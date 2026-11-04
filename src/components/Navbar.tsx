import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Wallet,
  Receipt,
  LayoutDashboard,
  Target,
  HandCoins,
  ArrowLeftRight,
  LogOut,
  Plus,
  PiggyBank,
  Tags,
  ChevronDown,
  FileEdit,
  User,
  Download,
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: UserProfile | null;
  onSignOut: () => void;
  onOpenNLP: () => void;
  onOpenReceiptScan: () => void;
  onOpenManualTx: () => void;
  onOpenCategories: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onSignOut,
  onOpenNLP,
  onOpenReceiptScan,
  onOpenManualTx,
  onOpenCategories,
}) => {
  const [showRecordDropdown, setShowRecordDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const recordDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        recordDropdownRef.current &&
        !recordDropdownRef.current.contains(event.target as Node)
      ) {
        setShowRecordDropdown(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Standard English navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'wallets', label: 'Wallets', icon: Wallet },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'debts', label: 'Debts', icon: HandCoins },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-black/[0.06] px-4 lg:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand: Logo & "developed by Cruizer" */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src="/logo.png?v=2"
            alt="SmartFinance Logo"
            className="w-8 h-8 rounded-xl object-contain shadow-2xs border border-black/10"
          />
          <div>
            <h1 className="font-bold text-base text-[#1A1A1A] tracking-tight leading-tight">
              SmartFinance
            </h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-tight">
              developed by Cruizer
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Slim, Minimalist Navigation) */}
        <nav className="hidden lg:flex items-center gap-0.5 bg-[#F4F5F9] p-1 rounded-full border border-black/[0.04]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`relative px-3.5 py-1.5 rounded-full text-[12px] transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-black text-white shadow-2xs font-medium'
                    : 'text-gray-600 hover:text-black hover:bg-black/[0.04] font-normal'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Scan Receipt (Visible on tablet & web; on mobile accessible via bottom floating dock) */}
          <button
            onClick={onOpenReceiptScan}
            className="hidden sm:flex px-3.5 py-1.5 rounded-full border border-gray-200/90 bg-white hover:border-black/30 hover:bg-gray-50 text-[#1A1A1A] text-[12px] font-medium items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Scan receipt with AI OCR"
          >
            <Receipt className="w-3.5 h-3.5 text-pink-600 shrink-0" />
            <span className="hidden sm:inline">Scan Receipt</span>
          </button>

          {/* Consolidated + Record Button with Dropdown (Visible on tablet & web; on mobile accessible via bottom floating dock) */}
          <div className="hidden sm:block relative" ref={recordDropdownRef}>
            <button
              onClick={() => setShowRecordDropdown(!showRecordDropdown)}
              className="px-3.5 py-1.5 rounded-full bg-black hover:bg-gray-800 text-white text-[12px] font-medium flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Add a new transaction"
            >
              <Plus className="w-3.5 h-3.5 text-[#24D0FE]" />
              <span className="font-medium">Record</span>
              <ChevronDown
                className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                  showRecordDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Record Options Dropdown Menu */}
            {showRecordDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-black/[0.08] p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setShowRecordDropdown(false);
                    onOpenNLP();
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-gray-50 flex items-start gap-3 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-gray-900 block group-hover:text-black">
                      Record via AI
                    </span>
                    <span className="text-[11px] text-gray-500 leading-tight block">
                      Natural language prompt in Indonesian or English
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowRecordDropdown(false);
                    onOpenManualTx();
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-gray-50 flex items-start gap-3 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 group-hover:bg-black group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                    <FileEdit className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-gray-900 block group-hover:text-black">
                      Manual Entry
                    </span>
                    <span className="text-[11px] text-gray-500 leading-tight block">
                      Custom expense, income, or wallet transfer form
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* User Profile Avatar with Dropdown */}
          {user && (
            <div className="relative pl-1 border-l border-gray-200 ml-1" ref={profileDropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-black/10 transition-all cursor-pointer"
                title="Account menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-7 h-7 rounded-full ring-1 ring-gray-200 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-black text-white font-bold flex items-center justify-center text-[10px]">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <ChevronDown
                  className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                    showProfileDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-black/[0.08] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Header */}
                  <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-9 h-9 rounded-full ring-1 ring-gray-200 object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-black text-white font-bold flex items-center justify-center text-xs">
                        {user.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-semibold text-xs text-gray-900 truncate">
                        {user.displayName || 'SmartFinance User'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {user.email || 'Google Account'}
                      </p>
                    </div>
                  </div>

                  {/* Manage Categories Action */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        onOpenCategories();
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-gray-50 flex items-center gap-2.5 text-left text-xs font-medium text-gray-700 hover:text-black transition-colors cursor-pointer"
                    >
                      <Tags className="w-4 h-4 text-indigo-600" />
                      <span>Manage Categories</span>
                    </button>
                  </div>

                  {/* Sign Out Action */}
                  <div className="pt-1 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        onSignOut();
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-red-50 flex items-center gap-2.5 text-left text-xs font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Grid (4 columns x 2 rows, perfectly fitting all 8 features without horizontal scrolling) */}
      <div className="grid grid-cols-4 lg:hidden gap-1.5 mt-2 pt-2 border-t border-gray-100">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`py-1.5 px-1 rounded-xl text-[10.5px] font-medium transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-black text-white shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-black bg-gray-100/80 hover:bg-gray-200/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#24D0FE]' : 'text-gray-500'}`} />
              <span className="truncate max-w-full leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
