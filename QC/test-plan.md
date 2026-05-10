# Test Plan — Alliance Assistant (MVP)

**Version:** 1.0  
**Date:** 2026-05-01  
**Based on:** BA/requirements.md  

---

## 1. Scope

Bao gồm toàn bộ chức năng MVP:

- Authentication (Login / Logout)
- Home / Dashboard
- Bookmark
- Note
- Timeline (Daily)
- Reminder (in-app popup)
- Random Tool (Ăn gì hôm nay)

Không bao gồm: Calendar phức tạp, Chat, Task management nâng cao, Web Notification API.

---

## 2. Test Environment

| Mục | Giá trị |
|-----|---------|
| Browser | Chrome (latest), Edge (latest) |
| Role test | Admin, User |
| Dữ liệu | Tài khoản do Admin tạo sẵn |

---

## 3. Test Cases

### 3.1. Authentication

| ID | Tên test | Bước thực hiện | Expected result | Priority |
|----|----------|----------------|-----------------|----------|
| AUTH-01 | Login thành công | Nhập đúng username + password → Submit | Chuyển về Dashboard | High |
| AUTH-02 | Login sai password | Nhập sai password → Submit | Hiện thông báo lỗi, không vào app | High |
| AUTH-03 | Login để trống field | Bỏ trống username hoặc password → Submit | Validate lỗi tại field | High |
| AUTH-04 | Logout | Click Logout | Về trang login, session bị xóa | High |
| AUTH-05 | Truy cập URL khi chưa login | Gõ thẳng URL vào app | Redirect về trang login | High |
| AUTH-06 | Không có self-register | Kiểm tra không tồn tại form đăng ký | Không có UI đăng ký | Medium |

---

### 3.2. Home / Dashboard

| ID | Tên test | Bước thực hiện | Expected result | Priority |
|----|----------|----------------|-----------------|----------|
| HOME-01 | Load trang | Đăng nhập → vào Home | Trang load < 2s | High |
| HOME-02 | Greeting hiển thị | Vào Home buổi sáng / chiều / tối | Hiển thị đúng greeting theo giờ | Medium |
| HOME-03 | Timeline hôm nay | Có item trong ngày hôm nay | Danh sách hiển thị đúng items của ngày hiện tại | High |
| HOME-04 | Pinned bookmark | Có bookmark đã pin | Bookmark pinned xuất hiện trên Home | High |
| HOME-05 | Nút Random | Click nút Random nhanh trên Home | Hiện kết quả random | Medium |
| HOME-06 | Không có data | User mới, chưa có data | Trang hiển thị trạng thái rỗng hợp lệ (không lỗi) | Medium |

---

### 3.3. Bookmark

| ID | Tên test | Bước thực hiện | Expected result | Priority |
|----|----------|----------------|-----------------|----------|
| BM-01 | Thêm bookmark hợp lệ | Nhập URL + Title → Lưu | Bookmark xuất hiện trong danh sách dạng grid card | High |
| BM-02 | Thêm bookmark thiếu URL | Bỏ trống URL → Lưu | Validate lỗi tại field URL | High |
| BM-03 | Thêm bookmark thiếu Title | Bỏ trống Title → Lưu | Validate lỗi tại field Title | High |
| BM-04 | URL không hợp lệ | Nhập "abc xyz" → Lưu | Validate lỗi định dạng URL | High |
| BM-05 | Thêm ≤ 2 bước | Đếm số bước thao tác để thêm bookmark | Hoàn thành trong ≤ 2 bước | High |
| BM-06 | Pin bookmark | Click pin trên một bookmark | Bookmark xuất hiện trên Dashboard + icon pin | High |
| BM-07 | Unpin bookmark | Click pin lần 2 | Bookmark không còn trên Dashboard | High |
| BM-08 | Xóa bookmark | Click xóa → Confirm | Bookmark biến khỏi danh sách | High |
| BM-09 | Tách biệt dữ liệu | User A thêm bookmark, đăng nhập User B | User B không thấy bookmark của User A | High |

---

### 3.4. Note

| ID | Tên test | Bước thực hiện | Expected result | Priority |
|----|----------|----------------|-----------------|----------|
| NOTE-01 | Tạo note | Nhập nội dung → Lưu | Note xuất hiện trong danh sách | High |
| NOTE-02 | Tạo note trống | Bỏ trống nội dung → Lưu | Validate lỗi, không lưu | High |
| NOTE-03 | Edit note | Click edit → Sửa nội dung → Lưu | Nội dung cập nhật đúng | High |
| NOTE-04 | Xóa note | Click xóa → Confirm | Note biến khỏi danh sách | High |
| NOTE-05 | Sắp xếp theo thời gian | Tạo nhiều note | Note mới nhất hiển thị trước | Medium |
| NOTE-06 | Tách biệt dữ liệu | User A tạo note, đăng nhập User B | User B không thấy note của User A | High |

---

### 3.5. Timeline (Daily)

