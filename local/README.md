# Thử giọng VieNeu trên máy Mac

Thử nghiệm giọng Việt mặc định, không dùng khóa dịch vụ đọc:

```sh
python3 -m venv .local/vieneu-env
.local/vieneu-env/bin/python -m pip install -r local/requirements.txt
HF_HOME="$PWD/.local/vieneu-cache" .local/vieneu-env/bin/python local/vieneu_sample.py
```

Lần đầu tải mô hình và thư viện. File nghe thử ở `.local/vieneu/nghe-thu.wav`.
Đây là thử nghiệm trên máy, chưa phải dịch vụ chạy trên Vercel hoặc nhà cung cấp đã tích hợp vào EPUB. Máy phải xử lý tạo audio; theo vết cần đo/đồng bộ thêm vì đầu ra mẫu không có timestamps từng chữ.

Đã chạy thử v3 Turbo CPU trên Mac Apple Silicon: danh sách 25 giọng, audio mẫu 6,16 giây. Script xử lý symlink model trong HF cache để tương thích kiểm tra đường dẫn tensor của ONNX Runtime. Chất lượng cần nghe mẫu để đánh giá; chưa đo độ chính xác theo vết.
