import {execFileSync} from 'node:child_process';
if(process.platform==='darwin') {
 const app='deliverables/Lemma-darwin-arm64/Lemma.app';
 execFileSync('codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});
 execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
}
