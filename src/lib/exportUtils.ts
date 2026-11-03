import { jsPDF } from 'jspdf';
import { Transaction, Wallet, Category } from '../types';
import { formatIDR, formatDateIndo, resolveTransactionCategory } from './formatters';

export function exportTransactionsToCSV(
  transactions: Transaction[],
  wallets: Wallet[],
  categories: Category[],
  filename = 'smartfinance-transactions-export.csv'
) {
  const walletMap = new Map(wallets.map((w) => [w.id, w.name]));

  // 7 Distinct Columns in formal English per PRD v5
  const headers = [
    'Date',
    'Type',
    'Category',
    'Description / Notes',
    'Source Wallet',
    'Destination Wallet',
    'Amount (IDR)',
  ];

  // Sort ascending chronologically (Older first, Newer last per PRD v5)
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );

  const rows = sorted.map((t) => {
    const date = formatDateIndo(t.transactionDate);
    const isIncome = t.type === 'Income';
    const isExpense = t.type === 'Expense';
    const type = isIncome ? 'Income' : isExpense ? 'Expense' : 'Transfer';
    const cat = resolveTransactionCategory(t, categories).name || '-';
    const notes = t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '-';

    // Wallet resolution per ERD v5 2.1
    const sourceWallet = isIncome ? '-' : walletMap.get(t.walletId) || '-';
    const destWallet = isExpense ? '-' : walletMap.get(t.destWalletId || t.walletId) || '-';
    const amount = t.amount;

    return [date, type, cat, notes, sourceWallet, destWallet, amount].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportTransactionsToPDF(
  transactions: Transaction[],
  wallets: Wallet[],
  categories: Category[],
  userName = 'SmartFinance User',
  periodLabel = 'All Time',
  filename = 'smartfinance-financial-report.pdf'
) {
  // Initialize Landscape PDF (A4 landscape: 297mm x 210mm)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const walletMap = new Map(wallets.map((w) => [w.id, w.name]));

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(26, 26, 26);
  doc.text('SmartFinance', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Cash Flow & Financial Transaction Report', 14, 24);
  doc.text(`Account Owner: ${userName || 'SmartFinance User'}`, 14, 29);
  doc.text(
    `Print Date: ${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    14,
    34
  );
  doc.text(`Report Period: ${periodLabel}`, 14, 39);

  // Dynamic Summary box strictly calculated for the provided filtered dataset
  const totalIncome = transactions
    .filter((t) => t.type === 'Income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'Expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  doc.setFillColor(248, 249, 253);
  doc.roundedRect(14, 44, 269, 20, 3, 3, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Total Income:', 20, 51);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald green
  doc.text(formatIDR(totalIncome), 20, 58);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Total Expenses:', 110, 51);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68); // rose red
  doc.text(formatIDR(totalExpense), 110, 58);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Net Cash Flow:', 200, 51);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(netCashflow >= 0 ? 16 : 239, netCashflow >= 0 ? 185 : 68, netCashflow >= 0 ? 129 : 68);
  doc.text(formatIDR(netCashflow), 200, 58);

  // Table headers helper across 7 distinct columns (landscape printable width: 14mm to 283mm = 269mm)
  const renderTableHeaders = (startY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(26, 26, 26);
    doc.text('Date', 14, startY);
    doc.text('Type', 40, startY);
    doc.text('Category', 62, startY);
    doc.text('Description / Notes', 106, startY);
    doc.text('Source Wallet', 184, startY);
    doc.text('Destination Wallet', 222, startY);
    doc.text('Amount', 258, startY);

    doc.setDrawColor(220, 220, 230);
    doc.line(14, startY + 2.5, 283, startY + 2.5);
  };

  let y = 72;
  renderTableHeaders(y);
  y += 7.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // Sort ascending chronologically (Older first, Newer last per PRD v5)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );

  for (const t of sortedTransactions) {
    const dateStr = formatDateIndo(t.transactionDate);
    const isIncome = t.type === 'Income';
    const isExpense = t.type === 'Expense';
    const typeStr = isIncome ? 'Income' : isExpense ? 'Expense' : 'Transfer';
    const categoryName = resolveTransactionCategory(t, categories).name || '-';
    const desc = t.notes || '-';

    // Wallet resolution per ERD v5 2.1
    const sourceWallet = isIncome ? '-' : walletMap.get(t.walletId) || '-';
    const destWallet = isExpense ? '-' : walletMap.get(t.destWalletId || t.walletId) || '-';

    // ALL table columns auto-wrap when text is long. No truncation with "..." or ".." anywhere!
    const dateLines: string[] = doc.splitTextToSize(dateStr, 24);
    const typeLines: string[] = doc.splitTextToSize(typeStr, 20);
    const catLines: string[] = doc.splitTextToSize(categoryName, 42);
    const descLines: string[] = doc.splitTextToSize(desc, 76);
    const srcLines: string[] = doc.splitTextToSize(sourceWallet, 36);
    const destLines: string[] = doc.splitTextToSize(destWallet, 34);

    const sign = isIncome ? '+' : isExpense ? '-' : '';
    const amtStr = `${sign}${formatIDR(t.amount)}`;
    const amtLines: string[] = doc.splitTextToSize(amtStr, 25);

    // Dynamic row height based on the maximum lines across ALL columns
    const maxLines = Math.max(
      dateLines.length,
      typeLines.length,
      catLines.length,
      descLines.length,
      srcLines.length,
      destLines.length,
      amtLines.length
    );

    const lineSpacing = 4.2;
    const rowHeight = Math.max(maxLines * lineSpacing + 2.5, 7);

    // Page overflow check for landscape height (210mm)
    if (y + rowHeight > 185) {
      doc.addPage();
      y = 18;
      renderTableHeaders(y);
      y += 7.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    // Render Date (Wrapped)
    doc.setTextColor(70, 70, 70);
    dateLines.forEach((lineText, idx) => {
      doc.text(lineText, 14, y + idx * lineSpacing);
    });

    // Render Type (Wrapped)
    if (isIncome) {
      doc.setTextColor(16, 185, 129);
    } else if (isExpense) {
      doc.setTextColor(239, 68, 68);
    } else {
      doc.setTextColor(59, 130, 246);
    }
    typeLines.forEach((lineText, idx) => {
      doc.text(lineText, 40, y + idx * lineSpacing);
    });

    // Render Category (Wrapped without truncation)
    doc.setTextColor(26, 26, 26);
    catLines.forEach((lineText, idx) => {
      doc.text(lineText, 62, y + idx * lineSpacing);
    });

    // Render Description / Notes (Wrapped without truncation)
    descLines.forEach((lineText, idx) => {
      doc.text(lineText, 106, y + idx * lineSpacing);
    });

    // Render Source Wallet (Wrapped without truncation)
    doc.setTextColor(70, 70, 70);
    srcLines.forEach((lineText, idx) => {
      doc.text(lineText, 184, y + idx * lineSpacing);
    });

    // Render Destination Wallet (Wrapped without truncation)
    destLines.forEach((lineText, idx) => {
      doc.text(lineText, 222, y + idx * lineSpacing);
    });

    // Render Amount (Wrapped)
    if (isIncome) {
      doc.setTextColor(16, 185, 129);
    } else if (isExpense) {
      doc.setTextColor(239, 68, 68);
    } else {
      doc.setTextColor(59, 130, 246);
    }
    amtLines.forEach((lineText, idx) => {
      doc.text(lineText, 258, y + idx * lineSpacing);
    });

    y += rowHeight;
  }

  // Footer page numbers across all landscape pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Printed from SmartFinance • Page ${i} of ${totalPages}`,
      14,
      202
    );
  }

  doc.save(filename);
}
