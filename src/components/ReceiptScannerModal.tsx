import React, { useState, useRef } from 'react';
import {
  Receipt,
  X,
  Upload,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Wallet, Category, ReceiptItem } from '../types';
import { formatIDR } from '../lib/formatters';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSaveReceiptTransaction: (tx: {
    walletId: string;
    categoryId?: string;
    amount: number;
    notes: string;
    transactionDate: string;
    receiptItems?: string;
  }) => Promise<void>;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  wallets,
  categories,
  onSaveReceiptTransaction,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extracted OCR fields
  const [extractedData, setExtractedData] = useState<{
    merchantName: string;
    date: string;
    items: ReceiptItem[];
    subtotal?: number;
    tax?: number;
    discount?: number;
    totalAmount: number;
    walletId: string;
    categoryId: string;
    notes: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      processReceipt(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Generate synthetic sample receipt for quick testing if user doesn't have an image ready
  const loadSampleReceipt = (type: 'supermarket' | 'cafe') => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 400, 600);

    ctx.fillStyle = '#1A1A1A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px monospace';

    if (type === 'supermarket') {
      ctx.fillText('SUPERINDO SUPERMARKET', 200, 50);
      ctx.font = '12px monospace';
      ctx.fillText('Jl. Sudirman No. 45, Jakarta Selatan', 200, 75);
      ctx.fillText('Tgl: 31/10/2026 14:22  Kasir: 04', 200, 95);
      ctx.fillText('--------------------------------------', 200, 115);

      ctx.textAlign = 'left';
      ctx.font = '14px monospace';
      ctx.fillText('Ultra Milk Cokelat 1L     21.500', 30, 150);
      ctx.fillText('Roti Tawar Gandum         18.000', 30, 180);
      ctx.fillText('Telur Ayam Negeri 10btr   28.500', 30, 210);
      ctx.fillText('Minyak Goreng Sania 2L    34.000', 30, 240);

      ctx.textAlign = 'center';
      ctx.fillText('--------------------------------------', 200, 280);
      ctx.textAlign = 'left';
      ctx.fillText('SUBTOTAL                 102.000', 30, 310);
      ctx.fillText('PPN 11%                   11.220', 30, 335);
      ctx.font = 'bold 16px monospace';
      ctx.fillText('TOTAL                    113.220', 30, 370);
      ctx.font = '12px monospace';
      ctx.fillText('Metode: GoPay / QRIS', 30, 405);
      ctx.textAlign = 'center';
      ctx.fillText('*** TERIMA KASIH ***', 200, 470);
    } else {
      ctx.fillText('KOPI KENANGAN MANTAN', 200, 50);
      ctx.font = '12px monospace';
      ctx.fillText('Outlet Grand Indonesia Mall', 200, 75);
      ctx.fillText('31/10/2026 10:15 WIB', 200, 95);
      ctx.fillText('--------------------------------------', 200, 115);

      ctx.textAlign = 'left';
      ctx.font = '14px monospace';
      ctx.fillText('2x Kopi Kenangan Mantan   44.000', 30, 150);
      ctx.fillText('1x Roti Daging Asap       18.000', 30, 180);

      ctx.textAlign = 'center';
      ctx.fillText('--------------------------------------', 200, 220);
      ctx.textAlign = 'left';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('TOTAL                    62.000', 30, 260);
      ctx.font = '12px monospace';
      ctx.fillText('Pembayaran: BCA QRIS', 30, 295);
      ctx.textAlign = 'center';
      ctx.fillText('Terima kasih, have a good day!', 200, 360);
    }

    const dataUrl = canvas.toDataURL('image/jpeg');
    setImagePreview(dataUrl);
    processReceipt(dataUrl, 'image/jpeg');
  };

  const processReceipt = async (base64: string, mimeType: string) => {
    setLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const response = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          wallets: wallets.map((w) => ({ id: w.id, name: w.name })),
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to scan receipt image.');
      }

      const d = resJson.data;

      // Match wallet
      let matchedWallet = wallets.find(
        (w) =>
          d.suggestedWallet &&
          w.name.toLowerCase().includes(d.suggestedWallet.toLowerCase())
      );
      if (!matchedWallet && wallets.length > 0) matchedWallet = wallets[0];

      // Match category
      let matchedCat = categories.find(
        (c) =>
          d.suggestedCategory &&
          c.name.toLowerCase().includes(d.suggestedCategory.toLowerCase())
      );
      if (!matchedCat && categories.length > 0) matchedCat = categories[0];

      setExtractedData({
        merchantName: d.merchantName || 'Receipt Purchase',
        date: d.date || new Date().toISOString().split('T')[0],
        items: Array.isArray(d.items) ? d.items : [],
        subtotal: d.subtotal,
        tax: d.tax,
        discount: d.discount,
        totalAmount: Number(d.totalAmount) || 0,
        walletId: matchedWallet?.id || (wallets[0]?.id ?? ''),
        categoryId: matchedCat?.id || (categories[0]?.id ?? ''),
        notes: d.rawNotes || `Purchase at ${d.merchantName || 'Store'}`,
      });
    } catch (err: any) {
      setError(err.message || 'Error occurred while scanning receipt with Gemini AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;
    if (!extractedData.walletId) {
      setError('Please select a payment wallet.');
      return;
    }

    setSaving(true);
    try {
      await onSaveReceiptTransaction({
        walletId: extractedData.walletId,
        categoryId: extractedData.categoryId,
        amount: extractedData.totalAmount,
        notes: `${extractedData.notes} (${extractedData.merchantName})`,
        transactionDate: new Date(extractedData.date).toISOString(),
        receiptItems: JSON.stringify(extractedData.items),
      });
      onClose();
      setImagePreview(null);
      setExtractedData(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save receipt transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pr-10">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-950 font-bold shadow-xs shrink-0">
            <Receipt className="w-5 h-5 text-pink-700" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg sm:text-xl text-[#1A1A1A] tracking-tight leading-snug">
              Receipt Scanner &amp; OCR
            </h2>
            <p className="text-xs text-gray-500">
              Upload any receipt photo in Indonesian or English; Gemini Vision will extract itemized lines and totals.
            </p>
          </div>
        </div>

        {/* Upload Dropzone */}
        {!imagePreview && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-black rounded-[24px] p-8 text-center cursor-pointer bg-[#F8F9FD] hover:bg-white transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center text-gray-500 group-hover:text-black mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-sm text-[#1A1A1A] mb-1">
                Select or Drag Receipt Image Here
              </h4>
              <p className="text-xs text-gray-500">
                Supported formats: JPG, PNG, WEBP (Maximum 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Quick Demo Struk Buttons */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                <span>Or Test Instantly with Sample Receipts:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => loadSampleReceipt('supermarket')}
                  className="px-3.5 py-2 rounded-full bg-gray-100 hover:bg-pink-50 text-xs font-semibold text-gray-700 hover:text-black transition-all cursor-pointer border border-gray-200"
                >
                  🛒 Supermarket Receipt (Superindo)
                </button>
                <button
                  onClick={() => loadSampleReceipt('cafe')}
                  className="px-3.5 py-2 rounded-full bg-gray-100 hover:bg-indigo-50 text-xs font-semibold text-gray-700 hover:text-black transition-all cursor-pointer border border-gray-200"
                >
                  ☕ Coffee Shop Receipt (Kenangan)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#24D0FE]" />
            <p className="text-sm font-semibold text-[#1A1A1A]">
              Gemini Vision is parsing your receipt items...
            </p>
            <p className="text-xs text-gray-500">
              Extracting store name, timestamp, itemized lines, and payment totals
            </p>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="p-3 my-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Image Preview & Extracted Output */}
        {imagePreview && !loading && extractedData && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Thumbnail of receipt */}
              <div className="sm:col-span-4 bg-gray-100 rounded-2xl overflow-hidden p-2 flex flex-col items-center justify-center border border-gray-200 relative group">
                <img
                  src={imagePreview}
                  alt="Receipt Preview"
                  className="max-h-48 rounded-xl object-contain shadow-xs"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setExtractedData(null);
                  }}
                  className="mt-2 text-[11px] text-gray-600 hover:text-red-600 font-semibold cursor-pointer underline"
                >
                  Change Receipt Photo
                </button>
              </div>

              {/* Merchant & Overview */}
              <div className="sm:col-span-8 bg-[#F8F9FD] rounded-2xl p-4 border border-black/[0.06] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Merchant / Store Name
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      Date: {extractedData.date}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={extractedData.merchantName}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, merchantName: e.target.value })
                    }
                    className="w-full font-bold text-lg text-[#1A1A1A] bg-transparent border-b border-gray-300 focus:border-black outline-hidden pb-0.5 tracking-tight"
                  />

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Payment Wallet
                      </label>
                      <select
                        value={extractedData.walletId}
                        onChange={(e) =>
                          setExtractedData({ ...extractedData, walletId: e.target.value })
                        }
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden"
                      >
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Category
                      </label>
                      <select
                        value={extractedData.categoryId}
                        onChange={(e) =>
                          setExtractedData({ ...extractedData, categoryId: e.target.value })
                        }
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden"
                      >
                        {categories
                          .filter((c) => c.type === 'Expense')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Total Amount:</span>
                  <div className="flex items-center gap-1 font-extrabold text-xl text-[#1A1A1A] tracking-tight tabular-nums">
                    <span>Rp</span>
                    <input
                      type="number"
                      value={extractedData.totalAmount}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          totalAmount: Number(e.target.value) || 0,
                        })
                      }
                      className="w-28 text-right bg-transparent border-b border-black font-black outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Itemized Line Items Table */}
            {extractedData.items.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Itemized Receipt Lines ({extractedData.items.length} Items)
                  </span>
                  <span className="text-[11px] text-gray-500">Detected with AI Vision</span>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {extractedData.items.map((item, idx) => (
                    <div key={idx} className="px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-medium text-gray-800">{item.itemName}</span>
                        {item.qty && item.qty > 1 && (
                          <span className="text-gray-400 text-[11px]">x{item.qty}</span>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900 font-mono">
                        {formatIDR(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-full bg-black hover:bg-gray-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#24D0FE]" />
                  <span>Recording to Ledger...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#24D0FE]" />
                  <span>Save Receipt Transaction ({formatIDR(extractedData.totalAmount)})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
