
-- Add after_hours_access toggle to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS after_hours_access boolean NOT NULL DEFAULT false;

-- Create checkins table for daily cashier photos
CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read checkins" ON public.checkins FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert checkins" ON public.checkins FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete checkins" ON public.checkins FOR DELETE TO public USING (true);

-- Storage bucket for checkin photos
INSERT INTO storage.buckets (id, name, public) VALUES ('checkins', 'checkins', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload checkin photos" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'checkins');
CREATE POLICY "Anyone can read checkin photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'checkins');
CREATE POLICY "Anyone can delete checkin photos" ON storage.objects FOR DELETE TO public USING (bucket_id = 'checkins');
