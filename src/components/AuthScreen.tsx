import React, { useState } from 'react';
import {
  Sparkles,
  Receipt,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Loader2,
  Wifi,
} from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

export const AuthScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans-body">
      {/* Decorative Pastel Background Blobs */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-[#BABDFF]/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#FBC6F2]/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#24D0FE]/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shadow-sm relative overflow-hidden">
            <span className="font-extrabold text-xl text-[#24D0FE]">S</span>
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#1A1A1A] tracking-tight leading-tight">
              SmartFinance
            </h1>
            <span className="text-[11px] font-medium text-gray-400 tracking-tight">
              Developed by Cruizer
            </span>
          </div>
        </div>
      </header>

      {/* Hero Body */}
      <main className="max-w-6xl mx-auto w-full my-auto py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        {/* Left Column: Headline & CTA */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Tagline 1 Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#BABDFF]/30 border border-indigo-200/60 text-indigo-950 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
            <span>Next-Gen Financial Intelligence</span>
          </div>

          {/* Main Headline */}
          <h2 className="font-extrabold text-4xl sm:text-6xl text-[#1A1A1A] leading-[1.12] tracking-tight">
            Master Your Cash Flow with{' '}
            <span className="underline decoration-[#24D0FE] decoration-wavy decoration-2">
              Intelligent AI Precision
            </span>
            .
          </h2>

          {/* Sub-headline description */}
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-xl">
            Capture expenses effortlessly using conversational natural language, scan receipts
            instantly with AI OCR, and seamlessly orchestrate your multi-wallet wealth with complete peace of mind.
          </p>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="px-8 py-3.5 rounded-full bg-black hover:bg-gray-800 active:scale-95 text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg border border-black/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#24D0FE]" />
                  <span>Connecting to secure session...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Modern High-End SmartFinance Obsidian Card */}
        <div className="lg:col-span-5 relative">
          {/* Subtle Accent Glow Layers */}
          <div className="w-full h-60 rounded-[32px] bg-gradient-to-tr from-[#24D0FE]/30 to-[#BABDFF]/40 absolute -top-3 -right-3 rotate-2 blur-xs opacity-70 pointer-events-none" />
          <div className="w-full h-60 rounded-[32px] bg-gradient-to-bl from-[#FBC6F2]/30 to-[#EAFF00]/20 absolute -bottom-3 -left-3 -rotate-2 blur-xs opacity-70 pointer-events-none" />

          {/* Premium Obsidian Platinum Card */}
          <div className="relative rounded-[32px] bg-gradient-to-br from-[#18181B] via-[#0F0F12] to-[#1C1938] p-7 sm:p-8 text-white shadow-2xl border border-white/10 space-y-6 overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#24D0FE] shadow-[0_0_8px_#24D0FE]" />
                <span className="font-semibold text-xs tracking-wider uppercase text-gray-300">
                  SmartFinance Obsidian
                </span>
              </div>
              <Wifi className="w-4 h-4 text-gray-400 rotate-90" />
            </div>

            {/* Chip & Masked Number */}
            <div className="flex items-center gap-4 relative z-10 pt-1">
              <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/60 shadow-xs relative overflow-hidden">
                <div className="absolute inset-x-0 top-1/2 h-px bg-amber-800/40" />
                <div className="absolute inset-y-0 left-1/3 w-px bg-amber-800/40" />
              </div>
              <span className="font-mono text-xs tracking-widest text-gray-400">
                •••• •••• •••• 8826
              </span>
            </div>

            {/* Balance Display */}
            <div className="relative z-10">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">
                Total Liquid Portfolio
              </span>
              <h3 className="font-extrabold text-3xl sm:text-4xl text-white tracking-tight mt-0.5 tabular-nums">
                Rp 28.450.000
              </h3>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs relative z-10">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-medium">
                  Cardholder
                </span>
                <span className="font-medium text-gray-300 tracking-wide text-xs">
                  CRUIZER PREMIER
                </span>
              </div>
              <div className="flex items-center -space-x-2">
                <div className="w-6 h-6 rounded-full bg-red-500/80 backdrop-blur-xs" />
                <div className="w-6 h-6 rounded-full bg-amber-400/80 backdrop-blur-xs" />
              </div>
            </div>

            {/* Background subtle light sweep */}
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#24D0FE]/10 blur-2xl pointer-events-none" />
          </div>

          {/* Floating Pill: Instant AI Extraction preview */}
          <div className="absolute -bottom-4 left-6 bg-white rounded-full px-4 py-2 shadow-xl border border-black/[0.08] flex items-center gap-2 text-xs font-medium text-[#1A1A1A]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-gray-600">"Lunch at Cafe 50k via GoPay"</span>
            <span className="font-bold text-black">➔ Instant AI Entry</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-gray-400 py-4 border-t border-gray-200/60 z-10">
        Cruizer SmartFinance Web App Courtesy 2026
      </footer>
    </div>
  );
};
