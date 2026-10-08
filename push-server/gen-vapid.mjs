// Prints a new VAPID key pair. Run once: node push-server/gen-vapid.mjs
const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const raw=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
const b64=bytes=>Buffer.from(bytes).toString('base64url');
console.log('VAPID_PUBLIC_KEY='+b64(raw));
console.log('VAPID_PRIVATE_KEY='+jwk.d);
