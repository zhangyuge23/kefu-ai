import { createClient } from '@supabase/supabase-js';

/**
 * service_role 客户端，绕过 RLS
 * 仅在 API Routes / 服务端使用，绝不暴露给前端
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
