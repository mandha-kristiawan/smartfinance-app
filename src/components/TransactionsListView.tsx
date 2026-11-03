import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Search,
  Trash2,
  FileSpreadsheet,
  FileText,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Tags,
  Calendar,
  X,
  Filter,
  Sparkles,
  Plus,
} from 'lucide-react';
import { Transaction, Wallet, Category, ReceiptItem } from '../types';
import { formatIDR, formatShortIDR, resolveTransactionCategory } from '../lib/formatters';
import { exportTransactionsToCSV, exportTransactionsToPDF } from '../lib/exportUtils';

interface TransactionsListViewProps {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  userName: string;
  onDeleteTransaction: (tx: Transaction) => Promise<void>;
  onOpenManualTx: () => void;
  onOpenNLPTx: () => void;
  onOpenCategories: () => void;
}

type TimePeriod = 'all' | 'this_month' | 'last_month' | '7d' | '30d' | 'custom';

export const TransactionsListView: React.FC<TransactionsListViewProps> = ({
  transactions,
  wallets,
  categories,
  userName,
  onDeleteTransaction,
  onOpenManualTx,
  onOpenNLPTx,
  onOpenCategories,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Expense' | 'Income' | 'Transfer'>('All');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('All');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedReceiptItems, setSelectedReceiptItems] = useState<{
    items: ReceiptItem[];
    notes: string;
  } | null>(null);

  const walletMap = new Map(wallets.map((w) => [w.id, w.name]));
  const catObjMap = new Map(categories.map((c) => [c.id, c]));

  // Date filtering helper
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter transactions
  const filtered = transactions.filter((t) => {
    // Type Filter
    if (filterType !== 'All' && t.type !== filterType) return false;

    // Wallet Filter
    if (
      selectedWalletId !== 'All' &&
      t.walletId !== selectedWalletId &&
      t.destWalletId !== selectedWalletId
    ) {
      return false;
    }

    // Time Period Filter
    const txDate = new Date(t.transactionDate);
    if (isNaN(txDate.getTime())) return true;

    if (timePeriod === 'this_month') {
      if (txDate < startOfThisMonth) return false;
    } else if (timePeriod === 'last_month') {
      if (txDate < startOfLastMonth || txDate > endOfLastMonth) return false;
    } else if (timePeriod === '7d') {
      if (txDate < sevenDaysAgo) return false;
    } else if (timePeriod === '30d') {
      if (txDate < thirtyDaysAgo) return false;
    } else if (timePeriod === 'custom') {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (txDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const notesMatch = t.notes?.toLowerCase().includes(q);
      const resolvedCat = resolveTransactionCategory(t, categories);
      const catMatch = resolvedCat.name.toLowerCase().includes(q);
      const amountMatch = t.amount.toString().includes(q);
      const walletMatch = walletMap.get(t.walletId)?.toLowerCase().includes(q);
      if (!notesMatch && !catMatch && !amountMatch && !walletMatch) return false;
    }

    return true;
  });

  // Calculate totals
  const totalExpense = filtered
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = filtered
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const netFlow = totalIncome - totalExpense;

  // Helper to format date header (e.g. "Today", "Yesterday", or "31 Oct 2026")
  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (d.toDateString() === todayStr) return 'Today';
    if (d.toDateString() === yesterdayStr) return 'Yesterday';

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  };

  // Group transactions by date string YYYY-MM-DD
  const groupedTransactions: { [key: string]: Transaction[] } = {};
  filtered.forEach((t) => {
    const dateKey = t.transactionDate.split('T')[0] || t.transactionDate;
    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = [];
    }
    groupedTransactions[dateKey].push(t);
  });

  const sortedDateKeys = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-black/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Transaction Ledger &amp; Cash Flow
          </span>
          <div className="flex items-baseline gap-4 mt-1 flex-wrap">
            <h2 className="font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] tracking-tight">
              {filtered.length} {filtered.length === 1 ? 'Transaction' : 'Transactions'}
            </h2>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Inflow: +{formatIDR(totalIncome)}
              </span>
              <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Outflow: -{formatIDR(totalExpense)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Manage Categories, Export CSV, Print PDF */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenCategories}
            className="px-4 py-2.5 rounded-full bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-gray-200 shadow-2xs"
            title="Manage custom income & expense categories"
          >
            <Tags className="w-3.5 h-3.5 text-indigo-600" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={() => exportTransactionsToCSV(filtered, wallets, categories)}
            className="px-4 py-2.5 rounded-full bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-gray-200 shadow-2xs"
            title="Download CSV for Excel / Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => exportTransactionsToPDF(filtered, wallets, categories, userName)}
            className="px-4 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-xs"
            title="Generate printable PDF statement"
          >
            <FileText className="w-3.5 h-3.5 text-[#24D0FE]" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-[28px] p-5 border border-black/[0.06] shadow-xs space-y-4">
        {/* Row 1: Search & Wallet Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by notes, merchant, category, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black focus:bg-white transition-all"
            />
          </div>

          {/* Wallet selector */}
          <select
            value={selectedWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
            className="px-4 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black transition-all cursor-pointer"
          >
            <option value="All">All Wallets &amp; Accounts</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: Type Filter Pills & Time Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Type:</span>
            {(['All', 'Expense', 'Income', 'Transfer'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === t
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-[#F1F3F9] text-gray-600 hover:text-black hover:bg-gray-200'
                }`}
              >
                {t === 'All'
                  ? 'All Types'
                  : t === 'Expense'
                  ? 'Expenses'
                  : t === 'Income'
                  ? 'Income'
                  : 'Transfers'}
              </button>
            ))}
          </div>

          {/* Time Filter Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Period:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setTimePeriod(p.id as TimePeriod)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  timePeriod === p.id
                    ? 'bg-[#24D0FE] text-black font-bold shadow-xs'
                    : 'bg-[#F1F3F9] text-gray-600 hover:text-black hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {timePeriod === 'custom' && (
          <div className="p-3 bg-[#F8F9FD] rounded-2xl border border-gray-200 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-gray-500 hover:text-red-600 font-medium cursor-pointer underline"
              >
                Clear Custom Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transaction Records List grouped by date */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[28px] p-12 text-center border border-black/[0.06]">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-lg text-[#1A1A1A] mb-1 tracking-tight">
            No Transactions Found
          </h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            Try adjusting your search criteria or period filters, or record a new transaction.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onOpenNLPTx}
              className="px-4 py-2 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Record via AI</span>
            </button>
            <button
              onClick={onOpenManualTx}
              className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold cursor-pointer hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#24D0FE]" />
              <span>Manual Entry</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDateKeys.map((dateKey) => {
            const dayTxs = groupedTransactions[dateKey];
            const dayIncome = dayTxs
              .filter((t) => t.type === 'Income')
              .reduce((sum, t) => sum + t.amount, 0);
            const dayExpense = dayTxs
              .filter((t) => t.type === 'Expense')
              .reduce((sum, t) => sum + t.amount, 0);

            return (
              <div
                key={dateKey}
                className="bg-white rounded-[28px] border border-black/[0.06] overflow-hidden shadow-xs"
              >
                {/* Date Section Header */}
                <div className="px-5 py-3 bg-[#F8F9FD] border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-bold text-sm text-[#1A1A1A] tracking-tight">
                      {formatDateHeader(dateKey)}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      ({dayTxs.length} {dayTxs.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>

                  {/* Daily Net Flow Pills */}
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {dayIncome > 0 && (
                      <span className="text-emerald-600 font-mono text-[11px]">
                        +{formatShortIDR(dayIncome)}
                      </span>
                    )}
                    {dayExpense > 0 && (
                      <span className="text-rose-600 font-mono text-[11px]">
                        -{formatShortIDR(dayExpense)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Transactions List */}
                <div className="divide-y divide-gray-100">
                  {dayTxs.map((t) => {
                    const isIncome = t.type === 'Income';
                    const isExpense = t.type === 'Expense';
                    const isTransfer = t.type === 'Transfer';

                    const resolvedCat = resolveTransactionCategory(t, categories);
                    const categoryName = resolvedCat.name;
                    const categoryColor = resolvedCat.color;

                    const sourceWallet = walletMap.get(t.walletId) || 'Wallet';
                    const destWallet = t.destWalletId ? walletMap.get(t.destWalletId) : null;

                    return (
                      <div
                        key={t.id}
                        className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors group"
                      >
                        {/* Left block with icon & details */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-[220px]">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-800'
                                : isExpense
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-cyan-100 text-cyan-800'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : isExpense ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : (
                              <ArrowRightLeft className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-[#1A1A1A] truncate">
                                {t.notes || (isTransfer ? 'Account Transfer' : categoryName)}
                              </span>

                              {/* Receipt Badge */}
                              {t.receiptItems && (
                                <button
                                  onClick={() => {
                                    try {
                                      const parsed = JSON.parse(t.receiptItems || '[]');
                                      setSelectedReceiptItems({ items: parsed, notes: t.notes });
                                    } catch {}
                                  }}
                                  className="px-2 py-0.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-pink-200 shrink-0"
                                  title="View parsed receipt breakdown"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>Receipt Breakdown</span>
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                              {isTransfer ? (
                                <span className="font-medium text-gray-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                                  {sourceWallet} → {destWallet}
                                </span>
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 font-semibold text-[11px] border border-gray-200">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: categoryColor }}
                                    />
                                    <span>{categoryName}</span>
                                  </span>
                                  <span className="text-gray-500">
                                    via <strong className="text-gray-700 font-semibold">{sourceWallet}</strong>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right block with amount and delete button */}
                        <div className="flex items-center gap-4 shrink-0">
                          <span
                            className={`font-extrabold text-base sm:text-lg tracking-tight tabular-nums ${
                              isIncome
                                ? 'text-emerald-600'
                                : isExpense
                                ? 'text-rose-600'
                                : 'text-cyan-700'
                            }`}
                          >
                            {isIncome ? '+' : isExpense ? '-' : ''}
                            {formatIDR(t.amount)}
                          </span>

                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete transaction "${t.notes || categoryName}"? Wallet balance will be updated.`
                                )
                              ) {
                                onDeleteTransaction(t);
                              }
                            }}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete transaction and rollback balance"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt Itemized Modal */}
      {selectedReceiptItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-black/10 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-pink-700" />
                <h3 className="font-bold text-lg text-[#1A1A1A] tracking-tight">
                  Itemized Receipt Breakdown
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceiptItems(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">{selectedReceiptItems.notes}</p>

            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-2xl">
              {selectedReceiptItems.items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-800 block">{item.itemName}</span>
                    {item.qty && item.qty > 1 && (
                      <span className="text-[11px] text-gray-400">Qty: {item.qty}</span>
                    )}
                  </div>
                  <span className="font-bold text-[#1A1A1A] font-mono">
                    {formatIDR(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedReceiptItems(null)}
              className="w-full mt-4 py-2.5 rounded-full bg-black text-white text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
