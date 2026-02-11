import { useMemo } from 'react';
import { useCurrencies, useCashMovements, useTransactions, useExchangeRates, formatAmount } from '@/db/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, ArrowUpDown, Wallet } from 'lucide-react';

const Dashboard = () => {
  const currencies = useCurrencies();
  const movements = useCashMovements();
  const transactions = useTransactions();
  const rates = useExchangeRates();

  const balances = useMemo(() => {
    const b: Record<string, { currencyId: number; typeId: number; currencySymbol: string; typeName: string; amount: number }> = {};
    for (const m of movements) {
      const key = `${m.currencyId}-${m.typeId}`;
      if (!b[key]) b[key] = { currencyId: m.currencyId, typeId: m.typeId, currencySymbol: m.currencySymbol, typeName: m.typeName, amount: 0 };
      b[key].amount += m.amount;
    }
    return Object.values(b);
  }, [movements]);

  const businessValue = useMemo(() => {
    let total = 0;
    const usd = currencies.find(c => c.symbol === 'USD');
    if (!usd) return 0;
    for (const b of balances) {
      if (b.currencySymbol === 'USD') {
        total += b.amount;
      } else {
        const r = rates.find(rt => rt.fromCurrencyId === usd.id && rt.toCurrencyId === b.currencyId);
        if (r && r.rate > 0) total += b.amount / r.rate;
      }
    }
    return total;
  }, [balances, currencies, rates]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTxs = transactions.filter(t => new Date(t.date) >= today);

  const todayProfit = useMemo(() => {
    let total = 0;
    const usd = currencies.find(c => c.symbol === 'USD');
    for (const tx of todayTxs) {
      if (tx.profitCurrencySymbol === 'USD') {
        total += tx.profit;
      } else if (usd) {
        const r = rates.find(rt => rt.fromCurrencyId === usd.id && rt.toCurrencyId === tx.sendCurrencyId);
        if (r && r.rate > 0) total += tx.profit / r.rate;
      }
    }
    return total;
  }, [todayTxs, currencies, rates]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} title="Valor del Negocio" value={`$ ${formatAmount(businessValue)}`} />
        <StatCard icon={TrendingUp} title="Ganancia Hoy" value={`$ ${formatAmount(todayProfit)}`} />
        <StatCard icon={ArrowUpDown} title="Operaciones Hoy" value={String(todayTxs.length)} />
        <StatCard icon={Wallet} title="Total Operaciones" value={String(transactions.length)} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Cajas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {balances.map((b) => (
            <Card key={`${b.currencyId}-${b.typeId}`} className="bg-secondary/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{b.currencySymbol} • {b.typeName}</p>
                <p className={`text-lg font-bold ${b.amount >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatAmount(b.amount)}
                </p>
              </CardContent>
            </Card>
          ))}
          {balances.length === 0 && (
            <p className="text-muted-foreground col-span-full text-sm">Sin movimientos registrados</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Últimas Operaciones</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Envía</TableHead>
                <TableHead>Recibe</TableHead>
                <TableHead>Tasa</TableHead>
                <TableHead>Ganancia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 10).map(tx => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs">{new Date(tx.date).toLocaleDateString('es-VE')}</TableCell>
                  <TableCell>{tx.clientName}</TableCell>
                  <TableCell>{formatAmount(tx.sendAmount)} {tx.sendCurrencySymbol}</TableCell>
                  <TableCell>{formatAmount(tx.receiveAmount)} {tx.receiveCurrencySymbol}</TableCell>
                  <TableCell>{tx.rate.toFixed(4)}</TableCell>
                  <TableCell className="text-primary">{formatAmount(tx.profit)} {tx.profitCurrencySymbol}</TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay operaciones registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="text-primary" size={20} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;
