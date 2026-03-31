'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export function useCredits() {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    loadCredits();

    // 实时监听余额变化
    const channel = supabase
      .channel('credits-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, (payload) => {
        if (payload.new && 'credits' in payload.new) {
          setCredits((payload.new as any).credits);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
