import React, { useState } from 'react';
import {
  Vault,
  Plus,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Trash2,
  Trophy,
  Loader2,
  AlertCircle,
  X,
  History,
  Info,
} from 'lucide-react';
import { SavingsGoal, Wallet, Category } from '../types';
import { formatIDR } from '../lib/formatters';

interface SavingsGoalsManagerProps {
  savingsGoals: SavingsGoal[];
  wallets: Wallet[];
  categories?: Category[];
  onCreateGoal: (goal: { goalName: string; targetAmount: number }) => Promise<void>;
  onDepositFunds: (params: {
    goalId: string;
    walletId: string;
    amount: number;
    depositDate: string;
    notes?: string;
  }) => Promise<void>;
  onWithdrawFunds: (params: {
    goalId: string;
    walletId: string;
    amount: number;
    withdrawalDate: string;
    notes?: string;
  }) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

export const SavingsGoalsManager: React.FC<SavingsGoalsManagerProps> = ({
  savingsGoals,
  wallets,
  onCreateGoal,
  onDepositFunds,
  onWithdrawFunds,
  onDeleteGoal,
}) => {
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [depositTarget, setDepositTarget] = useState<SavingsGoal | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<SavingsGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);

  // Create Goal Form state (Deadline-Free per PRD v3)
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Deposit Form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [depositAmount, setDepositAmount] = useState('');
  const [depositWalletId, setDepositWalletId] = useState(wallets[0]?.id || '');
  const [depositDate, setDepositDate] = useState(todayStr);
  const [depositNotes, setDepositNotes] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Withdraw Form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawWalletId, setWithdrawWalletId] = useState(wallets[0]?.id || '');
  const [withdrawDate, setWithdrawDate] = useState(todayStr);
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Portfolio Totals
  const totalAccumulated = savingsGoals.reduce((acc, g) => acc + (g.currentAmount || 0), 0);
  const totalTargetSum = savingsGoals.reduce((acc, g) => acc + (g.targetAmount || 0), 0);
  const overallPct = totalTargetSum > 0 ? Math.min(Math.round((totalAccumulated / totalTargetSum) * 100), 100) : 0;

  // Handle Create Goal
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    if (!goalName.trim()) {
      setCreateError('Please enter a goal name.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setCreateError('Please enter a valid target amount in IDR.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      await onCreateGoal({
        goalName: goalName.trim(),
        targetAmount: target,
      });
      setShowAddModal(false);
      setGoalName('');
      setTargetAmount('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create savings goal.');
    } finally {
      setCreating(false);
    }
  };

  // Open Deposit Modal
  const handleOpenDeposit = (goal: SavingsGoal) => {
    setDepositTarget(goal);
    setDepositAmount('');
    setDepositWalletId(wallets[0]?.id || '');
    setDepositDate(new Date().toISOString().split('T')[0]);
    setDepositNotes('');
    setDepositError(null);
  };

  // Submit Deposit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositTarget) return;

    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      setDepositError('Please enter a valid deposit amount.');
      return;
    }
    if (!depositWalletId) {
      setDepositError('Please select a source wallet.');
      return;
    }

    setDepositing(true);
    setDepositError(null);
    try {
      await onDepositFunds({
        goalId: depositTarget.id,
        walletId: depositWalletId,
        amount: amt,
        depositDate: depositDate || todayStr,
        notes: depositNotes.trim() || undefined,
      });
      setDepositTarget(null);
    } catch (err: any) {
      setDepositError(err.message || 'Failed to deposit funds into vault.');
    } finally {
      setDepositing(false);
    }
  };

  // Open Withdraw Modal
  const handleOpenWithdraw = (goal: SavingsGoal) => {
    setWithdrawTarget(goal);
    setWithdrawAmount('');
    setWithdrawWalletId(wallets[0]?.id || '');
    setWithdrawDate(new Date().toISOString().split('T')[0]);
    setWithdrawNotes('');
    setWithdrawError(null);
  };

  // Submit Withdraw
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawTarget) return;

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.');
      return;
    }
    if (amt > withdrawTarget.currentAmount) {
      setWithdrawError(`Withdrawal amount cannot exceed available savings (${formatIDR(withdrawTarget.currentAmount)}).`);
      return;
    }
    if (!withdrawWalletId) {
      setWithdrawError('Please select a destination wallet.');
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);
    try {
      await onWithdrawFunds({
        goalId: withdrawTarget.id,
        walletId: withdrawWalletId,
        amount: amt,
        withdrawalDate: withdrawDate || todayStr,
        notes: withdrawNotes.trim() || undefined,
      });
      setWithdrawTarget(null);
    } catch (err: any) {
      setWithdrawError(err.message || 'Failed to withdraw funds from vault.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!goalToDelete) return;
    setDeleting(true);
    try {
      await onDeleteGoal(goalToDelete.id);
      setGoalToDelete(null);
    } catch (err) {
      console.error('Failed to delete goal card:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Banner Card */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-black/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#24D0FE] animate-pulse" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Virtual Vaults &amp; Savings Goals
            </span>
          </div>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-[#1A1A1A] mt-1 tracking-tight tabular-nums">
            {formatIDR(totalAccumulated)}
            <span className="text-base sm:text-xl font-normal text-gray-400 ml-2">
              / {formatIDR(totalTargetSum)}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2">
            <span>{savingsGoals.length} active {savingsGoals.length === 1 ? 'goal' : 'goals'} in progress</span>
            <span>•</span>
            <span className="font-semibold text-[#1A1A1A]">{overallPct}% funded overall</span>
          </p>
        </div>

        <button
          onClick={() => {
            setGoalName('');
            setTargetAmount('');
            setCreateError(null);
            setShowAddModal(true);
          }}
          className="px-5 py-3 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Goal Cards Grid */}
      {savingsGoals.length === 0 ? (
        <div className="bg-white rounded-[28px] p-12 text-center border border-black/[0.06] shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-indigo-600">
            <Vault className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
            No Savings Goals Set Yet
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-5 leading-relaxed">
            Create simple, deadline-free goals for your emergency fund, mutual funds, gold accumulation, or personal dreams. Move funds in and out of your Virtual Vault anytime.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white font-bold text-xs cursor-pointer shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savingsGoals.map((goal) => {
            const current = goal.currentAmount || 0;
            const target = goal.targetAmount || 1;
            const percentage = Math.min(Math.round((current / target) * 100), 100);
            const isCompleted = current >= target;
            const remaining = Math.max(target - current, 0);

            return (
              <div
                key={goal.id}
                className={`bg-white rounded-[28px] p-6 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                  isCompleted
                    ? 'border-emerald-200/80 shadow-xs hover:border-emerald-300'
                    : 'border-black/[0.06] shadow-xs hover:border-black/15 hover:shadow-md'
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}
                      >
                        <Vault className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-[#1A1A1A] leading-tight tracking-tight">
                          {goal.goalName}
                        </h4>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                          Virtual Vault
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setGoalToDelete(goal)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    {isCompleted ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed (100% Target Reached) 🎉</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 text-xs font-bold inline-flex items-center gap-1 border border-cyan-100">
                        <span>{percentage}% Achieved</span>
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-black/[0.04]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-[#24D0FE]'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex items-baseline justify-between text-xs pt-1">
                      <span className="font-extrabold text-base text-[#1A1A1A] tracking-tight tabular-nums">
                        {formatIDR(current)}
                      </span>
                      <span className="text-gray-500 font-medium text-[11px]">
                        Target: <span className="font-semibold text-gray-700">{formatIDR(goal.targetAmount)}</span>
                      </span>
                    </div>

                    {!isCompleted && (
                      <div className="text-[11px] text-gray-400 font-medium">
                        Remaining: <span className="font-semibold text-gray-600">{formatIDR(remaining)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons & Footer */}
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenDeposit(goal)}
                      className="py-2 px-3 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 text-[#24D0FE]" />
                      <span>Deposit Funds</span>
                    </button>

                    <button
                      onClick={() => handleOpenWithdraw(goal)}
                      disabled={current <= 0}
                      className={`py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-transform cursor-pointer border ${
                        current > 0
                          ? 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200 active:scale-95 shadow-2xs'
                          : 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Withdraw Funds</span>
                    </button>
                  </div>

                  {/* Last Withdrawn Timestamp info */}
                  {goal.lastWithdrawnAt && (
                    <div className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                      <History className="w-3 h-3 text-gray-400" />
                      <span>Last Withdrawn on {goal.lastWithdrawnAt}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE GOAL MODAL (Deadline-Free per PRD v3) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
              Create Savings Goal
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Set up a deadline-free goal card. Allocate and liquidate funds anytime through your Virtual Vault.
            </p>

            {createError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, Mutual Funds Gold, Dream Vacation"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Target Amount (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  placeholder="e.g. 10000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-sm font-bold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-bold">Deadline-Free Setup:</span> No target dates required. Deposits and withdrawals automatically sync with your master ledger.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowAddModal(false)}
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
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Goal</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPOSIT FUNDS MODAL */}
      {depositTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative">
            <button
              onClick={() => setDepositTarget(null)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
              Deposit Funds
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Allocate investment capital to <span className="font-bold text-black">"{depositTarget.goalName}"</span>.
            </p>

            {depositError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{depositError}</span>
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Deposit Amount (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 500000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-sm font-bold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Source Wallet
                </label>
                <select
                  value={depositWalletId}
                  onChange={(e) => setDepositWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Deposit Date
                </label>
                <input
                  type="date"
                  required
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly salary allocation, bonus deposit"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-medium text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div className="p-3 rounded-2xl bg-cyan-50/70 border border-cyan-100 text-[11px] text-cyan-950 leading-relaxed">
                💡 <span className="font-bold">Virtual Vault Accounting:</span> The source wallet balance decreases, but your <span className="font-bold">Total Net Worth remains unchanged</span>. Automatically recorded under <span className="font-bold text-indigo-700">"Deposit Invest"</span>.
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={depositing}
                  onClick={() => setDepositTarget(null)}
                  className="w-1/2 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={depositing}
                  className="w-1/2 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {depositing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#24D0FE]" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Deposit</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW FUNDS MODAL (Disinvestment / Liquidation per PRD v3) */}
      {withdrawTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative">
            <button
              onClick={() => setWithdrawTarget(null)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
              Withdraw Funds
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Liquidate savings from <span className="font-bold text-black">"{withdrawTarget.goalName}"</span> to your active wallet.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#F8F9FD] border border-black/[0.06] mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Available in Vault
                </span>
                <span className="font-extrabold text-lg text-[#1A1A1A] tracking-tight tabular-nums">
                  {formatIDR(withdrawTarget.currentAmount)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawAmount(String(withdrawTarget.currentAmount))}
                className="px-3 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-[11px] font-bold transition-all cursor-pointer"
              >
                Withdraw 100%
              </button>
            </div>

            {withdrawError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Withdrawal Amount (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={withdrawTarget.currentAmount}
                  placeholder="e.g. 500000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-sm font-bold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Destination Wallet
                </label>
                <select
                  value={withdrawWalletId}
                  onChange={(e) => setWithdrawWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Withdrawal Date
                </label>
                <input
                  type="date"
                  required
                  value={withdrawDate}
                  onChange={(e) => setWithdrawDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Partial liquidation, fund rebalancing"
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-medium text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 text-[11px] text-amber-950 leading-relaxed">
                📥 <span className="font-bold">Liquidation Notice:</span> Funds will be added to your destination wallet. Automatically recorded in ledger under <span className="font-bold text-emerald-700">"Investment Withdrawal"</span>.
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={withdrawing}
                  onClick={() => setWithdrawTarget(null)}
                  className="w-1/2 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawing}
                  className="w-1/2 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {withdrawing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#24D0FE]" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Withdrawal</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-sm w-full p-6 border border-black/10 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-[#1A1A1A] tracking-tight">
                Delete Goal Card
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-gray-800">"{goalToDelete.goalName}"</span>?
                Your historical deposit and withdrawal ledger entries will remain completely intact.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setGoalToDelete(null)}
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
                  <span>Delete Goal</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
