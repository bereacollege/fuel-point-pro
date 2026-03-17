import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, Wallet, Settings } from 'lucide-react';
import { NavBtn } from '@/components/NavBtn';
import { POSView } from '@/components/POSView';
import { ExpenseView } from '@/components/ExpenseView';
import { AdminView } from '@/components/AdminView';
import { LockedScreen } from '@/components/LockedScreen';
import { CheckinGate } from '@/components/CheckinGate';
import { useOperatingHours } from '@/hooks/useOperatingHours';

type View = 'pos' | 'expense' | 'admin';

export default function Index() {
  const [view, setView] = useState<View>('pos');
  const [prices, setPrices] = useState({ retail: 0, distributor: 0 });
  const { isLocked } = useOperatingHours();

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('settings').select('*').single();
      if (data) {
        setPrices({
          retail: Number(data.retail_price_per_kg),
          distributor: Number(data.distributor_price_per_kg),
        });
      }
    }
    fetchSettings();
  }, []);

  const isCashierView = view === 'pos' || view === 'expense';

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="h-14 sm:h-16 bg-card px-3 sm:px-6 flex items-center justify-between sticky top-0 z-10" style={{ boxShadow: '0 1px 0 0 rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
            R
          </div>
          <span className="font-semibold heading-tight text-lg hidden sm:block">Rimtech GasOS</span>
        </div>
        <div className="flex gap-0.5 sm:gap-1 bg-secondary p-1 rounded-xl">
          <NavBtn active={view === 'pos'} onClick={() => setView('pos')} icon={<Receipt size={16} />} label="POS" />
          <NavBtn active={view === 'expense'} onClick={() => setView('expense')} icon={<Wallet size={16} />} label="Expense" />
          <NavBtn active={view === 'admin'} onClick={() => setView('admin')} icon={<Settings size={16} />} label="Admin" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-3 sm:p-6">
        {view === 'admin' && <AdminView prices={prices} setPrices={setPrices} />}
        {isCashierView && isLocked && <LockedScreen />}
        {isCashierView && !isLocked && (
          <CheckinGate>
            {view === 'pos' && <POSView prices={prices} />}
            {view === 'expense' && <ExpenseView />}
          </CheckinGate>
        )}
      </div>
    </main>
  );
}
