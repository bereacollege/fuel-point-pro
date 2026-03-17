import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useOperatingHours() {
  const [afterHoursAccess, setAfterHoursAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('settings').select('after_hours_access').single();
      if (data) setAfterHoursAccess(!!(data as any).after_hours_access);
      setLoading(false);
    };
    fetch();
    const interval = setInterval(fetch, 30000); // re-check every 30s
    return () => clearInterval(interval);
  }, []);

  const hours = new Date().getHours();
  const isRestrictedTime = hours >= 19 || hours < 7;
  const isLocked = isRestrictedTime && !afterHoursAccess;

  return { isLocked, isRestrictedTime, afterHoursAccess, loading };
}
