# EpubAudio

Web đọc EPUB bằng tiếng Việt, giữ HTML/CSS gốc của sách. Font và nền gốc là mặc định.

## Chức năng

- Import/kéo thả EPUB dưới 100 MB; lưu thư viện, bìa, tiến độ và dấu trang trên thiết bị.
- Mục lục, tìm kiếm, hai trang trên màn hình rộng, một trang trên điện thoại.
- Menu phủ không làm xê dịch chữ; tùy chỉnh font, cỡ chữ, giãn dòng và nền.
- Nhấp đúp bằng chuột trái trên chữ để đọc từ đầu cụm dấu câu đó và tiếp tục; có thông báo cụm đã chọn.
- Giọng Việt của thiết bị, điều chỉnh tốc độ/âm lượng, hẹn giờ, tự chuyển trang/chương.
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

## Thử VieNeu trên máy

Xem [local/README.md](local/README.md). Đây là thử nghiệm tạo audio tiếng Việt trên Mac, chưa tích hợp vào trình đọc đã xuất bản. Model và môi trường nằm ngoài Git trong thư mục `.local`.

## Giới hạn

Giọng thiết bị phụ thuộc hệ điều hành/trình duyệt; danh sách chỉ gồm giọng Việt. Theo vết và đọc nền cũng phụ thuộc trình duyệt. Dữ liệu sách ở IndexedDB, chưa đồng bộ đám mây. Không hỗ trợ DRM hoặc OCR chữ trong ảnh. Script và popup của EPUB bị vô hiệu hóa.
