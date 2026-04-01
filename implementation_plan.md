# Implementation Plan - SENKI Production & BOM Management Desktop App

The goal is to build a Windows desktop application (`.exe`) for managing production, Bill of Materials (BOM), and component inventory, replacing/extending the existing Excel/PowerPoint based process.

## Proposed Architecture

We will use **Electron** as the desktop framework, which combines:
- **Main Process (Node.js)**: Handles system interaction, file I/O (Excel), and connection to a **Centralized Database (PostgreSQL)**.
- **Renderer Process (React.js)**: Handles the UI, state, and user interactions.
- **IPC (Inter-Process Communication)**: Bridges the UI and the backend logic.

## Shared Data Environment

Since the application will be used on **multiple computers**, we will use a **Centralized Database (PostgreSQL)** hosted on a local server in the company network. This ensures all users see real-time, synchronized data.

## Role-Based Access Control (RBAC) & Audit Logs

| Role | Permissions |
| :--- | :--- |
| **Admin** | Full access (BOM, Orders, Inventory, User Management, Audit Logs). |
| **Engineer** | Create/Edit BOM, View all modules. Actions are recorded in the **Audit Log**. |
| **User** | View only (BOM, Orders, Inventory). |

Every change made to the BOM or Inventory will be recorded in an `audit_logs` table, tracking:
- **Who:** The user who made the change.
- **When:** Timestamp of the action.
- **What:** The specific action (Create, Edit, Delete) and the previous/new values.

## Proposed Changes

### [NEW] Project Infrastructure

We will initialize a new Electron + React project.

#### [NEW] `package.json`
- Basic dependencies: `electron`, `react`, `react-dom`, `electron-is-dev`.
- Build dependencies: `electron-builder`, `vite`.
- Data processing: `xlsx`, `exceljs`, `jspdf`, `pg` (PostgreSQL client).

#### [NEW] `main.js` (Electron Main Process)
- Initialize the application window.
- Setup IPC listeners for file operations and Database queries.
- Implement Excel reading logic to parse `Phần mềm Quản lý vật tư - BOM sx.xlsx` style files.

#### [NEW] `src/` (React Frontend)
- **`context/`**: `AuthContext` to manage the logged-in user and their role-based permissions.
- **`components/`**:
    - `ProtectedRoute`: Wraps routes to restrict access based on roles.
    - Reusable UI components (Tables, Buttons, Search bars).
- **`pages/`**:
    - `Dashboard`: Overview of orders and stock.
    - `BOMManagement`: Create/Add BOM from Excel, Search products.
    - `Inventory`: Component stock tracking.
- **`styles/index.css`**: Modern, premium design system with CSS variables.

### [NEW] Data Layer
We will use **PostgreSQL** to persist:
- `users`: Credentials and roles.
- `bom`: Bill of Materials records (sync across all PCs).
- `inventory`: Component levels and history.
- `orders`: Customer/Production orders.
- `audit_logs`: History of all data modifications.

### [NEW] Export Features
The app will include buttons to export current views (BOM, Inventory) to **Excel (.xlsx)** and **PDF** using `exceljs` and `jspdf`.

---

## Verification Plan

### Automated Tests
- **Unit Tests**: Test Excel parsing logic using `vitest`.
- **IPC Tests**: Verify data transfer between Main and Renderer processes.

### Manual Verification
1. **App Launch**: Verify the application opens and displays the main window.
2. **Excel Import**: Use the "Add BOM excel" feature to import data.
3. **Search**: Search for products and verify correct results.
4. **Build Process**: Run `electron-builder --win` to generate the `.exe` installer.
