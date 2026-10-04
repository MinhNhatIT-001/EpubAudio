export async function providerError(response, operation) {
  let data;
  try { data = await response.json(); } catch { data = {}; }
  const candidate = data?.detail?.status || data?.error?.code || data?.code;
  const code = typeof candidate === 'string' && /^[a-z_]{1,64}$/.test(candidate) ? candidate : '';
  if (['missing_permissions', 'missing_permission', 'insufficient_permissions'].includes(code)) {
    return operation === 'voices'
      ? 'Khóa được nhận nhưng thiếu quyền Voices: Read. Trong ElevenLabs, mở API Keys → Edit và bật quyền đọc giọng.'
      : 'Khóa thiếu quyền Text to Speech: Access. Trong ElevenLabs, mở API Keys → Edit và bật quyền tạo audio.';
  }
  if (code === 'invalid_api_key') return 'ElevenLabs báo khóa API không hợp lệ hoặc đã bị thu hồi. Hãy dùng khóa bí mật mới, không dùng Key ID.';
  if (code === 'unusual_activity') return 'ElevenLabs đang hạn chế yêu cầu do phát hiện hoạt động bất thường. Hãy kiểm tra tài khoản hoặc liên hệ ElevenLabs; đây không phải kết luận khóa sai.';
  if (code === 'quota_exceeded') return 'Tài khoản hoặc khóa đã hết hạn mức ElevenLabs. Hãy kiểm tra số dư và giới hạn của khóa.';
  if (code === 'voice_not_found') return 'Giọng này không còn khả dụng trong tài khoản. Hãy kết nối lại và chọn giọng khác.';
  if (response.status === 401 || response.status === 403) return `ElevenLabs từ chối truy cập (HTTP ${response.status}${code ? ', ' + code : ''}). Hãy kiểm tra quyền của khóa và trạng thái tài khoản; chưa đủ thông tin để kết luận khóa sai.`;
  if (response.status === 429) return 'ElevenLabs giới hạn số yêu cầu hoặc hạn mức. Hãy kiểm tra tài khoản và thử lại sau.';
  return `ElevenLabs chưa xử lý được yêu cầu (HTTP ${response.status}${code ? ', ' + code : ''}). Hãy kiểm tra giọng và tài khoản rồi thử lại.`;
}
