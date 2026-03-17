-- 1. Settings Table
CREATE TABLE public.settings (
  id int PRIMARY KEY DEFAULT 1,
  retail_price_per_kg numeric NOT NULL DEFAULT 0,
  distributor_price_per_kg numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT one_row CHECK (id = 1)
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Anyone can update settings" ON public.settings FOR UPDATE USING (true);

INSERT INTO public.settings (id, retail_price_per_kg, distributor_price_per_kg) 
VALUES (1, 1200, 1100);

-- 2. Sales Table
CREATE TABLE public.sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  total_kg numeric NOT NULL,
  total_amount numeric NOT NULL,
  customer_type text CHECK (customer_type IN ('Retail', 'Distributor')),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sales" ON public.sales FOR INSERT WITH CHECK (true);

-- 3. Sale Items Table
CREATE TABLE public.sale_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  kg numeric NOT NULL,
  amount numeric NOT NULL
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sale_items" ON public.sale_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sale_items" ON public.sale_items FOR INSERT WITH CHECK (true);

-- 4. Expenses Table
CREATE TABLE public.expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  amount numeric NOT NULL,
  note text,
  receipt_url text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert expenses" ON public.expenses FOR INSERT WITH CHECK (true);

-- 5. Storage Bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

CREATE POLICY "Anyone can upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Anyone can view receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');