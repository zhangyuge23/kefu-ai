'use client';

import TopBar from '@/components/layout/TopBar';
import RechargePanel from '@/components/pay/RechargePanel';
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

        {/* 充值面板 */}
        <div className="card p-6">
          <RechargePanel />
        </div>

        {/* CDKey 兑换 */}
        <CDKeyRedeem onSuccess={refresh} />
      </div>
    </>
  );
}
