# Entity-Relationship Diagram (ERD)

**Project:** SmartFinance Web Application  
**Document:** Database Schema & Relationship Specifications (Savings & Investments Updated)

Dokumen ini mendefinisikan struktur NoSQL (Koleksi & Dokumen Firestore) beserta relasi logis antar entitas pada aplikasi SmartFinance.

---

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

    USER {
        string id PK
        string email
        string display_name
        string photo_url
        timestamp created_at
    }

    WALLET {
        string id PK
        string user_id FK
        string name "e.g., BCA Payroll, GoPay, Cash"
        string type "E-Wallet, Bank, Cash"
        number balance "Active liquid balance"
        timestamp created_at
    }

    CATEGORY {
        string id PK
        string user_id FK "Null if system default"
        string name "e.g., Investment Deposit, Investment Withdrawal, Bayar Hutang"
        string type "Income, Expense"
        boolean is_default
    }

    TRANSACTION {
        string id PK
        string user_id FK
        string wallet_id FK
        string dest_wallet_id FK "Used for transfer type"
        string category_id FK
        string reference_id FK "Links to debt_payment_id or goal_transaction_id"
        string type "Income, Expense, Transfer"
        number amount
        string notes
        timestamp transaction_date
        timestamp created_at
    }

    SAVINGS_GOAL {
        string id PK
        string user_id FK
        string goal_name "e.g., Emergency Fund, Mutual Funds"
        number target_amount "Goal target sum"
        number current_amount "Accumulated vault balance"
        string status "Active, Completed"
        timestamp last_withdrawn_at "Timestamp of last withdrawal"
        timestamp created_at
    }

    GOAL_TRANSACTION {
        string id PK
        string goal_id FK
        string wallet_id FK "Source or Destination Wallet"
        string transaction_id FK "Linked core transaction entry"
        string type "Deposit, Withdrawal"
        number amount
        timestamp transaction_date
        timestamp created_at
    }

    DEBT_LOAN {
        string id PK
        string user_id FK
        string initial_wallet_id FK
        string type "Debt, Loan"
        string person_name
        number total_amount
        number remaining_amount
        string description
        string status "Active, Partial, Solved"
        timestamp start_date
        timestamp created_at
    }

    DEBT_PAYMENT {
        string id PK
        string debt_loan_id FK
        string wallet_id FK
        string transaction_id FK
        number amount_paid
        timestamp payment_date
        timestamp created_at
    }
```

---

## 2. Entity Specification & Collection Details

### 2.1. `savings_goals` (Virtual Vault Goals)
Menyimpan data kartu target finansial/investasi pengguna.
* `current_amount`: Menggambarkan total dana yang saat ini tersimpan di dalam *vault*. Nilai ini mempengaruhi total kekayaan (*Total Net Worth*) tanpa perlu disimpan di wallet fisik mana pun.
* `last_withdrawn_at`: Dicatat saat terjadi aktivitas penarikan (*withdrawal*) untuk keperluan display footer pada UI.

### 2.2. `goal_transactions` (Investment Ledger)
Menyimpan riwayat spesifik setiap aktivitas **Deposit** maupun **Withdrawal** dari suatu target investasi.
* Setiap dokumen `goal_transactions` secara otomatis membuat entri pasangan di `transactions` utama dengan kategori terkunci **`Investment Deposit`** atau **`Investment Withdrawal`**.

### 2.3. Data Consistency & Atomic Updates (Firestore Batch Transactions)
Saat user melakukan *Deposit* atau *Withdrawal*:
1. **Deposit:** `wallet.balance` berkurang (-N) $\rightarrow$ `savings_goal.current_amount` bertambah (+N) $\rightarrow$ dokumen `goal_transactions` dicatat $\rightarrow$ entri `transactions` (Type: Expense/Transfer, Category: `Investment Deposit`) dicatat.
2. **Withdrawal:** `savings_goal.current_amount` berkurang (-N) $\rightarrow$ `wallet.balance` bertambah (+N) $\rightarrow$ `savings_goal.last_withdrawn_at` diperbarui $\rightarrow$ entri `transactions` (Type: Income/Transfer, Category: `Investment Withdrawal`) dicatat.