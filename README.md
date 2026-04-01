# SENKI - Quản Lý Sản Xuất & BOM

Hệ thống quản lý Định mức vật tư (BOM), Kho linh kiện và Đơn đặt hàng chuyên dụng cho SENKI. Được xây dựng trên nền tảng Desktop hiện đại, hỗ trợ nhiều người dùng trên cùng một mạng nội bộ.

## 🚀 Tính Năng Chính

- **Quản lý Định mức Vật tư (BOM):**
    - Import danh mục sản phẩm và linh kiện trực tiếp từ file Excel.
    - Duyệt cây định mức chi tiết cho từng dòng máy (Geyser, Fujiion...).
    - Tìm kiếm nhanh theo Tên hoặc Mã sản phẩm.
- **Quản lý Kho Linh kiện:**
    - Theo dõi số lượng tồn kho theo thời gian thực.
    - Tự động trừ kho khi xác nhận đơn hàng sản xuất.
    - Cảnh báo khi linh kiện sắp hết (Low Stock).
- **Phân quyền & Bảo mật (RBAC):**
    - **Admin:** Toàn quyền hệ thống và quản lý tài khoản.
    - **Engineer:** Tạo/Sửa BOM, xem toàn bộ dữ liệu.
    - **User:** Chỉ có quyền xem (Read-only).
- **Nhật ký Hệ thống (Audit Log):** 
    - Ghi lại chi tiết mọi thay đổi (Ai, Khi nào, Nội dung gì).
- **Xuất Báo cáo:** 
    - Hỗ trợ xuất dữ liệu ra Excel (.xlsx) và PDF.

## 🛠 Công Nghệ Sử Dụng

- **Frontend:** React.js + Vite (Tailwind CSS/Premium UI).
- **Backend/Desktop:** Electron (Node.js).
- **Database:** PostgreSQL (Cơ sở dữ liệu tập trung cho LAN).
- **Build Tool:** Electron Builder (Packaging Windows .exe).

## 📥 Cài Đặt (Cho Nhà Phát Triển)

1.  **Clone dự án:**
    ```bash
    git clone https://github.com/Khachuy911/senki.git
    cd senki
    ```
2.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```
3.  **Cấu hình Database:**
    - Cài đặt PostgreSQL Server trên máy chủ LAN.
    - Tạo database và cập nhật chuỗi kết nối trong file `.env`.
4.  **Chạy ở chế độ Development:**
    ```bash
    npm run dev
    ```
5.  **Build ứng dụng (.exe):**
    ```bash
    npm run build
    ```

---
© 2026 SENKI Management System. All rights reserved.
