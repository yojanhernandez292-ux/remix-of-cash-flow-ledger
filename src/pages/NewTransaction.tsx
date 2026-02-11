import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useCurrencies, useAllCurrencyTypes, formatAmount } from '@/db/hooks';
import { lookupRate } from '@/db/hooks';
import { generateWhatsAppUrl, generateReceiptMessage, DEFAULT_TEMPLATE } from '@/lib/whatsapp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, MessageSquare, Save, RotateCcw, AlertCircle } from 'lucide-react';

const NewTransaction = () => {
  const { toast } = useToast();
  const currencies = useCurrencies();
  const allTypes = useAllCurrencyTypes();
  const template = useLiveQuery(() => db.whatsappTemplates.toCollection().first());

  const [cedulaSearch, setCedulaSearch] = useState('');
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDebt, setClientDebt] = useState(0);
  const [showNewClient, setShowNewClient] = useState(false);

  const [newName, setNewName] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [sendCurrencyId, setSendCurrencyId] = useState<number>(0);
  const [sendTypeId, setSendTypeId] = useState<number>(0);
  const [sendAmount, setSendAmount] = useState<number>(0);
  const [commissionPercent, setCommissionPercent] = useState<number>(0);
  const [receiveCurrencyId, setReceiveCurrencyId] = useState<number>(0);
  const [receiveTypeId, setReceiveTypeId] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);

  // Opciones de deuda
  const [isDebt, setIsDebt] = useState(false); // Si la entrada es a deuda
  const [payDebt, setPayDebt] = useState(false); // Si quiere pagar deuda existente
  const [debtPaymentAmount, setDebtPaymentAmount] = useState(0);

  // Modo de cálculo: 'send' = desde monto enviado, 'receive' = desde monto a entregar
  const [calcMode, setCalcMode] = useState<'send' | 'receive'>('send');
  const [receiveAmountInput, setReceiveAmountInput] = useState<number>(0);

  const [savedTxId, setSavedTxId] = useState<number | null>(null);

  // Cálculos según el modo
  const netAmount = calcMode === 'send' 
    ? sendAmount * (1 - commissionPercent / 100)
    : (receiveAmountInput / rate) || 0;
  
  const calculatedReceiveAmount = calcMode === 'send'
    ? netAmount * rate
    : receiveAmountInput;
  
  // Monto final a entregar (restando deuda si aplica)
  const finalReceiveAmount = payDebt && debtPaymentAmount > 0 
    ? calculatedReceiveAmount - debtPaymentAmount 
    : calculatedReceiveAmount;

  // Si el modo es 'receive', calcular el monto a enviar
  const calculatedSendAmount = calcMode === 'receive' && rate > 0
    ? receiveAmountInput / rate / (1 - commissionPercent / 100)
    : sendAmount;

  const effectiveSendAmount = calcMode === 'send' ? sendAmount : calculatedSendAmount;
  const profit = effectiveSendAmount * commissionPercent / 100;

  const sendTypes = useMemo(() => allTypes.filter(t => t.currencyId === sendCurrencyId), [allTypes, sendCurrencyId]);
  const receiveTypes = useMemo(() => allTypes.filter(t => t.currencyId === receiveCurrencyId), [allTypes, receiveCurrencyId]);

  const searchClient = async () => {
    if (!cedulaSearch.trim()) return;
    const client = await db.clients.where('cedula').equals(cedulaSearch.trim()).first();
    if (client) {
      setClientId(client.id!);
      setClientName(client.name);
      setClientPhone(client.phone);
      setClientDebt(client.debt || 0);
      toast({ title: 'Cliente encontrado', description: client.name });
    } else {
      setClientId(null);
      setClientName('');
      setClientPhone('');
      setClientDebt(0);
      setNewCedula(cedulaSearch.trim());
      setShowNewClient(true);
    }
  };

  useEffect(() => {
    if (sendCurrencyId) {
      const curr = currencies.find(c => c.id === sendCurrencyId);
      if (curr) setCommissionPercent(curr.commissionPercent);
    }
  }, [sendCurrencyId, currencies]);

  useEffect(() => {
    if (sendCurrencyId && receiveCurrencyId) {
      lookupRate(sendCurrencyId, receiveCurrencyId).then(r => {
        if (r !== null) setRate(r);
      });
    }
  }, [sendCurrencyId, receiveCurrencyId]);

  // Reset deuda cuando cambia cliente
  useEffect(() => {
    setPayDebt(false);
    setDebtPaymentAmount(0);
  }, [clientId]);

  const handleSaveClient = async () => {
    if (!newName.trim() || !newCedula.trim()) return;
    const id = await db.clients.add({
      name: newName.trim(),
      cedula: newCedula.trim(),
      phone: newPhone.trim(),
      createdAt: new Date().toISOString(),
      debt: 0,
      debtCurrencySymbol: 'USD',
    });
    setClientId(id as number);
    setClientName(newName.trim());
    setClientPhone(newPhone.trim());
    setClientDebt(0);
    setCedulaSearch(newCedula.trim());
    setShowNewClient(false);
    setNewName(''); setNewCedula(''); setNewPhone('');
    toast({ title: 'Cliente registrado' });
  };

  const handleSave = async () => {
    const actualSendAmount = calcMode === 'send' ? sendAmount : calculatedSendAmount;
    
    if (!clientId || !sendCurrencyId || !receiveCurrencyId || !receiveTypeId || actualSendAmount <= 0) {
      toast({ title: 'Error', description: 'Complete todos los campos requeridos', variant: 'destructive' });
      return;
    }
    
    // Si es deuda, no requiere tipo de envío (no hay movimiento de entrada real)
    if (!isDebt && !sendTypeId) {
      toast({ title: 'Error', description: 'Seleccione el tipo de entrada', variant: 'destructive' });
      return;
    }

    const sendCurr = currencies.find(c => c.id === sendCurrencyId)!;
    const sendType = sendTypes.find(t => t.id === sendTypeId);
    const recvCurr = currencies.find(c => c.id === receiveCurrencyId)!;
    const recvType = receiveTypes.find(t => t.id === receiveTypeId)!;

    const txId = await db.transactions.add({
      clientId,
      clientName,
      clientCedula: cedulaSearch,
      date: new Date().toISOString(),
      sendAmount: actualSendAmount,
      sendCurrencyId,
      sendCurrencySymbol: sendCurr.symbol,
      sendTypeId: sendTypeId || 0,
      sendTypeName: sendType?.name || 'Deuda',
      receiveAmount: calculatedReceiveAmount,
      receiveCurrencyId,
      receiveCurrencySymbol: recvCurr.symbol,
      receiveTypeId,
      receiveTypeName: recvType.name,
      rate,
      commissionPercent,
      netAmount,
      profit,
      profitCurrencySymbol: sendCurr.symbol,
      notes: '',
      status: 'completed',
      isDebt,
      debtPaymentAmount: payDebt ? debtPaymentAmount : 0,
    });

    // Movimientos de caja
    const movements = [];

    // Solo agregar movimiento de entrada si NO es deuda
    if (!isDebt && sendType) {
      movements.push({
        date: new Date().toISOString(),
        currencyId: sendCurrencyId,
        currencySymbol: sendCurr.symbol,
        typeId: sendTypeId,
        typeName: sendType.name,
        amount: actualSendAmount,
        concept: `Remesa #${txId} - Entrada`,
        transactionId: txId as number,
        movementType: 'remesa_in' as const,
      });
    }

    // Siempre hay salida
    movements.push({
      date: new Date().toISOString(),
      currencyId: receiveCurrencyId,
      currencySymbol: recvCurr.symbol,
      typeId: receiveTypeId,
      typeName: recvType.name,
      amount: -calculatedReceiveAmount,
      concept: `Remesa #${txId} - Salida`,
      transactionId: txId as number,
      movementType: 'remesa_out' as const,
    });

    await db.cashMovements.bulkAdd(movements);

    // Manejar deudas
    if (isDebt) {
      // Aumentar deuda del cliente
      const newDebt = clientDebt + actualSendAmount;
      await db.clients.update(clientId, { debt: newDebt, debtCurrencySymbol: sendCurr.symbol });
      await db.clientDebtMovements.add({
        clientId,
        date: new Date().toISOString(),
        amount: actualSendAmount,
        currencySymbol: sendCurr.symbol,
        concept: `Remesa #${txId} - Crédito otorgado`,
        transactionId: txId as number,
      });
      setClientDebt(newDebt);
    }

    if (payDebt && debtPaymentAmount > 0) {
      // Reducir deuda del cliente
      const newDebt = Math.max(0, clientDebt - debtPaymentAmount);
      await db.clients.update(clientId, { debt: newDebt });
      await db.clientDebtMovements.add({
        clientId,
        date: new Date().toISOString(),
        amount: -debtPaymentAmount,
        currencySymbol: sendCurr.symbol,
        concept: `Remesa #${txId} - Pago de deuda`,
        transactionId: txId as number,
      });
      setClientDebt(newDebt);
    }

    setSavedTxId(txId as number);
    toast({ title: '✅ Operación guardada', description: `Remesa #${txId}` });
  };

  const handleWhatsApp = () => {
    if (!clientPhone) {
      toast({ title: 'Sin teléfono', description: 'El cliente no tiene número registrado', variant: 'destructive' });
      return;
    }
    const sendCurr = currencies.find(c => c.id === sendCurrencyId);
    const recvCurr = currencies.find(c => c.id === receiveCurrencyId);
    const msg = generateReceiptMessage(template?.template || DEFAULT_TEMPLATE, {
      clientName,
      sendAmount: effectiveSendAmount,
      sendCurrency: sendCurr?.symbol || '',
      receiveAmount: finalReceiveAmount,
      receiveCurrency: recvCurr?.symbol || '',
      rate,
      commission: commissionPercent,
    });
    window.open(generateWhatsAppUrl(clientPhone, msg), '_blank');
  };

  const handleReset = () => {
    setCedulaSearch(''); setClientId(null); setClientName(''); setClientPhone(''); setClientDebt(0);
    setSendCurrencyId(0); setSendTypeId(0); setSendAmount(0); setCommissionPercent(0);
    setReceiveCurrencyId(0); setReceiveTypeId(0); setRate(0); setSavedTxId(null);
    setIsDebt(false); setPayDebt(false); setDebtPaymentAmount(0);
    setCalcMode('send'); setReceiveAmountInput(0);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Nueva Operación</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Cédula del cliente"
              value={cedulaSearch}
              onChange={e => setCedulaSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchClient()}
            />
            <Button onClick={searchClient} variant="secondary" size="icon"><Search size={16} /></Button>
            <Button onClick={() => { setNewCedula(''); setShowNewClient(true); }} variant="outline" size="icon"><UserPlus size={16} /></Button>
          </div>
          {clientId && (
            <div className={`p-3 rounded-md border ${clientDebt > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/5 border-primary/20'}`}>
              <p className="font-medium text-primary">{clientName}</p>
              <p className="text-xs text-muted-foreground">Cédula: {cedulaSearch} • Tel: {clientPhone || 'N/A'}</p>
              {clientDebt > 0 && (
                <div className="mt-2 flex items-center gap-2 text-destructive">
                  <AlertCircle size={14} />
                  <span className="text-sm font-medium">Deuda pendiente: {formatAmount(clientDebt)} USD</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base text-primary">📥 Recibe (Entrada)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2 p-2 bg-secondary/50 rounded-md">
              <Checkbox 
                id="isDebt" 
                checked={isDebt} 
                onCheckedChange={(checked) => setIsDebt(checked === true)}
              />
              <Label htmlFor="isDebt" className="text-sm cursor-pointer">Es a crédito (deuda)</Label>
            </div>
            <div>
              <Label>Moneda</Label>
              <Select value={sendCurrencyId > 0 ? String(sendCurrencyId) : ""} onValueChange={v => { setSendCurrencyId(Number(v)); setSendTypeId(0); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{currencies.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.symbol} - {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!isDebt && (
              <div>
                <Label>Tipo</Label>
                <Select value={sendTypeId > 0 ? String(sendTypeId) : ""} onValueChange={v => setSendTypeId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{sendTypes.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Monto</Label>
              <Input type="number" value={sendAmount || ''} onChange={e => setSendAmount(Number(e.target.value))} placeholder="0.00" />
            </div>
            <div>
              <Label>Comisión (%)</Label>
              <Input type="number" value={commissionPercent} onChange={e => setCommissionPercent(Number(e.target.value))} step="0.1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base text-muted-foreground">📤 Entrega (Salida)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Moneda</Label>
              <Select value={receiveCurrencyId > 0 ? String(receiveCurrencyId) : ""} onValueChange={v => { setReceiveCurrencyId(Number(v)); setReceiveTypeId(0); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{currencies.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.symbol} - {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={receiveTypeId > 0 ? String(receiveTypeId) : ""} onValueChange={v => setReceiveTypeId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{receiveTypes.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tasa</Label>
              <Input type="number" value={rate || ''} onChange={e => setRate(Number(e.target.value))} step="0.01" placeholder="0.00" />
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox 
                  id="calcModeReceive" 
                  checked={calcMode === 'receive'} 
                  onCheckedChange={(checked) => {
                    setCalcMode(checked ? 'receive' : 'send');
                    if (checked && calculatedReceiveAmount > 0) {
                      setReceiveAmountInput(calculatedReceiveAmount);
                    }
                  }}
                />
                <Label htmlFor="calcModeReceive" className="text-sm cursor-pointer">Especificar monto a entregar</Label>
              </div>
              {calcMode === 'receive' && (
                <div>
                  <Label>Monto a entregar</Label>
                  <Input 
                    type="number" 
                    value={receiveAmountInput || ''} 
                    onChange={e => setReceiveAmountInput(Number(e.target.value))} 
                    placeholder="0.00"
                  />
                  {calculatedSendAmount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cliente debe pagar: {formatAmount(calculatedSendAmount)} {currencies.find(c => c.id === sendCurrencyId)?.symbol || ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opción de pagar deuda */}
      {clientId && clientDebt > 0 && !isDebt && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox 
                id="payDebt" 
                checked={payDebt} 
                onCheckedChange={(checked) => {
                  setPayDebt(checked === true);
                  if (checked) setDebtPaymentAmount(Math.min(sendAmount, clientDebt));
                }}
              />
              <Label htmlFor="payDebt" className="text-sm cursor-pointer">Descontar de la deuda pendiente</Label>
            </div>
            {payDebt && (
              <div className="flex items-center gap-3">
                <Label className="shrink-0">Monto a descontar:</Label>
                <Input 
                  type="number" 
                  value={debtPaymentAmount || ''} 
                  onChange={e => setDebtPaymentAmount(Math.min(Number(e.target.value), clientDebt))}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">/ {formatAmount(clientDebt)} USD</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDebtPaymentAmount(Math.min(sendAmount, clientDebt))}
                >
                  Máximo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-secondary/30 border-primary/20">
        <CardContent className="p-5">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{calcMode === 'receive' ? 'Cliente paga' : 'Recibido'}</p>
              <p className="text-xl font-bold">{formatAmount(effectiveSendAmount)} {currencies.find(c => c.id === sendCurrencyId)?.symbol || ''}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Neto</p>
              <p className="text-lg font-semibold">{formatAmount(netAmount)} {currencies.find(c => c.id === sendCurrencyId)?.symbol || ''}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">A Entregar</p>
              <p className="text-xl font-bold">{formatAmount(finalReceiveAmount)} {currencies.find(c => c.id === receiveCurrencyId)?.symbol || ''}</p>
              {payDebt && debtPaymentAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  ({formatAmount(calculatedReceiveAmount)} - {formatAmount(debtPaymentAmount)} deuda)
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ganancia</p>
              <p className="text-xl font-bold text-primary">{formatAmount(profit)} {currencies.find(c => c.id === sendCurrencyId)?.symbol || ''}</p>
            </div>
          </div>
          {isDebt && (
            <p className="text-center mt-3 text-sm text-amber-600">⚠️ Esta operación generará una deuda de {formatAmount(effectiveSendAmount)} {currencies.find(c => c.id === sendCurrencyId)?.symbol}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {!savedTxId ? (
          <Button onClick={handleSave} className="flex-1" size="lg">
            <Save size={16} className="mr-2" /> Guardar Operación
          </Button>
        ) : (
          <>
            <Button onClick={handleWhatsApp} variant="secondary" size="lg" className="flex-1">
              <MessageSquare size={16} className="mr-2" /> WhatsApp
            </Button>
            <Button onClick={handleReset} size="lg" variant="outline">
              <RotateCcw size={16} className="mr-2" /> Nueva
            </Button>
          </>
        )}
      </div>

      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cédula</Label><Input value={newCedula} onChange={e => setNewCedula(e.target.value)} /></div>
            <div><Label>Nombre</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
            <div><Label>Teléfono</Label><Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+58..." /></div>
            <Button onClick={handleSaveClient} className="w-full">Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewTransaction;