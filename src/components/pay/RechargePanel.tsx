'use client';

import { useState } from 'react';
import { RECHARGE_PACKAGES, type RechargePackage } from '@/types';

export default function RechargePanel() {
  const [selected, setSelected] = useState<RechargePackage>(RECHARGE_PACKAGES[1]); // 默认选标准版
  const [payType, setPayType] = useState<'alipay' | 'wxpay'>('alipay');
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch('/api/pay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selected.id,
          payType,
        }),
      });
      const data = await res.json();

      if (res.ok && data.payUrl) {
        // 跳转到 ZPAY 收银台
        window.location.href = data.payUrl;
      } else {
        alert(data.error || '创建支付订单失败');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 套餐选择 */}
      <div>
        <h3 className="font-medium text-slate-700 mb-3">选择套餐</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RECHARGE_PACKAGES.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => setSelected(pkg)}
              className={`relative p-5 rounded-2xl border-2 transition-all duration-200 text-left ${
                selected.id === pkg.id
                  ? 'border-brand-500 bg-brand-50/50 shadow-lg shadow-brand-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2.5 left-4 bg-brand-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  推荐
                </span>
              )}
              <div className="text-sm text-slate-500">{pkg.name}</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                ¥{pkg.price}
              </div>
              <div className="text-sm text-brand-600 font-medium mt-1">
                {pkg.credits.toLocaleString()} 点算力
              </div>
              <div className="text-xs text-slate-400 mt-1">
                ≈ ¥{(pkg.price / pkg.credits).toFixed(3)}/点
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 支付方式 */}
      <div>
        <h3 className="font-medium text-slate-700 mb-3">支付方式</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setPayType('alipay')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all ${
              payType === 'alipay'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-lg">💙</span>
            <span className="text-sm font-medium">支付宝</span>
          </button>
          <button
            onClick={() => setPayType('wxpay')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all ${
              payType === 'wxpay'
                ? 'border-green-500 bg-green-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-lg">💚</span>
            <span className="text-sm font-medium">微信支付</span>
          </button>
        </div>
      </div>

      {/* 支付按钮 */}
      <button
        onClick={handlePay}
        disabled={loading}
        className="btn-primary w-full py-3.5 text-base"
      >
        {loading ? '正在创建订单...' : `支付 ¥${selected.price}`}
      </button>
    </div>
  );
}
