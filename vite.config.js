import { defineConfig } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
export default defineConfig({base:'./',plugins:[{name:'math-fonts',closeBundle(){mkdirSync('dist/fonts',{recursive:true});cpSync('node_modules/mathlive/fonts','dist/fonts',{recursive:true});}}]});
