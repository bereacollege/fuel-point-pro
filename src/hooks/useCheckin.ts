import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CHECKIN_KEY = 'rimtech_checkin_date';

export function useCheckin() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastCheckin = localStorage.getItem(CHECKIN_KEY);
    if (lastCheckin === today) setCheckedIn(true);
  }, []);

  const submitCheckin = async (imageFile: File) => {
    setLoading(true);
    const fileName = `checkin_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('checkins').upload(fileName, imageFile);

    if (uploadError) {
      setLoading(false);
      return { error: uploadError.message };
    }

    const { data: urlData } = supabase.storage.from('checkins').getPublicUrl(fileName);
    const { error: dbError } = await supabase.from('checkins').insert([{ image_url: urlData.publicUrl }]);

    if (dbError) {
      setLoading(false);
      return { error: dbError.message };
    }

    const today = new Date().toDateString();
    localStorage.setItem(CHECKIN_KEY, today);
    setCheckedIn(true);
    setLoading(false);
    return { error: null };
  };

  return { checkedIn, loading, submitCheckin };
}
