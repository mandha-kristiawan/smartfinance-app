import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatIDR, formatShortIDR } from '../lib/formatters';

interface CashflowChartProps {
  transactions: Transaction[];
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ transactions }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');
  const [activeMetric, setActiveMetric] = useState<'both' | 'expense' | 'income'>('both');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Helper to get local YYYY-MM-DD string to avoid timezone offset mismatches
  const getLocalDateString = (dateInput: Date | string): string => {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Build daily data points for the past 7 or 30 days
  const daysCount = timeRange === '7d' ? 7 : 30;
  const now = new Date();
  const dailyPoints: {
    dateStr: string;
    dateLabel: string;
    dayName: string;
    income: number;
    expense: number;
    net: number;
  }[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = getLocalDateString(d);
    const displayLabel = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
    }).format(d);
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);

    let dayIncome = 0;
    let dayExpense = 0;

    transactions.forEach((tx) => {
      const txDateStr = getLocalDateString(tx.transactionDate);
      if (txDateStr === dateStr) {
        if (tx.type === 'Income') dayIncome += tx.amount;
        if (tx.type === 'Expense') dayExpense += tx.amount;
      }
    });

    dailyPoints.push({
      dateStr,
      dateLabel: displayLabel,
      dayName,
      income: dayIncome,
      expense: dayExpense,
      net: dayIncome - dayExpense,
    });
  }

  // Calculate coordinates for SVG line chart
  const maxVal = Math.max(
    ...dailyPoints.map((p) => Math.max(p.expense, p.income)),
    1000000 // minimum baseline 1 million IDR
  );

  const chartHeight = 190;
  const chartWidth = 650;
  const paddingX = 24;
  const paddingY = 28;

  const points = dailyPoints.map((p, idx) => {
    const x = paddingX + (idx / (dailyPoints.length - 1)) * (chartWidth - paddingX * 2);
    const yExpense =
      chartHeight - paddingY - (p.expense / maxVal) * (chartHeight - paddingY * 2);
    const yIncome =
      chartHeight - paddingY - (p.income / maxVal) * (chartHeight - paddingY * 2);

    return {
      x,
      yExpense,
      yIncome,
      ...p,
    };
  });

  // Expense Bézier Curve
  const expensePathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.yExpense}`;
    const prev = points[idx - 1];
    const cpX = (prev.x + curr.x) / 2;
    return `${acc} C ${cpX} ${prev.yExpense}, ${cpX} ${curr.yExpense}, ${curr.x} ${curr.yExpense}`;
  }, '');
  const expenseAreaD = `${expensePathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  // Income Bézier Curve
  const incomePathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.yIncome}`;
    const prev = points[idx - 1];
    const cpX = (prev.x + curr.x) / 2;
    return `${acc} C ${cpX} ${prev.yIncome}, ${cpX} ${curr.yIncome}, ${curr.x} ${curr.yIncome}`;
  }, '');
  const incomeAreaD = `${incomePathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  const totalExpenseInRange = dailyPoints.reduce((acc, p) => acc + p.expense, 0);
  const totalIncomeInRange = dailyPoints.reduce((acc, p) => acc + p.income, 0);
  const netFlow = totalIncomeInRange - totalExpenseInRange;

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-xs relative overflow-hidden flex flex-col justify-between">
      {/* Header Bar */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
              Cash Flow Trend
            </span>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap sm:flex-nowrap">
              <h3 className="font-extrabold text-2xl text-[#1A1A1A] shrink-0 tracking-tight tabular-nums">
                {activeMetric === 'expense'
                  ? formatIDR(totalExpenseInRange)
                  : activeMetric === 'income'
                  ? formatIDR(totalIncomeInRange)
                  : formatIDR(netFlow)}
              </h3>
              <span className="text-xs text-gray-500 font-medium truncate">
                {activeMetric === 'expense'
                  ? `Total Outflow (${timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`
                  : activeMetric === 'income'
                  ? `Total Inflow (${timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`
                  : `Net Cash Flow (${timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`}
              </span>
            </div>
          </div>

          {/* Controls: Fixed Top-Right Alignment across all states */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View filter pill */}
            <div className="flex items-center bg-[#F1F3F9] p-1 rounded-full text-[11px] font-semibold">
              <button
                onClick={() => setActiveMetric('both')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  activeMetric === 'both'
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                Both
              </button>
              <button
                onClick={() => setActiveMetric('income')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  activeMetric === 'income'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setActiveMetric('expense')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  activeMetric === 'expense'
                    ? 'bg-[#24D0FE] text-black font-bold'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                Expenses
              </button>
            </div>

            {/* Time range pill */}
            <div className="flex items-center bg-[#F1F3F9] p-1 rounded-full text-[11px] font-semibold">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  timeRange === '7d'
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  timeRange === '30d'
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
        </div>

        {/* Legend & Summary Row */}
        <div className="flex flex-wrap items-center gap-5 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <span className="text-gray-500 font-medium">Income (Inflow):</span>
            <span className="font-bold text-emerald-600">+{formatShortIDR(totalIncomeInRange)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#24D0FE]" />
            <span className="text-gray-500 font-medium">Expenses (Outflow):</span>
            <span className="font-bold text-[#1A1A1A]">-{formatShortIDR(totalExpenseInRange)}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto text-[11px] text-gray-400">
            <span>Hover points for daily breakdown</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="w-full relative overflow-x-auto select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-48 overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Income Green Gradient */}
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>

            {/* Expense Cyan Gradient */}
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#24D0FE" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#24D0FE" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={chartWidth - paddingX}
            y2={paddingY}
            stroke="#F1F3F9"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={chartHeight / 2}
            x2={chartWidth - paddingX}
            y2={chartHeight / 2}
            stroke="#F1F3F9"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="#E5E7EB"
          />

          {/* Income Fill Area & Line */}
          {(activeMetric === 'both' || activeMetric === 'income') && (
            <>
              <path d={incomeAreaD} fill="url(#incomeGradient)" />
              <path
                d={incomePathD}
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Expense Fill Area & Line */}
          {(activeMetric === 'both' || activeMetric === 'expense') && (
            <>
              <path d={expenseAreaD} fill="url(#expenseGradient)" />
              <path
                d={expensePathD}
                fill="none"
                stroke="#24D0FE"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Hover highlight guide bar */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingY}
              x2={hoveredPoint.x}
              y2={chartHeight - paddingY}
              stroke="#CBD5E1"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
          )}

          {/* Data Points & Interactive Touch Circles */}
          {points.map((p, idx) => {
            const isVisible =
              timeRange === '7d' || idx % 5 === 0 || idx === points.length - 1;
            const hasActivity = p.income > 0 || p.expense > 0;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                className="cursor-pointer"
              >
                {/* Wide invisible hit area for easy hover on desktop & touch */}
                <rect
                  x={p.x - 12}
                  y={0}
                  width={24}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Income point */}
                {(activeMetric === 'both' || activeMetric === 'income') &&
                  (p.income > 0 || isHovered) && (
                    <circle
                      cx={p.x}
                      cy={p.yIncome}
                      r={isHovered ? 6 : p.income > 0 ? 4 : 2}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  )}

                {/* Expense point */}
                {(activeMetric === 'both' || activeMetric === 'expense') &&
                  (p.expense > 0 || isHovered) && (
                    <circle
                      cx={p.x}
                      cy={p.yExpense}
                      r={isHovered ? 6 : p.expense > 0 ? 4 : 2}
                      fill="#24D0FE"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  )}

                {/* Date Label on Bottom Axis */}
                {isVisible && (
                  <text
                    x={p.x}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    fill={isHovered ? '#1A1A1A' : '#9CA3AF'}
                    fontWeight={isHovered ? '600' : '400'}
                    fontSize="9"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {timeRange === '7d' ? p.dayName : p.dateLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip when hovering over a date */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-black/90 backdrop-blur-md text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-white/10 min-w-[140px]"
            style={{
              left: `${Math.min(Math.max((hoveredPoint.x / chartWidth) * 100, 10), 80)}%`,
              top: '12px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold text-gray-300 pb-1 border-b border-white/10 mb-1 flex items-center justify-between">
              <span>{hoveredPoint.dateLabel}</span>
              <span className="text-[10px] text-gray-400 font-normal">
                {hoveredPoint.dayName}
              </span>
            </div>
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between items-center text-emerald-400 font-medium">
                <span>Inflow:</span>
                <span>+{formatIDR(hoveredPoint.income)}</span>
              </div>
              <div className="flex justify-between items-center text-[#24D0FE] font-medium">
                <span>Outflow:</span>
                <span>-{formatIDR(hoveredPoint.expense)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-300 font-bold pt-1 border-t border-white/10 mt-1">
                <span>Net:</span>
                <span
                  className={
                    hoveredPoint.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  {formatIDR(hoveredPoint.net)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
