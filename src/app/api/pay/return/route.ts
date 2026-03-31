import { NextRequest, NextResponse } from 'next/server';

// GET /api/pay/return — 用户支付完成后跳转到这里
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tradeStatus = url.searchParams.get('trade_status');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  if (tradeStatus === 'TRADE_SUCCESS') {
    // 支付成功 → 跳转到充值页面并显示成功
    return NextResponse.redirect(new URL('/recharge?pay=success', appUrl));
  } else {
    // 支付失败或取消 → 跳回充值页
    return NextResponse.redirect(new URL('/recharge?pay=failed', appUrl));
  }
}
