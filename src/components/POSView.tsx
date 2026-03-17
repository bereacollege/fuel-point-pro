import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Printer, Loader2 } from 'lucide-react';
import { ReceiptTemplate } from './ReceiptTemplate';
import { toast } from '@/hooks/use-toast';

type CustomerType = 'Retail' | 'Distributor';
type SaleItem = { id: string; kg: number; amount: number };

interface POSViewProps {
  prices: { retail: number; distributor: number };
}

export function POSView({ prices }: POSViewProps) {
  const [customerType, setCustomerType] = useState<CustomerType>('Retail');
  const [items, setItems] = useState<SaleItem[]>([{ id: crypto.randomUUID(), kg: 0, amount: 0 }]);
  const [loading, setLoading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const currentPrice = customerType === 'Retail' ? prices.retail : prices.distributor;

  const updateItem = (id: string, field: 'kg' | 'amount', value: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        if (field === 'kg') return { ...item, kg: value, amount: +(value * currentPrice).toFixed(2) };
        return { ...item, amount: value, kg: currentPrice > 0 ? +(value / currentPrice).toFixed(2) : 0 };
      })
    );
  };

  const addItem = () => setItems([...items, { id: crypto.randomUUID(), kg: 0, amount: 0 }]);
  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const totalKg = items.reduce((acc, curr) => acc + curr.kg, 0);
  const totalAmount = items.reduce((acc, curr) => acc + curr.amount, 0);

  const handleCheckout = async () => {
    if (totalAmount <= 0) return;
    setLoading(true);

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([{ total_kg: totalKg, total_amount: totalAmount, customer_type: customerType }])
      .select()
      .single();

    if (saleError) {
      toast({ title: 'Error', description: saleError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (sale) {
      const saleItems = items
        .filter(i => i.kg > 0)
        .map(i => ({ sale_id: sale.id, kg: i.kg, amount: i.amount }));
      await supabase.from('sale_items').insert(saleItems);

      toast({ title: 'Sale Complete', description: `₦${totalAmount.toLocaleString()} recorded.` });

      // Trigger print
      window.print();

      setItems([{ id: crypto.randomUUID(), kg: 0, amount: 0 }]);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Entry */}
        <div className="lg:col-span-2 space-y-6">
          <div className="surface-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold heading-tight">New Transaction</h2>
              <div className="flex bg-secondary p-1 rounded-lg">
                <button
                  onClick={() => setCustomerType('Retail')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                    customerType === 'Retail' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Retail
                </button>
                <button
                  onClick={() => setCustomerType('Distributor')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                    customerType === 'Distributor' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Distributor
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-end gap-4 animate-fade-in">
                  <div className="flex-1 space-y-1.5">
                    <label className="label-caps">KG</label>
                    <input
                      type="number"
                      value={item.kg || ''}
                      onChange={(e) => updateItem(item.id, 'kg', parseFloat(e.target.value) || 0)}
                      className="w-full h-12 bg-secondary rounded-xl px-4 font-mono-value text-lg focus:ring-2 ring-primary outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="label-caps">Amount (₦)</label>
                    <input
                      type="number"
                      value={item.amount || ''}
                      onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full h-12 bg-secondary rounded-xl px-4 font-mono-value text-lg focus:ring-2 ring-primary outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addItem}
                className="w-full h-12 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-all duration-150 font-medium"
              >
                <Plus size={18} /> Add Cylinder
              </button>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          <div className="surface-card p-6 sticky top-24">
            <h3 className="label-caps mb-6">Order Summary</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground">Total Weight</span>
                <span className="text-2xl font-mono-value font-bold">
                  {totalKg.toFixed(2)} <small className="text-sm font-sans text-muted-foreground">KG</small>
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground">Current Rate</span>
                <span className="text-lg font-mono-value">₦{currentPrice.toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-end pt-2">
                <span className="font-bold">Total Amount</span>
                <span className="text-3xl font-mono-value font-black text-primary">
                  ₦{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              disabled={loading || totalAmount === 0}
              onClick={handleCheckout}
              className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Printer size={20} /> Complete & Print</>}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden receipt for printing */}
      <div ref={receiptRef} className="hidden print-receipt print:block p-8 text-foreground">
        <ReceiptTemplate items={items} totalKg={totalKg} totalAmount={totalAmount} customerType={customerType} />
      </div>
    </>
  );
}
