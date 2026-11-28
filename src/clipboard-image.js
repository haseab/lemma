import mathCss from 'mathlive/static.css?raw';

// Embed font data in this lazy chunk so desktop file URLs and offline copying
// work without fetching resources into the SVG image.
const fonts=import.meta.glob('../node_modules/mathlive/fonts/*.woff2',{query:'?inline',import:'default',eager:true});
const css=mathCss.replace(/url\(["']?fonts\/([^)'"\s]+)["']?\)/g,(_match,name)=>{
 const data=fonts[`../node_modules/mathlive/fonts/${name}`];
 if(!data)throw Error('An image font is missing.');
 return `url("${data}")`;
});

export async function formulaPng(markup,{document:doc,fontSize='20px',color='#28382c',fontFamily='sans-serif'}={}){
 const view=doc.defaultView,host=doc.createElement('div');
 host.style.cssText='position:fixed;left:-100000px;top:0;pointer-events:none';
 host.setAttribute('aria-hidden','true');
 const style=doc.createElement('style'),content=doc.createElement('div');
 style.textContent=css;content.style.cssText='display:inline-block;padding:12px;white-space:nowrap;line-height:1.5';
 content.style.fontSize=fontSize;content.style.color=color;content.style.setProperty('--text-font-family',fontFamily);
 content.innerHTML=markup;
 host.append(style,content);doc.body.append(host);
 try{
  const families=[...new Set([...content.querySelectorAll('span')].map(node=>view.getComputedStyle(node).fontFamily))];
  await Promise.all(families.map(family=>doc.fonts.load(`${fontSize} ${family}`)));await doc.fonts.ready;
  const rect=content.getBoundingClientRect(),width=Math.ceil(rect.width),height=Math.ceil(rect.height);
  if(!width||!height||width>16384||height>16384||width*height>32_000_000)throw Error('This selection is too large to copy as an image. Copy a smaller selection.');
  const serialized=new view.XMLSerializer().serializeToString(content);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</style>${serialized}</div></foreignObject></svg>`;
  const image=new view.Image();image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;await image.decode();
  const canvas=doc.createElement('canvas'),scale=Math.min(2,16384/Math.max(width,height),Math.sqrt(32_000_000/(width*height)));
  canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
  const context=canvas.getContext('2d');if(!context)throw Error('Image rendering is unavailable.');
  context.scale(scale,scale);context.drawImage(image,0,0);
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not render the selected image.')),'image/png'));
 }finally{host.remove();}
}
