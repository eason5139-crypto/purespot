import fs from 'node:fs';
const rate=22050;
const cues=[['tap',0,90],['tick',140,55],['mix',240,780],['drop',1100,240],['open',1400,260],['win',1760,880],['scratch',2740,150],['error',3000,220]];
const samples=new Float32Array(Math.ceil(3.4*rate));
for(const [name,start,duration] of cues){
 const offset=Math.round(start*rate/1000),length=Math.round(duration*rate/1000);
 for(let i=0;i<length;i++){
  const t=i/rate,p=i/length,fade=Math.min(1,p*25)*(1-p)**2;
  let value=0;
  if(name==='tap')value=Math.sin(2*Math.PI*(660-280*p)*t)*.34;
  if(name==='tick')value=(Math.sin(2*Math.PI*1450*t)+.3*Math.sin(2*Math.PI*2340*t))*.15;
  if(name==='mix')value=(Math.sin(2*Math.PI*115*t)+.4*Math.sin(2*Math.PI*173*t))*(.08+.05*Math.sin(2*Math.PI*18*t));
  if(name==='drop')value=Math.sin(2*Math.PI*(640-450*p)*t)*.35;
  if(name==='open')value=(Math.sin(2*Math.PI*880*t)+Math.sin(2*Math.PI*1320*t))*.14;
  if(name==='win'){
   const n=Math.min(4,Math.floor(t/.13)),freq=[523.25,659.25,783.99,1046.5,1318.5][n],local=(t% .13)/.13;
   value=(Math.sin(2*Math.PI*freq*t)+.23*Math.sin(4*Math.PI*freq*t))*.3*(1-local*.65);
  }
  if(name==='scratch')value=(Math.random()*2-1)*.13*(.7+.3*Math.sin(2*Math.PI*160*t));
  if(name==='error')value=Math.sin(2*Math.PI*(240-50*p)*t)*.2;
  samples[offset+i]=value*fade;
 }
}
const bytes=Buffer.alloc(44+samples.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples.length*2,40);
samples.forEach((n,i)=>bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,n))*32767),44+i*2));
fs.mkdirSync('public/audio',{recursive:true});fs.writeFileSync('public/audio/arcade-sprite-v2.wav',bytes);console.log({size:bytes.length,cues:cues.map(([id,start,duration])=>({id,start,duration}))});
