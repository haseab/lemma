import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(process.platform!=='darwin')throw Error('Icon generation requires macOS AppKit and sips.');
const root=fileURLToPath(new URL('..',import.meta.url)),temp=await mkdtemp(path.join(tmpdir(),'lemma-icons-'));
const run=(command,args)=>execFileSync(command,args,{stdio:'pipe'});
try{
 const source=path.join(temp,'Lemma.png');
 run('swift',['-module-cache-path',path.join(temp,'swift-cache'),path.join(root,'scripts/icon.swift'),source]);
 const images=new Map();
 for(const size of [16,24,32,48,64,128,256,512,1024]){
  const output=path.join(temp,`${size}.png`);run('sips',['-z',String(size),String(size),source,'--out',output]);
  const original=await readFile(output),chunks=[original.subarray(0,8)];
  // Keep image/color chunks and exclude metadata from distributed assets.
  for(let at=8;at<original.length;){const length=original.readUInt32BE(at),type=original.toString('ascii',at+4,at+8),end=at+length+12;if(['IHDR','PLTE','IDAT','IEND','tRNS','sRGB','gAMA','cHRM'].includes(type))chunks.push(original.subarray(at,end));at=end;}
  images.set(size,Buffer.concat(chunks));
 }
 // ICNS supports PNG representations for standard and Retina resolutions.
 const representations=[['icp4',16],['icp5',32],['icp6',64],['ic07',128],['ic08',256],['ic09',512],['ic10',1024],['ic11',32],['ic12',64],['ic13',256],['ic14',512]];
 const chunks=representations.map(([type,size])=>{const png=images.get(size),header=Buffer.alloc(8);header.write(type);header.writeUInt32BE(png.length+8,4);return Buffer.concat([header,png]);});
 const macHeader=Buffer.alloc(8);macHeader.write('icns');macHeader.writeUInt32BE(8+chunks.reduce((sum,c)=>sum+c.length,0),4);await writeFile(path.join(root,'assets/Lemma.icns'),Buffer.concat([macHeader,...chunks]));
 // PNG-backed ICO entries cover small Windows UI icons through high-DPI tiles.
 const sizes=[16,24,32,48,64,128,256],entries=[];let offset=6+sizes.length*16;
 for(const size of sizes){const png=images.get(size),entry=Buffer.alloc(16);entry[0]=size===256?0:size;entry[1]=entry[0];entry.writeUInt16LE(1,4);entry.writeUInt16LE(32,6);entry.writeUInt32LE(png.length,8);entry.writeUInt32LE(offset,12);offset+=png.length;entries.push(entry);}
 const header=Buffer.alloc(6);header.writeUInt16LE(1,2);header.writeUInt16LE(entries.length,4);await writeFile(path.join(root,'assets/Lemma.ico'),Buffer.concat([header,...entries,...sizes.map(size=>images.get(size))]));
 console.log('Updated Mac and Windows icons.');
}finally{await rm(temp,{recursive:true,force:true});}
