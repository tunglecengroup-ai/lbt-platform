# Bản ghi DNS cho Resend — lebatung.com (thêm ở Tenten)

Dùng để web gửi mã đăng nhập cho học viên (người gửi `hoc@lebatung.com`).
Web học chạy ở `hoc.lebatung.com` = CNAME `hoc` → `lebatung.netlify.app` (+ TXT `subdomain-owner-verification` để Netlify xác minh).
Chỉ thêm bản ghi trên tên miền con → email Lark (MX + SPF ở tên miền gốc) và web hiện tại không bị ảnh hưởng.

| Loại | Tên (Host) | Giá trị | TTL |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDBoetigvSqVmjGCpzTkEPBeN1ZfMYKGYsH8QK6/+H0+SvKFpNl2CRuXKxIVlyA7ismsnRdiin25IH1FEUW0Y/C+QQwoo/7VBSnUwys4nv3nSnl0jI74/43+iKc7fvNN4gTKS9ahCBQa5iSdDtdrRJAD7HgVGHVWIyOgbZ2wA453QIDAQAB` | mặc định |
| CNAME | `rsend` | `rsend-apne1.forge.rmta.net` | mặc định |
| CNAME | `send` | `send.forge.rmta.net` | mặc định |

KHÔNG thêm:
- Bản ghi MX `@` → `receive-apne1.forge.rmta.net` (mục "Cho phép nhận" của Resend) — sẽ làm hỏng hộp thư Lark.
- `_dmarc` — tên miền đã có sẵn `v=DMARC1;p=none`.

Ô "Tên" ở Tenten chỉ gõ phần đầu (vd `send`), không gõ cả `send.lebatung.com`.
