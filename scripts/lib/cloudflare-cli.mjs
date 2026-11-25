import {execFileSync} from 'node:child_process';
import path from 'node:path';
export const config=path.resolve('.wrangler/lemma.json');
export function wrangler(args,options={}){
 const profile=process.env.LEMMA_CLOUDFLARE_PROFILE;
 // An explicitly selected account wrapper can be used on multi-account machines.
 const wrapper=process.env.LEMMA_WRANGLER_WRAPPER;
 const bin=wrapper||path.resolve('node_modules/.bin/wrangler');
 return execFileSync(bin,[...(profile?(wrapper?[profile]:['--profile',profile]):[]),...args],{stdio:'inherit',...options});
}
