'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (profile?.nickname) {
      setNickname(profile.nickname);
    }
  }, [profile]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ nickname: nickname.trim(), updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (error) {
      setMessage('保存失败: ' + error.message);
    } else {
      setMessage('保存成功');
      refreshProfile();
    }
    setSaving(false);
  }

  if (authLoading) {
    return (
      <>
        <TopBar title="账号设置" breadcrumb="设置" />
        <div className="p-8 max-w-lg space-y-6">
          <div className="card p-6 space-y-5 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-32"></div>
            <div className="space-y-3">
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded w-24"></div>
            </div>
          </div>
          <div className="card p-6 space-y-3 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-24"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="账号设置" breadcrumb="设置" />

      <div className="p-8 max-w-lg space-y-6">
        <div className="card p-6 space-y-5">
          <h3 className="font-semibold text-slate-800">个人信息</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
            <input
              type="text"
              className="input bg-slate-50"
              value={profile?.id ? '已登录' : ''}
              disabled
            />
            <p className="text-xs text-slate-400 mt-1">邮箱不可修改</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">昵称</label>
            <input
              type="text"
              className="input"
              placeholder="输入昵称"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes('失败') ? 'text-red-500' : 'text-emerald-600'}`}>
              {message}
            </p>
          )}

          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>

        <div className="card p-6 space-y-3">
          <h3 className="font-semibold text-slate-800">账号信息</h3>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">用户ID</span>
            <span className="text-slate-700 font-mono text-xs">{profile?.id?.slice(0, 12)}...</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">注册时间</span>
            <span className="text-slate-700">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">算力余额</span>
            <span className="text-brand-600 font-medium">{profile?.credits ?? 0} 点</span>
          </div>
        </div>
      </div>
    </>
  );
}
