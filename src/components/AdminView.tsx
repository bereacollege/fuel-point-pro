import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, startOfWeek, startOfMonth, isAfter, subDays } from 'date-fns';
import { StatCard } from './StatCard';
import { ReceiptTemplate } from './ReceiptTemplate';
import { Lock, Eye, Download, Moon, Sun, Trash2, Plus, Power, PowerOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AdminViewProps {
  prices: { retail: number; distributor: number };
  setPrices: (p: { retail: number; distributor: number }) => void;
}

type FilterType = 'today' | 'week' | 'month' | 'all';

export function AdminView({ prices, setPrices }: AdminViewProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<Record<string, any[]>>({});
  const [expenses, setExpenses] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [receiptSale, setReceiptSale] = useState<any | null>(null);
  const [afterHoursAccess, setAfterHoursAccess] = useState(false);
  const [cashierCodes, setCashierCodes] = useState<any[]>([]);
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [newCodeValue, setNewCodeValue] = useState('');

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated]);

  const fetchData = async () => {
    const [salesRes, expRes, settingsRes, checkinsRes, codesRes] = await Promise.all([
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('*').single(),
      supabase.from('checkins').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('cashier_codes').select('*').order('created_at', { ascending: false }),
    ]);
    if (salesRes.data) setSales(salesRes.data);
    if (expRes.data) setExpenses(expRes.data);
    if (settingsRes.data) setAfterHoursAccess(!!(settingsRes.data as any).after_hours_access);
    if (checkinsRes.data) setCheckins(checkinsRes.data);
    if (codesRes.data) setCashierCodes(codesRes.data);
  };

  const toggleAfterHours = async () => {
    const newVal = !afterHoursAccess;
    await supabase.from('settings').update({ after_hours_access: newVal } as any).eq('id', 1);
    setAfterHoursAccess(newVal);
    toast({ title: newVal ? 'After-Hours Access Enabled' : 'After-Hours Access Disabled' });
  };

  // Delete helpers
  const deleteSale = async (saleId: string) => {
    await supabase.from('sale_items').delete().eq('sale_id', saleId);
    await supabase.from('sales').delete().eq('id', saleId);
    setSales(prev => prev.filter(s => s.id !== saleId));
    toast({ title: 'Transaction Deleted' });
  };

  const deleteExpense = async (expId: string) => {
    await supabase.from('expenses').delete().eq('id', expId);
    setExpenses(prev => prev.filter(e => e.id !== expId));
    toast({ title: 'Expense Deleted' });
  };

  const deleteCheckin = async (checkin: any) => {
    // Try to delete storage file
    const urlParts = checkin.image_url?.split('/');
    const fileName = urlParts?.[urlParts.length - 1];
    if (fileName) await supabase.storage.from('checkins').remove([fileName]);
    await supabase.from('checkins').delete().eq('id', checkin.id);
    setCheckins(prev => prev.filter(c => c.id !== checkin.id));
    toast({ title: 'Check-in Deleted' });
  };

  // Cashier code helpers
  const addCashierCode = async () => {
    if (newCodeValue.length !== 4 || !newCodeLabel.trim()) {
      toast({ title: 'Invalid', description: 'Provide a label and 4-digit code.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('cashier_codes').insert([{ code: newCodeValue, label: newCodeLabel.trim() }]);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewCodeLabel('');
    setNewCodeValue('');
    fetchData();
    toast({ title: 'Cashier Code Created' });
  };

  const toggleCashierCode = async (id: string, currentActive: boolean) => {
    await supabase.from('cashier_codes').update({ active: !currentActive }).eq('id', id);
    setCashierCodes(prev => prev.map(c => c.id === id ? { ...c, active: !currentActive } : c));
  };

  const deleteCashierCode = async (id: string) => {
    await supabase.from('cashier_codes').delete().eq('id', id);
    setCashierCodes(prev => prev.filter(c => c.id !== id));
    toast({ title: 'Cashier Code Deleted' });
  };

  const filterDate = useMemo(() => {
    const now = new Date();
    if (filter === 'today') return startOfDay(now);
    if (filter === 'week') return startOfWeek(now);
    if (filter === 'month') return startOfMonth(now);
    return null;
  }, [filter]);

  const filteredSales = useMemo(() => {
    if (!filterDate) return sales;
    return sales.filter(s => isAfter(new Date(s.created_at), filterDate));
  }, [sales, filterDate]);

  const filteredExpenses = useMemo(() => {
    if (!filterDate) return expenses;
    return expenses.filter(e => isAfter(new Date(e.created_at), filterDate));
  }, [expenses, filterDate]);

  const stats = useMemo(() => {
    const revenue = filteredSales.reduce((acc, s) => acc + Number(s.total_amount), 0);
    const kg = filteredSales.reduce((acc, s) => acc + Number(s.total_kg), 0);
    const exp = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    return { revenue, kg, count: filteredSales.length, expenses: exp };
  }, [filteredSales, filteredExpenses]);

  const chartData = useMemo(() => {
    const days: { day: string; revenue: number; expenses: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayRevenue = sales
        .filter(s => { const t = new Date(s.created_at); return t >= d && t < nextD; })
        .reduce((acc, s) => acc + Number(s.total_amount), 0);
      const dayExpenses = expenses
        .filter(e => { const t = new Date(e.created_at); return t >= d && t < nextD; })
        .reduce((acc, e) => acc + Number(e.amount), 0);
      days.push({ day: format(d, 'EEE'), revenue: dayRevenue, expenses: dayExpenses });
    }
    return days;
  }, [sales, expenses]);

  const updatePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('settings').update({
      retail_price_per_kg: prices.retail,
      distributor_price_per_kg: prices.distributor,
    }).eq('id', 1);
    toast({ title: 'Prices Updated', description: 'New prices are now active.' });
  };

  const viewReceipt = async (sale: any) => {
    const { data } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
    if (data) setSaleItems(prev => ({ ...prev, [sale.id]: data }));
    setReceiptSale(sale);
  };

  const handleLogin = () => {
    if (password === 'admin123') {
      setAuthenticated(true);
    } else {
      toast({ title: 'Wrong Password', variant: 'destructive' });
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto mt-12 surface-card p-6 text-center animate-fade-in">
        <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-muted-foreground" />
        </div>
        <h2 className="text-lg font-bold heading-tight mb-4">Admin Access</h2>
        <input
          type="password"
          placeholder="Enter Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full h-12 bg-secondary rounded-xl px-4 mb-4 text-center outline-none focus:ring-2 ring-primary transition-all"
        />
        <button
          onClick={handleLogin}
          className="w-full h-12 bg-foreground text-background rounded-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all duration-150"
        >
          Login
        </button>
        <p className="text-xs text-muted-foreground mt-3">Default: admin123</p>
      </div>
    );
  }

  if (receiptSale) {
    const items = saleItems[receiptSale.id] || [];
    return (
      <div className="animate-fade-in">
        <button onClick={() => setReceiptSale(null)} className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Dashboard
        </button>
        <div className="surface-card p-6 max-w-sm mx-auto">
          <ReceiptTemplate
            items={items.map((i: any) => ({ kg: Number(i.kg), amount: Number(i.amount) }))}
            totalKg={Number(receiptSale.total_kg)}
            totalAmount={Number(receiptSale.total_amount)}
            customerType={receiptSale.customer_type}
            receiptNumber={receiptSale.receipt_number}
            date={new Date(receiptSale.created_at)}
          />
          <button
            onClick={() => window.print()}
            className="w-full h-12 bg-foreground text-background rounded-xl font-bold mt-6 hover:opacity-90 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
          >
            <Download size={18} /> Print / Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* After-hours toggle + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'today', 'week', 'month'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filter === f ? 'bg-card shadow-sm text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
        <button
          onClick={toggleAfterHours}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            afterHoursAccess
              ? 'bg-accent text-accent-foreground'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          {afterHoursAccess ? <Sun size={16} /> : <Moon size={16} />}
          {afterHoursAccess ? 'After-Hours: ON' : 'After-Hours: OFF'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Revenue" value={`₦${stats.revenue.toLocaleString()}`} variant="primary" />
        <StatCard label="KG Sold" value={`${stats.kg.toLocaleString()} kg`} />
        <StatCard label="Expenses" value={`₦${stats.expenses.toLocaleString()}`} variant="danger" />
        <StatCard label="Net Profit" value={`₦${(stats.revenue - stats.expenses).toLocaleString()}`} variant="success" />
      </div>

      {/* Revenue Chart */}
      <div className="surface-card p-4">
        <h3 className="font-bold heading-tight text-sm mb-4">Revenue (Last 7 Days)</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(v: number) => [`₦${v.toLocaleString()}`, '']}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cashier Codes */}
      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold heading-tight text-sm">Cashier Codes</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
              placeholder="Label (e.g. Ada)"
              value={newCodeLabel}
              onChange={(e) => setNewCodeLabel(e.target.value)}
              className="flex-1 h-10 bg-secondary rounded-xl px-3 text-sm outline-none focus:ring-2 ring-primary transition-all"
            />
            <input
              placeholder="4-digit code"
              inputMode="numeric"
              maxLength={4}
              value={newCodeValue}
              onChange={(e) => setNewCodeValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-28 h-10 bg-secondary rounded-xl px-3 text-sm font-mono-value text-center outline-none focus:ring-2 ring-primary transition-all"
            />
            <button onClick={addCashierCode} className="h-10 w-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shrink-0">
              <Plus size={18} />
            </button>
          </div>
          {cashierCodes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No cashier codes yet. Create one above.</p>
          )}
          {cashierCodes.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-secondary rounded-xl px-4 py-2.5">
              <div>
                <span className="font-medium text-sm">{c.label}</span>
                <span className="ml-2 font-mono-value text-xs text-muted-foreground">({c.code})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCashierCode(c.id, c.active)}
                  className={`p-1.5 rounded-lg transition-colors ${c.active ? 'text-accent' : 'text-muted-foreground'}`}
                  title={c.active ? 'Deactivate' : 'Activate'}
                >
                  {c.active ? <Power size={16} /> : <PowerOff size={16} />}
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Cashier Code?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently remove "{c.label}" code. The cashier won't be able to check in.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteCashierCode(c.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checkins */}
      {checkins.length > 0 && (
        <div className="surface-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold heading-tight text-sm">Cashier Check-ins</h3>
          </div>
          <div className="flex gap-3 p-4 overflow-x-auto">
            {checkins.map((c) => (
              <div key={c.id} className="shrink-0 w-28 relative group">
                <img src={c.image_url} alt="Check-in" className="w-28 h-28 object-cover rounded-xl bg-secondary" />
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  {format(new Date(c.created_at), 'MMM d, HH:mm')}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="absolute top-1 right-1 p-1 bg-background/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Check-in Photo?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently remove this check-in photo from the system.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteCheckin(c)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Control */}
        <div className="surface-card p-5">
          <h3 className="font-bold heading-tight text-sm mb-4">Price Control</h3>
          <form onSubmit={updatePrices} className="space-y-3">
            <div>
              <label className="label-caps">Retail / KG</label>
              <input
                type="number"
                value={prices.retail}
                onChange={(e) => setPrices({ ...prices, retail: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 border-b-2 border-border focus:border-primary outline-none font-mono-value text-lg bg-transparent transition-colors"
              />
            </div>
            <div>
              <label className="label-caps">Distributor / KG</label>
              <input
                type="number"
                value={prices.distributor}
                onChange={(e) => setPrices({ ...prices, distributor: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 border-b-2 border-border focus:border-primary outline-none font-mono-value text-lg bg-transparent transition-colors"
              />
            </div>
            <button className="w-full py-2.5 bg-foreground text-background rounded-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all duration-150 text-sm">
              Update Prices
            </button>
          </form>
        </div>

        {/* Sales Log */}
        <div className="lg:col-span-2 surface-card overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-bold heading-tight text-sm">Recent Receipts</h3>
            <span className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">{stats.count}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-secondary text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                  <th className="px-4 py-2.5">Receipt #</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 font-mono-value text-xs">{sale.receipt_number || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(sale.created_at), 'MMM d, HH:mm')}</td>
                    <td className="px-4 py-3 font-medium">{sale.customer_type}</td>
                    <td className="px-4 py-3 text-right font-mono-value font-bold">₦{Number(sale.total_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                      <button onClick={() => viewReceipt(sale)} className="text-primary hover:opacity-70 transition-opacity"><Eye size={16} /></button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete receipt {sale.receipt_number || sale.id.slice(0, 8)} (₦{Number(sale.total_amount).toLocaleString()}). This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSale(sale.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold heading-tight text-sm">Expense Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-secondary text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5 hidden sm:table-cell">Note</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(exp.created_at), 'MMM d, HH:mm')}</td>
                  <td className="px-4 py-3 font-medium">{exp.title}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{exp.note || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono-value font-bold text-destructive">₦{Number(exp.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{exp.title}" (₦{Number(exp.amount).toLocaleString()}). This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteExpense(exp.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
