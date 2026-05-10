# VIBE365 — UI/UX Conventions & System Rules

> **Cập nhật:** 2026-04-11
> **Mục đích:** Quy định chung áp dụng cho toàn hệ thống. Dev và QA dùng file này làm checklist.

---

## 1. Confirmation & Warning Dialogs

### 1.1 Xác nhận trước khi xóa (Delete Confirmation)

- **Áp dụng:** Tất cả thao tác delete trong hệ thống (M04)
- **Behavior:** Hiển thị popup xác nhận trước khi gọi API delete
- **Nội dung popup:**
  - Title: "Confirm Delete"
  - Message: "Are you sure you want to delete "{item name}"? This action cannot be undone."
  - Buttons: **[Cancel]** (secondary) | **[Delete]** (danger/red)
- **Nếu có dependency:** Hiển thị thông báo lỗi E502 — "Cannot delete [Resource] — it is referenced by [Dependent]". Không cho xóa.

### 1.2 Cảnh báo mất dữ liệu chưa lưu (Unsaved Changes Warning)

- **Áp dụng:** Tất cả form có thao tác edit/create (S10, S11, S16, S17, S18, S19, S21, S33, ...)
- **Trigger:** User thay đổi bất kỳ field nào trên form mà chưa nhấn Save, sau đó:
  - Navigate sang route khác (click menu, breadcrumb, back button)
  - Đóng modal/tab
  - Refresh trang (browser beforeunload event)
- **Behavior:** Hiển thị popup cảnh báo
- **Nội dung popup:**
  - Title: "Unsaved Changes"
  - Message: "You have unsaved changes. If you leave this page, your changes will be lost."
  - Buttons: **[Stay]** (primary) | **[Leave]** (secondary/danger)
- **Tracking dirty state:** So sánh form values hiện tại với values ban đầu (initialValues). Nếu khác → dirty = true.

### 1.3 Xác nhận hành động quan trọng (Critical Action Confirmation)

- **Áp dụng:** Các thao tác không thể hoàn tác ngoài delete
  - Reset mật khẩu nhân viên
  - Reset 2FA cho nhân viên
  - Activate/Deactivate VIBE Icon Set (ảnh hưởng toàn hệ thống)
  - Thay đổi ForceToEnable2FA (ảnh hưởng tất cả user)
- **Nội dung popup:**
  - Title: "Confirm Action"
  - Message: Mô tả cụ thể hậu quả (VD: "The employee's current password will be replaced with a new temporary password.")
  - Buttons: **[Cancel]** | **[Confirm]**

---

## 2. Form Behavior

### 2.1 Validation

- **Client-side:** Validate ngay khi user blur khỏi field (onBlur) hoặc khi submit
- **Hiển thị lỗi:** Inline dưới field (text đỏ), field border chuyển đỏ
- **Required fields:** Hiển thị dấu `*` bên cạnh label
- **Server-side error:** Map `details[]` từ API response (E400) vào đúng field tương ứng
- **Scroll to error:** Khi submit form có lỗi, auto-scroll đến field lỗi đầu tiên

### 2.2 Submit Button

- **Khi submit:** Button chuyển sang disabled + hiển thị spinner (tránh double-click)
- **Thành công:** Toast notification (top-right, green, auto-dismiss 3s) + redirect/close
- **Thất bại:** Toast notification (red) + giữ nguyên form để user sửa

### 2.3 Form Reset

- **Sau khi save thành công:** Reset dirty state, cập nhật initialValues = values mới
- **Nút "Cancel":** Nếu form dirty → hiển thị Unsaved Changes Warning (1.2). Nếu clean → đóng/navigate ngay.

---

## 3. Table / List Behavior

### 3.1 Pagination

- **Default page size:** 20 items/page
- **Hiển thị:** "Showing {from}-{to} of {total} {resource}" (VD: "Showing 1-20 of 142 employees")
- **Navigation:** First, Previous, Page numbers, Next, Last
- **Giữ state:** Khi quay lại list từ detail screen → giữ nguyên page + filter đang chọn

### 3.2 Search & Filter

- **Search:** Debounce 300ms, search khi user ngừng gõ (không cần nhấn Enter)
- **Filter:** Apply ngay khi chọn (không cần nút "Lọc")
- **Clear filter:** Nút "Clear Filters" hiện khi có bất kỳ filter nào đang active
- **URL sync:** Filter/search state lưu vào URL query params để share/bookmark được

### 3.3 Sorting

- **Click header column:** Toggle ASC → DESC → no sort
- **Hiển thị:** Icon mũi tên trên column đang sort
- **Default sort:** Theo `OrderNo` ASC, sau đó `Log_CreatedAt` DESC (mới nhất trước)

### 3.4 Empty State

- Xem quy định chi tiết tại REQUIREMENTS.md Section 7.6.2

### 3.5 Row Actions

- **Inline actions:** Icon buttons cuối mỗi row (Edit, Delete, ...)
- **Hover:** Hiện tooltip mô tả action
- **Bulk actions:** Checkbox chọn nhiều row → action bar phía trên table (nếu có)

