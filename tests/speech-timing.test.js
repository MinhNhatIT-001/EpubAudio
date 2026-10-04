import test from 'node:test';
import assert from 'node:assert/strict';
import {speechTimeline,timeAtOffset,offsetAtTime} from '../src/speech-timing.js';
test('Browser speech timeline handles Vietnamese, punctuation and rate',()=>{
 const text='Chào bạn, hôm nay đẹp trời.';
 const normal=speechTimeline(text),fast=speechTimeline(text,2);
 assert.equal(normal.at(-1).offset,text.length);assert.equal(fast.at(-1).time,normal.at(-1).time/2);
 assert.equal(offsetAtTime(normal,-5),0);assert.equal(offsetAtTime(normal,100),text.length);
 assert.equal(offsetAtTime(normal,timeAtOffset(normal,text.indexOf('hôm'))),text.indexOf('hôm'));
 assert.ok(normal[2].time-normal[1].time>normal[1].time-normal[0].time);
});
