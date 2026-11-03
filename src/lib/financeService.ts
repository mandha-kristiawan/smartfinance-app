import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Wallet,
  Category,
  Transaction,
  Budget,
  SavingsGoal,
  GoalTransaction,
  DebtReceivable,
  DebtLoan,
  DebtPayment,
  UserProfile,
  Bill,
} from '../types';

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'userId'>[] = [
  { name: 'Food & Beverages', type: 'Expense', isDefault: true, icon: 'Utensils', color: '#FBC6F2' },
  { name: 'Transportation', type: 'Expense', isDefault: true, icon: 'Car', color: '#24D0FE' },
  { name: 'Shopping & Groceries', type: 'Expense', isDefault: true, icon: 'ShoppingBag', color: '#BABDFF' },
  { name: 'Bills & Utilities', type: 'Expense', isDefault: true, icon: 'Zap', color: '#EAFF00' },
  { name: 'Entertainment & Lifestyle', type: 'Expense', isDefault: true, icon: 'Film', color: '#F472B6' },
  { name: 'Health & Medical', type: 'Expense', isDefault: true, icon: 'HeartPulse', color: '#34D399' },
  { name: 'Education & Books', type: 'Expense', isDefault: true, icon: 'GraduationCap', color: '#818CF8' },
  { name: 'Salary / Payroll', type: 'Income', isDefault: true, icon: 'Briefcase', color: '#10B981' },
  { name: 'Business & Freelance', type: 'Income', isDefault: true, icon: 'TrendingUp', color: '#24D0FE' },
  { name: 'Bonus & Dividends', type: 'Income', isDefault: true, icon: 'Award', color: '#BABDFF' },
  { name: 'Deposit Invest', type: 'Expense', isDefault: true, icon: 'PiggyBank', color: '#24D0FE' },
  { name: 'Withdraw Invest', type: 'Income', isDefault: true, icon: 'Coins', color: '#10B981' },
  { name: 'Loan', type: 'Expense', isDefault: true, icon: 'ArrowUpRight', color: '#6366F1' },
  { name: 'Debt', type: 'Income', isDefault: true, icon: 'ArrowDownLeft', color: '#F59E0B' },
  { name: 'Debt Payment', type: 'Expense', isDefault: true, icon: 'ArrowDownLeft', color: '#F43F5E' },
  { name: 'Loan Repayment', type: 'Income', isDefault: true, icon: 'ArrowUpRight', color: '#10B981' },
  { name: 'Recurring Expenses', type: 'Expense', isDefault: true, icon: 'FileText', color: '#8B5CF6' },
  { name: 'Other / General', type: 'Expense', isDefault: true, icon: 'MoreHorizontal', color: '#94A3B8' },
];

// Helper to strip undefined values because Firestore rejects undefined fields
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

