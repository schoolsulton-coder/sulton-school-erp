import { api } from './api';

export interface Account {
  id: string;
  name: string;
  balance: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT';
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT';
  amount: number;
  date: string;
  description?: string | null;
  account: Account;
  category?: Category | null;
}

export interface Summary {
  totalBalance: number;
  accounts: Account[];
  month: { income: number; expense: number; net: number };
}

export interface CashFlow {
  period: { from: string; to: string };
  income: { contract: number; other: number; investment: number };
  totalIncome: number;
  expense: number;
  expenseByCategory: Record<string, number>;
  net: number;
}

export const financeApi = {
  summary: () => api.get<Summary>('/finance/summary').then((r) => r.data),
  cashFlow: (from?: string, to?: string) =>
    api.get<CashFlow>('/finance/cash-flow', { params: { from, to } }).then((r) => r.data),
  accounts: () => api.get<Account[]>('/finance/accounts').then((r) => r.data),
  createAccount: (data: { name: string; balance?: number }) =>
    api.post('/finance/accounts', data).then((r) => r.data),
  categories: (type?: string) =>
    api.get<Category[]>('/finance/categories', { params: { type } }).then((r) => r.data),
  transactions: (params?: { type?: string; accountId?: string }) =>
    api.get<Transaction[]>('/finance/transactions', { params }).then((r) => r.data),
  createTransaction: (data: {
    type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
    amount: number;
    accountId: string;
    categoryId?: string;
    description?: string;
  }) => api.post('/finance/transactions', data).then((r) => r.data),
  transfer: (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
  }) => api.post('/finance/transfer', data).then((r) => r.data),
};

export const money = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0)) + " so'm";
