# HƯỚNG DẪN DEPLOY MIỄN PHÍ — TUANANHPROXY

Bài này hướng dẫn từng bước đưa toàn bộ web TUANANHPROXY (frontend + backend + database) lên hosting **miễn phí**.

Ta sẽ dùng:
- **Render.com** — host Node.js (free 750 giờ/tháng, sleep sau 15 phút không có truy cập)
- **Neon.tech** — Postgres free 3GB, không hết hạn
- **GitHub** — chứa source code

Tổng thời gian: ~15 phút. Không cần thẻ tín dụng.

---

## BƯỚC 1 — Tạo database Postgres miễn phí (Neon)

1. Vào https://neon.tech và đăng ký bằng tài khoản GitHub/Google.
2. Bấm **Create project** → đặt tên `tuananhproxy` → chọn region **Singapore** (gần Việt Nam nhất) → **Create project**.
3. Sau khi tạo xong, tab **Connection Details** sẽ hiện chuỗi kết nối dạng:
   ```
   postgresql://USER:PASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Copy chuỗi này lại** — bước 3 sẽ dùng. Tick **"Pooled connection"** nếu có.

---

## BƯỚC 2 — Đẩy code lên GitHub

1. Vào https://github.com/new → đặt tên repo (ví dụ `tuananhproxy`) → **Public** hoặc **Private** đều được → **Create repository**.
2. Trong workspace Replit, mở thanh **Tools** bên trái → tab **Git** (hoặc **Version Control**) → bấm **Connect to GitHub** → chọn repo vừa tạo → bấm **Push**.
3. Đợi vài giây cho Replit đẩy hết code lên GitHub.

> Cách thay thế: tải 2 file zip về máy, giải nén ra cùng một thư mục, rồi `git init && git add . && git remote add origin URL && git push -u origin main`.

---

## BƯỚC 3 — Deploy lên Render.com

1. Vào https://render.com và đăng ký bằng tài khoản GitHub.
2. Sau khi đăng nhập, bấm **New +** → **Blueprint** (KHÔNG chọn Web Service thường — Blueprint sẽ tự đọc file `render.yaml` đã có sẵn trong repo).
3. Chọn repo `tuananhproxy` vừa push → bấm **Connect**.
4. Render sẽ tự đọc `render.yaml`, hiện ra 1 service tên **tuananhproxy**, plan **Free**.
5. Trang sẽ hỏi nhập biến **DATABASE_URL** (vì biến này không tự sinh được). Dán chuỗi kết nối Neon đã copy ở Bước 1 vào.
6. Bấm **Apply** → Render bắt đầu build (mất 5–8 phút lần đầu).
7. Khi build xong, web sẽ chạy tại địa chỉ dạng `https://tuananhproxy.onrender.com`.

---

## BƯỚC 4 — Đăng nhập admin và setup ban đầu

Tài khoản admin được tự động tạo lần đầu chạy:

- **Username:** `0339651811`
- **Password:** `tuananh2011@`

Truy cập `https://tuananhproxy.onrender.com/dang-nhap`, đăng nhập, vào `/admin` để bắt đầu thêm key proxy, duyệt nạp, v.v.

---

## LƯU Ý QUAN TRỌNG

### Render Free sleep sau 15 phút
- Sau 15 phút không có truy cập, service sẽ tự ngủ. Khách vào lần đầu sau đó sẽ phải đợi **15-30 giây** để thức dậy.
- Cách giữ luôn thức (miễn phí): dùng https://uptimerobot.com (free) tạo monitor ping URL `https://tuananhproxy.onrender.com/api/healthz` mỗi 5 phút.

### Cập nhật code sau này
- Mỗi lần bạn `git push` lên branch `main`, Render sẽ tự động build lại và deploy. Không cần làm gì thêm.

### Domain riêng
- Nếu mua domain riêng (ví dụ tuananhproxy.com), vào Render → Settings → **Custom Domain** → thêm domain → cập nhật DNS theo hướng dẫn của Render. Render cấp SSL miễn phí.

### Biến môi trường
- `DATABASE_URL` — bạn đã đặt ở bước 3.
- `SESSION_SECRET` — Render tự sinh ngẫu nhiên (không cần làm gì).
- `NODE_ENV=production`, `PORT=10000`, `BASE_PATH=/` — đã định sẵn trong render.yaml.

### Backup database
- Neon free có Point-in-Time Recovery 7 ngày. Để xuất dữ liệu thủ công, cài `pg_dump` rồi chạy `pg_dump $DATABASE_URL > backup.sql`.

---

## XỬ LÝ SỰ CỐ

**Build lỗi "DATABASE_URL is not defined":**  
Bạn chưa nhập DATABASE_URL ở Bước 3 mục 5. Vào Render dashboard → service tuananhproxy → Environment → thêm biến `DATABASE_URL` → bấm Save → service sẽ rebuild.

**Build lỗi pnpm version:**  
Render cần biết phiên bản pnpm. File `package.json` đã khai báo `packageManager: pnpm@10.26.1`. Nếu vẫn lỗi, vào Render → Settings → Build Command đảm bảo có `corepack enable && corepack prepare pnpm@10.26.1 --activate` ở đầu.

**Đăng nhập không lưu được session:**  
Render đã được set `trust proxy` và cookie `secure: true` ở chế độ production. Nếu vẫn lỗi, kiểm tra biến `NODE_ENV=production` đã được set chưa.

**Frontend hiện trang trắng:**  
Mở Console (F12) → tab Network. Nếu file JS/CSS bị 404 → có thể `BASE_PATH` không đúng. Kiểm tra trong Render Environment, biến `BASE_PATH` phải là `/` (chỉ một dấu gạch chéo).

---

Chúc deploy thành công! Có vấn đề gì cứ nhắn lại.
