import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { Transaction, Wallet, Category, Budget, SavingsGoal, DebtReceivable, FinancialAdvice } from '../types';
import { formatIDR } from '../lib/formatters';

interface AIAdvisorViewProps {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  debts: DebtReceivable[];
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({
  transactions,
  wallets,
  categories,
  budgets,
  savingsGoals,
  debts,
}) => {
  const [advice, setAdvice] = useState<FinancialAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvice = async () => {
    setLoading(true);
    setError(null);

    // Prepare clean summary
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const totalLiquid = wallets.reduce((s, w) => s + w.balance, 0);

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    const monthlyTxs = transactions.filter((t) => {
      const d = new Date(t.transactionDate);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const monthlyIncome = monthlyTxs
      .filter((t) => t.type === 'Income')
      .reduce((s, t) => s + t.amount, 0);

    const monthlyExpense = monthlyTxs
      .filter((t) => t.type === 'Expense')
      .reduce((s, t) => s + t.amount, 0);

    // Spending by category
    const categoryBreakdown: Record<string, number> = {};
    monthlyTxs
      .filter((t) => t.type === 'Expense')
      .forEach((t) => {
        const catName = t.categoryId ? (catMap.get(t.categoryId) || 'Lain-lain') : 'Lain-lain';
        categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;
      });

    // Unpaid debts
    const unpaidDebtTotal = debts
      .filter((d) => d.type === 'Debt' && d.status === 'Unpaid')
      .reduce((s, d) => s + d.amount, 0);

    const unpaidReceivableTotal = debts
      .filter((d) => d.type === 'Receivable' && d.status === 'Unpaid')
      .reduce((s, d) => s + d.amount, 0);

    const summaryData = {
      totalLiquidWealthIDR: totalLiquid,
      monthlyIncomeIDR: monthlyIncome,
      monthlyExpenseIDR: monthlyExpense,
      netCashflowIDR: monthlyIncome - monthlyExpense,
      spendingByCategory: categoryBreakdown,
      budgetsCount: budgets.length,
      savingsGoalsCount: savingsGoals.length,
      totalUnpaidDebtsIDR: unpaidDebtTotal,
      totalUnpaidReceivablesIDR: unpaidReceivableTotal,
      sampleRecentTransactions: transactions.slice(0, 10).map((t) => ({
        type: t.type,
        amount: t.amount,
        notes: t.notes,
        category: t.categoryId ? catMap.get(t.categoryId) : undefined,
      })),
    };

    try {
      const response = await fetch('/api/ai/financial-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryData }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Gagal memuat nasihat keuangan.');
      }
      setAdvice(resJson.data);
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung dengan AI Advisor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!advice && transactions.length > 0) {
      fetchAdvice();
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-[#1E1B4B] rounded-[32px] p-6 lg:p-8 text-white relative overflow-hidden shadow-xl border border-black/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAFF00] text-black text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google AI Studio Powered</span>
          </div>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-white mb-2 tracking-tight">
            AI Financial Advisor &amp; Health Score
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Analisis holistik arus kas pribadi, deteksi lonjakan pengeluaran, kepatuhan anggaran, dan saran percepatan target tabungan secara personal.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3 relative z-10">
          <button
            onClick={fetchAdvice}
            disabled={loading}
            className="px-5 py-2.5 rounded-full bg-[#24D0FE] hover:bg-[#18b8e0] text-black text-xs font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menganalisis Transaksi...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Analisis Ulang Finansial</span>
              </>
            )}
          </button>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#BABDFF]/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 right-20 w-48 h-48 rounded-full bg-[#24D0FE]/20 blur-xl pointer-events-none" />
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-[28px] p-16 text-center border border-black/[0.06] shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#BABDFF]/30 flex items-center justify-center mx-auto text-indigo-900 animate-pulse">
            <BrainCircuit className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="font-bold text-xl text-[#1A1A1A] tracking-tight">
            Gemini AI Sedang Mengaudit Pola Keuangan Anda...
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Memeriksa rasio pengeluaran kategori, alokasi tabungan, dan peringatan potensi boncos bulan ini.
          </p>
        </div>
      )}

      {!loading && advice && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Health Score Gauge (Col 4) */}
          <div className="lg:col-span-4 bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between items-center text-center">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Skor Kesehatan Finansial
              </span>

              {/* Circular Score Visual */}
              <div className="relative w-40 h-40 mx-auto my-3 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r="56"
                    fill="transparent"
                    stroke="#F1F3F9"
                    strokeWidth="12"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="56"
                    fill="transparent"
                    stroke={advice.healthScore >= 75 ? '#10B981' : advice.healthScore >= 50 ? '#24D0FE' : '#EF4444'}
                    strokeWidth="12"
                    strokeDasharray={`${(advice.healthScore / 100) * 352} 352`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-extrabold text-4xl text-[#1A1A1A] tracking-tight tabular-nums">
                    {advice.healthScore}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    / 100
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <span className="px-3.5 py-1.5 rounded-full bg-[#EAFF00] text-black text-xs font-black uppercase tracking-wider inline-block">
                {advice.healthStatus}
              </span>
            </div>

            <div className="w-full pt-4 mt-4 border-t border-gray-100 text-xs text-gray-500">
              <span>Dievaluasi berdasarkan arus kas dan rasio likuiditas</span>
            </div>
          </div>

          {/* Executive Summary & Insights (Col 8) */}
          <div className="lg:col-span-8 bg-white rounded-[28px] p-6 sm:p-8 border border-black/[0.06] shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                  Ringkasan Eksekutif
                </h4>
              </div>
              <p className="font-semibold text-lg sm:text-xl text-[#1A1A1A] leading-relaxed tracking-tight">
                "{advice.executiveSummary}"
              </p>
            </div>

            {/* Actionable Insights */}
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Pola &amp; Wawasan Pengeluaran (Insights)</span>
              </h5>
              <div className="space-y-2.5">
                {advice.insights.map((ins, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#F8F9FD] border border-black/[0.04] text-xs font-medium text-gray-800 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#BABDFF] text-indigo-950 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{ins}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations & Savings Advice */}
            <div className="pt-2">
              <h5 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-600" />
                <span>Rekomendasi Tindakan Cerdas</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {advice.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#EAFF00]/15 border border-[#EAFF00]/40 text-xs font-semibold text-gray-900 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>

              {advice.savingsAdvice && (
                <div className="p-4 rounded-2xl bg-[#FBC6F2]/30 border border-[#FBC6F2] text-xs text-pink-950 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-pink-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Kiat Percepatan Tabungan:</span>
                    <span>{advice.savingsAdvice}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
