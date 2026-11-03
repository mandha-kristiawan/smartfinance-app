import React, { useState, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowRightLeft,
  Trash2,
  Edit2,
  TrendingUp,
  Landmark,
  Smartphone,
  Banknote,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Wallet, WalletType } from '../types';
import { formatIDR } from '../lib/formatters';

interface WalletsManagerProps {
  wallets: Wallet[];
  onCreateWallet: (w: Omit<Wallet, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateWallet: (id: string, updates: Partial<Wallet>) => Promise<void>;
  onDeleteWallet: (id: string) => Promise<void>;
  onQuickTransfer: (sourceId: string, destId: string, amount: number) => Promise<void>;
}

const WALLET_COLORS = [
  { label: 'Lilac Signature', hex: '#BABDFF' },
  { label: 'Soft Pink', hex: '#FBC6F2' },
  { label: 'Electric Cyan', hex: '#24D0FE' },
  { label: 'Neon Glow', hex: '#EAFF00' },
  { label: 'Emerald Mint', hex: '#A7F3D0' },
  { label: 'Obsidian Black', hex: '#1E293B' },
  { label: 'Deep Blue', hex: '#17386D' },
  { label: 'Purple Haze', hex: '#7B4CE6' },
];

export const WalletsManager: React.FC<WalletsManagerProps> = ({
  wallets,
  onCreateWallet,
  onUpdateWallet,
  onDeleteWallet,
  onQuickTransfer,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('Bank');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#BABDFF');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick transfer form states
  const [transferSource, setTransferSource] = useState('');
  const [transferDest, setTransferDest] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // In-app deletion confirm state (avoids window.confirm iframe sandbox block)
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalWealth = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);

  // Sync transfer selection whenever wallets change or transfer modal opens
  useEffect(() => {
    if (wallets.length > 0) {
      if (!transferSource || !wallets.some((w) => w.id === transferSource)) {
        setTransferSource(wallets[0].id);
      }
      if (
        !transferDest ||
        transferDest === transferSource ||
        !wallets.some((w) => w.id === transferDest)
      ) {
        const other = wallets.find((w) => w.id !== (transferSource || wallets[0].id));
        if (other) {
          setTransferDest(other.id);
        }
      }
    }
  }, [wallets, showTransferModal, transferSource]);

  const handleOpenAddModal = () => {
    setName('');
    setType('Bank');
    setBalance('');
    setColor('#BABDFF');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (w: Wallet) => {
    setEditingWallet(w);
    setName(w.name);
    setType(w.type);
    setBalance(w.balance.toString());
    setColor(w.color || '#BABDFF');
    setFormError(null);
    setShowEditModal(true);
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter a wallet name.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await onCreateWallet({
        userId: '',
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        color,
      });
      setShowAddModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create wallet.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet || !name.trim()) return;

    setSaving(true);
    setFormError(null);
    try {
      await onUpdateWallet(editingWallet.id, {
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        color,
      });
      setShowEditModal(false);
      setEditingWallet(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update wallet.');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);

    if (!transferSource || !transferDest) {
      setTransferError('Please select both source and destination wallets.');
      return;
    }
    if (transferSource === transferDest) {
      setTransferError('Source and destination wallets must be different.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setTransferError('Please enter a valid transfer amount.');
      return;
    }

    const srcWallet = wallets.find((w) => w.id === transferSource);
    if (srcWallet && srcWallet.balance < amt) {
      setTransferError(`Insufficient funds in ${srcWallet.name} (Available: ${formatIDR(srcWallet.balance)}).`);
      return;
    }

    setTransferring(true);
    setTransferError(null);
    try {
      await onQuickTransfer(transferSource, transferDest, amt);
      setShowTransferModal(false);
      setTransferAmount('');
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed.');
    } finally {
      setTransferring(false);
    }
  };

  const getWalletIcon = (wType: WalletType) => {
    switch (wType) {
      case 'Bank':
        return Landmark;
      case 'E-Wallet':
        return Smartphone;
      case 'Cash':
        return Banknote;
      default:
        return TrendingUp;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Overview Card */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-black/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Total Liquid Portfolio
          </span>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-[#1A1A1A] mt-1 tracking-tight tabular-nums">
            {formatIDR(totalWealth)}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Distributed across {wallets.length} active {wallets.length === 1 ? 'account' : 'accounts & e-wallets'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTransferError(null);
              setShowTransferModal(true);
            }}
            disabled={wallets.length < 2}
            className="px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Balance</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-semibold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#24D0FE]" />
            <span>Add New Wallet</span>
          </button>
        </div>
      </div>

      {/* Grid of Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map((wallet) => {
          const Icon = getWalletIcon(wallet.type);
          const isDark =
            wallet.color === '#1E293B' ||
            wallet.color === '#17386D' ||
            wallet.color === '#7B4CE6';

          return (
            <div
              key={wallet.id}
              className="rounded-[28px] p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-black/10 flex flex-col justify-between h-52 group"
              style={{ backgroundColor: wallet.color || '#BABDFF' }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                      isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-black'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4
                      className={`font-bold text-base leading-tight tracking-tight ${
                        isDark ? 'text-white' : 'text-[#1A1A1A]'
                      }`}
                    >
                      {wallet.name}
                    </h4>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      {wallet.type}
                    </span>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(wallet)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/30 text-white'
                        : 'bg-black/10 hover:bg-black/20 text-black'
                    }`}
                    title="Edit wallet"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setWalletToDelete(wallet)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-white/10 hover:bg-red-500 text-white'
                        : 'bg-black/10 hover:bg-red-500 hover:text-white text-black'
                    }`}
                    title="Delete wallet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Footer Balance */}
              <div className="relative z-10 pt-3 border-t border-black/10">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider block ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Available Balance
                </span>
                <span
                  className={`font-extrabold text-2xl tracking-tight tabular-nums ${
                    isDark ? 'text-white' : 'text-[#1A1A1A]'
                  }`}
                >
                  {formatIDR(wallet.balance)}
                </span>
              </div>

              {/* Subtle background accent */}
              <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/20 pointer-events-none blur-xs" />
            </div>
          );
        })}
      </div>

      {/* Add Wallet Modal */}
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
              Add New Account / Wallet
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Connect your bank account, digital e-wallet, or cash register.
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWallet} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Wallet / Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tabungan BCA, GoPay, Uang Tunai"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Account Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as WalletType)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                  >
                    <option value="Bank">Bank Account</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Cash">Physical Cash</option>
                    <option value="Investment">Investment</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Initial Balance (IDR)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-bold text-gray-800 outline-hidden focus:border-black"
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Card Theme Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {WALLET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        color === c.hex ? 'scale-125 border-black shadow-xs ring-2 ring-black/20' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                    <span>Save Wallet</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Wallet Modal */}
      {showEditModal && editingWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingWallet(null);
              }}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
              Edit Wallet
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Update wallet details, theme color, or current balance.
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateWallet} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Wallet / Account Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Account Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as WalletType)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                  >
                    <option value="Bank">Bank Account</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Cash">Physical Cash</option>
                    <option value="Investment">Investment</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Current Balance (IDR)
                  </label>
                  <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-bold text-gray-800 outline-hidden focus:border-black"
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Card Theme Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {WALLET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        color === c.hex ? 'scale-125 border-black shadow-xs ring-2 ring-black/20' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingWallet(null);
                  }}
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
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Wallet</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative">
            <button
              onClick={() => setShowTransferModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
              Transfer Between Wallets
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Shift funds from one account to another without altering your total liquid net worth.
            </p>

            {transferError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Source Wallet (Funds Out)
                </label>
                <select
                  value={transferSource}
                  onChange={(e) => setTransferSource(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
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
                  Destination Wallet (Deposit Into)
                </label>
                <select
                  value={transferDest}
                  onChange={(e) => setTransferDest(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                >
                  {wallets
                    .filter((w) => w.id !== transferSource)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Transfer Amount (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="500000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-sm font-bold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="w-1/2 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="w-1/2 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {transferring ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#24D0FE]" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <span>Execute Transfer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {walletToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-sm w-full p-6 border border-black/10 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-[#1A1A1A] tracking-tight">Delete Wallet</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-gray-800">"{walletToDelete.name}"</span>?
                This wallet and its associated balance will be removed.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setWalletToDelete(null)}
                className="flex-1 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (!walletToDelete) return;
                  setDeleting(true);
                  try {
                    await onDeleteWallet(walletToDelete.id);
                    setWalletToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete wallet:', err);
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Wallet</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
