import { phraseRange } from './text.js';
let worker, pending, nextId=0;
export const vietnameseFemaleVoices = [{id:'SF',name:'Nữ miền Nam'},{id:'NF',name:'Nữ miền Bắc'}];
export function speechParts(text, base=0) {
  const result=[];let cursor=0;
  while(cursor<text.length){
    while(cursor<text.length && /\s/.test(text[cursor]))cursor++;
    if(cursor>=text.length)break;
    let [,end]=phraseRange(text,cursor);end=Math.max(cursor+1,end);
    // Bound model input while preserving the original EPUB and source offsets.
    while(end-cursor>180){let cut=text.lastIndexOf(' ',cursor+180);if(cut<=cursor)cut=cursor+180;result.push({text:text.slice(cursor,cut),start:base+cursor});cursor=cut;while(/\s/.test(text[cursor] || '') && cursor<end)cursor++;}
    if(text.slice(cursor,end).trim())result.push({text:text.slice(cursor,end).trim(),start:base+cursor});cursor=end;
  }
  return result;
}
export function cancelVtts() {
  if(!pending)return;
  worker?.terminate();worker=null;
  const current=pending;pending=null;current.reject(new DOMException('Đã hủy tạo audio','AbortError'));
}
export function generateVtts(text,speaker,base=0,onStatus=()=>{}) {
  cancelVtts();
  if(!vietnameseFemaleVoices.some(v=>v.id===speaker))return Promise.reject(new Error('Giọng nữ không hợp lệ.'));
  worker ||= new Worker(new URL('./vtts.worker.js',import.meta.url),{type:'module'});
  const id=++nextId;
  return new Promise((resolve,reject)=>{
    pending={reject};
    worker.onerror=()=>{worker?.terminate();worker=null;pending=null;reject(new Error('V-TTS chưa chạy được trong trình duyệt này. Thử Chrome hoặc Edge bản mới.'));};
    worker.onmessage=({data})=>{
      if(data.id!==id)return;
      if(data.status){onStatus(data.status);return;}
      pending=null;
      if(data.error){reject(new Error(data.error));return;}
      resolve({blob:pcmWav(data.samples,data.sampleRate),cues:data.cues});
    };
    worker.postMessage({id,speaker,parts:speechParts(text,base)});
  });
}
export function pcmWav(samples,rate) {
  const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
  const str=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  str(0,'RIFF');view.setUint32(4,36+samples.length*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++)view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
  return new Blob([buffer],{type:'audio/wav'});
}
