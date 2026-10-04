import test from 'node:test';
import assert from 'node:assert/strict';
import { providerError } from '../server/eleven-errors.js';
const error = (status, detail) => new Response(JSON.stringify({detail}), {status});
test('missing voice permission is distinguished from invalid API key', async () => {
  const message = await providerError(error(401, {status:'missing_permissions'}), 'voices');
  assert.match(message, /Voices: Read/);
  assert.doesNotMatch(message, /không hợp lệ/);
});
test('unknown 401 does not claim a key is invalid or leak provider text', async () => {
  const message = await providerError(error(401, {message:'secret-content'}), 'voices');
  assert.match(message, /chưa đủ thông tin/);
  assert.doesNotMatch(message, /secret-content/);
});
test('invalid key and missing speech scope have different messages', async () => {
  assert.match(await providerError(error(401,{status:'invalid_api_key'}),'speech'), /đã bị thu hồi/);
  assert.match(await providerError(error(401,{status:'missing_permissions'}),'speech'), /Text to Speech: Access/);
});
