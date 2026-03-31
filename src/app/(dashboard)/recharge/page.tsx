'use client';

import TopBar from '@/components/layout/TopBar';
import CDKeyRedeem from '@/components/CDKeyRedeem';
import { useCredits } from '@/hooks/useCredits';

export default function RechargePage() {
  const { credits, refresh } = useCredits();

  return (
    <>
      <TopBar title="算力充值" breadcrumb="充值" />

      <div className="p-8 max-w-2xl space-y-6">
        {/* 当前余额 */}
        <div className="card p-6 bg-gradient-to-r from-brand-600 to-brand-800 text-white">
          <div className="text-sm text-white/70">当前算力余额</div>
          <div className="text-4xl font-bold mt-1">
            {credits.toLocaleString()}
            <span className="text-lg font-normal text-white/60 ml-2">点</span>
          </div>
        </div>

        {/* CDKey 兑换 */}
        <CDKeyRedeem onSuccess={refresh} />

        {/* 使用说明 */}
        <div className="card p-6">
          <h3 className="font-medium text-slate-700 mb-3">使用说明</h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• 通过购买 CDKey 兑换码获得算力</li>
            <li>• 输入兑换码即可充值到您的账户</li>
            <li>• 算力可用于数字人视频生成</li>
            <li>• 如有问题，请联系客服</li>
          </ul>
        </div>
      </div>
    </>
  );
}
