'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export function useCredits() {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    loadCredits();
  }, []);

  async function loadCredits() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (data) setCredits(data.credits);
    setLoading(false);
  }

  return { credits, loading, refresh: loadCredits };
}