---

## 4. Toast Notifications

| Loại | Màu | Auto-dismiss | Vị trí |
| -- | -- | -- | -- |
| Success | Green | 3 giây | Top-right |
| Error | Red | 5 giây | Top-right |
| Warning | Yellow/Orange | 5 giây | Top-right |
| Info | Blue | 3 giây | Top-right |

- **Stackable:** Nhiều toast có thể hiện cùng lúc, xếp chồng từ trên xuống
- **Dismissable:** User có thể click X để đóng sớm
- **Không dùng toast cho:** Validation errors (dùng inline), Permission denied (dùng full-page)

---

## 5. Loading States

> Xem quy định chi tiết tại REQUIREMENTS.md Section 7.6.1

- **Skeleton:** Cho list/table/card có cấu trúc cố định
- **Button spinner:** Cho submit buttons
- **Overlay:** Cho tiến trình chặn (import Excel, bulk operations)
- **Minimum display time:** Skeleton/spinner hiện tối thiểu 300ms để tránh flash

---

## 6. Date, Time & Number Format

### 6.1 Date

| Context | Format | Ví dụ |
|---------|--------|-------|
| Hiển thị trên UI | `DD/MM/YYYY` | 11/04/2026 |
| Date picker | `DD/MM/YYYY` | 11/04/2026 |
| API request/response | `YYYY-MM-DD` (ISO 8601) | 2026-04-11 |
| Datetime hiển thị | `DD/MM/YYYY HH:mm` | 11/04/2026 08:30 |
| Datetime API | `YYYY-MM-DDTHH:mm:ssZ` (ISO 8601) | 2026-04-11T08:30:00Z |

### 6.2 Time

| Context | Format | Ví dụ |
|---------|--------|-------|
| Hiển thị giờ làm | `HH:mm` (24h) | 08:30, 17:00 |
| Duration (thời lượng) | `HH:mm:ss` | 08:30:15 |
| Duration ngắn (< 1 giờ) | `mm:ss` hoặc `X mins` | 42:15 hoặc "42 mins" |

### 6.3 Number

- **Separator:** Dùng dấu phẩy cho hàng nghìn (1,234,567)
- **Decimal:** Dấu chấm (1,234.56)
- **Percentage:** 1 chữ số thập phân (85.5%)
- **Currency:** Theo locale (nếu cần sau này)

### 6.4 Timezone

- **Hiển thị:** IANA format (Asia/Manila, Australia/Sydney)
- **Giờ hiển thị:** Luôn theo timezone của Staff đang xem (Staff.Timezone)
- **API:** Trả về TIMESTAMPTZ (UTC), frontend convert sang local timezone

---

## 7. Responsive & Accessibility

### 7.1 Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, hamburger menu |
| Tablet | 768px – 1024px | Sidebar collapsed, 2 columns |
| Desktop | > 1024px | Full sidebar, multi-column |

### 7.2 Accessibility

- **Keyboard navigation:** Tất cả interactive elements phải focus được bằng Tab
- **Focus indicator:** Visible focus ring (outline) trên tất cả focusable elements
- **Alt text:** Tất cả images phải có alt text
- **Color contrast:** Minimum ratio 4.5:1 (WCAG AA)
- **Screen reader:** Form labels gắn đúng với input (htmlFor/id)
- **Cursor pointer:** Tất cả button và link phải hiển thị `cursor: pointer` (biểu tượng bàn tay) khi hover — không dùng cursor mặc định trên interactive elements

---

## 8. File Upload

- **Allowed formats:** .xlsx (Excel import), .jpg/.jpeg/.png (avatar, max 2MB)
- **Drag & drop:** Hỗ trợ kéo thả file vào vùng upload
- **Preview:** Hiển thị preview ảnh trước khi upload (avatar)
- **Progress:** Hiển thị progress bar khi upload file lớn
- **Error:** Nếu file sai format/quá size → hiển thị inline error, không gọi API

---

## 9. Session & Security

### 9.1 Session Timeout

- **Access token TTL:** 15 phút (configurable)
- **Refresh token TTL:** 7 ngày (configurable)
- **Auto refresh:** Frontend tự gọi `/api/auth/refresh` trước khi access token hết hạn
- **Session expired:** Redirect về `/login` + toast "Session expired. Please log in again." (E004)

### 9.2 Concurrent Sessions

- **Cho phép:** Nhiều thiết bị/trình duyệt đăng nhập cùng lúc
- **Trạng thái chia sẻ:** Tất cả session của cùng 1 user chia sẻ chung 1 trạng thái chấm công — thay đổi trạng thái ở thiết bị nào thì tất cả thiết bị còn lại phản ánh ngay
- **Login thêm:** Tạo `TimeTracking` row mới với `IsSuperseded = true` (audit); thiết bị mới nhận trạng thái hiện tại của nhân viên
- **Logout:** Revoke **toàn bộ** token của user (không chỉ token hiện tại) → tất cả thiết bị còn lại nhận `401` ở request tiếp theo và bị redirect về `/login` (không qua M07)
- Chi tiết quy tắc: xem REQUIREMENTS.md §4.1b

