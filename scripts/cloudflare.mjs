import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {config,wrangler} from './lib/cloudflare-cli.mjs';
const command=process.argv[2];
if(command==='configure'){
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,database=process.env.LEMMA_DOWNLOADS_DATABASE_ID;
 if(!/^[a-f0-9]{32}$/.test(account||'')||!/^[-a-f0-9]{36}$/.test(database||''))throw Error('Set CLOUDFLARE_ACCOUNT_ID and LEMMA_DOWNLOADS_DATABASE_ID in private runtime settings.');
 const value=JSON.parse(await readFile('cloudflare/wrangler.example.json','utf8'));value.main=path.resolve('cloudflare/worker.js');value.assets.directory=path.resolve('site-dist');value.account_id=account;value.d1_databases[0].database_id=database;
 if(process.env.LEMMA_DOMAIN){const domain=process.env.LEMMA_DOMAIN;if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain))throw Error('Invalid deployment domain');value.routes=[{pattern:domain,custom_domain:true},{pattern:'www.'+domain,custom_domain:true}];}
 await mkdir(path.dirname(config),{recursive:true});await writeFile(config,JSON.stringify(value,null,2)+'\n',{mode:0o600});console.log('Private Wrangler configuration created.');
}else if(command==='migrate')wrangler(['d1','execute','lemma-downloads','--remote','--file','cloudflare/schema.sql','--config',config]);
else if(command==='deploy'){
 if(!process.env.VITE_REPOSITORY_URL)throw Error('Set VITE_REPOSITORY_URL for the public source link.');
 execFileSync('npm',['run','site:build'],{stdio:'inherit'});wrangler(['deploy','--config',config]);
}else if(command==='stats-secret'){
 if(!process.env.LEMMA_STATS_TOKEN||process.env.LEMMA_STATS_TOKEN.length<32)throw Error('Provide a strong LEMMA_STATS_TOKEN in private runtime settings.');
 wrangler(['secret','put','STATS_TOKEN','--config',config],{input:process.env.LEMMA_STATS_TOKEN,stdio:['pipe','inherit','inherit']});
}else throw Error('Use cloudflare.mjs configure|migrate|deploy|stats-secret');
