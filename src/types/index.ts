export type WalletType = 'Cash' | 'Bank' | 'E-Wallet' | 'Investment';
export type TransactionType = 'Income' | 'Expense' | 'Transfer';
export type CategoryType = 'Income' | 'Expense';
export type DebtType = 'Debt' | 'Receivable';
export type DebtStatus = 'Unpaid' | 'Paid';

export type DebtLoanType = 'Debt' | 'Loan';
export type DebtLoanStatus = 'Active' | 'Partial' | 'Solved';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  accountNumber?: string;
  color?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: CategoryType;
  isDefault: boolean;
  icon?: string;
  color?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  destWalletId?: string;
  categoryId?: string;
  categoryName?: string; // Explicit category name (e.g. Deposit Invest, Debt, Loan, Debt Payment, Loan Repayment)
  referenceId?: string; // Link ke debt_payment_id atau debt_loan_id jika ada
  type: TransactionType;
  amount: number;
  notes: string;
  transactionDate: string;
  receiptItems?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  month: number;
  year: number;
  limitAmount: number;
  createdAt: string;
}

export type SavingsGoalStatus = 'Active' | 'Completed';

export interface SavingsGoal {
  id: string;
  userId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  status?: SavingsGoalStatus;
  lastWithdrawnAt?: string;
  walletId?: string;
  deadlineDate?: string;
  createdAt: string;
}

export interface GoalTransaction {
  id: string;
  userId: string;
  goalId: string;
  walletId: string;
  transactionId?: string;
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  transactionDate: string;
  createdAt: string;
}

export interface DebtLoan {
  id: string;
  userId: string;
  initialWalletId: string;
  type: DebtLoanType; // 'Debt' (Saya Berutang) | 'Loan' (Saya Meminjamkan Uang)
  personName: string;
  totalAmount: number;
  remainingAmount: number;
  description: string;
  status: DebtLoanStatus; // 'Active' | 'Partial' | 'Solved'
  startDate: string; // ISO date YYYY-MM-DD
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  userId: string;
  debtLoanId: string;
  walletId: string;
  transactionId?: string;
  amountPaid: number;
  paymentDate: string;
  createdAt: string;
}

// Legacy alias for backward compatibility
export interface DebtReceivable {
  id: string;
  userId: string;
  type: DebtType;
  personName: string;
  amount: number;
  status: DebtStatus;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface ReceiptItem {
  itemName: string;
  qty?: number;
  unitPrice?: number;
  totalPrice: number;
}

export interface FinancialAdvice {
  healthScore: number;
  healthStatus: string;
  executiveSummary: string;
  insights: string[];
  recommendations: string[];
  savingsAdvice: string;
}

export type BillCycle = 'Monthly' | 'Yearly';

export interface Bill {
  id: string;
  userId: string;
  name: string;
  description?: string;
  expectedAmount: number;
  cycle: BillCycle;
  lastPaidPeriod?: string; // e.g. "2026-11" for Monthly, "2026" for Yearly
  createdAt: string;
}
