# Alliance Assistant - Requirements

## 1. Overview

Alliance Assistant là một web app nội bộ giúp nhân sự:

* Lưu trữ nhanh các link quan trọng (Bookmark)
* Ghi chú nhanh (Note)
* Quản lý thời gian biểu đơn giản (Timeline + Reminder)
* Hỗ trợ ra quyết định nhanh bằng các tool random (ví dụ: ăn gì hôm nay)

Mục tiêu:

* Nhanh, nhẹ, dễ dùng
* Mở mỗi ngày như một “trợ lý cá nhân”

---

## 2. Scope (MVP)

Phiên bản đầu tiên chỉ bao gồm:

1. Bookmark
2. Note nhanh
3. Timeline (theo ngày)
4. Reminder + Notification Settings
5. Random tool (ăn gì)
6. Đặt món (Group Food Order)

Không bao gồm:

* Calendar phức tạp
* Chat
* Task management nâng cao

---

## 3. User Roles

### 3.1. Admin (IT / quản trị nội bộ)

* Tạo tài khoản cho nhân sự mới (add user, set password)
* Quản lý danh sách món mặc định trong Random Tool
* Quản lý **danh mục quán cố định** dùng cho Group Food Order: thêm/sửa/xóa quán, thêm/sửa/xóa món của quán, upload ảnh món, cấu hình option của từng món (xem §4.9)

### 3.2. User (nhân sự)

* Sử dụng toàn bộ chức năng
* Dữ liệu chủ yếu là cá nhân

---

## 4. Features Detail

## 4.1. Home (Dashboard)

### Mô tả

Trang chính khi user đăng nhập

### Hiển thị

* Greeting (ví dụ: “Good morning”)
* Danh sách việc hôm nay (Timeline)
* Bookmark quan trọng (pinned)
* Nút Random nhanh

### Yêu cầu

* Load nhanh (< 2s)
* Không quá nhiều thông tin

---

## 4.2. Bookmark

### Mô tả

Cho phép user lưu và truy cập nhanh link

### Chức năng

* Thêm bookmark:
  * URL
  * Title (nhập tay)
  * Icon (optional) — xem mục Icon bên dưới
  * Màu (optional) — xem mục Màu bên dưới
* Edit bookmark: sửa URL, Title, Icon, Màu của bookmark đã có
* Hiển thị dạng grid card (icon + màu thể hiện trên card)
* Pin bookmark (đánh dấu quan trọng)
* Xóa bookmark
* Kéo thả (drag & drop) để thay đổi thứ tự bookmark:
  * Thứ tự được lưu lại (field `sort_order`) và dùng nhất quán ở mọi nơi
  * Phần pinned bookmark trên Dashboard cũng theo đúng `sort_order` này (không có thứ tự riêng)

### Icon

* Thư viện dùng: **Iconify** — `https://iconify.design`
  * Browse 200,000+ icon miễn phí, không cần account
  * Mỗi icon có URL dạng: `https://api.iconify.design/{collection}/{name}.svg` (ví dụ: `https://api.iconify.design/lucide/star.svg`)
* Trong form thêm/edit bookmark: có field nhập URL icon + link shortcut mở thẳng `iconify.design` để user browse
* User copy URL icon từ Iconify → paste vào field
* Icon render bằng `<img src="...">` từ URL đó, preview trực tiếp trong form trước khi lưu
* Nếu không nhập icon: card hiển thị icon mặc định (ví dụ: icon link/globe)

### Màu

* User có thể chọn màu cho bookmark card theo 3 cách:
  * Color picker (native hoặc component)
  * Nhập mã hex trực tiếp (ví dụ: `#4A90E2`)
  * Select từ bảng màu gợi ý sẵn (palette ~8–12 màu pastel)
* Màu được dùng làm accent (border, header card, hoặc background nhẹ) — không ảnh hưởng readability
* Nếu không chọn: dùng màu mặc định theo theme

### Optional (nếu có thời gian)

* Tag

### UX yêu cầu

* Thêm nhanh (≤ 2 bước)

