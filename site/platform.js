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
export function updatePlatformLinks(root,platform,downloads={}){
 const label=platform==='mac'?'Download for Mac':platform==='windows'?'Download for Windows':null;
 const href=platform?(downloads[platform]?.url||`#download-${platform}`):'#download';
 for(const link of root.querySelectorAll('[data-primary-download]')){link.textContent=label?`${label} ↓`:'View downloads ↓';link.setAttribute('href',href);}
 const card=platform&&root.querySelector(`[data-platform="${platform}"]`);
 if(card){card.classList.add('detected');card.parentElement.prepend(card);}
}
