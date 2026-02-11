import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './database';

export function useCurrencies() {
  return useLiveQuery(() => db.currencies.toArray()) ?? [];
}

export function useAllCurrencyTypes() {
  return useLiveQuery(() => db.currencyTypes.toArray()) ?? [];
}

export function useExchangeRates() {
  return useLiveQuery(() => db.exchangeRates.toArray()) ?? [];
}

export function useClients() {
  return useLiveQuery(() => db.clients.orderBy('name').toArray()) ?? [];
}

export function useTransactions() {
  return useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray()) ?? [];
}

export function useCashMovements() {
  return useLiveQuery(() => db.cashMovements.toArray()) ?? [];
}

export async function lookupRate(fromCurrencyId: number, toCurrencyId: number): Promise<number | null> {
  if (fromCurrencyId === toCurrencyId) return 1;

  const currencies = await db.currencies.toArray();
  const rates = await db.exchangeRates.toArray();
  const usd = currencies.find(c => c.symbol === 'USD');
  if (!usd || !usd.id) return null;

  const fromCurr = currencies.find(c => c.id === fromCurrencyId);
  const toCurr = currencies.find(c => c.id === toCurrencyId);
  if (!fromCurr || !toCurr) return null;

  if (fromCurr.symbol === 'USD') {
    const found = rates.find(rt => rt.fromCurrencyId === usd.id && rt.toCurrencyId === toCurrencyId);
    return found ? found.rate : null;
  }

  if (toCurr.symbol === 'USD') {
    const found = rates.find(rt => rt.fromCurrencyId === usd.id && rt.toCurrencyId === fromCurrencyId);
    return found ? 1 / found.rate : null;
  }

  const fromUsd = rates.find(rt => rt.fromCurrencyId === usd.id && rt.toCurrencyId === fromCurrencyId);
  const toUsd = rates.find(rt => rt.fromCurrencyId === usd.id && rt.toCurrencyId === toCurrencyId);
  if (fromUsd && toUsd && fromUsd.rate > 0) {
    return toUsd.rate / fromUsd.rate;
  }

  return null;
}

export function formatAmount(n: number): string {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
