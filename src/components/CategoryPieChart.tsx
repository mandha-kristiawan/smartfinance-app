import React, { useState } from 'react';
import { Transaction, Category } from '../types';
import { formatIDR, resolveTransactionCategory } from '../lib/formatters';

interface CategoryPieChartProps {
  transactions: Transaction[];
  categories: Category[];
}

const PALETTE = ['#24D0FE', '#BABDFF', '#FBC6F2', '#34D399', '#FBBF24', '#F472B6', '#A78BFA', '#94A3B8'];

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  transactions,
  categories,
}) => {
  const [breakdownType, setBreakdownType] = useState<'Expense' | 'Income'>('Expense');

  // Filter transactions by selected type (Expense vs Income)
  const filteredTxs = transactions.filter((t) => t.type === breakdownType);
  const totalAmount = filteredTxs.reduce((sum, t) => sum + t.amount, 0);

  const categoryTotals: { name: string; amount: number; color: string; percentage: number }[] = [];
  const mapTotals = new Map<string, number>();

  filteredTxs.forEach((t) => {
    const resolved = resolveTransactionCategory(t, categories);
    const name = resolved.name;
    mapTotals.set(name, (mapTotals.get(name) || 0) + t.amount);
  });

  let colorIdx = 0;
  mapTotals.forEach((amount, name) => {
    categoryTotals.push({
      name,
      amount,
      color: PALETTE[colorIdx % PALETTE.length],
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    });
    colorIdx++;
  });

  // Sort descending
  categoryTotals.sort((a, b) => b.amount - a.amount);

  // SVG Donut Calculations
  let cumulativeAngle = 0;
  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header with Type Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
              Category Breakdown
            </span>
            <h3 className="font-bold text-xl text-[#1A1A1A] mt-0.5 tracking-tight">
              {breakdownType === 'Expense' ? 'Expense Breakdown' : 'Income Breakdown'}
            </h3>
          </div>

          {/* Toggle Pills */}
          <div className="flex items-center bg-[#F1F3F9] p-1 rounded-full border border-black/[0.04]">
            <button
              onClick={() => setBreakdownType('Expense')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                breakdownType === 'Expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setBreakdownType('Income')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                breakdownType === 'Income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        {totalAmount === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            No {breakdownType.toLowerCase()} transactions recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Donut Chart Visual */}
            <div className="md:col-span-5 flex flex-col items-center justify-center relative">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
                {categoryTotals.map((item, idx) => {
                  const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((cumulativeAngle / 360) * circumference);
                  cumulativeAngle += (item.percentage / 100) * 360;

                  return (
                    <circle
                      key={idx}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-500 hover:opacity-85"
                    />
                  );
                })}
              </svg>

              {/* Center hole text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Total {breakdownType}
                </span>
                <span className="font-extrabold text-sm text-[#1A1A1A] tracking-tight tabular-nums">
                  {formatIDR(totalAmount)}
                </span>
              </div>
            </div>

            {/* Category breakdown bars */}
            <div className="md:col-span-7 space-y-3">
              {categoryTotals.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-gray-800 truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium text-gray-500">
                        {cat.percentage.toFixed(0)}%
                      </span>
                      <span className="font-bold text-[#1A1A1A]">{formatIDR(cat.amount)}</span>
                    </div>
                  </div>
                  {/* Rounded progress cap */}
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
        <span>Showing {categoryTotals.length} active categories</span>
        <span>Real-time Sync</span>
      </div>
    </div>
  );
};
