import { providerError } from '../server/eleven-errors.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' });
  const key = req.headers['x-elevenlabs-key'];
  if (typeof key !== 'string' || !key.trim()) return res.status(401).json({ error: 'Hãy nhập khóa ElevenLabs cá nhân.' });
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) return res.status(response.status).json({ error: await providerError(response, 'voices') });
    const data = await response.json();
    return res.status(200).json({ voices: (data.voices || []).map(v => ({ id: v.voice_id, name: v.name, labels: v.labels || {}, preview: v.preview_url })) });
  } catch { return res.status(502).json({ error: 'Không kết nối được ElevenLabs. Hãy thử lại.' }); }
}
