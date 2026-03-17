import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function ExpenseView() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    let receipt_url: string | null = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        receipt_url = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('expenses').insert([{
      title: formData.get('title') as string,
      amount: parseFloat(formData.get('amount') as string),
      note: formData.get('note') as string || null,
      receipt_url,
    }]);

    if (!error) {
      toast({ title: 'Expense Saved', description: 'Expense logged successfully.' });
      formRef.current?.reset();
      setFile(null);
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto surface-card p-8 animate-fade-in">
      <h2 className="text-2xl font-bold heading-tight mb-6">Log Expense</h2>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Expense Title</label>
          <input
            name="title"
            required
            className="w-full h-12 bg-secondary rounded-xl px-4 outline-none focus:ring-2 ring-primary transition-all"
            placeholder="e.g. Generator Fuel"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount (₦)</label>
          <input
            name="amount"
            type="number"
            required
            className="w-full h-12 bg-secondary rounded-xl px-4 outline-none focus:ring-2 ring-primary transition-all font-mono-value"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            name="note"
            className="w-full h-24 bg-secondary rounded-xl p-4 outline-none focus:ring-2 ring-primary transition-all resize-none"
            placeholder="Optional details..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Receipt (optional)</label>
          <label className="flex items-center justify-center w-full h-12 bg-secondary rounded-xl cursor-pointer hover:bg-muted transition-colors gap-2 text-muted-foreground">
            <Upload size={18} />
            <span>{file ? file.name : 'Upload receipt image/PDF'}</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <button
          disabled={loading}
          className="w-full h-12 bg-foreground text-background rounded-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save Expense'}
        </button>
      </form>
    </div>
  );
}
