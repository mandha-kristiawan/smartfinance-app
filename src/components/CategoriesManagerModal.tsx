import React, { useState } from 'react';
import { X, Plus, Trash2, Tag } from 'lucide-react';
import { Category, CategoryType } from '../types';

const CATEGORY_COLORS = [
  '#FBC6F2',
  '#24D0FE',
  '#BABDFF',
  '#EAFF00',
  '#A7F3D0',
  '#F472B6',
  '#818CF8',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#06B6D4',
  '#64748B',
];

interface CategoriesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreateCategory: (cat: Omit<Category, 'id'>) => Promise<void>;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export const CategoriesManagerModal: React.FC<CategoriesManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [activeType, setActiveType] = useState<CategoryType>('Expense');
  const [newCatName, setNewCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FBC6F2');
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const currentCategories = categories.filter((c) => c.type === activeType);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCreating(true);
    try {
      await onCreateCategory({
        userId: '',
        name: newCatName.trim(),
        type: activeType,
        isDefault: false,
        color: selectedColor,
      });
      setNewCatName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-black/10 relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-xl text-[#1A1A1A] mb-1 tracking-tight">
          Manage Transaction Categories
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Add new categories and customize tag colors for clean financial tracking.
        </p>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-[#F1F3F9] p-1 rounded-full mb-4">
          <button
            onClick={() => {
              setActiveType('Expense');
              setSelectedColor('#FBC6F2');
            }}
            className={`py-2 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              activeType === 'Expense' ? 'bg-black text-white shadow-xs' : 'text-gray-600 hover:text-black'
            }`}
          >
            Expense Categories
          </button>
          <button
            onClick={() => {
              setActiveType('Income');
              setSelectedColor('#24D0FE');
            }}
            className={`py-2 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              activeType === 'Income' ? 'bg-black text-white shadow-xs' : 'text-gray-600 hover:text-black'
            }`}
          >
            Income Categories
          </button>
        </div>

        {/* New Category Input with Color Picker */}
        <form onSubmit={handleCreate} className="space-y-3 mb-4 p-3 bg-[#F8F9FD] rounded-2xl border border-gray-200">
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              placeholder={`Add new ${activeType === 'Expense' ? 'expense' : 'income'} category name...`}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 outline-hidden focus:border-black transition-all"
            />
            <button
              type="submit"
              disabled={creating || !newCatName.trim()}
              className="px-4 py-2 rounded-xl bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Color Palette Choice for New Category */}
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Tag Color Accent:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORY_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setSelectedColor(hex)}
                  className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                    selectedColor === hex ? 'scale-125 border-black shadow-xs ring-2 ring-black/20' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-2xl p-2 bg-white">
          {currentCategories.map((c) => (
            <div key={c.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-2.5">
                {/* Clickable Color Swatch for Quick Color Customization */}
                <div className="relative group">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 shadow-2xs border border-black/10 cursor-pointer"
                    style={{ backgroundColor: c.color || '#BABDFF' }}
                    title="Click to change tag color"
                  />
                  <input
                    type="color"
                    value={c.color || '#BABDFF'}
                    onChange={(e) => onUpdateCategory(c.id, { color: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-4 h-4"
                  />
                </div>

                <span className="font-semibold text-gray-800">{c.name}</span>
                {c.isDefault && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                    Default
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {CATEGORY_COLORS.slice(0, 5).map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onUpdateCategory(c.id, { color: hex })}
                      className="w-3.5 h-3.5 rounded-full border border-black/10 transition-transform hover:scale-125 cursor-pointer"
                      style={{ backgroundColor: hex }}
                      title="Set color"
                    />
                  ))}
                </div>

                {!c.isDefault && (
                  <button
                    onClick={() => onDeleteCategory(c.id)}
                    className="w-7 h-7 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center cursor-pointer transition-colors"
                    title="Delete custom category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
