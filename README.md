# Nhanh.vn MCP Server cho Claude

Kết nối Claude AI với Nhanh.vn để hỏi doanh thu, đơn hàng, tồn kho... bằng tiếng Việt, ngay trong chat.

![Claude Desktop demo](https://img.shields.io/badge/Claude_Desktop-Ready-green)

## Bạn sẽ làm được gì?

Mở Claude Desktop, gõ tiếng Việt bình thường:

| Câu hỏi | Claude sẽ trả lời |
|----------|-------------------|
| "Doanh thu hôm nay?" | Tổng tiền, số đơn thành công, đơn đang xử lý |
| "Top 5 sản phẩm bán chạy tuần này?" | Xếp hạng theo số lượng bán |
| "Tồn kho sản phẩm X?" | Số lượng còn, giá bán |
| "Tìm khách hàng tên Linh" | Tên, SĐT, email, tổng đơn |
| "So sánh doanh thu tuần này vs tuần trước" | Bảng so sánh chi tiết |
| "Token còn hạn không?" | Ngày hết hạn token |

---

## Hướng dẫn cài đặt (từng bước, cho người chưa biết code)

### Bước 0: Cài phần mềm cần thiết

Bạn cần cài 3 thứ trước (nếu chưa có):

#### 0.1. Cài Node.js

1. Vào https://nodejs.org
2. Bấm nút **Download** (chọn bản LTS)
3. Mở file vừa tải → bấm **Next → Next → Install → Finish**
4. Kiểm tra: mở **Command Prompt** (gõ `cmd` trong Start Menu), gõ:
   ```
   node --version
   ```
   Nếu hiện `v20.x.x` hoặc `v22.x.x` là OK.

#### 0.2. Cài Git

1. Vào https://git-scm.com/downloads/win
2. Tải bản **64-bit Git for Windows Setup**
3. Mở file → bấm **Next** liên tục → **Install → Finish**

#### 0.3. Cài Claude Desktop

1. Vào https://claude.ai/download
2. Tải bản Windows → cài đặt
3. Đăng nhập bằng tài khoản Claude (cần gói **Pro** hoặc **Max**)

---

### Bước 1: Tải code về máy

Mở **Command Prompt** (gõ `cmd` trong Start Menu), chạy lần lượt:

```
cd %USERPROFILE%\Desktop
git clone https://github.com/Junokyo/nhanh-mcp.git
cd nhanh-mcp
npm install
```

Chờ 10-30 giây cho nó cài xong. Khi thấy dòng `added ... packages` là OK.

---

### Bước 2: Lấy credentials từ Nhanh.vn

Bạn cần 3 thông tin: **App ID**, **Secret Key**, **Access Token**.

#### 2.1. Tạo App developer

1. Mở trình duyệt, vào https://open.nhanh.vn
2. Đăng ký tài khoản developer (nếu chưa có)
3. Vào **Danh sách app** → bấm **+ Thêm mới**
4. Điền:
   - **Tên App**: `MCP Claude` (hoặc tên bất kỳ)
   - **Redirect URL**: `https://yourdomain.com/callback` (điền domain thật của bạn, hoặc domain bất kỳ)
5. Bấm **Lưu**
6. Bấm vào app vừa tạo → ghi lại **App ID** và **Secret Key**

#### 2.2. Bật Open API trên Nhanh.vn

1. Đăng nhập Nhanh.vn bằng **tài khoản Giám đốc** (tài khoản có quyền cao nhất)
2. Vào **Cài đặt chung** → **Cài đặt Open API**
3. Bật **"Cho phép kết nối Open API"**
4. Lưu lại

#### 2.3. Lấy Access Code

Mở trình duyệt (đang đăng nhập Nhanh.vn), dán URL sau vào thanh địa chỉ:

```
https://nhanh.vn/oauth?version=2.0&appId=YOUR_APP_ID&returnLink=https://yourdomain.com/callback
```

> Thay `YOUR_APP_ID` bằng App ID thật. Thay `yourdomain.com/callback` bằng đúng Redirect URL đã điền ở bước 2.1.

Bấm Enter → Chọn **toàn bộ quyền** → bấm **Đồng ý**.

Trình duyệt sẽ redirect về URL có dạng:
```
https://yourdomain.com/callback?accessCode=XXXXXX
```

**Copy phần XXXXXX** sau `accessCode=`. Đây là Access Code, chỉ có hiệu lực **10 phút**!

#### 2.4. Đổi Access Code lấy Access Token

Mở **Command Prompt**, chạy lệnh sau (thay 3 giá trị YOUR_...):

```
curl --location "https://pos.open.nhanh.vn/v3.0/app/getaccesstoken?appId=YOUR_APP_ID" --header "Content-Type: application/json" --data "{\"accessCode\": \"YOUR_ACCESS_CODE\", \"secretKey\": \"YOUR_SECRET_KEY\"}"
```

Kết quả trả về dạng:
```json
{
  "code": 1,
  "data": {
    "accessToken": "abc123...",
    "businessId": 123456,
    "expiredAt": 1807705640
  }
}
```

Ghi lại **accessToken** và **businessId**.

> Token có hạn 1 năm. Khi hết hạn, làm lại từ bước 2.3.

---

### Bước 3: Kết nối vào Claude Desktop

#### 3.1. Mở file config

Bấm tổ hợp phím **Windows + R**, dán đường dẫn sau rồi bấm Enter:

```
%APPDATA%\Claude\claude_desktop_config.json
```

Nếu hỏi mở bằng gì → chọn **Notepad**.

#### 3.2. Dán nội dung config

Xóa hết nội dung cũ, dán đoạn sau (thay 3 giá trị `...`):

```json
{
  "mcpServers": {
    "nhanh-vn": {
      "command": "node",
      "args": ["C:\\Users\\TEN_USER\\Desktop\\nhanh-mcp\\index.js"],
      "env": {
        "NHANH_ACCESS_TOKEN": "access_token_tu_buoc_2",
        "NHANH_APP_ID": "app_id_tu_buoc_2",
        "NHANH_BUSINESS_ID": "business_id_tu_buoc_2"
      }
    }
  }
}
```

> **Quan trọng**: Thay `TEN_USER` bằng tên user Windows của bạn. Ví dụ máy bạn là `Admin` thì đường dẫn sẽ là `C:\\Users\\Admin\\Desktop\\nhanh-mcp\\index.js`.
>
> Để biết tên user: mở Command Prompt, gõ `echo %USERNAME%`.

Bấm **Ctrl + S** để lưu.

#### 3.3. Khởi động lại Claude Desktop

1. Nhìn góc dưới phải màn hình (system tray) → click phải vào icon Claude → **Quit**
2. Mở lại Claude Desktop từ Start Menu
3. Vào **Settings** → **Developer** → kiểm tra `nhanh-vn` hiện **running** (badge xanh)

---

### Bước 4: Dùng thôi!

Mở chat trong Claude Desktop, hỏi bằng tiếng Việt:

- "Doanh thu hôm nay bao nhiêu?"
- "Top 10 sản phẩm bán chạy từ 01/04 đến hôm nay?"
- "Tồn kho sản phẩm nào dưới 10?"
- "Tìm khách hàng số điện thoại 0912xxx"
- "Token Nhanh.vn còn hạn không?"

Claude sẽ tự động gọi API Nhanh.vn và trả kết quả cho bạn.

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| Server không hiện trong Settings > Developer | Đường dẫn file sai | Kiểm tra lại đường dẫn trong config, phải dùng `\\` thay vì `\` |
| Badge đỏ (error) | Node.js chưa cài hoặc thiếu packages | Mở cmd, chạy `cd Desktop\nhanh-mcp` rồi `npm install` |
| "Invalid accessToken" | Token sai hoặc hết hạn | Lấy lại token theo bước 2.3 - 2.4 |
| "Business not enable API" | Chưa bật Open API | Làm lại bước 2.2 |
| Doanh thu hiện 0 | Không có đơn thành công trong khoảng thời gian đó | Thử hỏi khoảng ngày khác |
| "node is not recognized" | Chưa cài Node.js | Cài Node.js theo bước 0.1, restart máy |

---

## Câu hỏi thường gặp

**Q: Có mất phí gì không?**
A: Bản thân tool này miễn phí. Bạn cần tài khoản Claude Pro/Max (có phí) và tài khoản Nhanh.vn (có sẵn).

**Q: Dữ liệu có an toàn không?**
A: Token chỉ lưu trên máy bạn (trong file config). Dữ liệu đi thẳng từ máy bạn → Nhanh.vn, không qua server trung gian.

**Q: Token hết hạn thì sao?**
A: Token có hạn 1 năm. Khi hết, làm lại bước 2.3 - 2.4 để lấy token mới, rồi cập nhật vào file config.

**Q: Dùng trên Mac được không?**
A: Được. Thay đường dẫn trong config thành `/Users/TEN_USER/Desktop/nhanh-mcp/index.js`. File config Mac nằm ở `~/Library/Application Support/Claude/claude_desktop_config.json`.

**Q: Nhiều người cùng dùng được không?**
A: Mỗi máy cài riêng, dùng chung hoặc riêng token đều được. Nếu dùng chung token thì lưu ý rate limit (150 request / 30 giây).

---

## Thông tin kỹ thuật

- **API**: Nhanh.vn Open API v3.0
- **Protocol**: MCP (Model Context Protocol)
- **Runtime**: Node.js 20+
- **Dependencies**: @modelcontextprotocol/sdk, axios, zod, dotenv
