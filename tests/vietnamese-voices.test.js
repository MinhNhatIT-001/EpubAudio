import test from 'node:test';
import assert from 'node:assert/strict';
import {vietnameseVoice} from '../server/vietnamese-voices.js';
test('Exclude English-only voices and prefer verified Vietnamese preview',()=>{
 assert.equal(vietnameseVoice({voice_id:'en',language:'en'}),null);
 const v=vietnameseVoice({voice_id:'vi',language:'en',preview_url:'english',verified_languages:[{language:'vi',preview_url:'viet'}]});
 assert.equal(v.preview,'viet');assert.equal(v.labels.language,'Tiếng Việt');
 assert.equal(vietnameseVoice({voice_id:'native',language:'vi',preview_url:'viet'}).preview,'viet');
});
