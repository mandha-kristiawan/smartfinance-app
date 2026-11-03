# Product Requirements Document (PRD)

**Project Name:** SmartFinance Web Application  
**Platform:** Web Application (Desktop-Optimized, Mobile-Responsive)  
**Status:** Updated (Bills & Recurring Expenses Module Added)  
**Target Audience:** Personal Use / Portfolio Project  

---

## 1. Executive Summary

SmartFinance is an intelligent personal finance web application designed for seamless tracking of cash flows, debts/loans, dynamic budgeting, dedicated savings/investment goals, and recurring bills. Powered by **Google AI Studio (Gemini API)** for NLP and OCR, the platform integrates **Firebase Authentication** and **Firestore** for real-time synchronization.

---

## 2. Tech Stack & Architecture

| Component | Technology | Primary Function |
| :--- | :--- | :--- |
| **Authentication** | Firebase Authentication | Google Single Sign-On (SSO). |
| **Database** | Firebase Firestore | Real-time data storage for transactions, goals, debts, bills, and wallets. |
| **AI Engine** | Google AI Studio (Gemini API) | NLP transaction extraction, OCR receipt processing, and financial insights. |
| **Frontend** | React / Vue | Desktop-first responsive UI built adhering to `DESIGN.md`. |

---

## 3. Functional Requirements

### 3.1. Authentication
* **Google Sign-In:** Exclusive SSO access via Google accounts.
* **Session Management:** Secure token-based session persistence.

### 3.2. AI Integration (Google AI Studio)
* **Natural Language Input:** Parse text entries into structured parameters (Amount, Category, Type, Wallet).
* **Receipt Scanner (OCR):** Image parsing to auto-populate multi-item expenses.
* **AI Financial Advisor:** Automated insights based on monthly spending behavior.

### 3.3. Core Finance & Cash Flow
* **Income & Expense Tracking:** Standard entries linked to wallets and dynamic categories.
* **Inter-Account Transfers:** Transfer funds without altering total net worth.

### 3.4. Debts & Loans Management
* **Record Creation:** Setup with initial wallet impact.
* **Resolution:** Full or partial payments support.
* **System Categories (Locked):** "Bayar Hutang" (Expense) / "Terima Piutang" (Income).

### 3.5. Savings & Investments Management (Virtual Vaults)
* **Dual-Action Buttons:** Deposit Funds and Withdraw Funds affecting the Vault and linked Wallet.
* **System Categories (Locked):** "Investment Deposit" / "Investment Withdrawal".
* **Progress Reset:** Full withdrawal resets progress to 0% with a *"Last Withdrawn on [Date]"* footer indicator.

---

### 3.6. Bills Management (Recurring Expenses) — *New Feature Spec*

Fitur ini melacak tagihan pasif atau pengeluaran rutin pengguna tanpa batasan tanggal jatuh tempo (*due date*) yang kaku.

#### A. Creation & Editing Phase
1. **User Input:**
   * **Bill Name:** Nama tagihan (contoh: *Netflix, PLN, Internet*).
   * **Expected Amount:** Nominal ekspektasi tagihan (dapat diedit kapan saja karena nominal bisa fluktuatif).
   * **Description:** Deskripsi singkat.
   * **Billing Cycle:** Pilihan siklus: **Monthly** (Bulanan) atau **Yearly** (Tahunan).
2. **Editing:** Pengguna memiliki hak penuh untuk mengubah nominal atau detail tagihan kapan pun dibutuhkan (contoh: tarif langganan naik).

#### B. Payment Flow (Manual Settlement)
1. **Action:** Pengguna mengeklik tombol **"Pay Bill"** pada kartu tagihan.
2. **Input Prompt:** 
   * **Actual Amount Paid:** Secara *default* terisi dengan *Expected Amount*, namun bisa diedit oleh pengguna saat itu juga jika tagihan riil berbeda.
   * **Source Wallet:** Pemilihan dompet sumber dana.
   * **Payment Date:** Mendukung input *backdate* (mundur) atau sesuai waktu *real-time*.
3. **Transaction History Sync:**
   * Saldo dompet sumber akan berkurang secara otomatis.
   * Transaksi baru tercatat di Riwayat Transaksi Utama.
   * **Category (Locked):** Secara otomatis dikunci sebagai **`Recurring Expenses`**.

#### C. UI/UX Sorting & Auto-Reset Logic
1. **Visual Cues:** Setelah dibayar, kartu tagihan akan mendapat label/badge **"Paid"** (misal: warna hijau atau abu-abu transparan).
2. **Auto-Sorting:** Kartu yang berstatus "Paid" secara otomatis akan tergeser/turun ke urutan paling bawah dalam daftar *Dashboard*, memastikan pengguna selalu melihat tagihan "Unpaid" di urutan teratas.
3. **Auto-Reset (Cycle Trigger):** Ketika pergantian bulan (untuk siklus *Monthly*) atau pergantian tahun (untuk siklus *Yearly*) terjadi, sistem akan secara otomatis mereset label kartu menjadi **"Unpaid"** dan mengembalikannya ke atas daftar untuk dibayar kembali.

---

### 3.7. Wallet & Category Management
* **Multi-Wallet Support:** Multi-dompet (Cash, Payroll, Personal Savings, E-Wallets).
* **Dynamic Custom Categories:** Fitur CRUD penuh untuk kategori personal pengguna di luar kategori sistem yang dikunci.

### 3.8. Dashboard & Analytics
* **Overview Cards:** Total Net Worth, Monthly Expenses, Weekly Expenses.
* **Visual Data:** Line Chart & Pie Chart.
* **Data Export:** CSV & PDF support.

---

## 4. Non-Functional Requirements
* **Design Standards:** Strictly follows `DESIGN.md`.
* **Data Consistency:** Atomic batch operations for Firestore transactions.