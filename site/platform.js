export function detectDesktopPlatform({userAgentData,platform='',userAgent='',maxTouchPoints=0}={}){
 const identity=`${platform} ${userAgent}`;
 if(userAgentData?.mobile||/Android|iPhone|iPad|iPod/i.test(identity)||/Mac/i.test(platform)&&maxTouchPoints>1)return null;
 const hint=userAgentData?.platform||platform;
 if(/Windows|Win32|Win64/i.test(hint))return 'windows';
 if(/macOS|MacIntel|MacPPC|Macintosh/i.test(hint))return 'mac';
 if(/Windows NT/i.test(userAgent))return 'windows';
 if(/Macintosh|Mac OS X/i.test(userAgent))return 'mac';
 return null;
}
export function updatePlatformLinks(root,platform,downloads={},fallback){
 const label=platform==='mac'?'Download for Mac':platform==='windows'?'Download for Windows':null;
 const href=platform?(downloads[platform]?.url||fallback||`#download-${platform}`):(fallback||'#download');
 for(const link of root.querySelectorAll('[data-primary-download]')){
  link.replaceChildren();
  if(platform==='mac'){
   const doc=link.ownerDocument,icon=doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=doc.createElementNS('http://www.w3.org/2000/svg','path');
   icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.setAttribute('data-platform-icon','mac');
   path.setAttribute('d','M17.05 12.54c.03 3.23 2.83 4.3 2.86 4.32-.02.08-.45 1.53-1.48 3.03-.9 1.3-1.83 2.6-3.3 2.63-1.44.03-1.9-.85-3.55-.85-1.64 0-2.16.82-3.52.88-1.42.05-2.5-1.41-3.4-2.71-1.84-2.66-3.24-7.51-1.35-10.8.94-1.63 2.62-2.66 4.44-2.69 1.39-.03 2.7.94 3.55.94.85 0 2.44-1.16 4.12-.99.7.03 2.67.28 3.94 2.13-.1.06-2.35 1.37-2.31 4.11ZM14.34 4.53c.75-.91 1.26-2.18 1.12-3.44-1.08.04-2.39.72-3.17 1.63-.7.8-1.31 2.08-1.15 3.31 1.2.09 2.43-.61 3.2-1.5Z');
   icon.append(path);link.append(icon,doc.createTextNode('Download ↓'));
  }else link.textContent=label?`${label} ↓`:'View downloads ↓';
  link.setAttribute('aria-label',label||'View downloads');link.setAttribute('href',href);
 }
 const card=platform&&root.querySelector(`[data-platform="${platform}"]`);
 if(card){card.classList.add('detected');card.parentElement.prepend(card);}
}
