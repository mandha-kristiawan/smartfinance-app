import React, { useState } from 'react';
import {
  Sparkles,
  X,
  AlertCircle,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { Wallet, Category, TransactionType } from '../types';
import { formatIDR } from '../lib/formatters';

interface NLPTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSaveTransaction: (tx: {
    walletId: string;
    destWalletId?: string;
    categoryId?: string;
    type: TransactionType;
    amount: number;
    notes: string;
    transactionDate: string;
  }) => Promise<void>;
}

export const NLPTransactionModal: React.FC<NLPTransactionModalProps> = ({
  isOpen,
  onClose,
  wallets,
  categories,
  onSaveTransaction,
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed result states
  const [parsedData, setParsedData] = useState<{
    type: TransactionType;
    amount: number;
    walletId: string;
    destWalletId?: string;
    categoryId?: string;
    notes: string;
    explanation?: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const samplePrompts = [
    'Makan siang di McD 50 ribu pakai GoPay',
    'Gaji kantor 8.500.000 masuk ke Tabungan BCA',
    'Beli kopi Starbucks 58rb pakai Cash',
    'Pindah dana 500rb dari Tabungan BCA ke GoPay',
    'Lunch meeting at Subway $12 paid with GoPay',
  ];

  const handleParse = async (textToParse?: string) => {
    const text = textToParse || inputText;
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setParsedData(null);

    try {
      const response = await fetch('/api/ai/parse-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          wallets: wallets.map((w) => ({ id: w.id, name: w.name, type: w.type })),
          categories: categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to process natural language input');
      }

      const d = resJson.data;

      // Find matching wallet
      let matchedWallet = wallets.find(
        (w) =>
          d.walletName &&
          w.name.toLowerCase().includes(d.walletName.toLowerCase())
      );
      if (!matchedWallet && wallets.length > 0) {
        matchedWallet = wallets[0];
      }

      let matchedDestWallet: Wallet | undefined;
      if (d.type === 'Transfer' && d.destWalletName) {
        matchedDestWallet = wallets.find((w) =>
          w.name.toLowerCase().includes(d.destWalletName.toLowerCase())
        );
      }

      // Find matching category
      let matchedCategory = categories.find(
        (c) =>
          c.type === d.type &&
          d.categoryName &&
          c.name.toLowerCase().includes(d.categoryName.toLowerCase())
      );
      if (!matchedCategory) {
        matchedCategory = categories.find((c) => c.type === d.type);
      }

      setParsedData({
        type: d.type || 'Expense',
        amount: d.amount || 0,
        walletId: matchedWallet ? matchedWallet.id : wallets[0]?.id || '',
        destWalletId: matchedDestWallet?.id,
        categoryId: matchedCategory?.id,
        notes: d.notes || text,
        explanation: d.explanation,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to parse natural language transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parsedData || !parsedData.walletId || parsedData.amount <= 0) {
      setError('Please verify the transaction amount and selected wallet.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSaveTransaction({
        type: parsedData.type,
        amount: parsedData.amount,
        walletId: parsedData.walletId,
        destWalletId: parsedData.type === 'Transfer' ? parsedData.destWalletId : undefined,
        categoryId: parsedData.type !== 'Transfer' ? parsedData.categoryId : undefined,
        notes: parsedData.notes,
        transactionDate: new Date().toISOString(),
      });
      onClose();
      setInputText('');
      setParsedData(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-[#1A1A1A] tracking-tight">
              Record via AI Natural Language
            </h3>
            <span className="text-[11px] text-gray-500 font-medium">
              Powered by Gemini 2.5 Flash
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Type freely in Indonesian or English (e.g., <span className="font-semibold text-gray-700">"Makan siang di McD 50rb pakai GoPay"</span> or <span className="font-semibold text-gray-700">"Salary 9M received in BCA"</span>) and AI will structure it automatically.
        </p>

        {/* Text Prompt Input */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your transaction in Indonesian or English..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-[#F8F9FD] border border-gray-200 focus:border-black focus:bg-white text-sm text-[#1A1A1A] outline-hidden transition-all resize-none font-medium placeholder:text-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleParse();
                }
              }}
            />
          </div>

          {/* Sample prompt chips */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <HelpCircle className="w-3 h-3" />
              <span>Quick Examples (Click to test):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(p);
                    handleParse(p);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black transition-all cursor-pointer border border-transparent"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parse button */}
          <button
            onClick={() => handleParse()}
            disabled={loading || !inputText.trim()}
            className="w-full py-3 rounded-full bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#24D0FE]" />
                <span>Processing with Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#24D0FE]" />
                <span>Extract Transaction with AI</span>
              </>
            )}
          </button>
        </div>

        {/* Parsed Result Preview Card */}
        {parsedData && (
          <div className="mt-6 pt-5 border-t border-gray-100 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                AI Extraction Result:
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  parsedData.type === 'Income'
                    ? 'bg-emerald-100 text-emerald-800'
                    : parsedData.type === 'Expense'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-cyan-100 text-cyan-800'
                }`}
              >
                {parsedData.type}
              </span>
            </div>

            {/* Editable Fields Grid */}
            <div className="bg-[#F8F9FD] rounded-2xl p-4 border border-black/[0.06] space-y-3">
              {/* Nominal */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                  Amount (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-sm text-gray-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={parsedData.amount}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, amount: Number(e.target.value) || 0 })
                    }
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-white border border-gray-200 text-base font-extrabold text-[#1A1A1A] outline-hidden focus:border-black tracking-tight tabular-nums"
                  />
                </div>
              </div>

              {/* Type & Wallet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={parsedData.type}
                    onChange={(e) =>
                      setParsedData({
                        ...parsedData,
                        type: e.target.value as TransactionType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    {parsedData.type === 'Income'
                      ? 'Deposit Into Account / Wallet'
                      : parsedData.type === 'Transfer'
                      ? 'Source Wallet'
                      : 'Source Wallet (Funds Out)'}
                  </label>
                  <select
                    value={parsedData.walletId}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, walletId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destination for Transfer OR Category for Expense/Income */}
              {parsedData.type === 'Transfer' ? (
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Destination Wallet
                  </label>
                  <select
                    value={parsedData.destWalletId || ''}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, destWalletId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                  >
                    <option value="">-- Select Destination --</option>
                    {wallets
                      .filter((w) => w.id !== parsedData.walletId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Category
                  </label>
                  <select
                    value={parsedData.categoryId || ''}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                  >
                    {categories
                      .filter((c) => c.type === parsedData.type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                  Description / Notes
                </label>
                <input
                  type="text"
                  value={parsedData.notes}
                  onChange={(e) =>
                    setParsedData({ ...parsedData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-800 outline-hidden focus:border-black"
                />
              </div>
            </div>

            {/* Save & Confirm */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-full bg-black hover:bg-gray-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#24D0FE]" />
                  <span>Saving Transaction...</span>
                </>
              ) : (
                <span>Confirm &amp; Save Transaction</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