---

## 4.3. Note

### Mô tả

Ghi chú nhanh, không cần format phức tạp

* Tạo note:
  * Title (optional) — hiển thị trên card nếu có nhập, ẩn nếu bỏ trống
  * Content (bắt buộc)
* Edit note: sửa Title và Content
* Xóa note
* Kéo thả (drag & drop) để thay đổi thứ tự note — thứ tự được lưu vào field `sort_order` trong DB

### Hiển thị card

* Card note hiển thị tối đa 7 dòng content, phần dư bị cắt (truncate)
* Click vào card để xem toàn bộ nội dung (mở modal hoặc expand)

### UX

* Nhập trực tiếp, không cần nhiều field

---

## 4.4. Timeline

### Mô tả

Quản lý lịch cá nhân theo ngày, tuần hoặc tháng

* Thêm item:
  * Title
  * Date — mặc định hôm nay, có thể đổi
  * Time (optional)
  * Màu (optional) — color picker / nhập hex / palette gợi ý (tương tự Bookmark)
  * Has Reminder — checkbox/toggle, mặc định `false`
* Edit item — form chứa các field: Title, Date, Time, Màu, Has Reminder (không có Recurrence); sau khi save thì reload lại data để phản ánh cập nhật mới
* Hiển thị theo thứ tự thời gian
* Mark done
* Xóa item

### Chế độ xem

* 3 chế độ hiển thị, chuyển bằng tab: **Day** | **Week** | **Month**
* Lựa chọn chế độ xem được lưu vào `localStorage`, giữ nguyên khi reload hoặc mở lại app
* Mặc định: Day view

### Hiển thị item có Reminder

* Khi `has_reminder = true`, item hiển thị thêm icon chuông (hoặc tương tự) trong tất cả các chế độ xem
* Icon giúp phân biệt nhanh item nào đang được nhắc nhở mà không cần mở chi tiết

### Lặp lịch (Recurrence)

Khi tạo item, user có thể bật tùy chọn lặp lịch với các chế độ:

| Chế độ | Mô tả |
| -------- | ------- |
| **Daily (weekday)** | Lặp mỗi ngày từ thứ 2 đến thứ 6 |
| **Weekly** | Chọn một hoặc nhiều thứ trong tuần (VD: thứ 2, thứ 4, thứ 6) |
| **Monthly** | Chọn một hoặc nhiều ngày trong tháng (1–31); nếu tháng không có ngày đó thì dùng ngày cuối cùng của tháng (VD: chọn ngày 31, tháng 2 → dùng 28/29) |

**Ngày kết thúc lặp:**

* Bắt buộc nhập khi bật lặp lịch
* Tối đa 6 tháng kể từ ngày tạo — validate và hiển thị thông báo nếu vượt quá

**Hành vi khi lưu:**

* Hệ thống sinh ra các item riêng lẻ cho từng ngày lặp trong khoảng từ `date` đến `recurrence_end_date`
* Các item được liên kết qua `recurrence_group_id` để biết cùng một chuỗi lặp
* Mỗi item instance có thể mark done, xóa độc lập mà không ảnh hưởng instance khác

**Xóa item lặp:**

* Khi xóa một item thuộc chuỗi lặp, hỏi user: **"Xóa chỉ item này"** hay **"Xóa toàn bộ chuỗi lặp"**

### Không yêu cầu

* Drag-and-drop trên calendar grid
* Chỉnh sửa toàn bộ chuỗi lặp sau khi đã tạo (edit chỉ áp dụng cho từng item)

---

## 4.5. Reminder

### Mô tả

Nhắc user theo thời gian đã set. Reminder **chỉ gắn với Timeline item**, không độc lập và không áp dụng cho Bookmark hay Note.

### Cài đặt Reminder trên form

* Khi user bật `Has Reminder = true`, hiện thêm ô nhập **số phút nhắc trước** (`reminder_minutes`)
* `reminder_minutes` là số nguyên dương — ví dụ: nhập `15` = nhắc trước giờ hẹn 15 phút
* `reminder_time` được tính tự động = `datetime(date, time)` − `reminder_minutes`; không cần user nhập trực tiếp

