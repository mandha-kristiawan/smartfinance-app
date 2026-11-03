import React, { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  X,
  CreditCard,
  AlertCircle,
  Loader2,
  Search,
  Repeat,
  DollarSign,
  Calendar,
  Wallet as WalletIcon,
} from 'lucide-react';
import { Bill, BillCycle, Wallet, Category } from '../types';
import { formatIDR } from '../lib/formatters';

interface BillsManagerProps {
  bills: Bill[];
  wallets: Wallet[];
  categories: Category[];
  onCreateBill: (bill: Omit<Bill, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  onUpdateBill: (billId: string, updates: Partial<Bill>) => Promise<void>;
  onDeleteBill: (billId: string) => Promise<void>;
  onPayBill: (params: {
    bill: Bill;
    actualAmount: number;
    walletId: string;
    paymentDate: string;
    categoryId?: string;
    notes?: string;
  }) => Promise<void>;
}

export const BillsManager: React.FC<BillsManagerProps> = ({
  bills,
  wallets,
  categories,
  onCreateBill,
  onUpdateBill,
  onDeleteBill,
  onPayBill,
}) => {
  const [filterTab, setFilterTab] = useState<'All' | 'Unpaid' | 'Paid'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);

  // Form States - Create / Edit
  const [name, setName] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [cycle, setCycle] = useState<BillCycle>('Monthly');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form States - Pay Bill
  const [actualAmount, setActualAmount] = useState('');
  const [payWalletId, setPayWalletId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Form States - Delete
  const [deleting, setDeleting] = useState(false);

  // Current period strings for auto-reset comparison
  const now = new Date();
  const currentMonthPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYearPeriod = `${now.getFullYear()}`;

  // Helper to determine if a bill is paid in its current cycle
  const checkIsPaid = (bill: Bill) => {
    if (!bill.lastPaidPeriod) return false;
    const targetPeriod = bill.cycle === 'Yearly' ? currentYearPeriod : currentMonthPeriod;
    return bill.lastPaidPeriod === targetPeriod;
  };

  // Compute Metrics
  const monthlyTotal = bills.reduce((sum, b) => {
    return sum + (b.cycle === 'Monthly' ? b.expectedAmount : b.expectedAmount / 12);
  }, 0);

  const unpaidBills = bills.filter((b) => !checkIsPaid(b));
  const paidBills = bills.filter((b) => checkIsPaid(b));

  const totalUnpaidAmount = unpaidBills.reduce((sum, b) => sum + b.expectedAmount, 0);
  const totalPaidAmount = paidBills.reduce((sum, b) => sum + b.expectedAmount, 0);

  // Filter & Auto-Sort Logic (Unpaid always on TOP, Paid on BOTTOM)
  const filteredBills = bills
    .filter((b) => {
      const isPaid = checkIsPaid(b);
      if (filterTab === 'Unpaid' && isPaid) return false;
      if (filterTab === 'Paid' && !isPaid) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchDesc = b.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const paidA = checkIsPaid(a);
      const paidB = checkIsPaid(b);
      // Unpaid (false) comes before Paid (true)
      if (paidA !== paidB) {
        return paidA ? 1 : -1;
      }
      // Secondary sort: alphabetical by name
      return a.name.localeCompare(b.name);
    });

  // Handlers for Create / Edit Modal
  const handleOpenCreateModal = () => {
    setEditingBill(null);
    setName('');
    setExpectedAmount('');
    setCycle('Monthly');
    setDescription('');
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (bill: Bill) => {
    setEditingBill(bill);
    setName(bill.name);
    setExpectedAmount(String(bill.expectedAmount));
    setCycle(bill.cycle);
    setDescription(bill.description || '');
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter a bill name.');
      return;
    }
    const amtNum = parseFloat(expectedAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setFormError('Please enter a valid expected amount.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingBill) {
        await onUpdateBill(editingBill.id, {
          name: name.trim(),
          expectedAmount: amtNum,
          cycle,
          description: description.trim(),
        });
      } else {
        await onCreateBill({
          name: name.trim(),
          expectedAmount: amtNum,
          cycle,
          description: description.trim(),
        });
      }
      setShowCreateModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save bill.');
    } finally {
      setSaving(false);
    }
  };

  // Handlers for Pay Bill Modal
  const handleOpenPayModal = (bill: Bill) => {
    setPayingBill(bill);
    setActualAmount(String(bill.expectedAmount));
    setPayWalletId(wallets[0]?.id || '');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes(`Pay Bill: ${bill.name}`);
    setPayError(null);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;

    const amtNum = parseFloat(actualAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setPayError('Please enter a valid payment amount.');
      return;
    }
    if (!payWalletId) {
      setPayError('Please select a source wallet.');
      return;
    }

    setPaying(true);
    setPayError(null);
    try {
      // Find category for Recurring Expenses
      const recurringCat = categories.find(
        (c) =>
          c.name.toLowerCase() === 'recurring expenses' ||
          c.name.toLowerCase().includes('recurring') ||
          c.name.toLowerCase().includes('tagihan')
      );

      await onPayBill({
        bill: payingBill,
        actualAmount: amtNum,
        walletId: payWalletId,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        categoryId: recurringCat?.id,
        notes: paymentNotes.trim() || `Pay Bill: ${payingBill.name}`,
      });

      setPayingBill(null);
    } catch (err: any) {
      setPayError(err.message || 'Failed to process bill payment.');
    } finally {
      setPaying(false);
    }
  };

  // Handler for Delete
  const handleDeleteConfirm = async () => {
    if (!billToDelete) return;
    setDeleting(true);
    try {
      await onDeleteBill(billToDelete.id);
      setBillToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete bill.');
    } finally {
      setDeleting(false);
    }
  };

  const selectedPayWallet = wallets.find((w) => w.id === payWalletId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] tracking-tight">
            Bills &amp; Recurring Expenses
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage subscriptions and recurring utility payments with automatic cycle resets.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 text-[#24D0FE]" />
          <span>Add Recurring Bill</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stat 1: Estimated Monthly Expense */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between group hover:border-black/15 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Estimated Monthly Commitments
              </span>
              <h3 className="font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] tracking-tight tabular-nums">
                {formatIDR(monthlyTotal)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Repeat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{bills.length} active subscription{bills.length === 1 ? '' : 's'}</span>
            <span className="text-purple-700 font-semibold text-[11px]">Auto-Reset Blueprint</span>
          </div>
        </div>

        {/* Stat 2: Unpaid Pending */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between group hover:border-black/15 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Unpaid This Cycle
                </span>
              </div>
              <h3 className="font-extrabold text-2xl sm:text-3xl text-amber-600 tracking-tight tabular-nums">
                {formatIDR(totalUnpaidAmount)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{unpaidBills.length} bill{unpaidBills.length === 1 ? '' : 's'} pending payment</span>
            <span className="text-amber-700 font-semibold text-[11px]">Due for Settlement</span>
          </div>
        </div>

        {/* Stat 3: Paid Settled */}
        <div className="bg-white rounded-[26px] p-5 sm:p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between group hover:border-black/15 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Paid &amp; Settled
                </span>
              </div>
              <h3 className="font-extrabold text-2xl sm:text-3xl text-emerald-600 tracking-tight tabular-nums">
                {formatIDR(totalPaidAmount)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{paidBills.length} bill{paidBills.length === 1 ? '' : 's'} settled</span>
            <span className="text-emerald-700 font-semibold text-[11px]">Cycle Completed</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-[28px] p-4 sm:p-5 border border-black/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center p-1 bg-[#F1F3F9] rounded-full gap-1">
          {(['All', 'Unpaid', 'Paid'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterTab === tab
                  ? 'bg-black text-white shadow-xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {tab === 'All'
                ? `All (${bills.length})`
                : tab === 'Unpaid'
                ? `Unpaid (${unpaidBills.length})`
                : `Paid (${paidBills.length})`}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[200px] sm:min-w-[280px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search bills by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#F8F9FD] border border-gray-200 text-xs font-medium text-gray-800 outline-hidden focus:border-black focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Bills Cards Grid */}
      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-[28px] p-12 text-center border border-black/[0.06] shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3 text-purple-600">
            <CreditCard className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-lg text-[#1A1A1A] mb-1 tracking-tight">
            No Recurring Bills Found
          </h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5">
            {searchQuery
              ? 'No bills match your search keywords or filter tab.'
              : 'Add your subscriptions, electricity, internet, or streaming bills to keep your recurring expenses organized.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold cursor-pointer shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#24D0FE]" />
            <span>Add Recurring Bill</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.map((bill) => {
            const isPaid = checkIsPaid(bill);

            return (
              <div
                key={bill.id}
                className={`bg-white rounded-[26px] p-5 border transition-all duration-200 flex flex-col justify-between gap-4 relative ${
                  isPaid
                    ? 'border-black/[0.05] bg-gray-50/60 opacity-80'
                    : 'border-black/[0.08] hover:border-black/20 shadow-xs'
                }`}
              >
                <div>
                  {/* Top Row: Name, Cycle Badge & Status Pill */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-2xs ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                            : 'bg-purple-100 text-purple-900 border border-purple-200/60'
                        }`}
                      >
                        {bill.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base text-[#1A1A1A] truncate tracking-tight">
                            {bill.name}
                          </h4>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200/80 shrink-0">
                            {bill.cycle}
                          </span>
                        </div>

                        {bill.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {bill.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expected Amount Box */}
                  <div className="bg-[#F8F9FD] rounded-2xl p-3.5 border border-black/[0.04] mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        Expected Amount
                      </span>
                      <span className="font-extrabold text-xl text-[#1A1A1A] tracking-tight tabular-nums">
                        {formatIDR(bill.expectedAmount)}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Unpaid</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  {!isPaid ? (
                    <button
                      onClick={() => handleOpenPayModal(bill)}
                      className="px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 shadow-2xs bg-black hover:bg-gray-800 text-white"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-[#24D0FE]" />
                      <span>Pay Bill</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Paid for this cycle</span>
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(bill)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
                      title="Edit bill blueprint"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setBillToDelete(bill)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                      title="Delete bill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT BILL MODAL */}
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
              {editingBill ? 'Edit Bill Blueprint' : 'Add Recurring Bill'}
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Set up expected recurring expenses for subscriptions, streaming, or monthly utilities.
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBill} className="space-y-4">
              {/* Bill Name */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Bill / Subscription Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, PLN Electricity, IndiHome WiFi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Expected Amount */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Expected Amount (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 186000"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-bold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Billing Cycle Toggle */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Billing Cycle
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#F1F3F9] p-1 rounded-full">
                  <button
                    type="button"
                    onClick={() => setCycle('Monthly')}
                    className={`py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      cycle === 'Monthly' ? 'bg-black text-white' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycle('Yearly')}
                    className={`py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      cycle === 'Yearly' ? 'bg-black text-white' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Description / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Premium 4K family plan, home wifi bill"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-medium text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowCreateModal(false)}
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
                    <span>{editingBill ? 'Update Bill' : 'Create Bill'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY BILL MODAL */}
      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPayingBill(null)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
              Pay Bill: {payingBill.name}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Confirm payment details to update wallet balance and log transaction history.
            </p>

            {payError && (
              <div className="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="space-y-4">
              {/* Actual Amount Paid */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Actual Amount Paid (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-sm font-bold text-gray-800 outline-hidden focus:border-black"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Expected: {formatIDR(payingBill.expectedAmount)}
                </span>
              </div>

              {/* Source Wallet (Only display wallet names in dropdown) */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Source Payment Wallet
                </label>
                <select
                  value={payWalletId}
                  onChange={(e) => setPayWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Date */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Payment Notes */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Transaction Notes (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FD] border border-gray-200 text-xs font-medium text-gray-800 outline-hidden focus:border-black"
                />
              </div>

              {/* Info Note */}
              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-950 leading-relaxed">
                💳 Paid from <span className="font-bold">{selectedPayWallet?.name}</span>. Wallet balance decreases, bill gets marked as <span className="font-bold text-emerald-700">"Paid"</span>, and recorded under category <span className="font-bold text-purple-700">"Recurring Expenses"</span>.
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => setPayingBill(null)}
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
                      <span>Processing...</span>
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
      {billToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-sm w-full p-6 border border-black/10 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-[#1A1A1A] tracking-tight">
                Delete Bill
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete the bill <span className="font-bold text-gray-800">"{billToDelete.name}"</span>?
                Future recurring tracking for this item will be removed.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setBillToDelete(null)}
                className="flex-1 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
