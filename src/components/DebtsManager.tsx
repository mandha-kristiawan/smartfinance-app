import React, { useState, useMemo } from 'react';
import {
  HandCoins,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Wallet as WalletIcon,
  Search,
  CheckCircle2,
  Clock,
  CreditCard,
  AlertCircle,
  Loader2,
  X,
  FileCheck2,
} from 'lucide-react';
import { DebtLoan, Wallet, Category, DebtLoanType, DebtLoanStatus } from '../types';
import { formatIDR } from '../lib/formatters';

interface DebtsManagerProps {
  debtLoans: DebtLoan[];
  wallets: Wallet[];
  categories: Category[];
  onCreateDebtLoan: (params: {
    initialWalletId: string;
    type: DebtLoanType;
    personName: string;
    totalAmount: number;
    description: string;
    startDate: string;
    categoryId?: string;
  }) => Promise<void>;
  onRecordPayment: (params: {
    debtLoan: DebtLoan;
    amountPaid: number;
    walletId: string;
    paymentDate: string;
    categoryId?: string;
    notes?: string;
  }) => Promise<void>;
  onDeleteDebtLoan: (id: string) => Promise<void>;
}

export const DebtsManager: React.FC<DebtsManagerProps> = ({
  debtLoans,
  wallets,
  categories,
  onCreateDebtLoan,
  onRecordPayment,
  onDeleteDebtLoan,
}) => {
  // Navigation & Filtering
  const [filterType, setFilterType] = useState<'All' | 'Loan' | 'Debt'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Solved'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<DebtLoan | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<DebtLoan | null>(null);

  // Create Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [createType, setCreateType] = useState<DebtLoanType>('Loan');
  const [personName, setPersonName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [initialWalletId, setInitialWalletId] = useState(wallets[0]?.id || '');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Payment Form State
  const [paymentMode, setPaymentMode] = useState<'Full' | 'Partial'>('Full');
  const [partialAmount, setPartialAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentWalletId, setPaymentWalletId] = useState(wallets[0]?.id || '');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Delete State
  const [deleting, setDeleting] = useState(false);

  // Wallet map for instant lookup
  const walletMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);

  // Derived summaries
  const totalReceivables = useMemo(() => {
    return debtLoans
      .filter((d) => d.type === 'Loan' && d.status !== 'Solved')
      .reduce((sum, d) => sum + (d.remainingAmount ?? d.totalAmount), 0);
  }, [debtLoans]);

  const totalLiabilities = useMemo(() => {
    return debtLoans
      .filter((d) => d.type === 'Debt' && d.status !== 'Solved')
      .reduce((sum, d) => sum + (d.remainingAmount ?? d.totalAmount), 0);
  }, [debtLoans]);

  const solvedCount = useMemo(() => {
    return debtLoans.filter((d) => d.status === 'Solved').length;
  }, [debtLoans]);

  const activeBorrowersCount = useMemo(() => {
    return new Set(
      debtLoans.filter((d) => d.type === 'Loan' && d.status !== 'Solved').map((d) => d.personName.toLowerCase().trim())
    ).size;
  }, [debtLoans]);

  const activeCreditorsCount = useMemo(() => {
    return new Set(
      debtLoans.filter((d) => d.type === 'Debt' && d.status !== 'Solved').map((d) => d.personName.toLowerCase().trim())
    ).size;
  }, [debtLoans]);

  // Filtered list
  const filteredList = useMemo(() => {
    return debtLoans.filter((item) => {
      if (filterType !== 'All' && item.type !== filterType) return false;
      if (filterStatus === 'Pending' && item.status === 'Solved') return false;
      if (filterStatus === 'Solved' && item.status !== 'Solved') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.personName?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [debtLoans, filterType, filterStatus, searchQuery]);

  // Handle open create modal
  const handleOpenCreateModal = () => {
    setCreateType('Loan');
    setPersonName('');
    setTotalAmount('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setInitialWalletId(wallets[0]?.id || '');
    setDescription('');
    setCreateError(null);
    setShowCreateModal(true);
  };

  // Handle submit create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(totalAmount);
    if (!personName.trim()) {
      setCreateError('Please enter the counterparty / contact name.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setCreateError('Please enter a valid loan or debt amount in IDR.');
      return;
    }
    if (!initialWalletId) {
      setCreateError('Please select an associated wallet for initial balance sync.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      // Find category: for Loan -> 'Loan' (Expense). For Debt -> 'Debt' (Income).
      const targetCatName = createType === 'Debt' ? 'Debt' : 'Loan';
      const initialCat = categories.find(
        (c) =>
          c.name.toLowerCase() === targetCatName.toLowerCase() ||
          (createType === 'Debt'
            ? c.name.toLowerCase().includes('debt') || c.name.toLowerCase().includes('utang')
            : c.name.toLowerCase().includes('loan') || c.name.toLowerCase().includes('pinjam'))
      ) || categories.find((c) => (createType === 'Debt' ? c.type === 'Income' : c.type === 'Expense'));

      await onCreateDebtLoan({
        initialWalletId,
        type: createType,
        personName: personName.trim(),
        totalAmount: amountNum,
        description: description.trim(),
        startDate: startDate || new Date().toISOString().split('T')[0],
        categoryId: initialCat?.id,
      });

      setShowCreateModal(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to record debt/loan.');
    } finally {
      setCreating(false);
    }
  };

  // Handle open payment modal
  const handleOpenPaymentModal = (item: DebtLoan) => {
    setPaymentTarget(item);
    setPaymentMode('Full');
    setPartialAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    // Preselect initial wallet or first wallet
    setPaymentWalletId(item.initialWalletId || wallets[0]?.id || '');
    setPaymentNotes('');
    setPaymentError(null);
  };

  // Handle submit payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;

    const remaining = paymentTarget.remainingAmount ?? paymentTarget.totalAmount;
    const amountToPay =
      paymentMode === 'Full' ? remaining : parseFloat(partialAmount);

    if (isNaN(amountToPay) || amountToPay <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      return;
    }
    if (amountToPay > remaining) {
      setPaymentError(`Payment amount cannot exceed the remaining balance (${formatIDR(remaining)}).`);
      return;
    }
    if (!paymentWalletId) {
      setPaymentError('Please select a payment wallet.');
      return;
    }

    setPaying(true);
    setPaymentError(null);
    try {
      // Locked default categories:
      // Specific categories:
      // If paying back a Debt -> category is "Debt Payment" (Expense)
      // If receiving repayment for a Loan -> category is "Loan Repayment" (Income)
      const targetCatName =
        paymentTarget.type === 'Debt' ? 'Debt Payment' : 'Loan Repayment';
      const targetCat = categories.find(
        (c) =>
          c.name.toLowerCase() === targetCatName.toLowerCase() ||
          (paymentTarget.type === 'Debt'
            ? c.name.toLowerCase().includes('debt payment') ||
              c.name.toLowerCase().includes('bayar hutang') ||
              c.name.toLowerCase().includes('bayar utang')
            : c.name.toLowerCase().includes('loan repayment') ||
              c.name.toLowerCase().includes('terima piutang'))
      );

      await onRecordPayment({
        debtLoan: paymentTarget,
        amountPaid: amountToPay,
        walletId: paymentWalletId,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        categoryId: targetCat?.id,
        notes: paymentNotes.trim() || undefined,
      });

      setPaymentTarget(null);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment.');
    } finally {
      setPaying(false);
    }
  };

  // Handle execute delete
  const handleExecuteDelete = async () => {
    if (!debtToDelete) return;
    setDeleting(true);
    try {
      await onDeleteDebtLoan(debtToDelete.id);
      setDebtToDelete(null);
    } catch (err) {
      console.error('Failed to delete debt loan:', err);
    } finally {
      setDeleting(false);
    }
  };

  const selectedInitialWallet = walletMap.get(initialWalletId);
  const selectedPaymentWallet = walletMap.get(paymentWalletId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] tracking-tight">
            Debts &amp; Loans
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Track personal lending, borrowings, and installment settlements with automatic wallet balance sync.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record Debt or Loan</span>
        </button>
      </div>

      {/* Modern Minimalist Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Receivables (Money Lent) */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Receivables (Money Lent)
                </span>
              </div>
              <h3 className="font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] mt-1 tracking-tight tabular-nums">
                {formatIDR(totalReceivables)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{activeBorrowersCount} active borrower{activeBorrowersCount === 1 ? '' : 's'}</span>
            <span className="text-emerald-700 font-semibold text-[11px]">Uncollected Funds</span>
          </div>
        </div>

        {/* Card 2: Liabilities (Money Borrowed) */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Liabilities (Money Borrowed)
                </span>
              </div>
              <h3 className="font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] mt-1 tracking-tight tabular-nums">
                {formatIDR(totalLiabilities)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{activeCreditorsCount} active creditor{activeCreditorsCount === 1 ? '' : 's'}</span>
            <span className="text-rose-700 font-semibold text-[11px]">Pending Payments</span>
          </div>
        </div>

        {/* Card 3: Resolved & Historical Ledger */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Settled Records
                </span>
              </div>
              <h3 className="font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] mt-1 tracking-tight">
                {solvedCount} <span className="text-base font-normal text-gray-400 font-sans">Solved</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{debtLoans.length} total interactions</span>
            <span className="text-indigo-700 font-semibold text-[11px]">Permanent Audit Trail</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-[24px] p-3 border border-black/[0.06] shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Type Switcher Pills */}
        <div className="flex items-center bg-[#F1F3F9] p-1 rounded-full text-xs font-semibold w-full lg:w-auto">
          <button
            onClick={() => setFilterType('All')}
            className={`flex-1 lg:flex-initial px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              filterType === 'All'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            All ({debtLoans.length})
          </button>
          <button
            onClick={() => setFilterType('Loan')}
            className={`flex-1 lg:flex-initial px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              filterType === 'Loan'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Loans (Lent)
          </button>
          <button
            onClick={() => setFilterType('Debt')}
            className={`flex-1 lg:flex-initial px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              filterType === 'Debt'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Debts (Borrowed)
          </button>
        </div>

        {/* Status Switcher & Search */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center bg-[#F1F3F9] p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('All')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                filterStatus === 'All'
                  ? 'bg-white text-black shadow-2xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setFilterStatus('Pending')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                filterStatus === 'Pending'
                  ? 'bg-white text-black shadow-2xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Pending (Active / Partial)
            </button>
            <button
              onClick={() => setFilterStatus('Solved')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                filterStatus === 'Solved'
                  ? 'bg-white text-black shadow-2xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Solved
            </button>
          </div>

          <div className="relative flex-1 lg:w-56">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search counterparty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-full bg-[#F8F9FD] border border-gray-200 focus:border-black outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Main Records List */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-[28px] p-12 text-center border border-black/[0.06] shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <HandCoins className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-lg text-[#1A1A1A] mb-1 tracking-tight">
            No Debt or Loan Records Found
          </h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5">
            {searchQuery
              ? 'No records match your current filter and search criteria.'
              : 'Your debt ledger is clean. Click "+ Record Debt or Loan" to log a new lending or borrowing interaction.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-semibold cursor-pointer shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Record</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => {
            const isLoan = item.type === 'Loan';
            const isSolved = item.status === 'Solved';
            const isPartial = item.status === 'Partial';
            const remaining = item.remainingAmount ?? (isSolved ? 0 : item.totalAmount);
            const paid = item.totalAmount - remaining;
            const progressPct = Math.min(
              Math.max(0, Math.round((paid / item.totalAmount) * 100)),
              100
            );

            const initialWallet = walletMap.get(item.initialWalletId);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-[26px] p-5 sm:p-6 border transition-all duration-200 flex flex-col justify-between gap-4 ${
                  isSolved
                    ? 'border-black/[0.05] bg-gray-50/50 opacity-90'
                    : 'border-black/[0.08] hover:border-black/20 shadow-xs'
                }`}
              >
                {/* Header Information */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Counterparty Initial Avatar */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base shrink-0 shadow-2xs ${
                          isLoan
                            ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-200/60'
                            : 'bg-indigo-100/70 text-indigo-900 border border-indigo-200/60'
                        }`}
                      >
                        {item.personName.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-[#1A1A1A] tracking-tight">
                            {item.personName}
                          </h4>
                          {/* Type Badge */}
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              isLoan
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                                : 'bg-indigo-50 text-indigo-800 border border-indigo-200/80'
                            }`}
                          >
                            {isLoan ? 'Loan (Lent)' : 'Debt (Borrowed)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {item.startDate || item.createdAt.split('T')[0]}
                          </span>
                          {initialWallet && (
                            <span className="flex items-center gap-1">
                              <WalletIcon className="w-3 h-3 text-gray-400" />
                              {initialWallet.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill Badge */}
                    <div>
                      {isSolved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Solved</span>
                        </span>
                      ) : isPartial ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-900">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Partial ({progressPct}%)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                          <span>Active (Unpaid)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description note */}
                  {item.description && (
                    <p className="text-xs text-gray-600 bg-[#F8F9FD] rounded-xl px-3 py-2 border border-gray-100 mb-3">
                      "{item.description}"
                    </p>
                  )}

                  {/* Amount Breakdown */}
                  <div className="bg-[#F8F9FD] rounded-2xl p-3.5 border border-black/[0.04] space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        {isSolved ? 'Settled Total Amount' : 'Remaining Balance'}
                      </span>
                      <span
                        className={`font-extrabold text-xl tracking-tight tabular-nums ${
                          isSolved
                            ? 'text-gray-400 line-through'
                            : isLoan
                            ? 'text-emerald-700'
                            : 'text-indigo-900'
                        }`}
                      >
                        {formatIDR(isSolved ? item.totalAmount : remaining)}
                      </span>
                    </div>

                    {/* Progress Bar for Partial Payments */}
                    {!isSolved && (
                      <div className="space-y-1 pt-1 border-t border-gray-200/50">
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLoan ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                          <span>Paid: {formatIDR(paid)}</span>
                          <span>Total: {formatIDR(item.totalAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  {!isSolved ? (
                    <button
                      onClick={() => handleOpenPaymentModal(item)}
                      className="px-4 py-2 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-[#24D0FE]" />
                      <span>Record Payment</span>
                    </button>
                  ) : (
                    <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Settlement finalized</span>
                    </div>
                  )}

                  <button
                    onClick={() => setDebtToDelete(item)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE RECORD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
              Record Debt or Loan
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Keep transparent track of third-party loans with instant wallet balance updates.
            </p>

            {createError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Record Type
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#F1F3F9] p-1 rounded-full">
                  <button
                    type="button"
                    onClick={() => setCreateType('Loan')}
                    className={`py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      createType === 'Loan'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Loan (I Lent)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateType('Debt')}
                    className={`py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      createType === 'Debt'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Debt (I Borrowed)
                  </button>
                </div>
              </div>

              {/* Counterparty Name */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Counterparty / Person Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fuji, Alex, PT Mitra Jaya"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Total Amount */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Principal Amount (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 500000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-sm font-bold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Activity Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Associated Wallet */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Associated Wallet (Initial Sync)
                </label>
                <select
                  value={initialWalletId}
                  onChange={(e) => setInitialWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                {/* Helper notice explaining the initial sync */}
                <div className="mt-2 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                  {createType === 'Loan' ? (
                    <span>
                      💸 <span className="font-bold">Loan Outgoing:</span> Funds will be deducted from{' '}
                      <span className="font-bold">{selectedInitialWallet?.name || 'wallet'}</span> and logged as an expense in your ledger.
                    </span>
                  ) : (
                    <span>
                      💰 <span className="font-bold">Debt Incoming:</span> Borrowed funds will be deposited into{' '}
                      <span className="font-bold">{selectedInitialWallet?.name || 'wallet'}</span> and logged as income in your ledger.
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Description / Purpose (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Working capital, project advance, personal loan"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-medium text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-1/2 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#24D0FE]" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Create Record</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLUTION & PAYMENT MODAL */}
      {paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPaymentTarget(null)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
              Record Payment
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {paymentTarget.type === 'Debt'
                ? `Pay back debt to ${paymentTarget.personName}.`
                : `Receive loan repayment from ${paymentTarget.personName}.`}
            </p>

            {/* Current Summary Card */}
            <div className="p-3.5 rounded-2xl bg-[#F8F9FD] border border-black/[0.06] mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Current Remaining Balance
                </span>
                <span className="font-extrabold text-lg text-[#1A1A1A] tracking-tight tabular-nums">
                  {formatIDR(paymentTarget.remainingAmount ?? paymentTarget.totalAmount)}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  paymentTarget.type === 'Loan'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {paymentTarget.type === 'Loan' ? 'Incoming Repayment' : 'Outgoing Settlement'}
              </span>
            </div>

            {paymentError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* Payment Mode (Full vs Partial) */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#F1F3F9] p-1 rounded-full">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('Full');
                      setPartialAmount('');
                    }}
                    className={`py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      paymentMode === 'Full'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Full Settlement
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Partial')}
                    className={`py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      paymentMode === 'Partial'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Partial Installment
                  </button>
                </div>
              </div>

              {/* Partial Amount Input if Partial */}
              {paymentMode === 'Partial' ? (
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Payment Amount (IDR)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={paymentTarget.remainingAmount ?? paymentTarget.totalAmount}
                    placeholder="e.g. 250000"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-sm font-bold text-gray-800 outline-hidden focus:border-black"
                  />
                  {partialAmount && (
                    <div className="text-[11px] text-gray-500 mt-1">
                      Remaining after payment:{' '}
                      <span className="font-bold text-[#1A1A1A]">
                        {formatIDR(
                          Math.max(
                            0,
                            (paymentTarget.remainingAmount ?? paymentTarget.totalAmount) -
                              parseFloat(partialAmount || '0')
                          )
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <span>Settling full balance:</span>
                  <span className="font-bold text-sm tracking-tight tabular-nums">
                    {formatIDR(paymentTarget.remainingAmount ?? paymentTarget.totalAmount)}
                  </span>
                </div>
              )}

              {/* Payment Date */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Settlement Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Wallet for Payment */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  {paymentTarget.type === 'Debt'
                    ? 'Payment Source Wallet (Funds Out)'
                    : 'Repayment Destination Wallet (Funds In)'}
                </label>
                <select
                  value={paymentWalletId}
                  onChange={(e) => setPaymentWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  {paymentTarget.type === 'Debt' ? (
                    <>
                      💳 Paid from <span className="font-bold">{selectedPaymentWallet?.name}</span>. Automatically recorded in ledger under debt settlement.
                    </>
                  ) : (
                    <>
                      📥 Deposited into <span className="font-bold">{selectedPaymentWallet?.name}</span>. Automatically recorded in ledger under loan collection.
                    </>
                  )}
                </p>
              </div>

              {/* Payment Notes */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer, cash settlement, installment #1"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-medium text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => setPaymentTarget(null)}
                  className="w-1/2 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="w-1/2 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#24D0FE]" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Payment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {debtToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-sm w-full p-6 border border-black/10 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-[#1A1A1A] tracking-tight">
                Delete Record
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete the debt/loan record with{' '}
                <span className="font-bold text-gray-800">"{debtToDelete.personName}"</span>?
                This will remove the tracking entry from your ledger.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDebtToDelete(null)}
                className="flex-1 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Record</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
