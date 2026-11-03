# Entity-Relationship Diagram (ERD)

**Project:** SmartFinance Web Application  
**Document:** Database Schema & Relationship Specifications

This document defines the NoSQL structure (Firestore Collections & Documents) and logical relationships, heavily updated to support the Reporting & Export module (specifically distinguishing Source and Destination wallets).

## 1. Mermaid Visual Diagram

```mermaid
erDiagram
    USER ||--o{ WALLET : "owns"
    USER ||--o{ CATEGORY : "creates"
    USER ||--o{ TRANSACTION : "performs"
    USER ||--o{ BUDGET : "sets"
    USER ||--o{ SAVINGS_GOAL : "manages"
    USER ||--o{ DEBT_LOAN : "records"
    USER ||--o{ BILL : "subscribes to"
    
    WALLET ||--o{ TRANSACTION : "source for"
    WALLET ||--o{ TRANSACTION : "destination for"
    
    CATEGORY ||--o{ TRANSACTION : "classifies"
    CATEGORY ||--o{ BUDGET : "budgeted in"
    
    SAVINGS_GOAL ||--o{ TRANSACTION : "generates core entry"
    DEBT_LOAN ||--o{ TRANSACTION : "generates core entry"
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
        string name 
        string type
        boolean is_default
    }

    TRANSACTION {
        string id PK
        string user_id FK
        string source_wallet_id FK "Nullable (Uses '-' in export if null)"
        string destination_wallet_id FK "Nullable (Uses '-' in export if null)"
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
        string name 
        string description
        number expected_amount 
        string cycle "Monthly, Yearly"
        string last_paid_period 
        timestamp created_at
    }
    
    SAVINGS_GOAL {
        string id PK
        string user_id FK
        string name
        number target_amount
        number current_amount
        timestamp created_at
        timestamp last_withdrawn_at
    }
    
    DEBT_LOAN {
        string id PK
        string user_id FK
        string person_name
        string type "Debt, Loan"
        number total_amount
        number remaining_amount
        string description
        timestamp created_at
    }
```

## 2. Export Feature Implementation Notes

### 2.1. Transaction Schema Update (`source_wallet_id` & `destination_wallet_id`)
To accommodate the new Export requirement, the `TRANSACTION` entity replaces a single `wallet_id` with two distinct fields:
* **Expense:** `source_wallet_id` is populated. `destination_wallet_id` is `null`.
* **Income:** `source_wallet_id` is `null`. `destination_wallet_id` is populated.
* **Transfer (or Loan/Debt resolutions involving movement):** Both `source_wallet_id` and `destination_wallet_id` are populated.
* **Export Logic:** If a query returns `null` for either field, the export script will automatically replace the frontend output with a dash (`-`).

### 2.2. Querying for Exports
When a user requests an export, the application will perform a Firestore query against the `TRANSACTION` collection:
1.  **Filter:** `where("transaction_date", ">=", startDate)` and `where("transaction_date", "<=", endDate)`
2.  **Order:** `orderBy("transaction_date", "asc")` (To ensure chronological ascending order).
3.  **Aggregation:** The application will calculate the sum of Income and Expenses strictly from the queried document payload to generate the Dynamic Summary Cards in the PDF header.