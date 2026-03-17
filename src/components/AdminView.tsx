import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';
import { StatCard } from './StatCard';
import { ReceiptTemplate } from './ReceiptTemplate';
import { Lock, Eye, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const [filter, setFilter] = useState<FilterType>('all');
  const [receiptSale, setReceiptSale] = useState<any | null>(null);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated]);

  const fetchData = async () => {
    const [salesRes, expRes] = await Promise.all([
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
    ]);
    if (salesRes.data) setSales(salesRes.data);
    if (expRes.data) setExpenses(expRes.data);
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
    if (data) {
      setSaleItems(prev => ({ ...prev, [sale.id]: data }));
    }
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
      <div className="max-w-md mx-auto mt-20 surface-card p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold heading-tight mb-4">Admin Access</h2>
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

  // Receipt modal
  if (receiptSale) {
    const items = saleItems[receiptSale.id] || [];
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setReceiptSale(null)}
          className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Dashboard
        </button>
        <div className="surface-card p-8 max-w-md mx-auto">
          <ReceiptTemplate
            items={items.map(i => ({ kg: Number(i.kg), amount: Number(i.amount) }))}
            totalKg={Number(receiptSale.total_kg)}
            totalAmount={Number(receiptSale.total_amount)}
            customerType={receiptSale.customer_type}
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
    <div className="space-y-8 animate-fade-in">
      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'today', 'week', 'month'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              filter === f ? 'bg-card shadow-sm text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₦${stats.revenue.toLocaleString()}`} variant="primary" />
        <StatCard label="Total KG Sold" value={`${stats.kg.toLocaleString()} kg`} />
        <StatCard label="Total Expenses" value={`₦${stats.expenses.toLocaleString()}`} variant="danger" />
        <StatCard label="Net Profit" value={`₦${(stats.revenue - stats.expenses).toLocaleString()}`} variant="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Price Control */}
        <div className="surface-card p-6">
          <h3 className="font-bold heading-tight mb-4">Price Control</h3>
          <form onSubmit={updatePrices} className="space-y-4">
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
            <button className="w-full py-3 bg-foreground text-background rounded-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all duration-150">
              Update Prices
            </button>
          </form>
        </div>

        {/* Sales Log */}
        <div className="lg:col-span-2 surface-card overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="font-bold heading-tight">Recent Receipts</h3>
            <span className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">
              {stats.count} Total
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-secondary text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">KG</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(sale.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-6 py-4 font-medium">{sale.customer_type}</td>
                    <td className="px-6 py-4 font-mono-value">{sale.total_kg}</td>
                    <td className="px-6 py-4 text-right font-mono-value font-bold">
                      ₦{Number(sale.total_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => viewReceipt(sale)}
                        className="text-primary hover:opacity-70 transition-opacity"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="surface-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-bold heading-tight">Expense Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-secondary text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Note</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground">
                    {format(new Date(exp.created_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-6 py-4 font-medium">{exp.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{exp.note || '—'}</td>
                  <td className="px-6 py-4 text-right font-mono-value font-bold text-destructive">
                    ₦{Number(exp.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {exp.receipt_url ? (
                      <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-70">
                        View
                      </a>
                    ) : '—'}
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
