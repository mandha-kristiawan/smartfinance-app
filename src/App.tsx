/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  testConnection,
  logOut,
} from './lib/firebase';
import {
  syncUserProfile,
  seedInitialUserData,
  subscribeWallets,
  subscribeCategories,
  subscribeTransactions,
  subscribeBudgets,
  subscribeSavingsGoals,
  subscribeDebts,
  subscribeDebtLoans,
  createTransactionWithBalance,
  deleteTransactionWithBalance,
  createWallet,
  updateWallet,
  deleteWallet,
  createCategory,
  updateCategory,
  deleteCategory,
  saveBudget,
  deleteBudget,
  createSavingsGoal,
  depositToSavingsGoal,
  withdrawFromSavingsGoal,
  allocateToSavingsGoal,
  deleteSavingsGoal,
  createDebtReceivable,
  updateDebtStatus,
  deleteDebtReceivable,
  createDebtLoanWithInitialSync,
  recordDebtPaymentWithSync,
  deleteDebtLoan,
  subscribeBills,
  createBill,
  updateBill,
  deleteBill,
  payBillWithSync,
} from './lib/financeService';
import {
  UserProfile,
  Wallet,
  Category,
  Transaction,
  Budget,
  SavingsGoal,
  DebtReceivable,
  DebtLoan,
  DebtLoanType,
  DebtLoanStatus,
  TransactionType,
  Bill,
} from './types';

import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { TransactionsListView } from './components/TransactionsListView';
import { WalletsManager } from './components/WalletsManager';
import { BudgetsManager } from './components/BudgetsManager';
import { SavingsGoalsManager } from './components/SavingsGoalsManager';
import { DebtsManager } from './components/DebtsManager';
import { BillsManager } from './components/BillsManager';
import { ExportView } from './components/ExportView';
import { Sparkles, Receipt, Plus } from 'lucide-react';

