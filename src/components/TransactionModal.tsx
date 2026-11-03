import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Loader2,
} from 'lucide-react';
import { Wallet, Category, TransactionType } from '../types';
import { formatIDR } from '../lib/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSave: (tx: {
    walletId: string;
    destWalletId?: string;
    categoryId?: string;
    type: TransactionType;
    amount: number;
    notes: string;
    transactionDate: string;
  }) => Promise<void>;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  wallets,
  categories,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>('Expense');
  const [amount, setAmount] = useState<string>('');
  const [walletId, setWalletId] = useState<string>('');
  const [destWalletId, setDestWalletId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync walletId whenever wallets load or modal opens
  useEffect(() => {
    if (wallets.length > 0) {
      if (!walletId || !wallets.some((w) => w.id === walletId)) {
        setWalletId(wallets[0].id);
      }
      if (!destWalletId || destWalletId === walletId || !wallets.some((w) => w.id === destWalletId)) {
        const other = wallets.find((w) => w.id !== (walletId || wallets[0].id));
        if (other) {
          setDestWalletId(other.id);
        }
      }
    }
  }, [wallets, isOpen, walletId]);

  // Sync categoryId whenever category type changes or modal opens
  useEffect(() => {
    const available = categories.filter((c) => c.type === type);
    if (available.length > 0) {
      if (!categoryId || !available.some((c) => c.id === categoryId)) {
        setCategoryId(available[0].id);
      }
    } else {
      setCategoryId('');
    }
  }, [type, categories, isOpen]);

  if (!isOpen) return null;

  const availableCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid transaction amount.');
      return;
    }

    const effectiveWalletId = walletId || wallets[0]?.id;
    if (!effectiveWalletId) {
      setError(
        type === 'Income'
          ? 'Please select the destination wallet/account to receive the funds.'
          : 'Please select a source wallet.'
      );
      return;
    }

    if (type === 'Transfer') {
      const effectiveDestId =
        destWalletId || wallets.find((w) => w.id !== effectiveWalletId)?.id;
      if (!effectiveDestId || effectiveDestId === effectiveWalletId) {
        setError('Please select a distinct destination wallet for the transfer.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const effectiveCategoryId =
        type !== 'Transfer' ? (categoryId || availableCategories[0]?.id) : undefined;

      await onSave({
        type,
        amount: numAmount,
        walletId: effectiveWalletId,
        destWalletId: type === 'Transfer' ? destWalletId : undefined,
        categoryId: effectiveCategoryId,
        notes: notes.trim(),
        transactionDate: new Date(transactionDate).toISOString(),
      });
      onClose();
      setAmount('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <h2 className="font-bold text-2xl text-[#1A1A1A] mb-1 tracking-tight">
          Manual Transaction Entry
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          Record cash flow for income, expenses, or account transfers.
        </p>

        {/* Type Toggle Pills */}
        <div className="grid grid-cols-3 gap-1 bg-[#F1F3F9] p-1.5 rounded-full mb-6">
          <button
            type="button"
            onClick={() => setType('Expense')}
            className={`py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              type === 'Expense'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={() => setType('Income')}
            className={`py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              type === 'Income'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Income</span>
          </button>
          <button
            type="button"
            onClick={() => setType('Transfer')}
            className={`py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              type === 'Transfer'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#24D0FE]" />
            <span>Transfer</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount in IDR */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Transaction Amount (IDR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 font-bold text-gray-400 text-base">
                Rp
              </span>
              <input
                type="number"
                required
                min="1"
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xl font-extrabold text-[#1A1A1A] outline-hidden focus:border-black focus:bg-white tracking-tight tabular-nums"
              />
            </div>
          </div>

          {/* Wallets & Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                {type === 'Transfer'
                  ? 'Source Wallet'
                  : type === 'Income'
                  ? 'Deposit Into Account / Wallet'
                  : 'Source Wallet (Funds Out)'}
              </label>
              <select
                value={walletId || wallets[0]?.id || ''}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black focus:bg-white"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {type === 'Transfer' ? (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Destination Wallet
                </label>
                <select
                  value={destWalletId}
                  onChange={(e) => setDestWalletId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black focus:bg-white"
                >
                  <option value="">-- Select Destination --</option>
                  {wallets
                    .filter((w) => w.id !== (walletId || wallets[0]?.id))
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={categoryId || availableCategories[0]?.id || ''}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black focus:bg-white"
                >
                  {availableCategories.length === 0 ? (
                    <option value="">No category available</option>
                  ) : (
                    availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Notes / Description
              </label>
              <input
                type="text"
                placeholder={
                  type === 'Income'
                    ? 'e.g. Monthly Salary, Freelance project'
                    : 'e.g. Groceries, Lunch with team'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-medium text-gray-800 outline-hidden focus:border-black focus:bg-white"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-black hover:bg-gray-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer shadow-md mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#24D0FE]" />
                <span>Saving Transaction...</span>
              </>
            ) : (
              <span>Save Transaction</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
