'use client';

import { useAuth } from '@/hooks/useAuth';

export default function TopBar({ title, breadcrumb }: { title: string; breadcrumb?: string }) {
  const { profile, signOut } = useAuth();
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-20">
      {/* Left: Breadcrumb */}
      <div>
        <div className="text-xs text-slate-400">
          控制台 {breadcrumb ? `> ${breadcrumb}` : ''}
        </div>
        <h1 className="text-lg font-semibold text-slate-800 -mt-0.5">{title}</h1>
      </div>

      {/* Right: Date + User */}
      <div className="flex items-center gap-6">
        <span className="text-sm text-slate-400 hidden sm:block">{today}</span>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-medium">
            {profile?.nickname?.charAt(0) || '?'}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-slate-700 leading-tight">
              {profile?.nickname || '用户'}
            </div>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-2"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
