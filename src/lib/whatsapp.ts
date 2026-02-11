export const DEFAULT_TEMPLATE = `✅ *Confirmación de envío*

Hola {nombreCliente},

Recibimos: {montoEnvio} {monedaEnvio}
Entregamos: {montoRecibe} {monedaRecibe}
Tasa: {tasa}
Comisión: {comision}%

¡Gracias por su preferencia!`;

export function generateReceiptMessage(
  template: string,
  data: {
    clientName: string;
    sendAmount: number;
    sendCurrency: string;
    receiveAmount: number;
    receiveCurrency: string;
    rate: number;
    commission: number;
  }
): string {
  const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return template
    .replace(/{nombreCliente}/g, data.clientName)
    .replace(/{montoEnvio}/g, fmt(data.sendAmount))
    .replace(/{monedaEnvio}/g, data.sendCurrency)
    .replace(/{montoRecibe}/g, fmt(data.receiveAmount))
    .replace(/{monedaRecibe}/g, data.receiveCurrency)
    .replace(/{tasa}/g, data.rate.toFixed(4))
    .replace(/{comision}/g, data.commission.toFixed(2))
    // Legacy support for English variables
    .replace(/{clientName}/g, data.clientName)
    .replace(/{sendAmount}/g, fmt(data.sendAmount))
    .replace(/{sendCurrency}/g, data.sendCurrency)
    .replace(/{receiveAmount}/g, fmt(data.receiveAmount))
    .replace(/{receiveCurrency}/g, data.receiveCurrency)
    .replace(/{rate}/g, data.rate.toFixed(4))
    .replace(/{commission}/g, data.commission.toFixed(2));
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
