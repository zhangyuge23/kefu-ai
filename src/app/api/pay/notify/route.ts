import { NextRequest, NextResponse } from 'next/server';
import { verifySign } from '@/lib/zpay';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/pay/notify — ZPAY 异步回调
export async function POST(req: NextRequest) {
  // ZPAY 回调可能是 form-data 或 query string
  let params: Record<string, string> = {};

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    formData.forEach((val, key) => { params[key] = val.toString(); });
  } else {
    // 尝试从 URL 参数读取
    const url = new URL(req.url);
    url.searchParams.forEach((val, key) => { params[key] = val; });
  }

  // 1. 验签
  if (!verifySign(params)) {
    console.error('[ZPAY] 签名验证失败', params);
    return new NextResponse('sign error', { status: 400 });
  }

  // 2. 判断支付状态
  if (params.trade_status !== 'TRADE_SUCCESS') {
    return new NextResponse('success');
  }

  const admin = createAdminClient();
  const outTradeNo = params.out_trade_no;

  // 3. 查询订单
  const { data: order } = await admin
    .from('orders')
    .select('*')
    .eq('out_trade_no', outTradeNo)
    .single();

  if (!order) {
    console.error('[ZPAY] 订单不存在', outTradeNo);
    return new NextResponse('order not found', { status: 400 });
  }

  // 幂等：已支付的订单不重复处理
  if (order.status === 'paid') {
    return new NextResponse('success');
  }

  // 4. 校验金额
  if (parseFloat(params.money) !== parseFloat(String(order.amount))) {
    console.error('[ZPAY] 金额不一致', params.money, order.amount);
    return new NextResponse('amount mismatch', { status: 400 });
  }

  // 5. 原子事务：更新订单 + 充值算力 + 记录日志
  const { error } = await admin.rpc('process_payment', {
    p_out_trade_no: outTradeNo,
    p_trade_no: params.trade_no || '',
    p_pay_type: params.type || '',
    p_callback_raw: params,
  });

  if (error) {
    console.error('[ZPAY] 处理支付失败', error);
    return new NextResponse('process error', { status: 500 });
  }

  // 必须返回纯字符串 "success"
  return new NextResponse('success');
}

// ZPAY 也可能用 GET 发回调
export async function GET(req: NextRequest) {
  const params: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((val, key) => { params[key] = val; });

  if (!verifySign(params)) return new NextResponse('sign error', { status: 400 });
  if (params.trade_status !== 'TRADE_SUCCESS') return new NextResponse('success');

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('*')
    .eq('out_trade_no', params.out_trade_no)
    .single();

  if (!order || order.status === 'paid') return new NextResponse('success');
  if (parseFloat(params.money) !== parseFloat(String(order.amount))) {
    return new NextResponse('amount mismatch', { status: 400 });
  }

  await admin.rpc('process_payment', {
    p_out_trade_no: params.out_trade_no,
    p_trade_no: params.trade_no || '',
    p_pay_type: params.type || '',
    p_callback_raw: params,
  });

  return new NextResponse('success');
}