### Trigger Notification

* Frontend chạy một **polling engine mỗi 60 giây** để kiểm tra các item có `has_reminder = true` và `is_reminded = false`
* Nếu thời điểm hiện tại ≥ `reminder_time` → bắn **Web Notification** (browser notification) và đánh dấu `is_reminded = true`
* Cờ `is_reminded` ngăn notification bắn lại khi engine tick lần kế tiếp
* Notification chỉ bắn được nếu user đã **cấp quyền trình duyệt** — xem cấu hình tại §4.7 Notification Settings

### Ngoài phạm vi

* Push notification qua server (server-side push, background worker)

### Optional

* Snooze

---

## 4.6. Random Tool (Ăn gì hôm nay)

### Mô tả

Tool giúp user chọn ngẫu nhiên

### Chức năng:

* Danh sách món chia làm 2 loại:
  * **Món hệ thống (default):** do Admin tạo sẵn, tất cả user đều thấy (Cơm, Bún, Phở, Trà sữa, ...)
  * **Món cá nhân:** user tự tạo thêm, chỉ user đó thấy
* Khi random: dùng chung cả 2 loại (system + cá nhân của user đó)
* Nút “Random”
* Hiển thị kết quả

* Animation nhẹ khi hiển thị kết quả random

---

## 4.7. Notification Settings

### Mô tả

Màn hình cấu hình thông báo của hệ thống, cho phép user kiểm soát cách nhận reminder notification.

* **Trạng thái quyền trình duyệt:** hiển thị rõ trạng thái permission hiện tại (`Chưa cấp quyền` / `Đã cấp quyền` / `Đã từ chối`)
* **Nút cấp quyền:** nếu chưa cấp — hiện nút "Bật thông báo" để trigger browser permission dialog
* Nếu user đã từ chối ở trình duyệt — hiển thị hướng dẫn cách bật lại thủ công trong browser settings
* **Toggle bật/tắt notification:** user có thể tắt notification toàn bộ dù đã cấp quyền (lưu vào DB theo từng user)

**Hành vi liên quan đến §4.5:** polling engine kiểm tra cả `notification_enabled = true` lẫn browser permission trước khi bắn — nếu một trong hai không thỏa thì bỏ qua, không đánh dấu `is_reminded`.

_Không yêu cầu: cấu hình riêng theo từng loại thông báo (hiện chỉ có Reminder)._

---

## 4.8. Notification Inbox

Màn hình xem danh sách tất cả thông báo đã được hệ thống bắn, giúp user không bỏ sót reminder khi không để ý browser notification.

* Danh sách các notification đã bắn, sắp xếp mới nhất lên trên
* Mỗi item hiển thị: tiêu đề timeline item, thời gian reminder đã bắn, trạng thái đã đọc / chưa đọc
* Click vào notification → đánh dấu đã đọc (`is_read = true`) và điều hướng đến timeline item tương ứng
* Có badge đếm số thông báo chưa đọc, hiển thị trên icon/menu dẫn vào Inbox

_Không yêu cầu: xóa từng notification, phân loại theo category._

---

## 4.9. Đặt món (Group Food Order)

### Mô tả

Cho phép một user tạo phiên đặt đồ ăn nhóm. Nguồn menu có thể đến từ một trong hai cách: paste link ShopeeFood/Grab, hoặc chọn quán từ **danh mục quán cố định** do Admin quản lý. Sau khi có menu, host gửi link cho đồng nghiệp vào chọn → tổng hợp đơn và chia bill nếu cần.

### Danh mục quán cố định (Admin quản lý)

* Chỉ **Admin** mới có quyền tạo/sửa/xóa quán và món trong danh mục cố định
* Mỗi quán có: tên quán, ảnh đại diện (optional), trạng thái active/inactive
* Mỗi món thuộc quán có: tên món, ảnh món, giá gốc, giá sau giảm (optional), danh sách option group (giống cấu trúc option của menu fetch từ ShopeeFood/Grab), trạng thái available
* **Ảnh quán và ảnh món lưu trên Supabase Storage**; DB chỉ lưu URL
* Danh mục dùng chung cho mọi user khi tạo phiên đặt món

