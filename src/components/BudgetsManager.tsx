import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  ShieldAlert,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Budget, Category, Transaction } from '../types';
import { formatIDR } from '../lib/formatters';

interface BudgetsManagerProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  onSaveBudget: (budget: Omit<Budget, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
}

export const BudgetsManager: React.FC<BudgetsManagerProps> = ({
  budgets,
  categories,
  transactions,
  onSaveBudget,
  onDeleteBudget,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [categoryId, setCategoryId] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === 'Expense');
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  // Sync categoryId state whenever expenseCategories or modal changes
  useEffect(() => {
    if (expenseCategories.length > 0) {
      if (!categoryId || !expenseCategories.some((c) => c.id === categoryId)) {
        setCategoryId(expenseCategories[0].id);
      }
    }
  }, [expenseCategories, showModal, categoryId]);

  // Calculate actual spending for each category in current month
  const getCategorySpending = (catId: string, m: number, y: number) => {
    return transactions
      .filter((t) => {
        if (t.type !== 'Expense' || t.categoryId !== catId) return false;
        const d = new Date(t.transactionDate);
        return d.getMonth() + 1 === m && d.getFullYear() === y;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleOpenModal = (b?: Budget) => {
    setError(null);
    if (b) {
      setEditingBudget(b);
      setCategoryId(b.categoryId);
      setLimitAmount(b.limitAmount.toString());
      setMonth(b.month);
      setYear(b.year);
    } else {
      setEditingBudget(null);
      setCategoryId(expenseCategories[0]?.id || '');
      setLimitAmount('');
      setMonth(currentMonth);
      setYear(currentYear);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(limitAmount);

    const effectiveCategoryId = categoryId || expenseCategories[0]?.id;
    if (!effectiveCategoryId) {
      setError('Please select an expense category.');
      return;
    }

    if (isNaN(limit) || limit <= 0) {
      setError('Please enter a valid monthly limit amount (e.g. 1,000,000).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const budgetPayload: Omit<Budget, 'id' | 'createdAt'> & { id?: string } = {
        userId: '',
        categoryId: effectiveCategoryId,
        limitAmount: limit,
        month: Number(month),
        year: Number(year),
      };
      if (editingBudget?.id) {
        budgetPayload.id = editingBudget.id;
      }
      await onSaveBudget(budgetPayload);
      setShowModal(false);
      setLimitAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to save budget limit.');
    } finally {
      setSaving(false);
    }
  };

  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.limitAmount, 0);
  const totalBudgetSpent = budgets.reduce(
    (acc, b) => acc + getCategorySpending(b.categoryId, b.month, b.year),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header overview card */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-black/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Monthly Category Budgets
          </span>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-[#1A1A1A] mt-1 tracking-tight tabular-nums">
            {formatIDR(totalBudgetSpent)} / {formatIDR(totalBudgetLimit)}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)}
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-3 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-semibold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 text-[#24D0FE]" />
          <span>Set Budget Limit</span>
        </button>
      </div>

      {/* Budget Cards List */}
      {budgets.length === 0 ? (
        <div className="bg-white rounded-[28px] p-12 text-center border border-black/[0.06]">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3 text-amber-700">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-[#1A1A1A] mb-1 tracking-tight">
            No Budgets Configured Yet
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            Set category spending limits to keep your cash flow healthy and prevent overspending.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-full bg-black hover:bg-gray-800 text-white font-bold text-xs cursor-pointer"
          >
            Create First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((b) => {
            const spent = getCategorySpending(b.categoryId, b.month, b.year);
            const percentage = Math.min((spent / b.limitAmount) * 100, 150);
            const isOverBudget = spent > b.limitAmount;
            const isWarning = !isOverBudget && percentage >= 80;
            const remaining = b.limitAmount - spent;

            let barColor = '#24D0FE';
            if (isWarning) barColor = '#FBBF24';
            if (isOverBudget) barColor = '#EF4444';

            return (
              <div
                key={b.id}
                className={`bg-white rounded-[28px] p-6 border shadow-xs transition-all relative overflow-hidden ${
                  isOverBudget
                    ? 'border-red-300 ring-2 ring-red-100'
                    : isWarning
                    ? 'border-amber-300'
                    : 'border-black/[0.06]'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-[#1A1A1A] tracking-tight">
                      {catMap.get(b.categoryId) || 'Category'}
                    </h4>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Period: {b.month}/{b.year}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(b)}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
                      title="Edit budget"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteBudget(b.id)}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 flex items-center justify-center cursor-pointer transition-colors"
                      title="Delete budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status Pill Warning Badge */}
                <div className="mb-4">
                  {isOverBudget ? (
                    <div className="px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-bold flex items-center gap-1.5 w-fit">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Over Budget! ({percentage.toFixed(0)}%)</span>
                    </div>
                  ) : isWarning ? (
                    <div className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 w-fit">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Near Limit ({percentage.toFixed(0)}%)</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5 w-fit">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>On Track ({percentage.toFixed(0)}%)</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar with rounded cap */}
                <div className="space-y-2">
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-600">
                      Spent: <span className="text-[#1A1A1A]">{formatIDR(spent)}</span>
                    </span>
                    <span className="text-gray-600">
                      Limit: <span className="text-[#1A1A1A]">{formatIDR(b.limitAmount)}</span>
                    </span>
                  </div>
                </div>

                {/* Footer remaining */}
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs flex items-center justify-between">
                  <span className="text-gray-500">Remaining Budget:</span>
                  <span
                    className={`font-bold text-sm tracking-tight tabular-nums ${
                      remaining >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {remaining >= 0 ? formatIDR(remaining) : `-${formatIDR(Math.abs(remaining))}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
              {editingBudget ? 'Edit Budget Limit' : 'Set Category Budget'}
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Define monthly spending caps to control your cash flow automatically.
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Select Expense Category
                </label>
                <select
                  value={categoryId || expenseCategories[0]?.id || ''}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Monthly Limit (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="10000"
                  placeholder="e.g. 1500000"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-sm font-bold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
                          new Date(2026, m - 1, 1)
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#24D0FE]" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Budget</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
