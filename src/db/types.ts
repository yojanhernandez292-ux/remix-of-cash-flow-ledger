export interface Currency {
  id?: number;
  name: string;
  symbol: string;
  commissionPercent: number;
}

export interface CurrencyType {
  id?: number;
  currencyId: number;
  name: string;
}

export interface ExchangeRate {
  id?: number;
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  updatedAt: string;
}

export interface Client {
  id?: number;
  cedula: string;
  name: string;
  phone: string;
  createdAt: string;
  debt: number; // Deuda en USD
  debtCurrencySymbol: string;
}

export interface ClientDebtMovement {
  id?: number;
  clientId: number;
  date: string;
  amount: number; // Positivo = aumenta deuda, Negativo = pago
  currencySymbol: string;
  concept: string;
  transactionId?: number;
}

export interface Transaction {
  id?: number;
  clientId: number;
  clientName: string;
  clientCedula: string;
  date: string;
  sendAmount: number;
  sendCurrencyId: number;
  sendCurrencySymbol: string;
  sendTypeId: number;
  sendTypeName: string;
  receiveAmount: number;
  receiveCurrencyId: number;
  receiveCurrencySymbol: string;
  receiveTypeId: number;
  receiveTypeName: string;
  rate: number;
  commissionPercent: number;
  netAmount: number;
  profit: number;
  profitCurrencySymbol: string;
  notes: string;
  status: 'completed' | 'pending' | 'cancelled';
  isDebt: boolean; // Si el envío es a deuda
  debtPaymentAmount: number; // Monto aplicado para pagar deuda
}

export interface CashMovement {
  id?: number;
  date: string;
  currencyId: number;
  currencySymbol: string;
  typeId: number;
  typeName: string;
  amount: number;
  concept: string;
  transactionId?: number;
  movementType: 'remesa_in' | 'remesa_out' | 'compra' | 'venta' | 'ajuste_in' | 'ajuste_out';
}

export interface WhatsAppTemplate {
  id?: number;
  template: string;
}
