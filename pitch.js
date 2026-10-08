/* YIN-style difference estimator. Monophonic audio only. No audio leaves the device. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FQPitch=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
function detect(input,sampleRate){
  let energy=0,mean=0;for(let i=0;i<input.length;i++){energy+=input[i]*input[i];mean+=input[i];}
  const rms=Math.sqrt(energy/input.length);if(rms<.008)return {frequency:null,rms,clarity:0};mean/=input.length;
  const stride=sampleRate>30000?2:1,rate=sampleRate/stride,buf=new Float32Array(Math.floor(input.length/stride));
  for(let i=0;i<buf.length;i++)buf[i]=input[i*stride]-mean;
  const min=Math.max(2,Math.floor(rate/1400)),max=Math.min(Math.floor(rate/70),Math.floor(buf.length/2)-1),size=buf.length-max;
  const diff=new Float32Array(max+1),norm=new Float32Array(max+1);norm[0]=1;let sum=0;
  for(let lag=1;lag<=max;lag++){let v=0;for(let j=0;j<size;j++){const d=buf[j]-buf[j+lag];v+=d*d;}diff[lag]=v;sum+=v;norm[lag]=sum? v*lag/sum:1;}
  let lag=-1;for(let i=min;i<max;i++){if(norm[i]<.13){while(i+1<max&&norm[i+1]<norm[i])i++;lag=i;break;}}
  if(lag<0)return {frequency:null,rms,clarity:0};
  const a=norm[lag-1],b=norm[lag],c=norm[lag+1],denom=2*(2*b-a-c);const shift=denom?(c-a)/denom:0;
  const frequency=rate/(lag+Math.max(-1,Math.min(1,shift)));return {frequency,rms,clarity:1-b};
}
const midi=f=>69+12*Math.log2(f/440),frequency=n=>440*Math.pow(2,(n-69)/12),cents=(f,n)=>1200*Math.log2(f/frequency(n));
return {detect,midi,frequency,cents};
});
