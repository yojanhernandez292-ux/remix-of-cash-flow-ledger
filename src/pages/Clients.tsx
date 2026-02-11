import { useState } from 'react';
import { db } from '@/db/database';
import { useClients, formatAmount } from '@/db/hooks';
import type { Client } from '@/db/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, AlertCircle } from 'lucide-react';

const Clients = () => {
  const { toast } = useToast();
  const clients = useClients();
  const [search, setSearch] = useState('');
  const [onlyWithDebt, setOnlyWithDebt] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');

  const filtered = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.cedula.includes(search);
    const matchesDebt = !onlyWithDebt || (c.debt && c.debt > 0);
    return matchesSearch && matchesDebt;
  });

  const totalDebt = clients.reduce((sum, c) => sum + (c.debt || 0), 0);
  const clientsWithDebt = clients.filter(c => c.debt && c.debt > 0).length;

  const handleSave = async () => {
    if (!name.trim() || !cedula.trim()) return;
    if (editId) {
      await db.clients.update(editId, { name: name.trim(), cedula: cedula.trim(), phone: phone.trim() });
      toast({ title: 'Cliente actualizado' });
    } else {
      await db.clients.add({ name: name.trim(), cedula: cedula.trim(), phone: phone.trim(), createdAt: new Date().toISOString(), debt: 0, debtCurrencySymbol: 'USD' });
      toast({ title: 'Cliente registrado' });
    }
    resetForm();
  };

  const handleEdit = (client: Client) => {
    setEditId(client.id!);
    setName(client.name);
    setCedula(client.cedula);
    setPhone(client.phone);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    await db.clients.delete(id);
    toast({ title: 'Cliente eliminado' });
  };

  const resetForm = () => {
    setShowForm(false); setEditId(null);
    setName(''); setCedula(''); setPhone('');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          {totalDebt > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="text-destructive font-medium">{clientsWithDebt} cliente(s)</span> con deuda total: <span className="text-destructive font-bold">{formatAmount(totalDebt)} USD</span>
            </p>
          )}
        </div>
        <Button onClick={() => setShowForm(true)}><UserPlus size={16} className="mr-2" /> Nuevo Cliente</Button>
      </div>
      
      <div className="flex gap-4 items-center">
        <Input placeholder="Buscar por nombre o cédula..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="onlyDebt" 
            checked={onlyWithDebt} 
            onCheckedChange={(checked) => setOnlyWithDebt(checked === true)}
          />
          <Label htmlFor="onlyDebt" className="text-sm cursor-pointer whitespace-nowrap">Solo con deuda</Label>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cédula</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Deuda</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id} className={c.debt && c.debt > 0 ? 'bg-destructive/5' : ''}>
                <TableCell className="font-mono">{c.cedula}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone || '-'}</TableCell>
                <TableCell>
                  {c.debt && c.debt > 0 ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle size={12} />
                      {formatAmount(c.debt)} {c.debtCurrencySymbol || 'USD'}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">Sin deuda</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('es-VE')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(c)}>Editar</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id!)}>Eliminar</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {search || onlyWithDebt ? 'Sin resultados' : 'No hay clientes registrados'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) resetForm(); else setShowForm(v); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cédula</Label><Input value={cedula} onChange={e => setCedula(e.target.value)} /></div>
            <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>Teléfono</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+58..." /></div>
            <Button onClick={handleSave} className="w-full">{editId ? 'Actualizar' : 'Registrar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;