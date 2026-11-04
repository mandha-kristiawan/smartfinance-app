import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Download,
  Clock,
} from 'lucide-react';
import { Transaction, Wallet, Category, UserProfile } from '../types';
import { formatIDR, formatDateIndo, resolveTransactionCategory } from '../lib/formatters';
import { exportTransactionsToCSV, exportTransactionsToPDF } from '../lib/exportUtils';

interface ExportViewProps {
  user: UserProfile;
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
}

type DatePreset = 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom';

export const ExportView: React.FC<ExportViewProps> = ({
  user,
  transactions,
  wallets,
  categories,
}) => {
  const now = new Date();

  // Default to 'this_month'
  const [preset, setPreset] = useState<DatePreset>('this_month');

  // Custom date range state
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [customStartDate, setCustomStartDate] = useState<string>(firstDayThisMonth);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const walletMap = useMemo(() => new Map(wallets.map((w) => [w.id, w.name])), [wallets]);

  // Compute effective date range based on active preset or custom inputs in English
  const { startDate, endDate, periodLabel } = useMemo(() => {
    let start: Date;
    let end: Date;
    let label = '';

    if (preset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(now);
    } else if (preset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(start);
    } else if (preset === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      label = `Year ${now.getFullYear()}`;
    } else if (preset === 'all_time') {
      start = new Date('2000-01-01');
      end = new Date('2099-12-31');
      label = 'All-Time Transaction History';
    } else {
      // Custom
      start = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date('2000-01-01');
      end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date('2099-12-31');

      const formatOption: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      const sStr = !isNaN(start.getTime()) ? new Intl.DateTimeFormat('en-GB', formatOption).format(start) : customStartDate;
      const eStr = !isNaN(end.getTime()) ? new Intl.DateTimeFormat('en-GB', formatOption).format(end) : customEndDate;
      label = `${sStr} to ${eStr}`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [preset, customStartDate, customEndDate, now]);

  // Filter transactions within range & sort ASCENDING chronologically (Older first, Newer last per PRD v5)
  const filteredSortedTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const d = new Date(t.transactionDate);
        if (isNaN(d.getTime())) return true;
        return d >= startDate && d <= endDate;
      })
      .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
  }, [transactions, startDate, endDate]);

  // Calculate dynamic summary stats strictly for the filtered timeframe
  const totalIncome = useMemo(() => {
    return filteredSortedTransactions
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredSortedTransactions]);

  const totalExpense = useMemo(() => {
    return filteredSortedTransactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredSortedTransactions]);

  const netCashFlow = totalIncome - totalExpense;

  const handleExportPDF = async () => {
    await exportTransactionsToPDF(
      filteredSortedTransactions,
      wallets,
      categories,
      user.displayName,
      periodLabel,
      `smartfinance-financial-report-${preset}-${now.toISOString().split('T')[0]}.pdf`
    );
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(
      filteredSortedTransactions,
      wallets,
      categories,
      `smartfinance-transactions-${preset}-${now.toISOString().split('T')[0]}.csv`
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src="/logo.png?v=2"
            alt="SmartFinance Logo"
            className="w-11 h-11 rounded-2xl object-contain shadow-sm border border-black/10 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] tracking-tight">
                Export &amp; Financial Reports
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Generate publication-ready CSV and landscape PDF reports with custom timeframe filtering.
            </p>
          </div>
        </div>

        {/* Primary Export Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
            title="Download CSV spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
            title="Download Landscape PDF Financial Report"
          >
            <FileText className="w-4 h-4 text-[#24D0FE]" />
            <span>Export Landscape PDF</span>
          </button>
        </div>
      </div>

      {/* Timeframe Filter Control Panel */}
      <div className="bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center font-bold">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] tracking-tight">
                Report Timeframe Filter
              </h3>
              <p className="text-[11px] text-gray-400">
                Active Period: <span className="font-semibold text-gray-800">{periodLabel}</span>
              </p>
            </div>
          </div>

          <span className="text-xs text-gray-400 font-medium hidden sm:inline">
            {filteredSortedTransactions.length} records selected
          </span>
        </div>

        {/* Preset Selector Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPreset('this_month')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              preset === 'this_month'
                ? 'bg-black text-white shadow-2xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPreset('last_month')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              preset === 'last_month'
                ? 'bg-black text-white shadow-2xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => setPreset('this_year')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              preset === 'this_year'
                ? 'bg-black text-white shadow-2xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            This Year
          </button>
          <button
            onClick={() => setPreset('all_time')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              preset === 'all_time'
                ? 'bg-black text-white shadow-2xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setPreset('custom')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              preset === 'custom'
                ? 'bg-black text-white shadow-2xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Date Inputs if Custom preset is chosen */}
        {preset === 'custom' && (
          <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Filtered Summary Cards (Strictly calculated for the selected timeframe per PRD v5) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Income */}
        <div className="bg-white rounded-[28px] p-5 border border-black/[0.06] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Income
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <h4 className="font-extrabold text-2xl text-emerald-600 tracking-tight tabular-nums mt-1">
              {formatIDR(totalIncome)}
            </h4>
          </div>
          <span className="text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-100 font-medium">
            Calculated for: {periodLabel}
          </span>
        </div>

        {/* Total Expense */}
        <div className="bg-white rounded-[28px] p-5 border border-black/[0.06] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Expenses
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <h4 className="font-extrabold text-2xl text-rose-600 tracking-tight tabular-nums mt-1">
              {formatIDR(totalExpense)}
            </h4>
          </div>
          <span className="text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-100 font-medium">
            Calculated for: {periodLabel}
          </span>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white rounded-[28px] p-5 border border-black/[0.06] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Net Cash Flow
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <h4
              className={`font-extrabold text-2xl tracking-tight tabular-nums mt-1 ${
                netCashFlow >= 0 ? 'text-[#00AEDB]' : 'text-rose-600'
              }`}
            >
              {netCashFlow >= 0 ? '+' : ''}
              {formatIDR(netCashFlow)}
            </h4>
          </div>
          <span className="text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-100 font-medium">
            Net Surplus / Deficit in period
          </span>
        </div>
      </div>

      {/* Live Table Preview (7 Columns Ascending Order per PRD v5) */}
      <div className="bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Live Report Table Preview
            </span>
            <h3 className="font-bold text-lg text-[#1A1A1A] mt-0.5 tracking-tight">
              Export Payload ({filteredSortedTransactions.length} Transactions)
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>Sorted Chronologically (Ascending Order)</span>
          </div>
        </div>

        {filteredSortedTransactions.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            No transactions found in the selected timeframe ({periodLabel}). Adjust your filter to see export preview data.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description / Notes</th>
                  <th className="py-3 px-4">Source Wallet</th>
                  <th className="py-3 px-4">Destination Wallet</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredSortedTransactions.map((t) => {
                  const dateStr = formatDateIndo(t.transactionDate);
                  const isIncome = t.type === 'Income';
                  const isExpense = t.type === 'Expense';
                  const typeLabel = isIncome ? 'Income' : isExpense ? 'Expense' : 'Transfer';
                  const categoryName = resolveTransactionCategory(t, categories).name || '-';
                  const notes = t.notes || '-';

                  // Wallet resolution per ERD v5 2.1:
                  // Expense: source = walletId, dest = '-'
                  // Income: source = '-', dest = destWalletId || walletId
                  // Transfer: source = walletId, dest = destWalletId
                  const sourceWallet = isIncome
                    ? '-'
                    : walletMap.get(t.walletId) || '-';

                  const destWallet = isExpense
                    ? '-'
                    : walletMap.get(t.destWalletId || t.walletId) || '-';

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium whitespace-nowrap text-gray-600">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isExpense
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {categoryName}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs break-words">
                        {notes}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700 whitespace-nowrap">
                        {sourceWallet}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700 whitespace-nowrap">
                        {destWallet}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap text-gray-900">
                        <span
                          className={
                            isIncome
                              ? 'text-emerald-600'
                              : isExpense
                              ? 'text-rose-600'
                              : 'text-sky-700'
                          }
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {formatIDR(t.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
