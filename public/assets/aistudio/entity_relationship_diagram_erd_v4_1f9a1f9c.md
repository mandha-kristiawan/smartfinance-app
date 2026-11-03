# Entity-Relationship Diagram (ERD)

**Project:** SmartFinance Web Application

**Document:** Database Schema & Relationship Specifications (Including Bills & Recurring Expenses)

Dokumen ini mendefinisikan struktur NoSQL (Koleksi & Dokumen Firestore) beserta relasi logis antar entitas pada aplikasi SmartFinance.

## 1. Mermaid Visual Diagram

```mermaid
erDiagram
    USER ||--o{ WALLET : "owns"
    USER ||--o{ CATEGORY : "creates"
    USER ||--o{ TRANSACTION : "performs"
    USER ||--o{ BUDGET : "sets"
    USER ||--o{ SAVINGS_GOAL : "manages"
    USER ||--o{ GOAL_TRANSACTION : "executes"
    USER ||--o{ DEBT_LOAN : "records"
    USER ||--o{ BILL : "subscribes to"
    
    WALLET ||--o{ TRANSACTION : "source/destination for"
    WALLET ||--o{ GOAL_TRANSACTION : "funds source/destination"
    WALLET ||--o{ DEBT_LOAN : "initial wallet for"
    WALLET ||--o{ DEBT_PAYMENT : "payment wallet for"
    
    CATEGORY ||--o{ TRANSACTION : "classifies"
    CATEGORY ||--o{ BUDGET : "budgeted in"
    
    SAVINGS_GOAL ||--o{ GOAL_TRANSACTION : "has ledger history"
    GOAL_TRANSACTION ||--|| TRANSACTION : "generates core entry"
    
    DEBT_LOAN ||--o{ DEBT_PAYMENT : "has payment history"
    DEBT_PAYMENT ||--|| TRANSACTION : "generates core entry"
    
    BILL ||--o{ TRANSACTION : "generates via payment"

    USER {
        string id PK
        string email
        string display_name
        timestamp created_at
    }

    WALLET {
        string id PK
        string user_id FK
        string name
        number balance
    }

    CATEGORY {
        string id PK
        string user_id FK
        string name "Includes: Recurring Expenses"
        string type
        boolean is_default
    }

    TRANSACTION {
        string id PK
        string user_id FK
        string wallet_id FK
        string category_id FK
        string reference_id FK "Links to Debt, Goal, or Bill"
        string type "Income, Expense, Transfer"
        number amount
        string notes
        timestamp transaction_date
        timestamp created_at
    }

    BILL {
        string id PK
        string user_id FK
        string name "e.g., Netflix, PLN"
        string description
        number expected_amount "Editable blueprint amount"
        string cycle "Monthly, Yearly"
        string last_paid_period "e.g., '2026-11' or '2026' for UI logic"
        timestamp created_at
    }
```

## 2. Entity Specification & Collection Details

### 2.1. `bills` (Recurring Expenses Blueprint)

Koleksi ini menyimpan "cetak biru" dari tagihan-tagihan rutin milik pengguna.

* `expected_amount`: Menjadi patokan default saat menu pembayaran dibuka, namun tidak mengikat secara kaku (user bisa input nominal berbeda pada saat bayar).
* `last_paid_period`: Ini adalah kunci (*key mechanism*) untuk alur **Auto-Reset**. Alih-alih menjalankan proses *background/cron job* untuk mengubah status, UI akan melakukan pengecekan ini:
  * Jika `cycle == 'Monthly'`, dan `last_paid_period == '2026-11'` (Bulan Ini), maka tampilkan sebagai **"Paid"** dan geser ke bawah.
  * Ketika berganti bulan (menjadi `2026-12`), nilai `last_paid_period` otomatis kadaluarsa di mata UI, sehingga UI menampilkannya sebagai **"Unpaid"** dan menggesernya ke atas kembali.

### 2.2. Pembayaran Tagihan (Bill Payment Execution)

Saat pengguna melakukan "Pay Bill":
1. User input `Actual Amount`, `Wallet`, dan `Date`.
2. `wallet.balance` berkurang (-N).
3. Entri `transactions` baru dicatat: (Type: `Expense`, Category: `Recurring Expenses`, Amount: `Actual Amount`).
4. `bill.last_paid_period` diperbarui nilainya ke periode saat tanggal bayar (contoh: "2026-11"). Seluruh operasi pembaruan ini menggunakan *Atomic Batch* di Firestore.

### 2.3. Koleksi Sebelumnya (Reference)
Struktur untuk entitas *Transactions, Wallets, Categories, Savings Goals, Debts*, dan *Goal Transactions* tidak diubah dari skema sebelumnya, memastikan kompatibilitas penuh.