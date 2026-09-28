import type { Category } from '../types'

/** Starter categories. Ids are stable so they can be merged into existing accounts. */
export const DEFAULT_CATEGORIES: Category[] = [
  // Income
  { id: 'cat-salary', name: 'Salary', emoji: '💼', kind: 'income', isDefault: true, order: 0 },
  { id: 'cat-side', name: 'Side income', emoji: '🛠️', kind: 'income', isDefault: true, order: 1 },
  { id: 'cat-other-income', name: 'Other income', emoji: '🎁', kind: 'income', isDefault: true, order: 2 },
  // Needs
  { id: 'cat-rent', name: 'Rent / mortgage', emoji: '🏠', kind: 'expense', bucket: 'need', isDefault: true, order: 10 },
  { id: 'cat-groceries', name: 'Groceries', emoji: '🛒', kind: 'expense', bucket: 'need', isDefault: true, order: 11 },
  { id: 'cat-utilities', name: 'Utilities', emoji: '💡', kind: 'expense', bucket: 'need', isDefault: true, order: 12 },
  { id: 'cat-transport', name: 'Transport', emoji: '🚌', kind: 'expense', bucket: 'need', isDefault: true, order: 13 },
  { id: 'cat-insurance', name: 'Insurance', emoji: '🛡️', kind: 'expense', bucket: 'need', isDefault: true, order: 14 },
  { id: 'cat-health', name: 'Health', emoji: '🩺', kind: 'expense', bucket: 'need', isDefault: true, order: 15 },
  { id: 'cat-debt', name: 'Debt payment', emoji: '💳', kind: 'expense', bucket: 'need', isDefault: true, order: 16 },
  // Wants
  { id: 'cat-dining', name: 'Dining out', emoji: '🍜', kind: 'expense', bucket: 'want', isDefault: true, order: 20 },
  { id: 'cat-shopping', name: 'Shopping', emoji: '🛍️', kind: 'expense', bucket: 'want', isDefault: true, order: 21 },
  { id: 'cat-fun', name: 'Entertainment', emoji: '🎮', kind: 'expense', bucket: 'want', isDefault: true, order: 22 },
  { id: 'cat-subs', name: 'Subscriptions', emoji: '📺', kind: 'expense', bucket: 'want', isDefault: true, order: 23 },
  { id: 'cat-travel', name: 'Travel', emoji: '✈️', kind: 'expense', bucket: 'want', isDefault: true, order: 24 },
  // Savings
  { id: 'cat-emergency', name: 'Emergency fund', emoji: '🛟', kind: 'expense', bucket: 'savings', isDefault: true, order: 30 },
  { id: 'cat-invest', name: 'Investing / 401(k)', emoji: '📈', kind: 'expense', bucket: 'savings', isDefault: true, order: 31 },
  { id: 'cat-roth', name: 'Roth IRA', emoji: '🌱', kind: 'expense', bucket: 'savings', isDefault: true, order: 32 },
  { id: 'cat-extra-debt', name: 'Extra debt payoff', emoji: '⛓️', kind: 'expense', bucket: 'savings', isDefault: true, order: 33 },
  // Fallback
  { id: 'cat-other', name: 'Other', emoji: '📦', kind: 'expense', bucket: 'want', isDefault: true, order: 40 },
]
