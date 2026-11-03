# Product Requirements Document (PRD)

**Project Name:** SmartFinance Web Application  
**Platform:** Web Application (Desktop-Optimized, Mobile-Responsive)  
**Status:** Updated (Reporting & Export Module Added)  
**Target Audience:** Personal Use / Portfolio Project  

---

## 1. Executive Summary
SmartFinance is an intelligent personal finance web application designed for seamless tracking of cash flows, debts/loans, dynamic budgeting, dedicated savings/investment goals, and recurring bills. Powered by **Google AI Studio (Gemini API)** for NLP and OCR, the platform integrates **Firebase Authentication** and **Firestore** for real-time synchronization. The platform focuses on a minimalist, elegant, and professional user experience.

---

## 2. Tech Stack & Architecture
| Component | Technology | Primary Function |
| :--- | :--- | :--- |
| **Authentication** | Firebase Authentication | Google Single Sign-On (SSO). |
| **Database** | Firebase Firestore | Real-time NoSQL data storage. |
| **AI Engine** | Google AI Studio (Gemini API)| NLP transaction extraction and OCR processing. |
| **Frontend** | React / Vue | Desktop-first responsive UI built adhering to `DESIGN.md`. |

---

## 3. Functional Requirements

### 3.1. Authentication
* **Google Sign-In:** Exclusive SSO access via Google accounts.
* **Session Management:** Secure token-based session persistence.

### 3.2. AI Integration (Google AI Studio)
* **Natural Language Input:** Parse text entries into structured parameters (Amount, Category, Type, Wallet).
* **Receipt Scanner (OCR):** Image parsing to auto-populate multi-item expenses.

### 3.3. Core Finance & Cash Flow
* **Income & Expense Tracking:** Standard entries linked to wallets and dynamic categories.
* **Inter-Account Transfers:** Transfer funds without altering total net worth.

### 3.4. Debts & Loans Management
* **Record Creation:** Setup with initial wallet impact.
* **Resolution:** Full or partial payments support.
* **System Categories (Locked):** "Debt Payment" (Expense) / "Loan Repayment" (Income).

### 3.5. Savings & Investments Management (Virtual Vaults)
* **Dual-Action Buttons:** Deposit Funds and Withdraw Funds affecting the Vault and linked Wallet.
* **System Categories (Locked):** "Investment Deposit" / "Investment Withdrawal".
* **Progress Reset:** Full withdrawal resets progress to 0% with a *"Last Withdrawn on [Date]"* footer indicator.

### 3.6. Bills Management (Recurring Expenses)
* **User Input:** Bill Name, Expected Amount, Description, Cycle (Monthly/Yearly).
* **Payment Flow:** Manual settlement triggering wallet balance deduction and transaction logging.
* **Category (Locked):** "Recurring Expenses".
* **Auto-Reset Logic:** Paid bills are automatically sorted to the bottom. Cycles reset automatically to "Unpaid" based on the period change.

### 3.7. Wallet & Category Management
* **Multi-Wallet Support:** Cash, Payroll, Personal Savings, E-Wallets.
* **Dynamic Custom Categories:** Full CRUD features for personalized tagging.

---

### 3.8. Reporting & Data Export (New Module)

This feature provides users with the ability to generate professional financial reports in CSV and PDF formats, maintaining an elegant, clean, and minimalist UI layout.

#### A. Filtering Interface
* **Timeframe Filters:** Users can filter the export data using a simplified interface.
  * **Custom Date Range:** Select specific start and end dates.
  * **Monthly Preset:** Automatically sets the range from the first to the last day of the selected month.
  * **Yearly Preset:** Automatically sets the range for the entire selected year.
* **UI/UX Design:** The filter menu must reflect a minimalist and highly professional aesthetic, avoiding visual clutter.

#### B. Export Formatting & Layout (PDF & CSV)
* **PDF Orientation:** Landscape mode for optimal column fit and readability. Word-wrap is enabled for long text in the Description column.
* **Header Information:**
  * Application Name (SmartFinance)
  * Document Title ("Cash Flow & Financial Transaction Report")
  * Account Owner (User's Name)
  * Print Date (Current Date)
  * **Report Period:** `[Start Date] to [End Date]` based on the applied filter.
* **Dynamic Summary Cards:** Positioned below the header. The values (Total Income, Total Expense, Net Cash Flow) are **strictly calculated based on the selected timeframe filter**, not the all-time account balance.
* **Empty Cell Handling:** Any blank or null information across all columns will be represented uniformly by a single dash (`-`).

#### C. Table Data Structure & Sorting
The exported table consists of seven distinct columns for precise tracking:
1. **Date**
2. **Type** (Income, Expense, Transfer)
3. **Category** (e.g., Food/Beverages, Recurring Expenses)
4. **Description / Notes** (Transaction details only)
5. **Source Wallet** (Where funds originated; e.g., Payroll)
6. **Destination Wallet** (Where funds arrived; e.g., Cash)
7. **Amount**

* **Sorting Logic:** Data must be sorted in **Ascending** order based on the transaction date (Chronological order: older transactions at the top of the list, newer transactions at the bottom).

---

## 4. Non-Functional Requirements
* **Design Standards:** Strictly follows `DESIGN.md` for typography, color palette, and component structures.
* **Performance:** Export generation must be handled efficiently, utilizing client-side rendering for PDFs (e.g., `jspdf`, `pdfmake`) to reduce server load.