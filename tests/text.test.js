import test from 'node:test';
import assert from 'node:assert/strict';
import { charAtTime, wordRange } from '../src/text.js';
import speech from '../api/speech.js';
test('word follows Vietnamese accents and keeps punctuation', () => {
  assert.deepEqual(wordRange('Lắng nghe, rồi đọc.', 7), [5, 10]);
  assert.deepEqual(wordRange('Một trang sách', 0), [0, 3]);
});
test('timestamps find latest started character, including seeking backward', () => {
  assert.equal(charAtTime([0, .1, .1, .6, 1], .1), 2);
  assert.equal(charAtTime([0, .1, .1, .6, 1], .7), 3);
  assert.equal(charAtTime([0, .1, .1, .6, 1], 0), 0);
});
test('speech API rejects missing key and whole chapters exceeding provider limit without calling upstream', async () => {
  let status, body;
  const res = { setHeader() {}, status(n) { status = n; return this; }, json(x) { body = x; return this; } };
  await speech({ method: 'POST', headers: {}, body: {} }, res);
  assert.equal(status, 401);
  await speech({ method: 'POST', headers: { 'x-elevenlabs-key': 'test' }, body: { text: 'a'.repeat(40001), voice: 'voice' } }, res);
  assert.equal(status, 413);
  assert.match(body.error, /không tự chia nhỏ/);
});
