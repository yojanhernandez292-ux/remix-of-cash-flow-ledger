import { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useCurrencies, useAllCurrencyTypes, useExchangeRates } from '@/db/hooks';
import type { Currency } from '@/db/types';
import { exportToJSON, exportToCSV } from '@/lib/export';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Download, Upload, FileSpreadsheet, Save } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <Tabs defaultValue="currencies">
        <TabsList>
          <TabsTrigger value="currencies">Divisas</TabsTrigger>
          <TabsTrigger value="types">Tipos de Caja</TabsTrigger>
          <TabsTrigger value="rates">Tasas</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="backup">Respaldos</TabsTrigger>
        </TabsList>
        <TabsContent value="currencies"><CurrenciesTab /></TabsContent>
        <TabsContent value="types"><TypesTab /></TabsContent>
        <TabsContent value="rates"><RatesTab /></TabsContent>
        <TabsContent value="whatsapp"><WhatsAppTab /></TabsContent>
        <TabsContent value="backup"><BackupTab /></TabsContent>
      </Tabs>
    </div>
  );
};

function CurrenciesTab() {
  const { toast } = useToast();
  const currencies = useCurrencies();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [commission, setCommission] = useState(0);

  const save = async () => {
    if (!name.trim() || !symbol.trim()) return;
    if (editId) {
      await db.currencies.update(editId, { name: name.trim(), symbol: symbol.trim().toUpperCase(), commissionPercent: commission });
    } else {
      await db.currencies.add({ name: name.trim(), symbol: symbol.trim().toUpperCase(), commissionPercent: commission });
    }
    reset();
    toast({ title: editId ? 'Divisa actualizada' : 'Divisa agregada' });
  };

  const edit = (c: Currency) => { setEditId(c.id!); setName(c.name); setSymbol(c.symbol); setCommission(c.commissionPercent); setShowForm(true); };
  const del = async (id: number) => { await db.currencies.delete(id); toast({ title: 'Divisa eliminada' }); };
  const reset = () => { setShowForm(false); setEditId(null); setName(''); setSymbol(''); setCommission(0); };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Gestiona las divisas del sistema</p>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} className="mr-1" /> Agregar</Button>
        </div>
        <div className="space-y-2">
          {currencies.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
              <div>
                <span className="font-bold text-primary mr-2">{c.symbol}</span>
                <span>{c.name}</span>
                <span className="text-xs text-muted-foreground ml-2">Comisión: {c.commissionPercent}%</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => edit(c)}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => del(c.id!)}><Trash2 size={14} className="text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
        <Dialog open={showForm} onOpenChange={v => { if (!v) reset(); else setShowForm(v); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nueva'} Divisa</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Bolívar" /></div>
              <div><Label>Símbolo</Label><Input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="Ej: BS" /></div>
              <div><Label>Comisión predeterminada (%)</Label><Input type="number" value={commission} onChange={e => setCommission(Number(e.target.value))} step="0.1" /></div>
              <Button onClick={save} className="w-full">{editId ? 'Actualizar' : 'Agregar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function TypesTab() {
  const { toast } = useToast();
  const currencies = useCurrencies();
  const types = useAllCurrencyTypes();
  const [selectedCurrency, setSelectedCurrency] = useState<number>(0);
  const [newTypeName, setNewTypeName] = useState('');

  const filteredTypes = useMemo(() => types.filter(t => t.currencyId === selectedCurrency), [types, selectedCurrency]);

  const addType = async () => {
    if (!newTypeName.trim() || !selectedCurrency) return;
    await db.currencyTypes.add({ currencyId: selectedCurrency, name: newTypeName.trim() });
    setNewTypeName('');
    toast({ title: 'Tipo agregado' });
  };

  const delType = async (id: number) => { await db.currencyTypes.delete(id); toast({ title: 'Tipo eliminado' }); };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">Tipos de caja por divisa (Zelle, Efectivo, Nequi, etc.)</p>
        <Select value={selectedCurrency > 0 ? String(selectedCurrency) : ""} onValueChange={v => setSelectedCurrency(Number(v))}>
          <SelectTrigger className="max-w-xs"><SelectValue placeholder="Seleccionar divisa" /></SelectTrigger>
          <SelectContent>{currencies.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.symbol} - {c.name}</SelectItem>)}</SelectContent>
        </Select>
        {selectedCurrency > 0 && (
          <>
            <div className="space-y-2">
              {filteredTypes.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
                  <span>{t.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => delType(t.id!)}><Trash2 size={14} className="text-destructive" /></Button>
                </div>
              ))}
              {filteredTypes.length === 0 && <p className="text-sm text-muted-foreground">Sin tipos registrados</p>}
            </div>
            <div className="flex gap-2">
              <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Nombre del tipo" onKeyDown={e => e.key === 'Enter' && addType()} />
              <Button onClick={addType}><Plus size={14} className="mr-1" /> Agregar</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RatesTab() {
  const { toast } = useToast();
  const currencies = useCurrencies();
  const rates = useExchangeRates();
  const [editValues, setEditValues] = useState<Record<number, string>>({});
  const [newTargetId, setNewTargetId] = useState<number>(0);
  const [newRate, setNewRate] = useState('');

  const usd = currencies.find(c => c.symbol === 'USD');
  const currenciesWithoutRate = currencies.filter(c => c.symbol !== 'USD' && !rates.some(r => r.toCurrencyId === c.id));

  const updateRate = async (rateId: number) => {
    const val = parseFloat(editValues[rateId] || '0');
    if (val <= 0) return;
    await db.exchangeRates.update(rateId, { rate: val, updatedAt: new Date().toISOString() });
    toast({ title: 'Tasa actualizada' });
  };

  const addRate = async () => {
    if (!usd || !newTargetId || !newRate) return;
    await db.exchangeRates.add({
      fromCurrencyId: usd.id!,
      toCurrencyId: newTargetId,
      rate: parseFloat(newRate),
      updatedAt: new Date().toISOString(),
    });
    setNewTargetId(0); setNewRate('');
    toast({ title: 'Tasa agregada' });
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">Tasas de cambio base USD. Las tasas cruzadas se calculan automáticamente.</p>
        {rates.map(r => {
          const from = currencies.find(c => c.id === r.fromCurrencyId);
          const to = currencies.find(c => c.id === r.toCurrencyId);
          return (
            <div key={r.id} className="flex items-center gap-3">
              <span className="text-sm w-32 shrink-0">1 {from?.symbol} =</span>
              <Input
                type="number"
                className="w-40"
                value={editValues[r.id!] ?? String(r.rate)}
                onChange={e => setEditValues(prev => ({ ...prev, [r.id!]: e.target.value }))}
              />
              <span className="text-sm">{to?.symbol}</span>
              <Button size="sm" variant="secondary" onClick={() => updateRate(r.id!)}><Save size={14} /></Button>
              <span className="text-xs text-muted-foreground">{new Date(r.updatedAt).toLocaleString('es-VE')}</span>
            </div>
          );
        })}
        {currenciesWithoutRate.length > 0 && (
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <span className="text-sm shrink-0">1 USD =</span>
            <Input type="number" className="w-40" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="Tasa" />
            <Select value={newTargetId > 0 ? String(newTargetId) : ""} onValueChange={v => setNewTargetId(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Divisa" /></SelectTrigger>
              <SelectContent>{currenciesWithoutRate.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.symbol}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" onClick={addRate}><Plus size={14} className="mr-1" /> Agregar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WhatsAppTab() {
  const { toast } = useToast();
  const template = useLiveQuery(() => db.whatsappTemplates.toCollection().first());
  const [text, setText] = useState('');

  useEffect(() => {
    if (template) setText(template.template);
  }, [template]);

  const save = async () => {
    if (template?.id) {
      await db.whatsappTemplates.update(template.id, { template: text });
      toast({ title: 'Plantilla guardada' });
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">Edita la plantilla del mensaje de WhatsApp. Variables disponibles:</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {['{nombreCliente}', '{montoEnvio}', '{monedaEnvio}', '{montoRecibe}', '{monedaRecibe}', '{tasa}', '{comision}'].map(v => (
            <code key={v} className="px-2 py-1 bg-secondary rounded">{v}</code>
          ))}
        </div>
        <Textarea value={text} onChange={e => setText(e.target.value)} rows={10} className="font-mono text-sm" />
        <Button onClick={save}><Save size={14} className="mr-2" /> Guardar Plantilla</Button>
      </CardContent>
    </Card>
  );
}

function BackupTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportAllJSON = async () => {
    const data = {
      currencies: await db.currencies.toArray(),
      currencyTypes: await db.currencyTypes.toArray(),
      exchangeRates: await db.exchangeRates.toArray(),
      clients: await db.clients.toArray(),
      transactions: await db.transactions.toArray(),
      cashMovements: await db.cashMovements.toArray(),
      whatsappTemplates: await db.whatsappTemplates.toArray(),
      exportDate: new Date().toISOString(),
    };
    exportToJSON(data, `remesapro-backup-${new Date().toISOString().slice(0, 10)}`);
    toast({ title: 'Exportado', description: 'Respaldo JSON descargado' });
  };

  const exportTxCSV = async () => {
    const txs = await db.transactions.toArray();
    exportToCSV(txs as unknown as Record<string, unknown>[], `remesapro-transacciones-${new Date().toISOString().slice(0, 10)}`);
    toast({ title: 'Exportado', description: 'CSV de transacciones descargado' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await db.transaction('rw', [db.currencies, db.currencyTypes, db.exchangeRates, db.clients, db.transactions, db.cashMovements, db.whatsappTemplates], async () => {
        await db.currencies.clear();
        await db.currencyTypes.clear();
        await db.exchangeRates.clear();
        await db.clients.clear();
        await db.transactions.clear();
        await db.cashMovements.clear();
        await db.whatsappTemplates.clear();
        if (data.currencies) await db.currencies.bulkAdd(data.currencies);
        if (data.currencyTypes) await db.currencyTypes.bulkAdd(data.currencyTypes);
        if (data.exchangeRates) await db.exchangeRates.bulkAdd(data.exchangeRates);
        if (data.clients) await db.clients.bulkAdd(data.clients);
        if (data.transactions) await db.transactions.bulkAdd(data.transactions);
        if (data.cashMovements) await db.cashMovements.bulkAdd(data.cashMovements);
        if (data.whatsappTemplates) await db.whatsappTemplates.bulkAdd(data.whatsappTemplates);
      });
      toast({ title: '✅ Importado', description: 'Datos restaurados correctamente' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo importar el archivo', variant: 'destructive' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">Exporta e importa todos los datos del sistema.</p>
        <div className="flex gap-3">
          <Button onClick={exportAllJSON} variant="secondary"><Download size={16} className="mr-2" /> Exportar JSON</Button>
          <Button onClick={exportTxCSV} variant="secondary"><FileSpreadsheet size={16} className="mr-2" /> Exportar CSV</Button>
        </div>
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium mb-2">Restaurar Respaldo</p>
          <p className="text-xs text-muted-foreground mb-3">⚠️ Esto reemplazará todos los datos actuales.</p>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload size={16} className="mr-2" /> Importar JSON</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default Settings;
