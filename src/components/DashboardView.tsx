import React, { useState } from 'react';
import {
  Wallet as WalletIcon,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  PiggyBank,
  CheckCircle2,
  Coins,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import {
  Transaction,
  Wallet,
  Category,
  Budget,
  SavingsGoal,
  DebtReceivable,
  DebtLoan,
  Bill,
  UserProfile,
} from '../types';
import { formatIDR, formatShortIDR, resolveTransactionCategory } from '../lib/formatters';
import { CashflowChart } from './CashflowChart';
import { CategoryPieChart } from './CategoryPieChart';
import { exportTransactionsToCSV, exportTransactionsToPDF } from '../lib/exportUtils';
import { Receipt, HandCoins, ExternalLink } from 'lucide-react';

interface DashboardViewProps {
  user: UserProfile;
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  debts: DebtReceivable[];
  debtLoans?: DebtLoan[];
  bills?: Bill[];
  onOpenNLP: () => void;
  onOpenReceiptScan: () => void;
  onOpenManualTx: () => void;
  onNavigateTab: (tab: string) => void;
}

// Brand color palette helper for wallets
const getWalletTheme = (wallet: Wallet | null) => {
  if (!wallet) {
    // All Wallets / Master Central Treasury Vault (Obsidian Platinum with Gold & Cyan Accents)
    return {
      gradient: 'from-[#141418] via-[#0D0D11] to-[#1C1A29]',
      border: 'border-white/15',
      tagBg: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
      accentColor: '#24D0FE',
      typeLabel: 'ALL ASSETS & VAULT',
      icon: Coins,
    };
  }

  const name = wallet.name.toLowerCase();
  const type = wallet.type;

  if (name.includes('gopay')) {
    return {
      gradient: 'from-[#001F3F] via-[#004B87] to-[#00AEDB]',
      border: 'border-[#00AEDB]/30',
      tagBg: 'bg-[#00AEDB]/20 text-sky-200 border-[#00AEDB]/40',
      accentColor: '#00AEDB',
      typeLabel: 'GOPAY E-WALLET',
      icon: Smartphone,
    };
  }
  if (name.includes('ovo')) {
    return {
      gradient: 'from-[#240D3E] via-[#481E7F] to-[#7B4CE6]',
      border: 'border-[#7B4CE6]/30',
      tagBg: 'bg-[#7B4CE6]/20 text-purple-200 border-[#7B4CE6]/40',
      accentColor: '#A78BFA',
      typeLabel: 'OVO DIGITAL WALLET',
      icon: Smartphone,
    };
  }
  if (name.includes('dana')) {
    return {
      gradient: 'from-[#072B4A] via-[#0D5C99] to-[#118EEA]',
      border: 'border-[#118EEA]/30',
      tagBg: 'bg-[#118EEA]/20 text-sky-100 border-[#118EEA]/40',
      accentColor: '#38BDF8',
      typeLabel: 'DANA E-WALLET',
      icon: Smartphone,
    };
  }
  if (name.includes('shopeepay') || name.includes('shopee')) {
    return {
      gradient: 'from-[#4D1204] via-[#992C0C] to-[#EE4D2D]',
      border: 'border-[#EE4D2D]/30',
      tagBg: 'bg-[#EE4D2D]/20 text-orange-200 border-[#EE4D2D]/40',
      accentColor: '#FB923C',
      typeLabel: 'SHOPEEPAY WALLET',
      icon: Smartphone,
    };
  }
  if (type === 'Bank' || name.includes('bca') || name.includes('mandiri') || name.includes('bri') || name.includes('payroll')) {
    return {
      gradient: 'from-[#0A182F] via-[#0F2548] to-[#17386D]',
      border: 'border-[#24D0FE]/25',
      tagBg: 'bg-[#24D0FE]/15 text-[#63E2FF] border-[#24D0FE]/30',
      accentColor: '#24D0FE',
      typeLabel: 'BANK ACCOUNT (PAYROLL)',
      icon: Landmark,
    };
  }
  if (type === 'Cash' || name.includes('tunai') || name.includes('cash')) {
    return {
      gradient: 'from-[#04281E] via-[#064E3B] to-[#059669]',
      border: 'border-emerald-500/30',
      tagBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
      accentColor: '#34D399',
      typeLabel: 'PHYSICAL CASH',
      icon: Banknote,
    };
  }

  // Default custom account
  return {
    gradient: 'from-[#171923] via-[#232738] to-[#363A50]',
    border: 'border-white/10',
    tagBg: 'bg-white/10 text-gray-200 border-white/20',
    accentColor: '#E2E8F0',
    typeLabel: `${wallet.type.toUpperCase()} ACCOUNT`,
    icon: WalletIcon,
  };
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  wallets,
  categories,
  transactions,
  budgets,
  savingsGoals,
  debts,
  debtLoans = [],
  bills = [],
  onOpenNLP,
  onOpenReceiptScan,
  onOpenManualTx,
  onNavigateTab,
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const walletMap = new Map(wallets.map((w) => [w.id, w.name]));

  // Total Net Worth & Liquid Portfolio (including Virtual Vaults per PRD v3)
  const totalLiquidBalance = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);
  const totalSavingsVaults = savingsGoals.reduce((acc, g) => acc + (g.currentAmount || 0), 0);
  const totalNetWorth = totalLiquidBalance + totalSavingsVaults;

  // Time calculations
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Metrics
  const weeklyExpense = transactions
    .filter((t) => t.type === 'Expense' && new Date(t.transactionDate) >= oneWeekAgo)
    .reduce((acc, t) => acc + t.amount, 0);

  const monthlyExpense = transactions
    .filter((t) => t.type === 'Expense' && new Date(t.transactionDate) >= startOfMonth)
    .reduce((acc, t) => acc + t.amount, 0);

  const monthlyIncome = transactions
    .filter((t) => t.type === 'Income' && new Date(t.transactionDate) >= startOfMonth)
    .reduce((acc, t) => acc + t.amount, 0);

  // Budget warnings
  const budgetAlerts = budgets.filter((b) => {
    const spentInCat = transactions
      .filter((t) => {
        if (t.type !== 'Expense' || t.categoryId !== b.categoryId) return false;
        const d = new Date(t.transactionDate);
        return d.getMonth() + 1 === b.month && d.getFullYear() === b.year;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    return spentInCat >= b.limitAmount * 0.8;
  });

  // Slider Slides: Index 0 is "Total Portfolio", Index 1..N are individual wallets
  const totalSlides = 1 + wallets.length;
  const isMasterSlide = activeSlideIndex === 0;
  const currentWallet = isMasterSlide ? null : wallets[activeSlideIndex - 1];
  const walletTheme = getWalletTheme(currentWallet);
  const CardIcon = walletTheme.icon;

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome Bar & Action Pills */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] tracking-tight">
              Welcome back, {user.displayName || 'Friend'} 👋
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Here is your liquid wealth overview, spending pulse, and budget health for today.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTransactionsToCSV(transactions, wallets, categories)}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-gray-100 text-gray-800 text-xs font-semibold flex items-center gap-1.5 border border-black/[0.08] shadow-2xs transition-all cursor-pointer"
            title="Download CSV file for Excel / Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            onClick={() =>
              exportTransactionsToPDF(transactions, wallets, categories, user.displayName)
            }
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-gray-100 text-gray-800 text-xs font-semibold flex items-center gap-1.5 border border-black/[0.08] shadow-2xs transition-all cursor-pointer"
            title="Download PDF Financial Report"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Hero Financial Overview: Interactive Multi-Wallet Slider Card + 3 Core Metric Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Interactive Multi-Wallet Carousel Card (Col 5) */}
        <div className="lg:col-span-5 relative group">
          {/* Subtle ambient back-glow matching active wallet theme */}
          <div
            className="absolute -inset-1 rounded-[34px] opacity-40 blur-lg transition-all duration-500 pointer-events-none"
            style={{ backgroundColor: walletTheme.accentColor }}
          />

          {/* Luxury Obsidian Card Container */}
          <div
            className={`relative rounded-[32px] bg-gradient-to-br ${walletTheme.gradient} text-white p-6 sm:p-7 border ${walletTheme.border} shadow-xl flex flex-col justify-between h-full min-h-[270px] transition-all duration-500 overflow-hidden`}
          >
            {isMasterSlide ? (
              /* All Wallets / Central Treasury Vault Card with minimalist wealth & vault elements */
              <div className="flex flex-col justify-between h-full relative z-10">
                <div>
                  {/* Top Row: Central Treasury Vault Badge & Navigation */}
                  <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400/20 via-[#24D0FE]/20 to-purple-500/20 border border-white/15 flex items-center justify-center text-white backdrop-blur-md shadow-inner shrink-0">
                        <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                      </div>
                      <span className="px-2 py-0.5 sm:px-2.5 rounded-full text-[9.5px] sm:text-[10px] font-bold tracking-wider uppercase border border-amber-400/30 bg-amber-400/10 text-amber-200 truncate">
                        CENTRAL TREASURY VAULT
                      </span>
                    </div>

                    {/* Slider Chevrons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={handlePrevSlide}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                        title="Previous wallet"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNextSlide}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                        title="Next wallet"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Multi-Asset Minimalist Chips: Bank, E-Wallets, Cash */}
                  <div className="flex items-center gap-1.5 flex-wrap my-1.5 sm:my-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/10 text-[9.5px] sm:text-[10px] text-gray-200 font-medium">
                      <Landmark className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                      <span>Bank Accounts</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/10 text-[9.5px] sm:text-[10px] text-gray-200 font-medium">
                      <Smartphone className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                      <span>E-Wallets</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/10 text-[9.5px] sm:text-[10px] text-gray-200 font-medium">
                      <Banknote className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      <span>Physical Cash</span>
                    </span>
                  </div>

                  {/* Balance Display */}
                  <div className="mt-2.5 relative z-10">
                    <span className="text-[11px] font-medium text-gray-300 uppercase tracking-wider block">
                      Total Net Worth &amp; Liquid Portfolio
                    </span>
                    <h3 className="font-extrabold text-2xl sm:text-4xl text-white tracking-tight mt-0.5 tabular-nums">
                      {formatIDR(totalNetWorth)}
                    </h3>
                    <p className="text-xs text-gray-300 mt-1 max-w-sm">
                      Consolidated wealth across {wallets.length} active {wallets.length === 1 ? 'account' : 'accounts & e-wallets'}
                      {savingsGoals.length > 0 ? ` + ${savingsGoals.length} savings vaults` : ''}
                    </p>
                  </div>
                </div>

                {/* Subtle Luxury Vault & Bullion Coins Watermark SVG */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 sm:w-36 sm:h-36 pointer-events-none opacity-10 sm:opacity-20 overflow-hidden">
                  <svg viewBox="0 0 120 120" className="w-full h-full">
                    <circle cx="65" cy="65" r="46" stroke="#24D0FE" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                    <circle cx="65" cy="65" r="35" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
                    <circle cx="65" cy="65" r="22" stroke="#FFFFFF" strokeWidth="1" fill="none" />
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <line
                        key={deg}
                        x1="65"
                        y1="30"
                        x2="65"
                        y2="42"
                        stroke="#F59E0B"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        transform={`rotate(${deg} 65 65)`}
                      />
                    ))}
                    <text x="59" y="70" fill="#F59E0B" fontSize="13" fontWeight="bold" fontFamily="sans-serif">Rp</text>
                  </svg>
                </div>

                {/* Bottom Row */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 mt-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-[200px]">
                    <button
                      onClick={() => setActiveSlideIndex(0)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeSlideIndex === 0 ? 'w-6 bg-[#24D0FE]' : 'w-2 bg-white/30 hover:bg-white/60'
                      }`}
                      title="All Wallets"
                    />
                    {wallets.map((w, idx) => (
                      <button
                        key={w.id}
                        onClick={() => setActiveSlideIndex(idx + 1)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          activeSlideIndex === idx + 1 ? 'w-6 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'
                        }`}
                        title={w.name}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => onNavigateTab('wallets')}
                    className="text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer group/link"
                  >
                    <span>Manage Wallets</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Individual Wallet (Bank/Payroll, GoPay, OVO, Dana, ShopeePay, Cash) */
              <div className="flex flex-col justify-between h-full relative z-10">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white backdrop-blur-md shadow-inner"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                      >
                        <CardIcon className="w-3.5 h-3.5" style={{ color: walletTheme.accentColor }} />
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${walletTheme.tagBg}`}
                      >
                        {walletTheme.typeLabel}
                      </span>
                    </div>

                    {/* Slider Chevrons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handlePrevSlide}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                        title="Previous wallet"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNextSlide}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                        title="Next wallet"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Balance Title & Amount */}
                  <div className="mt-2 relative z-10">
                    <span className="text-[11px] font-medium text-gray-300 uppercase tracking-wider block">
                      {currentWallet?.name}
                    </span>
                    <h3 className="font-extrabold text-2xl sm:text-4xl text-white tracking-tight mt-1 tabular-nums">
                      {formatIDR(currentWallet?.balance || 0)}
                    </h3>
                    <p className="text-xs text-gray-300 mt-1">
                      {totalNetWorth > 0
                        ? `${(((currentWallet?.balance || 0) / totalNetWorth) * 100).toFixed(1)}% of your total net worth`
                        : 'Active balance'}
                    </p>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-[200px]">
                    <button
                      onClick={() => setActiveSlideIndex(0)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeSlideIndex === 0 ? 'w-6 bg-[#24D0FE]' : 'w-2 bg-white/30 hover:bg-white/60'
                      }`}
                      title="All Wallets"
                    />
                    {wallets.map((w, idx) => (
                      <button
                        key={w.id}
                        onClick={() => setActiveSlideIndex(idx + 1)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          activeSlideIndex === idx + 1 ? 'w-6 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'
                        }`}
                        title={w.name}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => onNavigateTab('wallets')}
                    className="text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer group/link"
                  >
                    <span>Manage Wallets</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3 Core Metric Stat Cards (Col 7) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stat 1: Weekly Outflow */}
          <div className="bg-white rounded-[28px] p-5 border border-black/[0.06] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Weekly Expenses
              </span>
              <h4 className="font-extrabold text-xl sm:text-2xl text-[#1A1A1A] mt-1 tracking-tight tabular-nums">
                {formatIDR(weeklyExpense)}
              </h4>
            </div>
            <span className="text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-100">
              Last 7 Days
            </span>
          </div>

          {/* Stat 2: Monthly Outflow */}
          <div className="bg-white rounded-[28px] p-5 border border-black/[0.06] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Monthly Expenses
              </span>
              <h4 className="font-extrabold text-xl sm:text-2xl text-[#1A1A1A] mt-1 tracking-tight tabular-nums">
                {formatIDR(monthlyExpense)}
              </h4>
            </div>
            <span className="text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-100">
              {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(now)}
            </span>
          </div>

          {/* Stat 3: Monthly Inflow */}
          <div className="bg-white rounded-[28px] p-5 border border-black/[0.06] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Monthly Income
              </span>
              <h4 className="font-extrabold text-xl sm:text-2xl text-[#1A1A1A] mt-1 tracking-tight tabular-nums">
                {formatIDR(monthlyIncome)}
              </h4>
            </div>
            <span className="text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-100">
              Net Flow:{' '}
              <span
                className={`font-bold ${
                  monthlyIncome >= monthlyExpense ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {monthlyIncome >= monthlyExpense ? '+' : ''}
                {formatIDR(monthlyIncome - monthlyExpense)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Budget Warning Banner if any category is nearing or over budget */}
      {budgetAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-[28px] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                Budget Health Alert
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {budgetAlerts.length} spending {budgetAlerts.length === 1 ? 'category has' : 'categories have'} reached or exceeded 80% of your allocated monthly limits.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('budgets')}
            className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Review Budgets
          </button>
        </div>
      )}

      {/* Visual Data Section: Line Chart + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <CashflowChart transactions={transactions} />
        </div>
        <div className="lg:col-span-5">
          <CategoryPieChart transactions={transactions} categories={categories} />
        </div>
      </div>

      {/* Ongoing Commitments & Credit Overview (Bills & Debts Summary Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Ongoing Bills Overview */}
        {(() => {
          const activeBillsList = bills || [];
          const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const unpaidBills = activeBillsList.filter((b: Bill) => b.lastPaidPeriod !== currentPeriod);
          const unpaidBillsTotal = unpaidBills.reduce((acc: number, b: Bill) => acc + b.expectedAmount, 0);
          const paidCount = activeBillsList.length - unpaidBills.length;

          return (
            <div className="bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between relative overflow-hidden group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                        Recurring Commitments
                      </span>
                      <h4 className="font-bold text-lg text-[#1A1A1A] tracking-tight">
                        Ongoing Bills
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('bills')}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors cursor-pointer"
                    title="Open Bills Manager"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                  <div>
                    <span className="text-[11px] font-medium text-gray-500 block">Pending Settlement</span>
                    <span className="font-extrabold text-base sm:text-lg text-amber-600 tabular-nums">
                      {formatIDR(unpaidBillsTotal)}
                    </span>
                    <span className="text-[10px] text-amber-700/80 block mt-0.5 font-medium">
                      {unpaidBills.length} {unpaidBills.length === 1 ? 'bill' : 'bills'} awaiting pay
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-gray-500 block">Current Cycle Status</span>
                    <span className="font-extrabold text-base sm:text-lg text-emerald-600 tabular-nums">
                      {paidCount} / {activeBillsList.length}
                    </span>
                    <span className="text-[10px] text-emerald-700/80 block mt-0.5 font-medium">
                      {paidCount === activeBillsList.length && activeBillsList.length > 0
                        ? 'All settled!'
                        : 'Bills paid this month'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {activeBillsList.length === 0
                    ? 'No subscriptions configured'
                    : `${activeBillsList.length} active recurring subscriptions`}
                </span>
                <button
                  onClick={() => onNavigateTab('bills')}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Manage Bills</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Card 2: Debts & Loans Summary */}
        {(() => {
          const activeDebtLoans = debtLoans || [];
          const totalReceivable = activeDebtLoans
            .filter((d: DebtLoan) => d.type === 'Loan' && d.status !== 'Solved')
            .reduce((acc: number, d: DebtLoan) => acc + d.remainingAmount, 0);
          const totalLiability = activeDebtLoans
            .filter((d: DebtLoan) => d.type === 'Debt' && d.status !== 'Solved')
            .reduce((acc: number, d: DebtLoan) => acc + d.remainingAmount, 0);
          const activeCount = activeDebtLoans.filter((d: DebtLoan) => d.status !== 'Solved').length;

          return (
            <div className="bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between relative overflow-hidden group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <HandCoins className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                        Credit Pulse
                      </span>
                      <h4 className="font-bold text-lg text-[#1A1A1A] tracking-tight">
                        Debts &amp; Receivables
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('debts')}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors cursor-pointer"
                    title="Open Debts Manager"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                  <div>
                    <span className="text-[11px] font-medium text-gray-500 block">Money Lent (Piutang)</span>
                    <span className="font-extrabold text-base sm:text-lg text-emerald-600 tabular-nums">
                      {formatIDR(totalReceivable)}
                    </span>
                    <span className="text-[10px] text-emerald-700/80 block mt-0.5 font-medium">
                      To be collected
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-gray-500 block">Money Borrowed (Utang)</span>
                    <span className="font-extrabold text-base sm:text-lg text-rose-600 tabular-nums">
                      {formatIDR(totalLiability)}
                    </span>
                    <span className="text-[10px] text-rose-700/80 block mt-0.5 font-medium">
                      To be repaid
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {activeCount === 0
                    ? 'No outstanding credit balances'
                    : `${activeCount} active ${activeCount === 1 ? 'counterparty' : 'counterparties'}`}
                </span>
                <button
                  onClick={() => onNavigateTab('debts')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Manage Debts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Bottom Section: Recent Transactions & Savings Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions (Col 8) */}
        <div className="lg:col-span-8 bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Recent Activity
              </span>
              <h3 className="font-bold text-xl text-[#1A1A1A] mt-0.5 tracking-tight">
                Latest Transactions
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-gray-600 hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              No transactions recorded yet. Click the Record button above to start tracking.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.slice(0, 5).map((t) => {
                const isIncome = t.type === 'Income';
                const isExpense = t.type === 'Expense';
                const resolvedCat = resolveTransactionCategory(t, categories);
                const catName = resolvedCat.name;
                const dateObj = new Date(t.transactionDate);
                const dateStr = !isNaN(dateObj.getTime())
                  ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(dateObj)
                  : t.transactionDate;

                return (
                  <div
                    key={t.id}
                    className="py-3 flex items-center justify-between text-xs hover:bg-gray-50/50 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-800'
                            : isExpense
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : isExpense ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <WalletIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 block">
                          {t.notes || catName}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {dateStr} • {walletMap.get(t.walletId) || 'Wallet'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-bold text-sm tabular-nums tracking-tight ${
                        isIncome ? 'text-emerald-600' : isExpense ? 'text-rose-600' : 'text-cyan-700'
                      }`}
                    >
                      {isIncome ? '+' : isExpense ? '-' : ''}
                      {formatIDR(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Savings Goals Overview (Col 4) */}
        <div className="lg:col-span-4 bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Savings Progress
                </span>
                <h4 className="font-bold text-lg text-[#1A1A1A] mt-0.5 tracking-tight">
                  Financial Goals
                </h4>
              </div>
              <button
                onClick={() => onNavigateTab('savings')}
                className="text-xs font-semibold text-gray-600 hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {savingsGoals.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                No active savings goals. Create your first goal to track your wealth accumulation.
              </div>
            ) : (
              <div className="space-y-4">
                {savingsGoals.slice(0, 3).map((goal) => {
                  const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                  return (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-900 truncate pr-2">
                          {goal.goalName}
                        </span>
                        <span className="text-gray-500 font-medium shrink-0">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct >= 100 ? '#10B981' : '#24D0FE',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>{formatIDR(goal.currentAmount)}</span>
                        <span>{formatIDR(goal.targetAmount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('savings')}
            className="w-full mt-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-black font-semibold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <span>Open Savings Goals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