### Luồng chính

1. User tạo phiên đặt món, chọn **nguồn menu**:
   * **Link ngoài:** paste link ShopeeFood hoặc Grab → hệ thống fetch menu, **loại bỏ món đã disabled** trên nguồn
   * **Quán cố định:** chọn một quán từ danh mục Admin đã tạo → lấy danh sách món `is_available = true` của quán đó
2. Hệ thống sinh **share link** (dạng token) để gửi cho người khác vào chọn
3. Mỗi người truy cập share link → **đăng nhập** → chọn tối đa **3 món**, chọn option (nếu có)
4. Khi phiên đóng (hết countdown hoặc creator bấm đóng), hệ thống tổng hợp đơn

### Tùy chọn khi tạo phiên

| Tùy chọn | Mô tả |
| -------- | ----- |
| **Countdown** | Optional — creator đặt thời hạn chọn món (VD: 15 phút); khi hết giờ phiên tự đóng |
| **Chế độ thanh toán** | `orderer_pays`: người tạo trả hết; `split`: mỗi người tự trả phần của mình |
| **Tiền ship** | Nhập tay (số nguyên ≥ 0), áp dụng khi tổng hợp bill |
| **Giảm giá** | Nhập tay (số nguyên ≥ 0), trừ vào tổng trước khi chia |

### Hiển thị menu

Mỗi món hiển thị: hình ảnh, tên món, giá gốc, giá sau giảm, danh sách option (nếu có) để người dùng chọn. Mỗi người chỉ được chọn tối đa **3 món** trong một phiên.

### Tổng hợp & chia bill

* Nếu `orderer_pays`: hiển thị toàn bộ đơn + tổng tiền (bao gồm ship, trừ giảm giá)
* Nếu `split`:
  * Gọi **API bên thứ 3** để chia bill (endpoint cấu hình qua env var `BILL_SPLIT_API_URL`)
  * Payload gửi đi: danh sách người mua + số tiền từng món của họ (ship fee, discount gửi kèm để API tự tính)
  * Hiển thị kết quả chia bill cho creator

### Trạng thái phiên

| Trạng thái | Mô tả |
| ---------- | ----- |
| `open` | Đang nhận chọn món |
| `closed` | Đã đóng (hết countdown hoặc creator đóng tay) |

### Lịch sử đơn

Creator có thể xem lại các phiên đã tạo (danh sách theo thời gian, mới nhất lên trên). Mỗi phiên hiển thị: tên quán, ngày tạo, trạng thái, tổng tiền. Click vào để xem chi tiết đơn.

### Không yêu cầu (Đặt món)

* Tích hợp thanh toán thực (VNPay, Momo…)
* Sync real-time trạng thái chọn của từng người (polling thủ công là đủ)

---

## 5. Non-functional Requirements

### 5.1. Performance

* Load trang < 2s
* Thao tác phản hồi gần như tức thì

### 5.2. Usability

* Ít bước thao tác
* Không cần training

### 5.3. UI/UX

* Style: nhẹ nhàng, pastel
* Bo góc, card layout

### 5.4. Security

* Login nội bộ: Admin tạo sẵn tài khoản (username/email + password) cho từng nhân sự, không có self-register
* Dữ liệu user tách biệt (mỗi user chỉ thấy dữ liệu của mình)

---

## 6. Data Model (Simple)

### User

* id
* name
* email
* notification_enabled (boolean, default `true`)

### Bookmark

* id
* user_id
* title
* url
* is_pinned
* sort_order (integer, dùng chung để sắp xếp cả trang Bookmark lẫn pinned trên Dashboard)
* icon_url (nullable — URL SVG từ Iconify, ví dụ: `https://api.iconify.design/lucide/star.svg`)
* color (nullable — mã hex, ví dụ: `#4A90E2`)