// User profile setup
export async function syncUserProfile(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }) {
  const userPath = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const data: UserProfile = {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'SmartFinance User',
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString(),
    };
    await setDoc(userRef, cleanFirestoreData(data), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

// Ensure default categories and starter wallets exist
export async function seedInitialUserData(userId: string) {
  const walletsPath = 'wallets';
  try {
    const walletsQ = query(collection(db, 'wallets'), where('userId', '==', userId));
    const walletSnap = await getDocs(walletsQ);

    if (walletSnap.empty) {
      // Create initial starter wallets
      const starterWallets: Omit<Wallet, 'id'>[] = [
        {
          userId,
          name: 'Tabungan BCA (Payroll)',
          type: 'Bank',
          balance: 7500000,
          accountNumber: '•••• 4821',
          color: '#BABDFF',
          createdAt: new Date().toISOString(),
        },
        {
          userId,
          name: 'GoPay',
          type: 'E-Wallet',
          balance: 450000,
          accountNumber: '0812••••991',
          color: '#24D0FE',
          createdAt: new Date().toISOString(),
        },
        {
          userId,
          name: 'Uang Tunai (Cash)',
          type: 'Cash',
          balance: 300000,
          color: '#EAFF00',
          createdAt: new Date().toISOString(),
        },
      ];

      for (const w of starterWallets) {
        await addDoc(collection(db, 'wallets'), w);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, walletsPath);
  }

  // Categories seed check & ensure essential system categories exist
  const catPath = 'categories';
  try {
    const catQ = query(collection(db, 'categories'), where('userId', '==', userId));
    const catSnap = await getDocs(catQ);
    const existingCatNames = new Set(
      catSnap.docs.map((d) => (d.data().name || '').trim().toLowerCase())
    );

    for (const cat of DEFAULT_CATEGORIES) {
      if (!existingCatNames.has(cat.name.toLowerCase())) {
        await addDoc(collection(db, 'categories'), {
          ...cat,
          userId,
          isDefault: true,
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, catPath);
  }
}

// Realtime subscriptions
export function subscribeWallets(userId: string, onUpdate: (wallets: Wallet[]) => void) {
  const path = 'wallets';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Wallet[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Wallet, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeCategories(userId: string, onUpdate: (categories: Category[]) => void) {
  const path = 'categories';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Category[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Category, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeTransactions(userId: string, onUpdate: (txs: Transaction[]) => void) {
  const path = 'transactions';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Transaction, 'id'>),
      }));
      // Sort descending by transactionDate
      items.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeBudgets(userId: string, onUpdate: (budgets: Budget[]) => void) {
  const path = 'budgets';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Budget[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Budget, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeSavingsGoals(userId: string, onUpdate: (goals: SavingsGoal[]) => void) {
  const path = 'savings_goals';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavingsGoal[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SavingsGoal, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeDebts(userId: string, onUpdate: (debts: DebtReceivable[]) => void) {
  const path = 'debts_receivables';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: DebtReceivable[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DebtReceivable, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeDebtLoans(userId: string, onUpdate: (debtLoans: DebtLoan[]) => void) {
  const path = 'debt_loans';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: DebtLoan[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DebtLoan, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeDebtPayments(userId: string, onUpdate: (payments: DebtPayment[]) => void) {
  const path = 'debt_payments';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: DebtPayment[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DebtPayment, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Transaction operations with automatic atomic wallet balance updates
export async function createTransactionWithBalance(
  txData: Omit<Transaction, 'id' | 'createdAt'>
) {
  const path = 'transactions';
  try {
    await runTransaction(db, async (txn) => {
      const sourceWalletRef = doc(db, 'wallets', txData.walletId);
      const sourceSnap = await txn.get(sourceWalletRef);
      if (!sourceSnap.exists()) {
        throw new Error('Dompet sumber tidak ditemukan.');
      }
      const sourceBalance = Number(sourceSnap.data().balance) || 0;

      if (txData.type === 'Expense') {
        txn.update(sourceWalletRef, {
          balance: sourceBalance - txData.amount,
        });
      } else if (txData.type === 'Income') {
        txn.update(sourceWalletRef, {
          balance: sourceBalance + txData.amount,
        });
      } else if (txData.type === 'Transfer') {
        if (!txData.destWalletId) {
          throw new Error('Dompet tujuan harus dipilih untuk transfer.');
        }
        const destWalletRef = doc(db, 'wallets', txData.destWalletId);
        const destSnap = await txn.get(destWalletRef);
        if (!destSnap.exists()) {
          throw new Error('Dompet tujuan tidak ditemukan.');
        }
        const destBalance = Number(destSnap.data().balance) || 0;

        txn.update(sourceWalletRef, {
          balance: sourceBalance - txData.amount,
        });
        txn.update(destWalletRef, {
          balance: destBalance + txData.amount,
        });
      }

      const newTxRef = doc(collection(db, 'transactions'));
      txn.set(newTxRef, cleanFirestoreData({
        ...txData,
        createdAt: new Date().toISOString(),
      }));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete transaction and reverse the balance
export async function deleteTransactionWithBalance(tx: Transaction) {
  const path = `transactions/${tx.id}`;
  try {
    await runTransaction(db, async (txn) => {
      const txRef = doc(db, 'transactions', tx.id);
      const sourceWalletRef = doc(db, 'wallets', tx.walletId);
      const sourceSnap = await txn.get(sourceWalletRef);

      if (sourceSnap.exists()) {
        const sourceBalance = Number(sourceSnap.data().balance) || 0;
        if (tx.type === 'Expense') {
          txn.update(sourceWalletRef, {
            balance: sourceBalance + tx.amount,
          });
        } else if (tx.type === 'Income') {
          txn.update(sourceWalletRef, {
            balance: sourceBalance - tx.amount,
          });
        } else if (tx.type === 'Transfer' && tx.destWalletId) {
          const destWalletRef = doc(db, 'wallets', tx.destWalletId);
          const destSnap = await txn.get(destWalletRef);
          if (destSnap.exists()) {
            const destBalance = Number(destSnap.data().balance) || 0;
            txn.update(sourceWalletRef, {
              balance: sourceBalance + tx.amount,
            });
            txn.update(destWalletRef, {
              balance: destBalance - tx.amount,
            });
          }
        }
      }

      txn.delete(txRef);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Wallet CRUD
export async function createWallet(wallet: Omit<Wallet, 'id' | 'createdAt'>) {
  const path = 'wallets';
  try {
    await addDoc(collection(db, path), cleanFirestoreData({
      ...wallet,
      createdAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateWallet(walletId: string, updates: Partial<Wallet>) {
  const path = `wallets/${walletId}`;
  try {
    await updateDoc(doc(db, 'wallets', walletId), cleanFirestoreData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteWallet(walletId: string) {
  const path = `wallets/${walletId}`;
  try {
    await deleteDoc(doc(db, 'wallets', walletId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Category CRUD
export async function createCategory(cat: Omit<Category, 'id'>) {
  const path = 'categories';
  try {
    await addDoc(collection(db, path), cat);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCategory(catId: string, updates: Partial<Category>) {
  const path = `categories/${catId}`;
  try {
    await updateDoc(doc(db, 'categories', catId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategory(catId: string) {
  const path = `categories/${catId}`;
  try {
    await deleteDoc(doc(db, 'categories', catId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Budget CRUD
export async function saveBudget(budget: Omit<Budget, 'id' | 'createdAt'> & { id?: string }) {
  const path = 'budgets';
  try {
    if (budget.id) {
      await updateDoc(doc(db, 'budgets', budget.id), cleanFirestoreData({
        limitAmount: budget.limitAmount,
        month: budget.month,
        year: budget.year,
        categoryId: budget.categoryId,
      }));
    } else {
      const { id, ...dataToSave } = budget;
      await addDoc(collection(db, path), cleanFirestoreData({
        ...dataToSave,
        createdAt: new Date().toISOString(),
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBudget(budgetId: string) {
  const path = `budgets/${budgetId}`;
  try {
    await deleteDoc(doc(db, 'budgets', budgetId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Savings Goal CRUD & Virtual Vault Operations (PRD v3 & ERD v3)
export async function createSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'createdAt'>) {
  const path = 'savings_goals';
  try {
    await addDoc(collection(db, path), cleanFirestoreData({
      ...goal,
      currentAmount: goal.currentAmount ?? 0,
      status: (goal.currentAmount ?? 0) >= goal.targetAmount ? 'Completed' : 'Active',
      createdAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function depositToSavingsGoal(params: {
  userId: string;
  goalId: string;
  walletId: string;
  amount: number;
  depositDate: string;
  categoryId?: string;
  notes?: string;
}) {
  const path = `savings_goals/${params.goalId}`;
  try {
    await runTransaction(db, async (txn) => {
      const goalRef = doc(db, 'savings_goals', params.goalId);
      const walletRef = doc(db, 'wallets', params.walletId);

      const goalSnap = await txn.get(goalRef);
      const walletSnap = await txn.get(walletRef);

      if (!goalSnap.exists()) {
        throw new Error('Savings goal not found.');
      }
      if (!walletSnap.exists()) {
        throw new Error('Source wallet not found.');
      }

      const currentWalletBal = Number(walletSnap.data().balance) || 0;
      const currentGoalAmt = Number(goalSnap.data().currentAmount) || 0;
      const targetAmt = Number(goalSnap.data().targetAmount) || 0;
      const goalData = goalSnap.data() as SavingsGoal;

      const newWalletBal = currentWalletBal - params.amount;
      const newGoalAmt = currentGoalAmt + params.amount;
      const newStatus = newGoalAmt >= targetAmt ? 'Completed' : 'Active';

      // 1. Source wallet decreases
      txn.update(walletRef, { balance: newWalletBal });

      // 2. Goal currentAmount increases
      txn.update(goalRef, {
        currentAmount: newGoalAmt,
        status: newStatus,
        userId: goalData.userId || params.userId,
      });

      // 3. Main core transaction entry (Category: Deposit Invest, Type: Expense)
      const txRef = doc(collection(db, 'transactions'));
      txn.set(
        txRef,
        cleanFirestoreData({
          userId: params.userId,
          walletId: params.walletId,
          categoryId: params.categoryId || undefined,
          categoryName: 'Deposit Invest',
          referenceId: params.goalId,
          type: 'Expense',
          amount: params.amount,
          notes: params.notes?.trim() || `Deposit to ${goalData.goalName || 'Savings Goal'}`,
          transactionDate: params.depositDate,
          createdAt: new Date().toISOString(),
        })
      );

      // 4. goal_transactions entry
      const goalTxRef = doc(collection(db, 'goal_transactions'));
      txn.set(
        goalTxRef,
        cleanFirestoreData({
          userId: params.userId,
          goalId: params.goalId,
          walletId: params.walletId,
          transactionId: txRef.id,
          type: 'Deposit',
          amount: params.amount,
          transactionDate: params.depositDate,
          createdAt: new Date().toISOString(),
        })
      );
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function withdrawFromSavingsGoal(params: {
  userId: string;
  goalId: string;
  walletId: string; // Destination wallet
  amount: number;
  withdrawalDate: string;
  categoryId?: string;
  notes?: string;
}) {
  const path = `savings_goals/${params.goalId}`;
  try {
    await runTransaction(db, async (txn) => {
      const goalRef = doc(db, 'savings_goals', params.goalId);
      const walletRef = doc(db, 'wallets', params.walletId);

      const goalSnap = await txn.get(goalRef);
      const walletSnap = await txn.get(walletRef);

      if (!goalSnap.exists()) {
        throw new Error('Savings goal not found.');
      }
      if (!walletSnap.exists()) {
        throw new Error('Destination wallet not found.');
      }

      const currentWalletBal = Number(walletSnap.data().balance) || 0;
      const currentGoalAmt = Number(goalSnap.data().currentAmount) || 0;
      const targetAmt = Number(goalSnap.data().targetAmount) || 0;
      const goalData = goalSnap.data() as SavingsGoal;

      if (params.amount > currentGoalAmt) {
        throw new Error('Withdrawal amount cannot exceed current accumulated savings.');
      }

      const newWalletBal = currentWalletBal + params.amount;
      const newGoalAmt = Math.max(0, currentGoalAmt - params.amount);
      const newStatus = newGoalAmt >= targetAmt ? 'Completed' : 'Active';

      // 1. Destination wallet increases
      txn.update(walletRef, { balance: newWalletBal });

      // 2. Goal currentAmount decreases, lastWithdrawnAt updated
      txn.update(goalRef, {
        currentAmount: newGoalAmt,
        status: newStatus,
        lastWithdrawnAt: params.withdrawalDate,
        userId: goalData.userId || params.userId,
      });

      // 3. Main core transaction entry (Category: Withdraw Invest, Type: Income)
      const txRef = doc(collection(db, 'transactions'));
      txn.set(
        txRef,
        cleanFirestoreData({
          userId: params.userId,
          walletId: params.walletId,
          categoryId: params.categoryId || undefined,
          categoryName: 'Withdraw Invest',
          referenceId: params.goalId,
          type: 'Income',
          amount: params.amount,
          notes: params.notes?.trim() || `Withdrawal from ${goalData.goalName || 'Savings Goal'}`,
          transactionDate: params.withdrawalDate,
          createdAt: new Date().toISOString(),
        })
      );

      // 4. goal_transactions entry
      const goalTxRef = doc(collection(db, 'goal_transactions'));
      txn.set(
        goalTxRef,
        cleanFirestoreData({
          userId: params.userId,
          goalId: params.goalId,
          walletId: params.walletId,
          transactionId: txRef.id,
          type: 'Withdrawal',
          amount: params.amount,
          transactionDate: params.withdrawalDate,
          createdAt: new Date().toISOString(),
        })
      );
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Backward-compatible alias for existing code
export async function allocateToSavingsGoal(
  goalId: string,
  walletId: string,
  amount: number,
  userId: string,
  goalName?: string
) {
  return depositToSavingsGoal({
    userId,
    goalId,
    walletId,
    amount,
    depositDate: new Date().toISOString().split('T')[0],
    notes: goalName ? `Deposit to ${goalName}` : undefined,
  });
}

// Card Deletion: Allows deleting Goal Card without deleting historical deposit/withdrawal ledger transactions
export async function deleteSavingsGoal(goalId: string) {
  const path = `savings_goals/${goalId}`;
  try {
    await deleteDoc(doc(db, 'savings_goals', goalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Debt & Receivable CRUD
export async function createDebtReceivable(item: Omit<DebtReceivable, 'id' | 'createdAt'>) {
  const path = 'debts_receivables';
  try {
    await addDoc(collection(db, path), cleanFirestoreData({
      ...item,
      createdAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDebtStatus(
  debtId: string,
  status: 'Paid' | 'Unpaid',
  walletId?: string,
  userId?: string,
  debt?: DebtReceivable
) {
  const path = `debts_receivables/${debtId}`;
  try {
    if (walletId && userId && debt) {
      await runTransaction(db, async (txn) => {
        const debtRef = doc(db, 'debts_receivables', debtId);
        const walletRef = doc(db, 'wallets', walletId);
        const walletSnap = await txn.get(walletRef);

        if (walletSnap.exists()) {
          const currentBal = Number(walletSnap.data().balance) || 0;
          if (debt.type === 'Receivable' && status === 'Paid') {
            // Piutang dibayar orang ke kita -> uang masuk (Income)
            txn.update(walletRef, { balance: currentBal + debt.amount });
            const txRef = doc(collection(db, 'transactions'));
            txn.set(txRef, {
              userId,
              walletId,
              categoryName: 'Loan Repayment',
              type: 'Income',
              amount: debt.amount,
              notes: `Pelunasan Piutang dari ${debt.personName}`,
              transactionDate: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
          } else if (debt.type === 'Debt' && status === 'Paid') {
            // Kita bayar utang kita ke orang -> uang keluar (Expense)
            txn.update(walletRef, { balance: currentBal - debt.amount });
            const txRef = doc(collection(db, 'transactions'));
            txn.set(txRef, {
              userId,
              walletId,
              categoryName: 'Debt Payment',
              type: 'Expense',
              amount: debt.amount,
              notes: `Pelunasan Utang ke ${debt.personName}`,
              transactionDate: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
          }
        }

        txn.update(debtRef, { status });
      });
    } else {
      await updateDoc(doc(db, 'debts_receivables', debtId), { status });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDebtReceivable(debtId: string) {
  const path = `debts_receivables/${debtId}`;
  try {
    await deleteDoc(doc(db, 'debts_receivables', debtId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// ERD v2 Debts & Loans Tracking (DebtLoan & DebtPayment)
// -------------------------------------------------------------

export async function createDebtLoanWithInitialSync(params: {
  userId: string;
  initialWalletId: string;
  type: 'Debt' | 'Loan';
  personName: string;
  totalAmount: number;
  description: string;
  startDate: string;
  categoryId?: string;
}) {
  const path = 'debt_loans';
  try {
    await runTransaction(db, async (txn) => {
      const walletRef = doc(db, 'wallets', params.initialWalletId);
      const walletSnap = await txn.get(walletRef);
      if (!walletSnap.exists()) {
        throw new Error('Dompet yang dipilih tidak ditemukan.');
      }

      const currentBalance = Number(walletSnap.data().balance) || 0;
      // Initial Sync:
      // Debt (Saya Berutang/Pinjam): uang masuk ke dompet pengguna (+ balance)
      // Loan (Saya Meminjamkan): uang keluar dari dompet pengguna (- balance)
      const newBalance =
        params.type === 'Debt'
          ? currentBalance + params.totalAmount
          : currentBalance - params.totalAmount;

      txn.update(walletRef, { balance: newBalance });

      const debtLoanRef = doc(collection(db, 'debt_loans'));
      txn.set(
        debtLoanRef,
        cleanFirestoreData({
          userId: params.userId,
          initialWalletId: params.initialWalletId,
          type: params.type,
          personName: params.personName,
          totalAmount: params.totalAmount,
          remainingAmount: params.totalAmount,
          description: params.description || '',
          status: 'Active',
          startDate: params.startDate,
          createdAt: new Date().toISOString(),
        })
      );

      // Otomatis catat di transaksi utama (Single Source of Truth)
      const txRef = doc(collection(db, 'transactions'));
      const debtCatName = params.type === 'Debt' ? 'Debt' : 'Loan';
      txn.set(
        txRef,
        cleanFirestoreData({
          userId: params.userId,
          walletId: params.initialWalletId,
          categoryId: params.categoryId || undefined,
          categoryName: debtCatName,
          referenceId: debtLoanRef.id,
          type: params.type === 'Debt' ? 'Income' : 'Expense',
          amount: params.totalAmount,
          notes:
            params.type === 'Debt'
              ? `Utang dari ${params.personName}${params.description ? `: ${params.description}` : ''}`
              : `Pinjaman kepada ${params.personName}${params.description ? `: ${params.description}` : ''}`,
          transactionDate: params.startDate,
          createdAt: new Date().toISOString(),
        })
      );
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function recordDebtPaymentWithSync(params: {
  userId: string;
  debtLoan: DebtLoan;
  amountPaid: number;
  walletId: string;
  paymentDate: string;
  categoryId?: string;
  notes?: string;
}) {
  const path = `debt_loans/${params.debtLoan.id}`;
  try {
    await runTransaction(db, async (txn) => {
      const debtRef = doc(db, 'debt_loans', params.debtLoan.id);
      const walletRef = doc(db, 'wallets', params.walletId);

      const debtSnap = await txn.get(debtRef);
      const walletSnap = await txn.get(walletRef);

      if (!debtSnap.exists()) {
        throw new Error('Data utang/piutang tidak ditemukan.');
      }
      if (!walletSnap.exists()) {
        throw new Error('Dompet pembayaran tidak ditemukan.');
      }

      const currentRemaining = Number(debtSnap.data().remainingAmount) || 0;
      const currentBalance = Number(walletSnap.data().balance) || 0;

      const newRemaining = Math.max(0, currentRemaining - params.amountPaid);
      const newStatus = newRemaining <= 0 ? 'Solved' : 'Partial';

      // Payment Balance Sync:
      // Debt (Bayar Hutang): uang keluar dari dompet pengguna (- balance)
      // Loan (Terima Piutang): uang masuk ke dompet pengguna (+ balance)
      const newBalance =
        params.debtLoan.type === 'Debt'
          ? currentBalance - params.amountPaid
          : currentBalance + params.amountPaid;

      txn.update(walletRef, { balance: newBalance });
      txn.update(debtRef, {
        remainingAmount: newRemaining,
        status: newStatus,
      });

      // Transaction entry in ledger with locked default category
      const txRef = doc(collection(db, 'transactions'));
      const paymentCatName =
        params.debtLoan.type === 'Debt' ? 'Debt Payment' : 'Loan Repayment';
      const defaultNotes =
        params.debtLoan.type === 'Debt'
          ? `Bayar Hutang ke ${params.debtLoan.personName} (${newStatus === 'Solved' ? 'Lunas' : 'Cicilan'})`
          : `Terima Piutang dari ${params.debtLoan.personName} (${newStatus === 'Solved' ? 'Lunas' : 'Cicilan'})`;

      txn.set(
        txRef,
        cleanFirestoreData({
          userId: params.userId,
          walletId: params.walletId,
          categoryId: params.categoryId || undefined,
          categoryName: paymentCatName,
          referenceId: params.debtLoan.id,
          type: params.debtLoan.type === 'Debt' ? 'Expense' : 'Income',
          amount: params.amountPaid,
          notes: params.notes?.trim() || defaultNotes,
          transactionDate: params.paymentDate,
          createdAt: new Date().toISOString(),
        })
      );

      // Record in debt_payments table
      const paymentRef = doc(collection(db, 'debt_payments'));
      txn.set(
        paymentRef,
        cleanFirestoreData({
          userId: params.userId,
          debtLoanId: params.debtLoan.id,
          walletId: params.walletId,
          transactionId: txRef.id,
          amountPaid: params.amountPaid,
          paymentDate: params.paymentDate,
          createdAt: new Date().toISOString(),
        })
      );
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDebtLoan(debtLoanId: string) {
  const path = `debt_loans/${debtLoanId}`;
  try {
    await deleteDoc(doc(db, 'debt_loans', debtLoanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Bills & Recurring Expenses Blueprint (PRD v4 & ERD v4)
// -------------------------------------------------------------

export function subscribeBills(userId: string, onUpdate: (bills: Bill[]) => void) {
  const path = 'bills';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Bill[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Bill, 'id'>),
      }));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createBill(bill: Omit<Bill, 'id' | 'createdAt'>) {
  const path = 'bills';
  try {
    await addDoc(
      collection(db, path),
      cleanFirestoreData({
        ...bill,
        createdAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBill(billId: string, updates: Partial<Bill>) {
  const path = `bills/${billId}`;
  try {
    await updateDoc(doc(db, 'bills', billId), cleanFirestoreData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBill(billId: string) {
  const path = `bills/${billId}`;
  try {
    await deleteDoc(doc(db, 'bills', billId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function payBillWithSync(params: {
  userId: string;
  bill: Bill;
  actualAmount: number;
  walletId: string;
  paymentDate: string; // YYYY-MM-DD
  categoryId?: string;
  notes?: string;
}) {
  const path = `bills/${params.bill.id}`;
  try {
    await runTransaction(db, async (txn) => {
      const billRef = doc(db, 'bills', params.bill.id);
      const walletRef = doc(db, 'wallets', params.walletId);

      const billSnap = await txn.get(billRef);
      const walletSnap = await txn.get(walletRef);

      if (!billSnap.exists()) {
        throw new Error('Tagihan tidak ditemukan.');
      }
      if (!walletSnap.exists()) {
        throw new Error('Dompet pembayaran tidak ditemukan.');
      }

      const currentBalance = Number(walletSnap.data().balance) || 0;
      const newBalance = currentBalance - params.actualAmount;

      // Determine lastPaidPeriod string e.g. "2026-11" for Monthly, "2026" for Yearly
      const dateParts = params.paymentDate.split('-');
      const year = dateParts[0] || new Date().getFullYear().toString();
      const month = dateParts[1] || String(new Date().getMonth() + 1).padStart(2, '0');
      const paidPeriod = params.bill.cycle === 'Yearly' ? year : `${year}-${month}`;

      // 1. Source wallet balance decreases
      txn.update(walletRef, { balance: newBalance });

      // 2. Bill lastPaidPeriod updated
      txn.update(billRef, { lastPaidPeriod: paidPeriod });

      // 3. Core transaction entry logged (Type: Expense, Category: Recurring Expenses)
      const txRef = doc(collection(db, 'transactions'));
      txn.set(
        txRef,
        cleanFirestoreData({
          userId: params.userId,
          walletId: params.walletId,
          categoryId: params.categoryId || undefined,
          categoryName: 'Recurring Expenses',
          referenceId: params.bill.id,
          type: 'Expense',
          amount: params.actualAmount,
          notes: params.notes?.trim() || `Pay Bill: ${params.bill.name}`,
          transactionDate: params.paymentDate,
          createdAt: new Date().toISOString(),
        })
      );
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
