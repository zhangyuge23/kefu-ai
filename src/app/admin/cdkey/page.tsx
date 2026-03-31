'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type CDKey = {
  id: string;
  code: string;
  credits_amount: number;
  redeemed_by: string | null;
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
  user_nickname?: string;
};

export default function CDKeyManagement() {
  const [cdkeys, setCdkeys] = useState<CDKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [generateForm, setGenerateForm] = useState({
    count: 10,
    credits: 100,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCDKeys();
  }, []);

  async function fetchCDKeys() {
    const supabase = createBrowserClient();
    try {
      const { data, error } = await supabase
        .from('cdkeys')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // 获取用户信息
      const userIds = data?.map(c => c.redeemed_by).filter(Boolean) || [];
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', userIds);

        const userMap = new Map(users?.map(u => [u.id, u.nickname]) || []);

        setCdkeys(
          (data || []).map(c => ({
            ...c,
            user_nickname: c.redeemed_by ? userMap.get(c.redeemed_by) || '未知用户' : undefined,
          }))
        );
      } else {
        setCdkeys(data || []);
      }
    } catch (error) {
      console.error('获取CDKey失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    const supabase = createBrowserClient();
    try {
      const codes = [];
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      for (let i = 1; i <= generateForm.count; i++) {
        codes.push({
          code: `KEFU${today}${String(i).padStart(4, '0')}`,
          credits_amount: generateForm.credits,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const { error } = await supabase.from('cdkeys').insert(codes);

      if (error) throw error;

      setMessage({ type: 'success', text: `成功生成 ${generateForm.count} 个兑换码！` });
      setShowModal(false);
      fetchCDKeys();

      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '生成失败' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这个兑换码吗？')) return;

    const supabase = createBrowserClient();
    try {
      const { error } = await supabase.from('cdkeys').delete().eq('id', id);
      if (error) throw error;

      setMessage({ type: 'success', text: '删除成功' });
      fetchCDKeys();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '删除失败' });
    }
  }

  const filteredCdkeys = cdkeys.filter(c => {
    if (filter === 'unused') return !c.redeemed_by;
    if (filter === 'used') return c.redeemed_by;
    return true;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">CDKey 管理</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          生成兑换码
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* 筛选器 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
        >
          全部 ({cdkeys.length})
        </button>
        <button
          onClick={() => setFilter('unused')}
          className={`px-4 py-2 rounded-lg ${filter === 'unused' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
        >
          未使用 ({cdkeys.filter(c => !c.redeemed_by).length})
        </button>
        <button
          onClick={() => setFilter('used')}
          className={`px-4 py-2 rounded-lg ${filter === 'used' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
        >
          已使用 ({cdkeys.filter(c => c.redeemed_by).length})
        </button>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">兑换码</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">面额</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">状态</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">使用者</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">过期时间</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredCdkeys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              filteredCdkeys.map((cdkey) => (
                <tr key={cdkey.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono text-slate-800">{cdkey.code}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{cdkey.credits_amount} 点</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      cdkey.redeemed_by ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {cdkey.redeemed_by ? '已使用' : '未使用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {cdkey.redeemed_by ? cdkey.user_nickname || '未知' : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(cdkey.expires_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    {!cdkey.redeemed_by && (
                      <button
                        onClick={() => handleDelete(cdkey.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 生成弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">生成兑换码</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">生成数量</label>
                <input
                  type="number"
                  value={generateForm.count}
                  onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">算力面额（点）</label>
                <input
                  type="number"
                  value={generateForm.credits}
                  onChange={(e) => setGenerateForm({ ...generateForm, credits: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  min="1"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleGenerate}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                生成
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
