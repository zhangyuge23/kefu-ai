import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/cdkey/redeem
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: '请输入兑换码' }, { status: 400 });

  // 查找 CDKey
  const { data: cdkey } = await admin
    .from('cdkeys')
    .select('*')
    .eq('code', code.trim())
    .single();

  if (!cdkey) {
    return NextResponse.json({ error: '无效的兑换码' }, { status: 400 });
  }
  if (cdkey.redeemed_by) {
    return NextResponse.json({ error: '该兑换码已被使用' }, { status: 400 });
  }
  if (cdkey.expires_at && new Date(cdkey.expires_at) < new Date()) {
    return NextResponse.json({ error: '该兑换码已过期' }, { status: 400 });
  }

  // 标记为已使用
  await admin.from('cdkeys').update({
    redeemed_by: user.id,
    redeemed_at: new Date().toISOString(),
  }).eq('id', cdkey.id);

  // 充值算力
  const { data: profile } = await admin
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single();

  const newBalance = (profile?.credits || 0) + cdkey.credits_amount;

  await admin.from('profiles').update({
    credits: newBalance,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id);

  // 记录日志
  await admin.from('credit_logs').insert({
    user_id: user.id,
    change_amount: cdkey.credits_amount,
    balance_after: newBalance,
    reason: 'cdkey',
    ref_id: cdkey.id,
  });

  return NextResponse.json({
    success: true,
    credits: cdkey.credits_amount,
    balance: newBalance,
  });
}
