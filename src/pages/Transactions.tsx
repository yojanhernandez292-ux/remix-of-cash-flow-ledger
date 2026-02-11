import { useState } from 'react';
import { useTransactions, formatAmount } from '@/db/hooks';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Transactions = () => {
  const transactions = useTransactions();
  const [search, setSearch] = useState('');

  const filtered = transactions.filter(t =>
    t.clientName.toLowerCase().includes(search.toLowerCase()) ||
    t.clientCedula.includes(search)
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transacciones</h1>
      <Input
        placeholder="Buscar por nombre o cédula..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Envía</TableHead>
              <TableHead>Recibe</TableHead>
              <TableHead>Tasa</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Ganancia</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(tx => (
              <TableRow key={tx.id}>
                <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                <TableCell className="text-xs">{new Date(tx.date).toLocaleString('es-VE')}</TableCell>
                <TableCell>
                  <div className="font-medium">{tx.clientName}</div>
                  <div className="text-xs text-muted-foreground">{tx.clientCedula}</div>
                </TableCell>
                <TableCell>
                  <div>{formatAmount(tx.sendAmount)} {tx.sendCurrencySymbol}</div>
                  <div className="text-xs text-muted-foreground">{tx.sendTypeName}</div>
                </TableCell>
                <TableCell>
                  <div>{formatAmount(tx.receiveAmount)} {tx.receiveCurrencySymbol}</div>
                  <div className="text-xs text-muted-foreground">{tx.receiveTypeName}</div>
                </TableCell>
                <TableCell>{tx.rate.toFixed(4)}</TableCell>
                <TableCell>{tx.commissionPercent}%</TableCell>
                <TableCell className="text-primary font-medium">{formatAmount(tx.profit)} {tx.profitCurrencySymbol}</TableCell>
                <TableCell>
                  <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                    {tx.status === 'completed' ? 'Completada' : tx.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {search ? 'Sin resultados' : 'No hay transacciones registradas'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Transactions;
