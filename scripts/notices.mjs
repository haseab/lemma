import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const paths=execFileSync('npm',['ls','--omit=dev','--all','--parseable'],{encoding:'utf8'}).trim().split('\n').slice(1);
let text='Lemma third-party license notices\n\n';
for(const path of paths){const pkg=JSON.parse(readFileSync(join(path,'package.json'),'utf8'));text+=`\n${pkg.name} ${pkg.version}\n${'='.repeat(60)}\n`;const names=readdirSync(path).filter(n=>/^(license|licence|copying|notice)(\.|$)/i.test(n));for(const name of names)text+=readFileSync(join(path,name),'utf8')+'\n';if(!names.length)text+=`License: ${pkg.license||'See upstream package'}\n`;}
for(const name of ['LICENSE.txt','LICENSE','OFL.txt']){const file=join('node_modules/mathlive/fonts',name);if(existsSync(file))text+='\nMathLive fonts\n'+readFileSync(file,'utf8');}
writeFileSync('THIRD-PARTY-NOTICES.txt',text.split('\n').map(line=>line.trimEnd()).join('\n').trimEnd()+'\n');
