# EpubAudio

Web đọc EPUB và nghe giọng AI, giao diện tiếng Việt. Giữ HTML/CSS gốc của EPUB: không chuyển sách thành giao diện các đoạn văn riêng. Font và nền gốc là mặc định.

## Chức năng

- Import/kéo thả EPUB dưới 100 MB; lưu sách và bìa trong IndexedDB của thiết bị.
- Thư viện, tìm kiếm, sắp xếp, đọc tiếp, mục lục và dấu trang.
- Phân trang theo kích thước màn hình; tùy chỉnh font, cỡ chữ, giãn dòng và nền.
- ElevenLabs Flash v2.5: chọn giọng, nghe mẫu, audio kèm timestamp, tô sáng từng từ, tự chuyển trang/chương.
- Chương được gửi nguyên bản văn bản tới API, không tự chia nhỏ. Giới hạn 40.000 ký tự/chương; có thể bôi chọn một đoạn để nghe riêng.
- Audio nguyên chương lưu trên thiết bị theo nội dung/giọng/độ ổn định; nghe lại và đọc tiếp dùng lại cache. Tốc độ và âm lượng được điều chỉnh khi phát.
- Giọng thiết bị dự phòng, hẹn giờ ngủ, phím Space/phím mũi tên.
- Sách mẫu tiếng Việt do dự án tự viết.

## Chạy local

Cần Node.js 22+ và pnpm.

```sh
pnpm install
pnpm dev
```

Vite phục vụ giao diện và proxy API giọng đọc qua middleware local. Mở URL được in trong terminal.

```sh
pnpm test
pnpm build
```

## Triển khai Vercel

Import GitHub repository `MinhNhatIT-001/EpubAudio`, framework **Vite**, build `pnpm build`, output `dist`. Hai endpoint `api/voices.js` và `api/speech.js` tự trở thành Vercel Functions. Không cần secret dùng chung hay biến môi trường.

Mỗi người dùng nhập khóa ElevenLabs cá nhân trong mục Giọng đọc AI. Khóa chỉ ở bộ nhớ phiên, gửi tới máy chủ qua HTTPS trong header rồi chuyển tiếp tới ElevenLabs; không ghi vào Git, localStorage hoặc IndexedDB. Không gửi khóa vào chat hay commit. Chỉ cấp quyền tối thiểu cho giọng/TTS khi tạo khóa. Mẫu giọng dùng preview của nhà cung cấp (có thể là ngôn ngữ khác); Flash v2.5 hỗ trợ văn bản tiếng Việt.

## Lưu ý thực tế

- Chưa có đồng bộ đám mây: dữ liệu chỉ ở trình duyệt/thiết bị hiện tại. Xóa dữ liệu website sẽ xóa thư viện và audio.
- Tạo audio AI có phí vào tài khoản ElevenLabs của người nghe. Hủy chờ trên web không đảm bảo nhà cung cấp chưa xử lý hoặc tính phí.
- Chương dài có thể vượt thời gian xử lý 60 giây hoặc kích thước phản hồi Vercel Functions; web hiển thị lỗi và không tự chia chương. Cần kiểm tra với sách và tài khoản thật trước khi dùng cho chương rất dài.
- Không hỗ trợ giải mã DRM; EPUB có chữ trong ảnh không được OCR. Sách bố cục cố định có thể không đổi được font.
- Đọc nền/khóa màn hình và theo vết giọng thiết bị phụ thuộc trình duyệt. Theo vết AI dùng mốc ký tự chính xác từ API; bố cục EPUB vẫn giữ nguyên.
- Script trong EPUB và popup bị vô hiệu hóa. EPUB có tài nguyên bên ngoài vẫn có thể tải tài nguyên đó khi đọc.

## Kiểm thử

`pnpm test` kiểm tra tìm từ tiếng Việt, tra timestamp và kiểm tra giới hạn/khóa API. Kiểm tra trình duyệt thực hiện riêng cho import sách mẫu, chuyển trang/chương, dấu trang, theme, cache và responsive. Giọng AI thật cần khóa cá nhân để xác minh chất lượng/chi phí; không có khóa được lưu trong repo.

## Kho giọng Việt và cấu hình máy chủ

Trong Vercel → Project epubaudio → Settings → Environment Variables, thêm `ELEVENLABS_API_KEY` cho Production rồi Redeploy. Không đặt tiền tố VITE_, không commit khóa. Người đọc không cần nhập khóa khi máy chủ đã cấu hình; mọi audio mới dùng hạn mức của tài khoản máy chủ. Giới hạn hạn mức của khóa trong ElevenLabs nếu chia sẻ web.

Voice Library được truy vấn với language=vi, chỉ hiển thị giọng có nhãn hoặc verified language tiếng Việt, có tìm kiếm, phân trang và nghe mẫu. Khi chọn, giọng được thêm vào tài khoản. Khóa cần Voices Read/Write và Text to Speech Access; Voice Library qua API yêu cầu gói trả phí của ElevenLabs. Khóa cá nhân có thể nhập riêng cho phiên đọc.

Trình đọc theo vết theo cụm dấu câu, hai trang trên màn hình rộng, menu phủ không làm đổi vị trí chữ, nhấp đúp để nghe đoạn. EPUB giữ nguyên markup; ranh giới audio không chia hoặc viết lại nội dung sách.
