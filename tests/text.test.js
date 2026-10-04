import test from 'node:test';
import assert from 'node:assert/strict';
import { charAtTime, wordRange, phraseRange } from '../src/text.js';
test('word follows Vietnamese accents and keeps punctuation', () => {
  assert.deepEqual(wordRange('Lắng nghe, rồi đọc.', 7), [5, 10]);
  assert.deepEqual(wordRange('Một trang sách', 0), [0, 3]);
});
test('timestamps find latest started character, including seeking backward', () => {
  assert.equal(charAtTime([0, .1, .1, .6, 1], .1), 2);
  assert.equal(charAtTime([0, .1, .1, .6, 1], .7), 3);
  assert.equal(charAtTime([0, .1, .1, .6, 1], 0), 0);
});
test('phrase tracking includes punctuation, accents, decimals and paragraph boundaries', () => {
  const text = 'Chào bạn, hôm nay đẹp trời. Giá là 3.14 đồng!\nĐọc tiếp.';
  assert.equal(text.slice(...phraseRange(text, 2)), 'Chào bạn,');
  assert.equal(text.slice(...phraseRange(text, 12)), 'hôm nay đẹp trời.');
  assert.equal(text.slice(...phraseRange(text, 37)), 'Giá là 3.14 đồng!');
  assert.equal(text.slice(...phraseRange(text, 45)), 'Đọc tiếp.');
});
