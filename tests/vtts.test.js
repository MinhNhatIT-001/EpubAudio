import test from 'node:test';
import assert from 'node:assert/strict';
import { speechParts, pcmWav, vietnameseFemaleVoices } from '../src/vtts.js';
test('V-TTS phrase cues retain EPUB offsets and bound long model inputs',()=>{
 const text='  Xin chào, bạn nhé!\n'+('Một đoạn văn dài không có dấu câu '.repeat(20))+' Kết thúc.';
 const parts=speechParts(text,42);
 assert.ok(parts.length>4);
 for(const part of parts){assert.ok(part.text.length<=180);assert.equal(text.slice(part.start-42,part.start-42+part.text.length),part.text);}
 assert.deepEqual(vietnameseFemaleVoices.map(v=>v.id),['SF','NF']);
});
test('Generated WAV has a valid PCM header and clips overflow',async()=>{
 const view=new DataView(await pcmWav(new Float32Array([-2,0,2]),24000).arrayBuffer());
 assert.equal(view.getUint32(24,true),24000);assert.equal(view.getUint32(40,true),6);assert.equal(view.getInt16(44,true),-32767);assert.equal(view.getInt16(48,true),32767);
});
