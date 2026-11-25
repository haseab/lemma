import {loadNotarySettings,runNotary} from './lib/notary.mjs';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,rm,symlink} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {signingIdentity,publicRepository} from './lib/release-config.mjs';
import {validateManifest} from '../src/release-manifest.js';
const run=(bin,args,opts={})=>execFileSync(bin,args,{stdio:'inherit',...opts});
if(process.platform!=='darwin')throw Error('Mac release requires macOS.');
const identity=signingIdentity(),notary=await loadNotarySettings(),repository=publicRepository(process.env.LEMMA_REPOSITORY_URL);
const pkg=JSON.parse(await readFile('package.json','utf8')),version=pkg.version;
if(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{encoding:'utf8'}).trim())throw Error('Commit the reviewed source before creating a release.');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
// Fail before building if the stored notarization credentials cannot authenticate.
runNotary(['history'],notary);
run('npm',['test']);run('npm',['run','build']);run(process.execPath,['scripts/package-desktop.mjs','darwin','arm64','--release']);
const bundle=path.resolve('release/packages/Lemma-darwin-arm64/Lemma.app'),out=path.resolve('release',version);await mkdir(out,{recursive:true});
const staging=await mkdtemp(path.join(tmpdir(),'lemma-release-'));
async function notarize(file,label){
 const result=runNotary(['submit',file,'--wait'],notary);
 await writeFile(path.join(out,label+'-notary.json'),JSON.stringify({id:result.id,status:result.status},null,2));
 if(result.status!=='Accepted')throw Error('Apple did not accept notarization. Inspect the submission with notarytool log.');
}
try{
 const zip=path.join(staging,'notarize.zip');run('ditto',['-c','-k','--sequesterRsrc','--keepParent',bundle,zip]);await notarize(zip,'app');
 run('xcrun',['stapler','staple',bundle]);run('xcrun',['stapler','validate',bundle]);run('codesign',['--verify','--deep','--strict',bundle]);run('spctl',['--assess','--type','execute',bundle]);
 const minimum=execFileSync('/usr/libexec/PlistBuddy',['-c','Print :LSMinimumSystemVersion',path.join(bundle,'Contents/Info.plist')],{encoding:'utf8'}).trim();
 const imageRoot=path.join(staging,'image');await mkdir(imageRoot);run('ditto',[bundle,path.join(imageRoot,'Lemma.app')]);await symlink('/Applications',path.join(imageRoot,'Applications'));
 const name=`Lemma-${version}-mac-arm64.dmg`,dmg=path.join(out,name);
 run('hdiutil',['create','-ov','-volname','Lemma','-srcfolder',imageRoot,'-format','UDZO',dmg]);
 run('codesign',['--force','--timestamp','--sign',identity,dmg]);await notarize(dmg,'dmg');
 run('xcrun',['stapler','staple',dmg]);run('xcrun',['stapler','validate',dmg]);run('spctl',['--assess','--type','open','--context','context:primary-signature',dmg]);
 const hash=createHash('sha256');let size=0;for await(const chunk of createReadStream(dmg)){hash.update(chunk);size+=chunk.length;}const sha256=hash.digest('hex');
 const manifest=validateManifest({schema:1,version,publishedAt:new Date().toISOString(),notesUrl:`${repository}/releases/tag/v${version}`,downloads:{mac:{key:`releases/${version}/${name}`,name,size,sha256,minimumSystem:`macOS ${minimum}+`,notarized:true}}});
 await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');await writeFile(path.join(out,'SHA256SUMS'),`${sha256}  ${name}\n`);
 await writeFile(path.join(out,'provenance.json'),JSON.stringify({version,commit,notarized:true},null,2)+'\n');
 await writeFile(path.join(out,'notes.md'),`Lemma ${version}\n\nA free, local math scratchpad for equations and prose.\n\n- Apple Silicon; macOS ${minimum} or later.\n- Developer ID signed and notarized. Drag Lemma into Applications.\n- Pages stay on your device; no desktop telemetry.\n- SHA-256 checksums are provided in SHA256SUMS.\n`);
 console.log('Verified release artifacts: '+out);
}finally{await rm(staging,{recursive:true,force:true});}
