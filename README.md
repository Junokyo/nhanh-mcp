# Nhanh.vn MCP cho Claude AI

Kết nối Nhanh.vn với Claude AI trong 3 phút. Không cần cài đặt gì, không cần code. Hoạt động trên mọi thiết bị.

## Bạn sẽ làm được gì?

Mở Claude AI (web, mobile, desktop), gõ tiếng Việt:

| Câu hỏi | Claude trả lời |
|----------|----------------|
| "Doanh thu hôm nay?" | Tổng tiền, số đơn thành công, phân tích tỷ lệ hủy |
| "Top 5 sản phẩm bán chạy tuần này?" | Xếp hạng theo số lượng + doanh thu |
| "Tồn kho sản phẩm X?" | Số lượng còn, giá bán |
| "Tìm khách hàng tên Linh" | Tên, SĐT, email, tổng đơn |
| "So sánh doanh thu tuần này vs tuần trước" | Bảng so sánh + nhận xét |

---

## Setup (3 phút, cho sếp chưa biết code)

### Bước 1: Tạo App trên Nhanh.vn

1. Mở https://open.nhanh.vn → Đăng ký tài khoản developer (nếu chưa có)
2. Vào **Danh sách app** → bấm **+ Thêm mới**
3. Điền:
   - **Tên App**: `Claude AI` (hoặc gì cũng được)
   - **Redirect URL**: `https://resproxy.io/nhanh/auth`
4. Bấm **Lưu** → bấm vào app vừa tạo → ghi lại **App ID** và **Secret Key**

### Bước 2: Bật Open API trên Nhanh.vn

1. Đăng nhập **Nhanh.vn** bằng **tài khoản Giám đốc**
2. Vào **Cài đặt chung** → **Cài đặt Open API**
3. Bật **"Cho phép kết nối Open API"** → Lưu

### Bước 3: Chạy Setup Wizard

1. Mở https://resproxy.io/nhanh
2. Nhập **App ID** (lấy ở bước 1) → bấm **Bắt đầu Setup**
3. Nhanh.vn sẽ hỏi cấp quyền → **chọn toàn bộ quyền** → bấm **Đồng ý**
4. Hệ thống redirect về trang `/nhanh/auth` → nhập **Secret Key** → bấm **Đổi lấy Access Token**
5. Nhận **Connector URL** → bấm **Copy**

### Bước 4: Thêm vào Claude.ai

1. Mở https://claude.ai → **Settings** → **Connectors**
2. Bấm **Add custom connector**
3. Điền:
   - **Name**: `Nhanh.vn`
   - **URL**: dán URL đã copy ở bước 3
4. Bấm **Add**

### Bước 5: Sử dụng

Mở chat mới trên Claude (web/mobile/desktop) → hỏi **"Doanh thu hôm nay?"** → Enjoy!

---

## Các tool có sẵn

| Tool | Chức năng |
|------|-----------|
| `check_token` | Kiểm tra token còn hạn không |
| `get_orders` | Danh sách đơn hàng theo ngày/trạng thái |
| `get_revenue_report` | Tính doanh thu theo khoảng thời gian |
| `get_top_products` | Top sản phẩm bán chạy |
| `get_inventory` | Xem tồn kho |
| `get_customers` | Tìm kiếm khách hàng |

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| "Invalid redirect URL" khi tạo app | Redirect URL phải HTTPS đúng cú pháp | Dùng chính xác `https://resproxy.io/nhanh/auth` |
| "ERR_BUSINESS_NOT_ENABLE_API" | Chưa bật Open API | Làm lại Bước 2 |
| "Invalid accessCode" sau 10 phút | Access Code hết hạn | Mở lại https://resproxy.io/nhanh, bắt đầu lại |
| "Invalid accessToken" | Token hết hạn hoặc sai | Làm lại setup để lấy token mới |
| Claude không gọi tool | Connector chưa enable | Settings → Connectors → Nhanh.vn → Configure → bật tools |

---

## FAQ

**Q: Có mất phí không?**
A: Miễn phí. Bạn chỉ cần tài khoản Claude (Pro/Max có phí riêng của Anthropic) và tài khoản Nhanh.vn.

**Q: Dữ liệu có an toàn không?**
A: Token được mã hóa trong URL connector, lưu trên tài khoản Claude của bạn. Server xử lý trên Cloudflare Workers, không lưu token ở đâu cả.

**Q: Token hết hạn thì sao?**
A: Token có hạn 1 năm. Khi hết, làm lại từ Bước 3 để lấy token mới, update vào Claude Connector.

**Q: Một tài khoản Claude có thể thêm nhiều shop Nhanh.vn không?**
A: Được. Add nhiều Connector, mỗi cái đặt tên khác nhau (Nhanh.vn Shop A, Nhanh.vn Shop B...).

**Q: Nhiều nhân viên cùng dùng được không?**
A: Mỗi người tự login Claude và tự add Connector với token riêng của họ. Claude connector lưu theo tài khoản, không chia sẻ được.

**Q: Dùng offline được không?**
A: Không. Cần internet để Claude gọi API Nhanh.vn.

---

## Kiến trúc (cho dev)

```
Claude AI
  ↓ HTTPS
Cloudflare Worker (nhanh-mcp.junokyo7.workers.dev)
  ↓ HTTPS + Auth
Nhanh.vn API v3.0
```

- **Frontend wizard**: Next.js tại `resproxy.io/nhanh` + `/nhanh/auth`
- **MCP Server**: Cloudflare Workers, JSON-RPC 2.0 over HTTP
- **Credentials**: passed via URL query params `?token=&appId=&businessId=`

### Dev local

```bash
git clone https://github.com/Junokyo/nhanh-mcp.git
cd nhanh-mcp
npm install
# Chạy local với stdio transport (cho Claude Desktop)
node index.js
```

File `index.js` trong repo này là bản **local/stdio** cho Claude Desktop.
Remote worker source: không public (deploy từ máy owner).

---

## Liên hệ

- GitHub: https://github.com/Junokyo/nhanh-mcp
- Issues: https://github.com/Junokyo/nhanh-mcp/issues