### Note

* id
* user_id
* title (nullable)
* content
* sort_order (integer)
* created_at, created_by, updated_at, updated_by (VegaBase audit fields)

### Timeline

* id
* user_id
* title
* date (ngày áp dụng, dạng date)
* time (giờ trong ngày, optional)
* is_done
* color (nullable — mã hex)
* has_reminder (boolean, default `false`)
* reminder_minutes (nullable integer — số phút nhắc trước giờ hẹn, chỉ có giá trị khi `has_reminder = true`)
* reminder_time (nullable datetime — tính tự động = `datetime(date, time)` − `reminder_minutes`)
* is_reminded (boolean, default `false` — đánh dấu đã bắn popup, ngăn trigger lặp lại)
* recurrence_group_id (nullable UUID — các instance cùng chuỗi lặp có chung giá trị này)
* recurrence_days (nullable JSON — ngày lặp: với weekly là mảng số thứ [1–7], với monthly là mảng ngày [1–31])
* recurrence_end_date (nullable date — ngày kết thúc chuỗi lặp, tối đa 6 tháng từ `date`)
* created_at, created_by, updated_at, updated_by (VegaBase audit fields)

### RandomItem

* id
* user_id (null = món hệ thống do Admin tạo; có giá trị = món cá nhân của user)
* name
* created_at, created_by, updated_at, updated_by (VegaBase audit fields)

### Restaurant (quán cố định, Admin tạo)

* id
* name
* image_url (nullable — ảnh đại diện, lưu trên Supabase Storage)
* is_active (boolean, default `true` — quán inactive sẽ không xuất hiện khi host chọn nguồn)
* created_at, created_by, updated_at, updated_by (VegaBase audit fields)

### RestaurantMenuItem (món thuộc quán cố định)

* id
* restaurant_id (FK → Restaurant)
* name
* image_url (nullable — lưu trên Supabase Storage)
* original_price (integer)
* discounted_price (nullable integer)
* options (JSON — cùng cấu trúc với `FoodMenuItem.options`)
* is_available (boolean, default `true`)
* created_at, created_by, updated_at, updated_by (VegaBase audit fields)

### FoodOrder

* id
* creator_id (FK → User)
* source_type (`external_link` / `restaurant`)
* source_url (nullable — link ShopeeFood / Grab; chỉ có khi `source_type = external_link`)
* restaurant_id (nullable FK → Restaurant; chỉ có khi `source_type = restaurant`)
* status (`open` / `closed`)
* countdown_end (nullable datetime — null = không giới hạn thời gian)
* payment_mode (`orderer_pays` / `split`)
* shipping_fee (integer, default 0)
* discount (integer, default 0)
* share_token (unique string — dùng để tạo share link)
* created_at, created_by, updated_at, updated_by (VegaBase audit fields)

### FoodMenuItem

* id
* order_id (FK → FoodOrder)
* name
* image_url (nullable)
* original_price (integer)
* discounted_price (nullable integer — null = không có giảm giá)
* options (JSON — danh sách option group và các lựa chọn)
* is_available (boolean — false = đã disable trên nguồn, không hiển thị cho người chọn)

### FoodOrderSelection

* id
* order_id (FK → FoodOrder)
* user_id (FK → User — người chọn, bắt buộc đăng nhập)
* menu_item_id (FK → FoodMenuItem)
* quantity (integer, ≥ 1)
* selected_options (JSON — option đã chọn)
* note (nullable string)
* created_at, updated_at

---

## 7. Future Enhancements

* Quick command (Cmd + K)
* Custom random tool
* AI suggest bookmark/tag
* Daily insights

---

## 8. Success Criteria

* User sử dụng ít nhất 1 lần/ngày
* Thời gian thao tác nhanh hơn dùng tool khác
* User không cần training

---

## 9. Out of Scope

* Thay thế hoàn toàn Notion/Jira
* Feature enterprise phức tạp

---

## 10. Notes

* Ưu tiên simplicity hơn đầy đủ
* Nếu feature làm chậm UX → loại bỏ
