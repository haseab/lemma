import {signingIdentity} from './lib/release-config.mjs';
import {packager} from '@electron/packager';
import {readFile,mkdtemp,mkdir,copyFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url));
const target=process.argv[2]||process.platform,arch=process.argv[3]||(target==='win32'?'x64':'arm64');
if(!['darwin','win32'].includes(target)||!['x64','arm64'].includes(arch))throw Error('Use package-desktop.mjs darwin|win32 x64|arm64');
const release=process.argv.includes('--release');
if(release&&(process.platform!=='darwin'||target!=='darwin'))throw Error('Signed Mac releases must be built on macOS.');
const signing=release?{identity:signingIdentity()}:null;
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
// Package a positive allowlist, never the checkout or its private overrides.
const stage=await mkdtemp(path.join(tmpdir(),'lemma-package-'));
try{
 for(const file of ['LICENSE','THIRD-PARTY-NOTICES.txt'])await copyFile(path.join(root,file),path.join(stage,file));
 for(const folder of ['dist','electron'])await cp(path.join(root,folder),path.join(stage,folder),{recursive:true});
 await mkdir(path.join(stage,'assets'));await copyFile(path.join(root,target==='darwin'?'assets/Lemma.icns':'assets/Lemma.ico'),path.join(stage,target==='darwin'?'assets/Lemma.icns':'assets/Lemma.ico'));
 await copyFile(path.join(root,'assets/document-types.plist'),path.join(stage,'assets/document-types.plist'));
 await import('node:fs/promises').then(fs=>fs.writeFile(path.join(stage,'package.json'),JSON.stringify({name:pkg.name,productName:pkg.productName,version:pkg.version,description:pkg.description,main:pkg.main,type:pkg.type,license:pkg.license})));
 const results=await packager({dir:stage,name:'Lemma',platform:target,arch,electronVersion:JSON.parse(await readFile(path.join(root,'node_modules/electron/package.json'),'utf8')).version,asar:true,prune:false,out:path.join(root,release?'release/packages':'deliverables'),overwrite:true,...(release?{osxSign:{identity:signing.identity,hardenedRuntime:true,preAutoEntitlements:false,gatekeeperAssess:false,optionsForFile:()=>({entitlements:path.join(root,'assets/entitlements.mac.plist'),hardenedRuntime:true})}}:{}),...(target==='darwin'?{appBundleId:'app.folio.math',appCategoryType:'public.app-category.productivity',icon:path.join(root,'assets/Lemma.icns'),extendInfo:path.join(root,'assets/document-types.plist')}:{icon:path.join(root,'assets/Lemma.ico'),win32metadata:{ProductName:'Lemma',FileDescription:'Lemma math scratchpad'}})});
 if(!release&&target==='darwin'&&process.platform==='darwin'){const bundle=path.join(results[0],'Lemma.app');execFileSync('codesign',['--force','--deep','--sign','-',bundle],{stdio:'inherit'});execFileSync('codesign',['--verify','--deep','--strict',bundle],{stdio:'inherit'});}
 if(release){
  const bundle=path.join(results[0],'Lemma.app');
  execFileSync('codesign',['--verify','--deep','--strict',bundle],{stdio:'inherit'});
  // Packager can warn and continue on signing failure; never promote such output.
  const {spawnSync}=await import('node:child_process');
  const check=spawnSync('codesign',['-dv','--verbose=4',bundle],{encoding:'utf8'}),details=check.stderr+check.stdout;
  if(check.status!==0||/Signature=adhoc|TeamIdentifier=not set/.test(details)||!details.includes('runtime')||!details.includes('Authority=Developer ID Application:')||!details.includes('Timestamp='))throw Error('Developer ID signing verification failed; this build is not eligible for release.');
 }
 console.log(`Packaged ${target}/${arch}: ${results.join(', ')}`);
 console.log(release?'Developer ID build created; run release:mac to notarize and verify it.':'Preview build: ad hoc signed on Mac; not notarized.');
}finally{await rm(stage,{recursive:true,force:true});}
