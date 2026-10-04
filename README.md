# EpubAudio

Web đọc EPUB bằng tiếng Việt, giữ HTML/CSS gốc của sách. Font và nền gốc là mặc định.

## Chức năng

- Import/kéo thả EPUB dưới 100 MB; lưu thư viện, bìa, tiến độ và dấu trang trên thiết bị.
- Mục lục, tìm kiếm, hai trang trên màn hình rộng, một trang trên điện thoại.
- Menu phủ không làm xê dịch chữ; tùy chỉnh font, cỡ chữ, giãn dòng và nền.
- Nhấp đúp bằng chuột trái trên chữ để đọc từ đầu cụm dấu câu đó và tiếp tục; có thông báo cụm đã chọn.
- Giọng Việt của trình duyệt, điều chỉnh tốc độ/âm lượng, hẹn giờ, tự chuyển trang/chương.
- Theo vết theo cụm dấu câu khi trình duyệt cung cấp mốc đọc.

## Chạy và kiểm tra

Cần Node.js 22+ và pnpm:

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Vercel

Repo `MinhNhatIT-001/EpubAudio`, framework Vite, build `pnpm build`, output `dist`. Không cần khóa dịch vụ đọc.

## Giới hạn

Giọng trình duyệt phụ thuộc hệ điều hành/trình duyệt; danh sách chỉ gồm giọng Việt. Theo vết và đọc nền cũng phụ thuộc trình duyệt. Dữ liệu sách ở IndexedDB, chưa đồng bộ đám mây. Không hỗ trợ DRM hoặc OCR chữ trong ảnh. Script và popup của EPUB bị vô hiệu hóa.

Nút lùi/tiến 5 giây dùng thời gian ước tính cho giọng trình duyệt (Web Speech không có seek API), hiệu chỉnh từ boundary nếu có. Tua giữ trạng thái phát/tạm dừng và không thay đổi EPUB.

Giọng đọc có hai lựa chọn riêng: Giọng trình duyệt (localService=false, trực tuyến) và Giọng thiết bị (localService=true hoặc không xác định). Mỗi lựa chọn nhớ giọng riêng. Nếu không có giọng Việt trực tuyến, danh sách trình duyệt trống và không tự đổi nguồn. Cả hai dùng Web Speech API.


## V-TTS nữ tiếng Việt (thử nghiệm)

Chọn **Giọng đọc → V-TTS · Nữ Việt → Nữ miền Nam (SF) hoặc Nữ miền Bắc (NF)**.
Nghe thử hoặc đọc EPUB không cần API key. Model và WASM tải khi sử dụng V-TTS lần đầu (khoảng 173 MB model + 14 MB runtime), lưu cache nếu trình duyệt cho phép. Văn bản sách được xử lý trong Web Worker trên máy người đọc, không gửi lên dịch vụ TTS.

Tạo audio WAV theo cụm dấu câu, ghép thành đoạn đọc; mốc bắt đầu mỗi cụm dùng để theo vết, không thay đổi HTML/CSS EPUB. Điều chỉnh tốc độ, âm lượng, tạm dừng, tua 5 giây theo audio thật. Tạo audio cả chương có thể mất thời gian trên máy yếu; nhấn nút phát lần nữa để hủy. Giọng mặc định cho nguồn V-TTS là nữ miền Nam. Chọn nguồn V-TTS không tự thay lựa chọn của nguồn thiết bị/trình duyệt.

Nguồn: [V-TTS](https://github.com/tronghieuit/v-tts), model/G2P ghim ở commit `e22eef3267869375e40a096b376cde94aa41e610`. License **CC BY-NC 4.0**, chỉ dùng phi thương mại; xem THIRD_PARTY_NOTICES.md. Chưa tích hợp các giọng tham chiếu/clone hoặc giọng nam. Safari có thể hạn chế bộ nhớ/WASM; nên thử Chrome hoặc Edge bản mới nếu gặp lỗi.
