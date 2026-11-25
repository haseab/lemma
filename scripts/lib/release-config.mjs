export function signingIdentity(env=process.env){
 const identity=env.LEMMA_SIGN_IDENTITY;
 if(!identity||identity==='-'||!(/^Developer ID Application: .+/.test(identity)||/^[A-Fa-f0-9]{40}$/.test(identity)))throw Error('Set LEMMA_SIGN_IDENTITY to your Developer ID Application identity or certificate SHA-1.');
 return identity;
}
export function signingOptions(env=process.env){
 const identity=signingIdentity(env),profile=env.LEMMA_NOTARY_PROFILE;
 if(!profile)throw Error('Set LEMMA_NOTARY_PROFILE to an existing notarytool Keychain profile.');
 return {identity,profile};
}
export function publicRepository(value){
 const url=new URL(value||'');if(url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.search||url.hash||!/^\/[-\w.]+\/[-\w.]+\/?$/.test(url.pathname))throw Error('Set LEMMA_REPOSITORY_URL to the public HTTPS GitHub repository.');return url.href.replace(/\/$/,'');
}
