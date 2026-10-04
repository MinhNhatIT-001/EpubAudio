export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' });
  const key = req.headers['x-elevenlabs-key'];
  if (typeof key !== 'string' || !key.trim()) return res.status(401).json({ error: 'Hãy nhập khóa ElevenLabs cá nhân.' });
  const { text, voice, stability = 0.5 } = req.body || {};
  if (typeof text !== 'string' || !text.trim() || typeof voice !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(voice)) return res.status(400).json({ error: 'Văn bản hoặc giọng đọc không hợp lệ.' });
  if (text.length > 40000) return res.status(413).json({ error: 'Chương này vượt 40.000 ký tự của giọng AI. Ứng dụng giữ nguyên chương và không tự chia nhỏ; hãy chọn một đoạn trong sách để nghe.' });
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps`, {
      method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5', voice_settings: { stability: Math.max(0, Math.min(1, Number(stability) || 0)), similarity_boost: 0.75 } }),
      signal: AbortSignal.timeout(55000)
    });
    if (!response.ok) return res.status(response.status).json({ error: response.status === 401 ? 'Khóa API không hợp lệ hoặc thiếu quyền tạo audio.' : response.status === 429 ? 'Hết hạn mức hoặc đang có quá nhiều yêu cầu. Hãy kiểm tra ElevenLabs.' : 'ElevenLabs chưa tạo được audio. Hãy kiểm tra giọng và số dư tài khoản.' });
    const data = await response.json();
    if (!data.audio_base64 || !data.alignment) return res.status(502).json({ error: 'Dịch vụ không trả về audio kèm thời gian theo vết.' });
    return res.status(200).json({ audio_base64: data.audio_base64, alignment: data.alignment });
  } catch { return res.status(502).json({ error: 'Tạo audio quá lâu hoặc mất kết nối. Hãy thử lại; kiểm tra lịch sử sử dụng trước khi tạo lại.' }); }
}