### 9.3 API Security

- **Authentication:** Mọi API (trừ auth endpoints) yêu cầu valid access token
- **Authorization:** Backend kiểm tra role + scope trước khi trả data
- **Rate limiting:** Áp dụng cho login (5 lần/phút), OTP (3 lần/ngày), API chung (100 req/phút)
- **CORS:** Chỉ cho phép domain frontend (whitelist)
- **Input sanitization:** Server-side sanitize tất cả input (XSS, SQL injection)

---

## 10. Naming Conventions (UI Text)

### 10.1 Button Labels

| Action | Label | Style |
|--------|-------|-------|
| Create | "Add New" hoặc "+ Add" | Primary (blue) |
| Save | "Save" | Primary (blue) |
| Cancel | "Cancel" | Secondary (outline) |
| Delete | "Delete" | Danger (red) |
| Edit | "Edit" | Secondary |
| Search | Icon 🔍 (không cần text) | — |
| Export | "Export Excel" hoặc "↓ Export" | Secondary |
| Import | "↑ Import" | Secondary |
| Back | "← Back" | Link style |
| Submit | "Submit" | Primary (blue) |
| Confirm | "Confirm" | Primary (blue) |
| Reset | "Reset" | Secondary |
| Send | "Send" | Primary (blue) |
| Resend | "Resend" | Secondary |

### 10.2 Messages

| Loại | Pattern | Ví dụ |
|------|---------|-------|
| Success create | "{Resource} has been created successfully" | "Employee has been created successfully" |
| Success update | "{Resource} has been updated" | "Information has been updated" |
| Success delete | "{Resource} has been deleted" | "Employee has been deleted" |
| Confirm delete | "Are you sure you want to delete **{name}**?" | "Are you sure you want to delete **Mark Lee**?" |
| No results | "No results found" | — |
| Empty state | "No {resource} yet" | "No employees yet" |
| Empty state + CTA | "No {resource} yet. Click **Add New** to get started." | "No employees yet. Click **Add New** to get started." |
| Loading error | "Something went wrong. Please try again." | — |
| Permission denied | "You do not have permission to access this page." | — |

---

## 11. Field Display & Input Rules

### 11.1 Field Labels

- **Label phải là ngôn ngữ tự nhiên**, dễ hiểu cho người dùng cuối — không dùng tên biến/key JSON (VD: "First Name" thay vì `firstName`, "Start Time" thay vì `shiftStartTime`).
- Label không chứa dấu gạch dưới, camelCase, hay bất kỳ ký hiệu lập trình nào.

### 11.2 Các Field Dạng JSON

- **Không được để field text có giá trị là JSON** (VD: textarea hiển thị `{"key": "value"}`).
- JSON phải được phân rã thành UI tương ứng để user thao tác trực tiếp:
  - Object đơn giản → form fields riêng lẻ
  - Array of objects → repeatable row / dynamic list (thêm/xóa dòng)
  - Key-value pairs → two-column input (key | value) với nút Add/Remove
- Nếu cấu trúc JSON phức tạp và thay đổi theo ngữ cảnh → dùng form builder hoặc wizard, không raw JSON.

### 11.3 Các Field Dạng HTML

- **Field có nội dung HTML** (VD: Email template body, notification content) phải dùng **rich text / HTML editor** — không dùng plain textarea.
- Editor phải có: thanh toolbar cơ bản (bold, italic, link, image, v.v.) + tab **Preview** để xem kết quả render.
- Nếu template có merge tags (VD: `{{UserDisplayName}}`): hiển thị danh sách merge tags có thể click-to-insert bên cạnh editor.
- API nhận/trả HTML string — frontend chịu trách nhiệm sanitize trước khi render preview (tránh XSS).

### 11.4 Date Range Picker (From – To)

- **Click vào 1 ngày duy nhất** → tự động set `from = to = ngày đó` (không bắt user click 2 lần vào cùng 1 ngày).
- Sau khi chọn ngày đầu, nếu user click ngày khác (ngày sau) → set `from = ngày đầu`, `to = ngày sau` (range bình thường).
- Nếu user click ngày trước ngày `from` đang chọn → swap: ngày mới làm `from`, ngày cũ làm `to`.
- **Clear button** luôn hiển thị khi đang có giá trị — reset cả `from` và `to` về null cùng lúc.
- Placeholder: "DD/MM/YYYY – DD/MM/YYYY"; hiển thị 2 tháng liên tiếp trong popup picker.

---

## 12. Soft Delete Convention

- **Tất cả delete trong hệ thống là soft delete** (set `IsDeleted = true`)
- **Query mặc định:** Luôn filter `WHERE IsDeleted = false` (trừ khi admin xem audit log)
- **Unique constraints:** Cần tính cả `IsDeleted` vào unique check (VD: Email unique chỉ trong các record active)
- **Cascade:** Khi soft delete parent, KHÔNG tự động delete children. Kiểm tra dependency trước → báo lỗi E502 nếu có.
