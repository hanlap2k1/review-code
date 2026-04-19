# INTERNAL CODING STANDARDS & LINTING RULES

**CHỈ THỊ CHO AI REVIEWER:** Dưới đây là bộ quy tắc bắt buộc. Khi phân tích code, bạn BẮT BUỘC phải đối chiếu từng dòng code với các quy tắc này. Nếu phát hiện vi phạm, hãy trích dẫn dòng code lỗi và yêu cầu sửa lại.

---

## 1. QUY TẮC ĐẶT TÊN (NAMING CONVENTION - STRICT MODE)
Đây là quy tắc quan trọng nhất. Phải kiểm tra khắt khe từng cú pháp khai báo.

### 1.1. Khai báo bằng `let` hoặc `var` hoặc parameter trong function (Biến thông thường)
- **Định dạng bắt buộc:** `lower_snake_case` (toàn bộ chữ thường, cách nhau bằng gạch dưới).
- ✅ **DO (Đúng):** `let user_list = [];`, `let total_count = 0;`
- ❌ **DON'T (Sai):** `let userList = [];`, `let TotalCount = 0;`

### 1.2. Khai báo bằng `function` hoặc method trong class
- **Định dạng bắt buộc:** `camelCase` (chữ cái đầu viết thường, viết hoa chữ cái đầu của từ tiếp theo).
- ✅ **DO (Đúng):** `function getUserInfo() {}`, `async processData() {}`
- ❌ **DON'T (Sai):** `function GetUserInfo() {}`, `function get_user_info() {}`

### 1.3. Khai báo bằng `class`, `interface`, `type`
- **Định dạng bắt buộc:** `PascalCase` (viết hoa chữ cái đầu của tất cả các từ).
- ✅ **DO (Đúng):** `class MessageHandler {}`, `interface ChatUser {}`, `type AppState = {}`
- ❌ **DON'T (Sai):** `class messageHandler {}`, `interface chat_user {}`

### 1.4. Khai báo bằng `const` hoặc `readonly` (Hằng số & Reactive State)
- **Định dạng mặc định:** `UPPER_SNAKE_CASE` (toàn bộ VIẾT HOA, cách nhau bằng gạch dưới).
- **QUY TẮC TUYỆT ĐỐI:** Bất kỳ khai báo nào sử dụng từ khóa `const` hoặc `readonly` ĐỀU BẮT BUỘC phải viết theo `UPPER_SNAKE_CASE`, bất kể giá trị chứa bên trong là gì (string, number, object instance, array, hay kết quả phản hồi từ API).
- **Trường hợp ngoại lệ:**
  - Khai báo biến `const` đi kèm với `ref()`, `computed()` của Vue 3 (quản lý reactive state) thì BẮT BUỘC dùng `lower_snake_case`.
  - Khai báo các Vue composables (như `useRoute`, `useRouter`, `useI18n`, ...) thì BẮT BUỘC dùng tiền tố `$` kết hợp với `lower_snake_case`. (Ví dụ: `const $route = useRoute();`)
  - Khai báo các Store composables (như `useAppStore`, `useUserStore`, ...) thì BẮT BUỘC dùng `camelCase` và KHÔNG có tiền tố `$`. (Ví dụ: `const appStore = useAppStore();`)
  - Khai báo các biến nhận instance từ Dependency Injection (DI) thông qua `container.resolve()` hoặc khởi tạo thực thể class mới (`new ClassName()`) thì có thể dùng một trong hai kiểu: tiền tố `$` kết hợp với `lower_snake_case` (Ví dụ: `const $toast = ...`, `const $main = ...`) **HOẶC** tuân theo quy tắc mặc định `UPPER_SNAKE_CASE` (Ví dụ: `const TOAST_SERVICE = ...`, `const MAIN = ...`).
- ✅ **DO (Đúng):** 
  - `const MAX_RETRY = 3;` (Hằng số)
  - `const USER_SERVICE = new UserService();` (Kiểu 2)
  - `const $user_service = new UserService();` (Kiểu 1)
  - `const form_id = ref('');` (Vue 3 Ref)
  - `const $route = useRoute();` (Vue Composable)
  - `const appStore = useAppStore();` (Vue Store)
  - `const $toast = container.resolve(Toast);` (DI - Kiểu 1)
  - `const $main = new Main();` (Instance - Kiểu 1)
