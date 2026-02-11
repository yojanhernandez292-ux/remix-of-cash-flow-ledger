import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useCurrencies, useAllCurrencyTypes, useCashMovements, useExchangeRates, formatAmount } from '@/db/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeftRight, AlertCircle } from 'lucide-react';

const Inventory = () => {
  const { toast } = useToast();
  const currencies = useCurrencies();
  const types = useAllCurrencyTypes();
  const movements = useCashMovements();
  const rates = useExchangeRates();
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];

  const [showAdjustment, setShowAdjustment] = useState(false);
  const [adjCurrencyId, setAdjCurrencyId] = useState<number>(0);
  const [adjTypeId, setAdjTypeId] = useState<number>(0);
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjKind, setAdjKind] = useState<'ingreso' | 'gasto'>('ingreso');
  const [adjDescription, setAdjDescription] = useState('');

  const [showExchange, setShowExchange] = useState(false);
  const [exBuyCurrId, setExBuyCurrId] = useState<number>(0);
  const [exBuyTypeId, setExBuyTypeId] = useState<number>(0);
  const [exSellCurrId, setExSellCurrId] = useState<number>(0);
  const [exSellTypeId, setExSellTypeId] = useState<number>(0);
  const [exAmount, setExAmount] = useState<number>(0);
  const [exRate, setExRate] = useState<number>(0);

  const balances = useMemo(() => {
    const b: Record<string, { currencyId: number; typeId: number; currencySymbol: string; typeName: string; amount: number }> = {};
    for (const m of movements) {
      const key = `${m.currencyId}-${m.typeId}`;
      if (!b[key]) b[key] = { currencyId: m.currencyId, typeId: m.typeId, currencySymbol: m.currencySymbol, typeName: m.typeName, amount: 0 };
      b[key].amount += m.amount;
    }
    return Object.values(b);
  }, [movements]);

  const groupedBalances = useMemo(() => {
    const groups: Record<string, typeof balances> = {};
    for (const b of balances) {
      if (!groups[b.currencySymbol]) groups[b.currencySymbol] = [];
      groups[b.currencySymbol].push(b);
    }
    return groups;
  }, [balances]);

  // Total de deudas por cobrar
  const totalDebt = useMemo(() => {
    return clients.reduce((sum, c) => sum + (c.debt || 0), 0);
  }, [clients]);

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
    // Sumar deudas como activo (cuentas por cobrar)
    total += totalDebt;
    return total;
  }, [balances, currencies, rates, totalDebt]);

  const adjTypes = useMemo(() => types.filter(t => t.currencyId === adjCurrencyId), [types, adjCurrencyId]);
  const exBuyTypes = useMemo(() => types.filter(t => t.currencyId === exBuyCurrId), [types, exBuyCurrId]);
  const exSellTypes = useMemo(() => types.filter(t => t.currencyId === exSellCurrId), [types, exSellCurrId]);

  const handleAdjustment = async () => {
    const curr = currencies.find(c => c.id === adjCurrencyId);
    const type = types.find(t => t.id === adjTypeId);
    if (!curr || !type || adjAmount <= 0) return;
    await db.cashMovements.add({
      date: new Date().toISOString(),
      currencyId: adjCurrencyId,
      currencySymbol: curr.symbol,
      typeId: adjTypeId,
      typeName: type.name,
      amount: adjKind === 'ingreso' ? adjAmount : -adjAmount,
      concept: adjDescription || (adjKind === 'ingreso' ? 'Ingreso de capital' : 'Gasto'),
      movementType: adjKind === 'ingreso' ? 'ajuste_in' : 'ajuste_out',
    });
    setShowAdjustment(false);
    setAdjAmount(0); setAdjDescription('');
    toast({ title: 'Ajuste registrado' });
  };

  const handleExchange = async () => {
    const buyCurr = currencies.find(c => c.id === exBuyCurrId);
    const buyType = types.find(t => t.id === exBuyTypeId);
    const sellCurr = currencies.find(c => c.id === exSellCurrId);
    const sellType = types.find(t => t.id === exSellTypeId);
    if (!buyCurr || !buyType || !sellCurr || !sellType || exAmount <= 0 || exRate <= 0) return;

    const sellAmount = exAmount * exRate;
    await db.cashMovements.bulkAdd([
      {
        date: new Date().toISOString(),
        currencyId: exBuyCurrId,
        currencySymbol: buyCurr.symbol,
        typeId: exBuyTypeId,
        typeName: buyType.name,
        amount: exAmount,
        concept: `Compra de ${buyCurr.symbol}`,
        movementType: 'compra' as const,
      },
      {
        date: new Date().toISOString(),
        currencyId: exSellCurrId,
        currencySymbol: sellCurr.symbol,
        typeId: exSellTypeId,
        typeName: sellType.name,
        amount: -sellAmount,
        concept: `Venta de ${sellCurr.symbol}`,
        movementType: 'venta' as const,
      },
    ]);
    setShowExchange(false);
    setExAmount(0); setExRate(0);
    toast({ title: 'Cambio ejecutado' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inventario / Cajas</h1>
          <p className="text-sm text-muted-foreground">Valor total: <span className="text-primary font-bold">$ {formatAmount(businessValue)}</span></p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAdjustment(true)} variant="secondary"><Plus size={16} className="mr-2" /> Ajuste</Button>
          <Button onClick={() => setShowExchange(true)} variant="secondary"><ArrowLeftRight size={16} className="mr-2" /> Compra/Venta</Button>
        </div>
      </div>

      {/* Cuentas por cobrar (deudas) */}
      {totalDebt > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle size={18} />
              Cuentas por Cobrar (Deudas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded-md bg-amber-500/10">
              <p className="text-xs text-muted-foreground">Total en créditos a clientes</p>
              <p className="text-lg font-bold text-amber-500">{formatAmount(totalDebt)} USD</p>
              <p className="text-xs text-muted-foreground mt-1">
                {clients.filter(c => c.debt && c.debt > 0).length} cliente(s) con deuda
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedBalances).map(([symbol, items]) => (
        <Card key={symbol}>
          <CardHeader className="pb-3"><CardTitle>{symbol}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map(b => (
                <div key={`${b.currencyId}-${b.typeId}`} className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">{b.typeName}</p>
                  <p className={`text-lg font-bold ${b.amount >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatAmount(b.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {balances.length === 0 && totalDebt === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sin movimientos registrados. Registre una operación o ajuste para comenzar.</CardContent></Card>
      )}

      <Dialog open={showAdjustment} onOpenChange={setShowAdjustment}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajuste Manual</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo de Ajuste</Label>
              <Select value={adjKind} onValueChange={v => setAdjKind(v as 'ingreso' | 'gasto')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">Ingreso de Capital</SelectItem>
                  <SelectItem value="gasto">Gasto / Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Moneda</Label>
              <Select value={adjCurrencyId > 0 ? String(adjCurrencyId) : ""} onValueChange={v => { setAdjCurrencyId(Number(v)); setAdjTypeId(0); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{currencies.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.symbol} - {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Caja</Label>
              <Select value={adjTypeId > 0 ? String(adjTypeId) : ""} onValueChange={v => setAdjTypeId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{adjTypes.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Monto</Label><Input type="number" value={adjAmount || ''} onChange={e => setAdjAmount(Number(e.target.value))} /></div>
            <div><Label>Descripción</Label><Input value={adjDescription} onChange={e => setAdjDescription(e.target.value)} placeholder="Ej: Pago de local" /></div>
            <Button onClick={handleAdjustment} className="w-full">Registrar Ajuste</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExchange} onOpenChange={setShowExchange}>
        <DialogContent>
          <DialogHeader><DialogTitle>Compra / Venta de Divisas</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Comprar una divisa vendiendo otra para reponer inventario.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Comprar (Moneda)</Label>
                <Select value={exBuyCurrId > 0 ? String(exBuyCurrId) : ""} onValueChange={v => setExBuyCurrId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Moneda" /></SelectTrigger>
                  <SelectContent>{currencies.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.symbol}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={exBuyTypeId > 0 ? String(exBuyTypeId) : ""} onValueChange={v => setExBuyTypeId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>{exBuyTypes.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Monto a Comprar</Label><Input type="number" value={exAmount || ''} onChange={e => setExAmount(Number(e.target.value))} /></div>
            <div><Label>Tasa (1 compra = X venta)</Label><Input type="number" value={exRate || ''} onChange={e => setExRate(Number(e.target.value))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vender (Moneda)</Label>
                <Select value={exSellCurrId > 0 ? String(exSellCurrId) : ""} onValueChange={v => setExSellCurrId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Moneda" /></SelectTrigger>
                  <SelectContent>{currencies.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.symbol}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={exSellTypeId > 0 ? String(exSellTypeId) : ""} onValueChange={v => setExSellTypeId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>{exSellTypes.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {exAmount > 0 && exRate > 0 && (
              <p className="text-sm p-2 bg-secondary rounded">Vender: <strong>{formatAmount(exAmount * exRate)} {currencies.find(c => c.id === exSellCurrId)?.symbol}</strong></p>
            )}
            <Button onClick={handleExchange} className="w-full">Ejecutar Cambio</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