| ID | Tên test | Bước thực hiện | Expected result | Priority |
|----|----------|----------------|-----------------|----------|
| TL-01 | Thêm item có time | Nhập Title + Date + Time → Lưu | Item xuất hiện đúng vị trí theo thứ tự thời gian | High |
| TL-02 | Thêm item không có time | Nhập Title + Date, bỏ trống Time → Lưu | Item xuất hiện cuối danh sách (hoặc theo quy tắc đã định) | High |
| TL-03 | Thiếu Title | Bỏ trống Title → Lưu | Validate lỗi | High |
| TL-04 | Thiếu Date | Bỏ trống Date → Lưu | Validate lỗi | High |
| TL-05 | Xem đúng ngày | Chọn ngày X | Chỉ hiển thị items của ngày X | High |
| TL-06 | Mark done | Click checkbox trên item | Item đánh dấu hoàn thành (style thay đổi) | High |
| TL-07 | Unmark done | Click checkbox lần 2 | Item trở về trạng thái chưa xong | Medium |
| TL-08 | Xóa item | Click xóa → Confirm | Item biến khỏi danh sách | High |
| TL-09 | Tách biệt dữ liệu | User A thêm item, đăng nhập User B | User B không thấy items của User A | High |

---

### 3.6. Reminder

| ID | Tên test | Bước thực hiện | Expected result | Priority |
|----|----------|----------------|-----------------|----------|
| REM-01 | Set reminder khi tạo item | Tạo timeline item + set `reminder_time` → Lưu | Reminder được lưu kèm item | High |
| REM-02 | Set reminder khi edit item | Edit item, thêm `reminder_time` → Lưu | Reminder cập nhật | High |
| REM-03 | Popup xuất hiện đúng giờ | Đặt reminder 1-2 phút tới, để tab mở | Popup xuất hiện đúng giờ đã set | High |
| REM-04 | Popup không bắn khi đóng tab | Đặt reminder, đóng tab, đợi qua giờ, mở lại | Không có popup (in-app only) | Medium |
| REM-05 | Xóa reminder | Edit item, bỏ `reminder_time` → Lưu | Reminder không còn kích hoạt | Medium |
| REM-06 | Reminder chỉ thuộc Timeline | Kiểm tra Bookmark và Note không có field reminder | Không có UI set reminder ở Bookmark/Note | Medium |

---

### 3.7. Random Tool

| ID | Tên test | Bước thực hiện | Expected result | Priority |
|----|----------|----------------|-----------------|----------|
| RND-01 | Random với danh sách default | Không thêm món cá nhân → Click Random | Kết quả là một trong các món hệ thống | High |
| RND-02 | Random với món cá nhân | Thêm món cá nhân → Click Random nhiều lần | Kết quả có thể là món hệ thống hoặc món cá nhân | High |
| RND-03 | Thêm món cá nhân | Nhập tên món → Lưu | Món xuất hiện trong danh sách của user | High |
| RND-04 | Xóa món cá nhân | Click xóa món cá nhân | Món không còn trong danh sách, không random ra | High |
| RND-05 | Không xóa được món hệ thống | Kiểm tra UI | User không thấy nút xóa trên món hệ thống | High |
| RND-06 | Animation | Click Random | Có animation nhẹ trước khi hiện kết quả | Low |
| RND-07 | Tách biệt món cá nhân | User A thêm món, đăng nhập User B | User B không thấy món cá nhân của User A | High |

---

### 3.8. Admin — Quản lý User

| ID | Tên test | Bước thực hiện | Expected result | Priority |
|----|----------|----------------|-----------------|----------|
| ADM-01 | Admin tạo user | Đăng nhập Admin → Tạo user mới với password | User mới tồn tại, có thể login | High |
| ADM-02 | Admin tạo user trùng email | Nhập email đã tồn tại → Lưu | Validate lỗi trùng email | High |
| ADM-03 | Admin quản lý món default | Thêm / xóa món hệ thống | Thay đổi phản ánh với tất cả user | High |
| ADM-04 | User không truy cập được trang Admin | Đăng nhập User thường → Gõ URL admin | 403 hoặc redirect | High |

---

## 4. Non-functional Tests

| ID | Mô tả | Tiêu chí pass |
|----|-------|---------------|
| NFT-01 | Performance — load Home | < 2s trên network bình thường |
| NFT-02 | Performance — thao tác CRUD | Phản hồi gần tức thì (< 500ms) |
| NFT-03 | Tách biệt dữ liệu toàn diện | Không có data leak giữa các user |
| NFT-04 | Responsive cơ bản | UI không vỡ trên màn hình 1280px và 1920px |

---

## 5. Out of Scope

- Web Notification API (notify khi tab đóng)
- Weekly / monthly calendar view
- Tag cho Bookmark (optional, chưa build)
- Snooze Reminder (optional, chưa build)
- Self-register tài khoản

---

## 6. Pass / Fail Criteria

**Pass:** Tất cả test case Priority **High** đều pass. Không có bug blocker.  
**Fail:** Bất kỳ test case Priority High nào fail, hoặc có bug ảnh hưởng đến luồng chính của user.
