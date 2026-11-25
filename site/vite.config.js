import {defineConfig} from 'vite';
import {cpSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({root,base:'./',envDir:fileURLToPath(new URL('..',import.meta.url)),build:{outDir:'../site-dist',emptyOutDir:true},plugins:[{name:'math-fonts',closeBundle(){const out=new URL('../site-dist/fonts',import.meta.url);mkdirSync(out,{recursive:true});cpSync(new URL('../node_modules/mathlive/fonts',import.meta.url),out,{recursive:true});}}]});
