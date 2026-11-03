# Security Specification for SmartFinance

## Data Invariants
1. A user can only access their own profile, wallets, categories, transactions, budgets, savings goals, and debts/receivables.
2. Default system categories are read-only for authenticated users. User custom categories are fully managed by the creator.
3. Every write requires the `userId` in the document payload to strictly match `request.auth.uid`.
4. Document IDs and string fields are constrained to prevent payload inflation or denial of wallet attacks.
5. Users cannot tamper with other users' financial ledger or wallet balances.

## Evaluated Payloads
- Spoofed userId on create: BLOCKED
- Impersonated read of another user's wallet: BLOCKED
- Modification of default category: BLOCKED
- Unauthenticated access: BLOCKED