- ❌ **DON'T (Sai):** 
  - `const FORM_ID = ref('');` (Phải dùng snake_case cho ref)
  - `const userService = new UserService();` (Không dùng camelCase cho instance)
  - `const route = useRoute();` (Thiếu dấu $)
  - `const $appStore = useAppStore();` (Store không dùng dấu $)
  - `const app_store = useAppStore();` (Store dùng camelCase)
  - `const main = new Main();` (Nếu dùng viết thường thì phải có tiền tố $)

### 1.5. Quy tắc ngữ nghĩa và viết tắt (Semantic & Abbreviations)
- Tên phải rõ nghĩa. KHÔNG dùng tên chung chung như `data`, `list`, `item`, `temp`.
- **DANH SÁCH VIẾT TẮT CHO PHÉP (Chỉ được dùng 3 từ này, CẤM dùng từ khác):**
  1. `p` (thay cho payload input API). Ví dụ: `let p = req.allParam()`
  2. `e` (thay cho error). Ví dụ: `catch(e) {}`
  3. `r` (thay cho response). Ví dụ: `const r = await api.get();`

---

## 2. COMMENTS & DOCUMENTATION
- **Yêu cầu BẮT BUỘC có Chú Thích:** Mọi khai báo biến (`let`, `var`, `const`), hàm (`function`, method), class, interface, type ĐỀU BẮT BUỘC phải có chú thích ngay phía trên. 
- **Cú pháp:** Không nhất thiết phải tuân thủ đúng định dạng JSDoc (`/** ... */`), có thể dùng comment dòng đơn (`//`) hoặc dòng đôi.
- **Tư duy Review:** Bạn BẮT BUỘC phải kiểm tra và yêu cầu bổ sung chú thích cho mọi khai báo, bất kể nội dung chú thích có vẻ "thừa" (ví dụ: `// Khai báo id người dùng \n let user_id = ...`).
- **Nội dung Comment:** Phải giải thích được "Hàm này/biến này dùng để làm CÁI GÌ (What)" và "TẠI SAO lại cần nó (Why)".
- **Magic Numbers:** Tuyệt đối không để số hoặc chuỗi trần trụi trong logic (vd: `if (status === 2)`). Bắt buộc phải khai báo thành `const` (vd: `const STATUS_ACTIVE = 2;`).

---

## 3. PRINCIPLES & CLEAN CODE
- **Nguyên lý SRP (Single Responsibility):** Một hàm/class chỉ làm MỘT việc. Đánh dấu lỗi (Flag) ngay lập tức các hàm làm từ 2 việc trở lên (ví dụ: vừa validate dữ liệu, vừa gọi database, vừa format response).
- **Tách biệt Logic:** Code giao tiếp ngoại vi (Database, ElasticSearch, Nginx/GCP Config, API) KHÔNG ĐƯỢC viết lẫn vào Core Logic (Business Rules). Phải tách thành các lớp Infrastructure riêng.
- **Độ dài giới hạn:** Đánh dấu cảnh báo nếu một `function` dài vượt quá **60 dòng code**. Yêu cầu refactor tách thành các hàm nhỏ (helper functions).

---

## 4. ERROR HANDLING (XỬ LÝ LỖI)
- **Bắt buộc Try/Catch:** Mọi lệnh gọi ra bên ngoài (External APIs, Database Query, File System read/write) BẮT BUỘC phải được bọc trong khối `try/catch`.
- **Cấm nuốt lỗi (No Empty Catch):** Khối `catch(e)` tuyệt đối không được để trống. Tối thiểu phải có `console.error(e)` hoặc đẩy lỗi vào Error Tracker. 
  - ❌ **Sai:** `catch(e) {}` hoặc `catch(e) { return false; }`
  - ✅ **Đúng:** `catch(e) { console.error('Lỗi kết nối DB:', e); throw e; }`

---

## 5. SECURITY (BẢO MẬT TUYỆT ĐỐI)
- **Hardcode Secrets:** Bắt lỗi NGAY LẬP TỨC nếu mã nguồn chứa chuỗi string giống với: Token, API Keys, Passwords, Database Credentials. Yêu cầu chuyển qua `process.env.VAR_NAME`.
- **Injection Prevention:** Không cho phép nối chuỗi (string concatenation) trực tiếp vào các raw queries (SQL/NoSQL/ElasticSearch). Bắt buộc sử dụng Parameterized Query hoặc ORM/Query Builder.