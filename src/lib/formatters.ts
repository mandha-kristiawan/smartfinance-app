export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortIDR(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}k`;
  }
  return `Rp ${amount.toLocaleString('en-US')}`;
}

export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateTimeIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export interface ResolvedCategory {
  name: string;
  color: string;
}

export function resolveTransactionCategory(
  tx: {
    type: 'Income' | 'Expense' | 'Transfer';
    notes?: string;
    categoryId?: string;
    categoryName?: string;
    referenceId?: string;
  },
  categories?: { id: string; name: string; color?: string; type?: string }[]
): ResolvedCategory {
  // 1. If explicit categoryName is provided on the record and is specific
  if (
    tx.categoryName &&
    !['general', 'lain-lain', 'umum'].includes(tx.categoryName.trim().toLowerCase())
  ) {
    const matched = categories?.find(
      (c) => c.name.toLowerCase() === tx.categoryName!.toLowerCase()
    );
    return {
      name: tx.categoryName,
      color:
        matched?.color ||
        (tx.type === 'Income' ? '#10B981' : tx.type === 'Expense' ? '#F43F5E' : '#24D0FE'),
    };
  }

  // 2. If valid categoryId exists in the user's category list
  const cat = tx.categoryId && categories ? categories.find((c) => c.id === tx.categoryId) : null;
  if (cat && !['general', 'lain-lain', 'umum'].includes(cat.name.trim().toLowerCase())) {
    return {
      name: cat.name,
      color:
        cat.color ||
        (tx.type === 'Income' ? '#10B981' : tx.type === 'Expense' ? '#F43F5E' : '#24D0FE'),
    };
  }

  // 3. Fallback / Contextual resolution from activity context (Debts, Loans, Savings, Investment)
  const notes = (tx.notes || '').toLowerCase();

  // Debt payment (bayar utang, bayar hutang, pelunasan utang, ngebalikin, cicilan utang)
  if (
    notes.includes('bayar utang') ||
    notes.includes('bayar hutang') ||
    notes.includes('pelunasan utang') ||
    notes.includes('ngebalikin') ||
    notes.includes('debt payment') ||
    notes.includes('cicilan utang')
  ) {
    return { name: 'Debt Payment', color: '#F43F5E' };
  }

  // Loan repayment received (terima piutang, pelunasan piutang, cicilan piutang)
  if (
    notes.includes('terima piutang') ||
    notes.includes('pelunasan piutang') ||
    notes.includes('loan repayment') ||
    notes.includes('cicilan piutang') ||
    notes.includes('dibayar oleh')
  ) {
    return { name: 'Loan Repayment', color: '#10B981' };
  }

  // Giving a loan to someone else (Expense)
  if (
    tx.type === 'Expense' &&
    (notes.includes('pinjaman kepada') ||
      notes.includes('meminjamkan') ||
      notes.includes('loan to') ||
      notes.includes('pinjaman modal') ||
      notes.includes('piutang'))
  ) {
    return { name: 'Loan', color: '#6366F1' };
  }

  // Borrowing money from someone else (Income)
  if (
    tx.type === 'Income' &&
    (notes.includes('utang dari') ||
      notes.includes('hutang dari') ||
      notes.includes('pinjam dari') ||
      notes.includes('debt from') ||
      notes.includes('meminjam'))
  ) {
    return { name: 'Debt', color: '#F59E0B' };
  }

  // Investment / Savings Deposit (Expense)
  if (
    tx.type === 'Expense' &&
    (notes.includes('invest') ||
      notes.includes('deposit') ||
      notes.includes('tabungan') ||
      notes.includes('simpanan') ||
      notes.includes('saving') ||
      notes.includes('emas'))
  ) {
    return { name: 'Deposit Invest', color: '#24D0FE' };
  }

  // Investment / Savings Withdrawal (Income)
  if (
    tx.type === 'Income' &&
    (notes.includes('withdraw') ||
      notes.includes('tarik dana') ||
      notes.includes('tarik tabungan') ||
      notes.includes('pencairan') ||
      notes.includes('invest'))
  ) {
    return { name: 'Withdraw Invest', color: '#10B981' };
  }

  // Recurring Expenses / Bill Payment
  if (
    tx.type === 'Expense' &&
    (notes.includes('pay bill') ||
      notes.includes('recurring') ||
      notes.includes('tagihan') ||
      notes.includes('subscription') ||
      notes.includes('langganan') ||
      notes.includes('netflix') ||
      notes.includes('spotify') ||
      notes.includes('pln') ||
      notes.includes('pdam') ||
      notes.includes('indihome') ||
      notes.includes('wifi'))
  ) {
    return { name: 'Recurring Expenses', color: '#8B5CF6' };
  }

  // If a general category matched, keep its name
  if (cat) {
    return { name: cat.name, color: cat.color || '#94A3B8' };
  }

  return { name: 'General', color: '#94A3B8' };
}
