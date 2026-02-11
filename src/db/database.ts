import Dexie, { type Table } from 'dexie';
import type { Currency, CurrencyType, ExchangeRate, Client, Transaction, CashMovement, WhatsAppTemplate, ClientDebtMovement } from './types';

export class ExchangeDB extends Dexie {
  currencies!: Table<Currency>;
  currencyTypes!: Table<CurrencyType>;
  exchangeRates!: Table<ExchangeRate>;
  clients!: Table<Client>;
  transactions!: Table<Transaction>;
  cashMovements!: Table<CashMovement>;
  whatsappTemplates!: Table<WhatsAppTemplate>;
  clientDebtMovements!: Table<ClientDebtMovement>;

  constructor() {
    super('RemesaProDB');
    this.version(2).stores({
      currencies: '++id, symbol',
      currencyTypes: '++id, currencyId',
      exchangeRates: '++id, [fromCurrencyId+toCurrencyId]',
      clients: '++id, cedula, name, debt',
      transactions: '++id, clientId, date, status, isDebt',
      cashMovements: '++id, currencyId, typeId, transactionId, date',
      whatsappTemplates: '++id',
      clientDebtMovements: '++id, clientId, transactionId, date',
    }).upgrade(tx => {
      // Migrar clientes existentes con deuda = 0
      return tx.table('clients').toCollection().modify(client => {
        if (client.debt === undefined) {
          client.debt = 0;
          client.debtCurrencySymbol = 'USD';
        }
      });
    });

    this.version(1).stores({
      currencies: '++id, symbol',
      currencyTypes: '++id, currencyId',
      exchangeRates: '++id, [fromCurrencyId+toCurrencyId]',
      clients: '++id, cedula, name',
      transactions: '++id, clientId, date, status',
      cashMovements: '++id, currencyId, typeId, transactionId, date',
      whatsappTemplates: '++id',
    });

    this.on('populate', () => {
      this.currencies.bulkAdd([
        { name: 'Dólar', symbol: 'USD', commissionPercent: 0 },
        { name: 'Bolívar', symbol: 'BS', commissionPercent: 6 },
        { name: 'Peso Colombiano', symbol: 'COP', commissionPercent: 3 },
      ]);
      this.currencyTypes.bulkAdd([
        { currencyId: 1, name: 'Zelle' },
        { currencyId: 1, name: 'Efectivo' },
        { currencyId: 1, name: 'USDT' },
        { currencyId: 1, name: 'Transferencia' },
        { currencyId: 1, name: 'Banesco Panamá' },
        { currencyId: 2, name: 'Transferencia' },
        { currencyId: 2, name: 'Pago Móvil' },
        { currencyId: 2, name: 'Efectivo' },
        { currencyId: 3, name: 'Nequi' },
        { currencyId: 3, name: 'Efectivo' },
        { currencyId: 3, name: 'Transferencia' },
      ]);
      this.exchangeRates.bulkAdd([
        { fromCurrencyId: 1, toCurrencyId: 2, rate: 36.5, updatedAt: new Date().toISOString() },
        { fromCurrencyId: 1, toCurrencyId: 3, rate: 4200, updatedAt: new Date().toISOString() },
      ]);
      this.whatsappTemplates.add({
        template: '✅ *Confirmación de envío*\n\nHola {nombreCliente},\n\nRecibimos: {montoEnvio} {monedaEnvio}\nEntregamos: {montoRecibe} {monedaRecibe}\nTasa: {tasa}\nComisión: {comision}%\n\n¡Gracias por su preferencia!',
      });
    });
  }
}

export const db = new ExchangeDB();
