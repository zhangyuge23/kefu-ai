import { createServerClient as createClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieOptions = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export function createServerClient() {
  const cookieStore = cookies();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieOptions[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            );
          } catch {
            // Server Component 中无法设置 cookie，忽略
          }
        },
      },
    }
  );
}
