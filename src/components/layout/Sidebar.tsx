'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCredits } from '@/hooks/useCredits';

const NAV_ITEMS = [
  { href: '/dashboard', label: '任务管理', icon: '📋' },
  { href: '/recharge',  label: '算力充值', icon: '💎' },
  { href: '/settings',  label: '设置',     icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { credits } = useCredits();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-slate-200/80 flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-500/20">
          可
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-[15px] leading-tight">可孚AI</div>
          <div className="text-[11px] text-slate-400 leading-tight">数字人视频平台</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Credits */}
      <div className="p-4 mx-3 mb-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <div className="text-xs text-slate-400 mb-1">算力余额</div>
        <div className="text-2xl font-bold tracking-tight">
          {credits.toLocaleString()}
          <span className="text-xs font-normal text-slate-400 ml-1">点</span>
        </div>
        <Link
          href="/recharge"
          className="mt-3 block text-center py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
        >
          充值
        </Link>
      </div>
    </aside>
  );
}
