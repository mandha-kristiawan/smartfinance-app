# Product Requirements Document (PRD)

**Project Name:** SmartFinance Web Application  
**Platform:** Web Application (Desktop-Optimized, Mobile-Responsive)  
**Status:** Updated (Savings & Investments Module Refined)  
**Target Audience:** Personal Use / Portfolio Project  

---

## 1. Executive Summary

SmartFinance is an intelligent personal finance web application designed for seamless tracking of cash flows, debts/loans, dynamic budgeting, and dedicated savings/investment goals. Powered by **Google AI Studio (Gemini API)** for Natural Language Processing (NLP) and optical character recognition (OCR) for receipts, the platform integrates **Firebase Authentication (Google Sign-In)** and **Firestore** for real-time synchronization.

---

## 2. Tech Stack & Architecture

| Component | Technology | Primary Function |
| :--- | :--- | :--- |
| **Authentication** | Firebase Authentication | Google Single Sign-On (SSO). |
| **Database** | Firebase Firestore / Realtime DB | Real-time data storage for transactions, goals, debts, and wallets. |
| **AI Engine** | Google AI Studio (Gemini API) | NLP transaction extraction, OCR receipt processing, and financial insights. |
| **Frontend** | React / Vue (Modern Web Stack) | Desktop-first responsive UI built adhering to `DESIGN.md`. |

---

## 3. Functional Requirements

### 3.1. Authentication
* **Google Sign-In:** Exclusive SSO access via Google accounts.
* **Session Management:** Secure token-based session persistence handled by Firebase.

### 3.2. AI Integration (Google AI Studio)
* **Natural Language Input:** Parse text entries into structured parameters (Amount, Category, Type, Wallet).
* **Receipt Scanner (OCR):** Image parsing to auto-populate multi-item expenses.
* **AI Financial Advisor:** Automated insights based on monthly spending behavior.

### 3.3. Core Finance & Cash Flow
* **Income & Expense Tracking:** Standard transaction entries linked to wallets and dynamic categories.
* **Inter-Account Transfers:** Transfer funds between wallets without altering total net worth.
* **Currency:** Standardized to Indonesian Rupiah (IDR).

---

### 3.4. Debts & Loans Management
* **Record Creation:** Opsi *Debt* (Borrowing) atau *Loan* (Lending) dengan penentuan wallet awal yang langsung memengaruhi saldo secara *real-time*.
* **Resolution & Partial Payments:** Mendukung pelunasan penuh atau cicilan bertahap.
* **System Categories:** Otomatis mengunci entri ke kategori **"Bayar Hutang"** (Expense) atau **"Terima Piutang"** (Income).
* **Persistent History:** Card tetap ditampilkan dengan indikator *Solved* untuk evaluasi histori.

---

### 3.5. Savings & Investments Management — *New Feature Spec*

Fitur ini berfokus pada pencatatan alokasi dana tabungan atau instrumen investasi secara berkala (seperti Reksa Dana, Emas, Tabungan Impian) dengan konsep **Virtual Vault**.

#### A. Creation Phase (Goal Card Setup)
1. **User Input:**
   * **Goal Name:** Nama target keuangan (contoh: *"Emergency Fund"*, *"Mutual Funds Gold"*).
   * **Target Amount:** Nominal target yang ingin dicapai.
   * **Deadline-Free:** Tanpa pengisian target tanggal/tenggat waktu (*simple & minimal*).
2. **Card Visuals:** Display progress bar persentase, nominal yang sudah terkumpul vs nominal target, serta action buttons.

#### B. Deposit Funds Flow (Investment Allocation)
1. **Action:** User mengeklik tombol **"Deposit Funds"** pada *Goal Card*.
2. **Input Fields:** Nominal Deposit, Source Wallet (misal: *Payroll Bank Account*), dan Tanggal Deposit.
3. **Virtual Vault Accounting Impact:**
   * Saldo *Source Wallet* berkurang sesuai nominal deposit.
   * Nilai terkumpul (*Current Amount*) pada *Goal Card* bertambah.
   * **Total Net Worth (Agregat Saldo Utama):** **TETAP SAMA (Tidak Berkurang)**, karena dana berpindah ke *Virtual Vault* milik pengguna.
4. **Transaction History Sync:**
   * Sistem membuat entri transaksi baru di Riwayat Transaksi Utama.
   * **Category (Locked):** Otomatis diset sebagai **`Investment Deposit`**.

#### C. Withdraw Funds Flow (Disinvestment / Liquidation)
1. **Action:** User mengeklik tombol **"Withdraw Funds"** pada *Goal Card*.
2. **Input Fields:** Nominal Penarikan, Destination Wallet (misal: *BCA Savings*), dan Tanggal Penarikan.
3. **Accounting & Progress Bar Impact:**
   * Saldo *Destination Wallet* bertambah sesuai nominal penarikan.
   * Nilai terkumpul pada *Goal Card* berkurang.
   * **Partial Withdrawal:** Progress bar menyesuaikan ke persentase terbaru.
   * **Full Withdrawal (Penarikan 100%):** Progress bar di-reset ke 0%. Footer kartu menampilkan timestamp info: *"Last Withdrawn on [Date]"*.
4. **Transaction History Sync:**
   * Sistem membuat entri transaksi baru di Riwayat Transaksi Utama.
   * **Category (Locked):** Otomatis diset sebagai **`Investment Withdrawal`**.

#### D. Completion & Deletion Lifecycle
* **Completion State:** Ketika *Current Amount* $\ge$ *Target Amount*, kartu menampilkan badge **"Completed"** namun tetap tampil di dashboard secara *default*.
* **Card Deletion:** User memiliki kontrol penuh untuk menghapus (*delete*) *Goal Card* kapan saja tanpa menghapus histori transaksi deposit/withdrawal yang sudah pernah terjadi.

---

### 3.6. Wallet & Category Management
* **Multi-Wallet Support:** Multi-dompet (Cash, Payroll, Personal Savings, E-Wallets).
* **Dynamic Custom Categories:** Fitur CRUD penuh untuk kategori personal pengguna di luar kategori sistem yang dikunci.

### 3.7. Dashboard & Analytics
* **Overview Cards:** Total Net Worth (termasuk Virtual Vaults), Monthly Expenses, Weekly Expenses.
* **Visual Data:** Line Chart (tren saldo) & Pie Chart (distribusi pengeluaran).
* **Data Export:** CSV & PDF support.

---

## 4. Non-Functional Requirements
* **Design Standards:** Strictly follows `DESIGN.md` (Playfair Display for headers, pill-shaped UI elements, lilac/pink/cyan accents).
* **Data Consistency:** Atomic batch operations for Firestore transactions ensuring wallet updates, goal progress, and ledger history write simultaneously.