
-- Cashier PIN codes table
CREATE TABLE public.cashier_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL DEFAULT 'Cashier',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cashier_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cashier_codes" ON public.cashier_codes FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert cashier_codes" ON public.cashier_codes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update cashier_codes" ON public.cashier_codes FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete cashier_codes" ON public.cashier_codes FOR DELETE TO public USING (true);

-- Add receipt_number to sales
ALTER TABLE public.sales ADD COLUMN receipt_number text;

-- Create a function to generate receipt numbers
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num integer;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM public.sales;
  NEW.receipt_number := 'RGS-' || TO_CHAR(now(), 'YYMMDD') || '-' || LPAD(seq_num::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_receipt_number
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_receipt_number();

-- Add delete policies for sales and expenses
CREATE POLICY "Anyone can delete sales" ON public.sales FOR DELETE TO public USING (true);
CREATE POLICY "Anyone can delete expenses" ON public.expenses FOR DELETE TO public USING (true);
CREATE POLICY "Anyone can delete sale_items" ON public.sale_items FOR DELETE TO public USING (true);
