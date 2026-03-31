import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPayUrl, generateOutTradeNo } from '@/lib/zpay';
import { RECHARGE_PACKAGES } from '@/types';

// POST /api/pay/create — 创建支付订单，返回跳转 URL
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { packageId, payType } = await req.json();

  // 查找套餐
  const pkg = RECHARGE_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return NextResponse.json({ error: '无效的套餐' }, { status: 400 });
  if (!['alipay', 'wxpay'].includes(payType)) {
    return NextResponse.json({ error: '无效的支付方式' }, { status: 400 });
  }

  const outTradeNo = generateOutTradeNo();

  // 创建订单记录
  const { error: insertErr } = await admin.from('orders').insert({
    user_id: user.id,
    product_name: `算力充值-${pkg.name}`,
    amount: pkg.price,
    credits_amount: pkg.credits,
    out_trade_no: outTradeNo,
    pay_type: payType,
    status: 'pending',
  });

  if (insertErr) {
    return NextResponse.json({ error: '创建订单失败' }, { status: 500 });
  }

  // 生成支付 URL
  const payUrl = createPayUrl({
    name: `可孚AI-${pkg.name}`,
    money: pkg.price.toFixed(2),
    outTradeNo,
    type: payType,
  });

  return NextResponse.json({ payUrl, outTradeNo });
}