import { NLPTransactionModal } from './components/NLPTransactionModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { TransactionModal } from './components/TransactionModal';
import { CategoriesManagerModal } from './components/CategoriesManagerModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Real-time data collections
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<DebtReceivable[]>([]);
  const [debtLoans, setDebtLoans] = useState<DebtLoan[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  // Modals
  const [showNLPModal, setShowNLPModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  // Initial connection test & auth listener
  useEffect(() => {
    testConnection().catch(() => {});

    // Safety timeout: Ensure loading screen never hangs more than 2 seconds
    const fallbackTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      // Clear loading immediately when auth state is evaluated
      clearTimeout(fallbackTimer);
      setAuthLoading(false);

      if (fbUser) {
        const profile: UserProfile = {
          id: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'SmartFinance User',
          photoURL: fbUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(profile);

        // Run profile sync and data seeding non-blocking in the background
        syncUserProfile(fbUser).catch((err) =>
          console.warn('Background profile sync note:', err)
        );
        seedInitialUserData(fbUser.uid).catch((err) =>
          console.warn('Background seed note:', err)
        );
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Real-time listeners when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      setWallets([]);
      setCategories([]);
      setTransactions([]);
      setBudgets([]);
      setSavingsGoals([]);
      setDebts([]);
      setDebtLoans([]);
      setBills([]);
      return;
    }

    const unsubWallets = subscribeWallets(currentUser.id, setWallets);
    const unsubCats = subscribeCategories(currentUser.id, setCategories);
    const unsubTxs = subscribeTransactions(currentUser.id, setTransactions);
    const unsubBudgets = subscribeBudgets(currentUser.id, setBudgets);
    const unsubSavings = subscribeSavingsGoals(currentUser.id, setSavingsGoals);
    const unsubDebts = subscribeDebts(currentUser.id, setDebts);
    const unsubDebtLoans = subscribeDebtLoans(currentUser.id, setDebtLoans);
    const unsubBills = subscribeBills(currentUser.id, setBills);

    return () => {
      unsubWallets();
      unsubCats();
      unsubTxs();
      unsubBudgets();
      unsubSavings();
      unsubDebts();
      unsubDebtLoans();
      unsubBills();
    };
  }, [currentUser]);

  // Combined debt loans with legacy migration support
  const combinedDebtLoans: DebtLoan[] = useMemo(() => {
    const legacyMapped: DebtLoan[] = debts
      .filter((d) => !debtLoans.some((dl) => dl.id === d.id))
      .map((d) => ({
        id: d.id,
        userId: d.userId,
        initialWalletId: wallets[0]?.id || '',
        type: (d.type === 'Receivable' ? 'Loan' : 'Debt') as DebtLoanType,
        personName: d.personName,
        totalAmount: d.amount,
        remainingAmount: d.status === 'Paid' ? 0 : d.amount,
        description: d.notes || '',
        status: (d.status === 'Paid' ? 'Solved' : 'Active') as DebtLoanStatus,
        startDate: d.createdAt ? d.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        createdAt: d.createdAt || new Date().toISOString(),
      }));

    return [...debtLoans, ...legacyMapped];
  }, [debtLoans, debts, wallets]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <img
            src="/logo.png?v=2"
            alt="SmartFinance Logo"
            className="w-14 h-14 rounded-2xl object-contain mx-auto shadow-lg border border-black/10 animate-pulse"
          />
          <p className="font-bold text-lg text-[#1A1A1A] tracking-tight">SmartFinance</p>
          <p className="text-xs text-gray-500">Loading user session...</p>
        </div>
      </div>
    );
  }

  // Not logged in: Show Auth Screen
  if (!currentUser) {
    return <AuthScreen />;
  }

  // Handlers
  const handleSaveTransaction = async (tx: {
    walletId: string;
    destWalletId?: string;
    categoryId?: string;
    type?: TransactionType;
    amount: number;
    notes: string;
    transactionDate: string;
    receiptItems?: string;
  }) => {
    const payload: any = {
      userId: currentUser.id,
      walletId: tx.walletId,
      type: tx.type || 'Expense',
      amount: tx.amount,
      notes: tx.notes || '',
      transactionDate: tx.transactionDate,
    };
    if (tx.destWalletId) payload.destWalletId = tx.destWalletId;
    if (tx.categoryId) payload.categoryId = tx.categoryId;
    if (tx.receiptItems) payload.receiptItems = tx.receiptItems;

    await createTransactionWithBalance(payload);
  };

  const handleQuickTransfer = async (sourceId: string, destId: string, amount: number) => {
    await createTransactionWithBalance({
      userId: currentUser.id,
      walletId: sourceId,
      destWalletId: destId,
      type: 'Transfer',
      amount,
      notes: 'Transfer Saldo Antar Akun',
      transactionDate: new Date().toISOString(),
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-[#1A1A1A] flex flex-col font-sans-body overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={currentUser}
        onSignOut={logOut}
        onOpenNLP={() => setShowNLPModal(true)}
        onOpenReceiptScan={() => setShowReceiptModal(true)}
        onOpenManualTx={() => setShowManualModal(true)}
        onOpenCategories={() => setShowCategoriesModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 sm:pb-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            user={currentUser}
            wallets={wallets}
            categories={categories}
            transactions={transactions}
            budgets={budgets}
            savingsGoals={savingsGoals}
            debts={debts}
            debtLoans={combinedDebtLoans}
            bills={bills}
            onOpenNLP={() => setShowNLPModal(true)}
            onOpenReceiptScan={() => setShowReceiptModal(true)}
            onOpenManualTx={() => setShowManualModal(true)}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsListView
            transactions={transactions}
            wallets={wallets}
            categories={categories}
            userName={currentUser.displayName}
            onDeleteTransaction={deleteTransactionWithBalance}
            onOpenManualTx={() => setShowManualModal(true)}
            onOpenNLPTx={() => setShowNLPModal(true)}
            onOpenCategories={() => setShowCategoriesModal(true)}
          />
        )}

        {currentTab === 'wallets' && (
          <WalletsManager
            wallets={wallets}
            onCreateWallet={(w) => createWallet({ ...w, userId: currentUser.id })}
            onUpdateWallet={updateWallet}
            onDeleteWallet={deleteWallet}
            onQuickTransfer={handleQuickTransfer}
          />
        )}

        {currentTab === 'budgets' && (
          <BudgetsManager
            budgets={budgets}
            categories={categories}
            transactions={transactions}
            onSaveBudget={(b) => saveBudget({ ...b, userId: currentUser.id })}
            onDeleteBudget={deleteBudget}
          />
        )}

        {currentTab === 'savings' && (
          <SavingsGoalsManager
            savingsGoals={savingsGoals}
            wallets={wallets}
            categories={categories}
            onCreateGoal={async ({ goalName, targetAmount }) => {
              await createSavingsGoal({
                userId: currentUser.id,
                goalName,
                targetAmount,
                currentAmount: 0,
                status: 'Active',
              });
            }}
            onDepositFunds={async ({ goalId, walletId, amount, depositDate, notes }) => {
              const depositCat = categories.find((c) =>
                c.name.toLowerCase() === 'deposit invest' ||
                c.name.toLowerCase().includes('deposit invest') ||
                c.name.toLowerCase().includes('investment deposit') ||
                c.name.toLowerCase().includes('deposit') ||
                c.name.toLowerCase().includes('tabungan')
              );
              await depositToSavingsGoal({
                userId: currentUser.id,
                goalId,
                walletId,
                amount,
                depositDate,
                categoryId: depositCat?.id,
                notes,
              });
            }}
            onWithdrawFunds={async ({ goalId, walletId, amount, withdrawalDate, notes }) => {
              const withdrawCat = categories.find((c) =>
                c.name.toLowerCase() === 'withdraw invest' ||
                c.name.toLowerCase().includes('withdraw invest') ||
                c.name.toLowerCase().includes('investment withdrawal') ||
                c.name.toLowerCase().includes('withdrawal') ||
                c.name.toLowerCase().includes('tarik')
              );
              await withdrawFromSavingsGoal({
                userId: currentUser.id,
                goalId,
                walletId,
                amount,
                withdrawalDate,
                categoryId: withdrawCat?.id,
                notes,
              });
            }}
            onDeleteGoal={deleteSavingsGoal}
          />
        )}

        {currentTab === 'debts' && (
          <DebtsManager
            debtLoans={combinedDebtLoans}
            wallets={wallets}
            categories={categories}
            onCreateDebtLoan={(params) =>
              createDebtLoanWithInitialSync({
                ...params,
                userId: currentUser.id,
              })
            }
            onRecordPayment={(params) =>
              recordDebtPaymentWithSync({
                ...params,
                userId: currentUser.id,
              })
            }
            onDeleteDebtLoan={async (id) => {
              if (debtLoans.some((dl) => dl.id === id)) {
                await deleteDebtLoan(id);
              } else {
                await deleteDebtReceivable(id);
              }
            }}
          />
        )}

        {currentTab === 'bills' && (
          <BillsManager
            bills={bills}
            wallets={wallets}
            categories={categories}
            onCreateBill={(bill) => createBill({ ...bill, userId: currentUser.id })}
            onUpdateBill={updateBill}
            onDeleteBill={deleteBill}
            onPayBill={(params) =>
              payBillWithSync({
                ...params,
                userId: currentUser.id,
              })
            }
          />
        )}

        {currentTab === 'export' && (
          <ExportView
            user={currentUser}
            transactions={transactions}
            wallets={wallets}
            categories={categories}
          />
        )}
      </main>

      {/* Simplified Mobile Floating Action Dock (Centered, Sleek, Professional) */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 sm:hidden flex items-center gap-1.5 bg-white/95 backdrop-blur-xl px-2.5 py-1.5 rounded-full border border-black/10 shadow-2xl">
        <button
          onClick={() => setShowNLPModal(true)}
          className="px-3 py-1.5 rounded-full bg-[#BABDFF]/25 hover:bg-[#BABDFF]/40 text-indigo-950 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          title="AI Prompt Entry"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>AI</span>
        </button>
        <button
          onClick={() => setShowReceiptModal(true)}
          className="px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-900 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          title="Scan Receipt"
        >
          <Receipt className="w-3.5 h-3.5 text-pink-600 shrink-0" />
          <span>Receipt</span>
        </button>
        <button
          onClick={() => setShowManualModal(true)}
          className="px-3.5 py-1.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
          title="Manual Entry"
        >
          <Plus className="w-3.5 h-3.5 text-[#24D0FE] shrink-0" />
          <span>Record</span>
        </button>
      </div>

      {/* Modals */}
      <NLPTransactionModal
        isOpen={showNLPModal}
        onClose={() => setShowNLPModal(false)}
        wallets={wallets}
        categories={categories}
        onSaveTransaction={handleSaveTransaction}
      />

      <ReceiptScannerModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        wallets={wallets}
        categories={categories}
        onSaveReceiptTransaction={handleSaveTransaction}
      />

      <TransactionModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        wallets={wallets}
        categories={categories}
        onSave={handleSaveTransaction}
      />

      <CategoriesManagerModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        categories={categories}
        onCreateCategory={(cat) => createCategory({ ...cat, userId: currentUser.id })}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-black/[0.06] bg-white py-4 px-6 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png?v=2"
              alt="SmartFinance"
              className="w-5 h-5 rounded-md object-contain shadow-2xs border border-black/10"
            />
            <span className="font-bold text-gray-900 tracking-tight">Cruizer SmartFinance</span>
          </div>

          <div className="text-gray-400 font-medium">
            Courtesy 2026
          </div>

          <div className="text-gray-400 text-[11px]">
            <span>Cloud Synchronized &amp; Secured</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
