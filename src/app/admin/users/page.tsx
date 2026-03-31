'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type UserProfile = {
  id: string;
  nickname: string;
  credits: number;
  created_at: string;
  task_count: number;
  total_spent: number;
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    amount: 0,
    action: 'add' as 'add' | 'subtract',
    reason: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const supabase = createBrowserClient();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 获取任务统计
      const { data: tasks } = await supabase
        .from('tasks')
        .select('user_id, credits_cost');

      const taskStats = tasks?.reduce((acc, task) => {
        if (!acc[task.user_id]) {
          acc[task.user_id] = { count: 0, spent: 0 };
        }
        acc[task.user_id].count++;
        acc[task.user_id].spent += task.credits_cost || 0;
        return acc;
      }, {} as Record<string, { count: number; spent: number }>);

      setUsers(
        (data || []).map(user => ({
          ...user,
          task_count: taskStats?.[user.id]?.count || 0,
          total_spent: taskStats?.[user.id]?.spent || 0,
        }))
      );
    } catch (error) {
      console.error('获取用户失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustCredits() {
    if (!selectedUser || !adjustForm.reason.trim()) {
      setMessage({ type: 'error', text: '请填写操作原因' });
      return;
    }

    const supabase = createBrowserClient();
    try {
      const amount = adjustForm.action === 'add' 
        ? adjustForm.amount 
        : -adjustForm.amount;

      if (adjustForm.action === 'subtract' && selectedUser.credits < adjustForm.amount) {
        setMessage({ type: 'error', text: '算力不足，无法扣除' });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          credits: selectedUser.credits + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: `成功${adjustForm.action === 'add' ? '添加' : '扣除'} ${adjustForm.amount} 算力` 
      });
      
      setShowModal(false);
      setSelectedUser(null);
      setAdjustForm({ amount: 0, action: 'add', reason: '' });
      fetchUsers();

      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '操作失败' });
    }
  }

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
        <h1 className="text-2xl font-bold text-slate-800">用户管理</h1>
        <div className="text-sm text-slate-600">
          共 {users.length} 个用户
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">用户</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">算力余额</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">任务数</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">已消耗算力</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">注册时间</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-medium">
                        {user.nickname?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{user.nickname}</div>
                        <div className="text-xs text-slate-500">{user.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-brand-600">{user.credits.toLocaleString()}</span>
                    <span className="text-sm text-slate-500 ml-1">点</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{user.task_count}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{user.total_spent} 点</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowModal(true);
                      }}
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      调整算力
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 调整算力弹窗 */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">调整用户算力</h2>
            
            {/* 用户信息 */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-lg font-medium">
                  {selectedUser.nickname?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="font-medium text-slate-800">{selectedUser.nickname}</div>
                  <div className="text-sm text-slate-600">
                    当前余额: <span className="font-bold text-brand-600">{selectedUser.credits} 点</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* 操作类型 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">操作类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustForm({ ...adjustForm, action: 'add' })}
                    className={`flex-1 px-4 py-2 rounded-lg ${
                      adjustForm.action === 'add' 
                        ? 'bg-brand-600 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    添加算力
                  </button>
                  <button
                    onClick={() => setAdjustForm({ ...adjustForm, action: 'subtract' })}
                    className={`flex-1 px-4 py-2 rounded-lg ${
                      adjustForm.action === 'subtract' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    扣除算力
                  </button>
                </div>
              </div>

              {/* 数量 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {adjustForm.action === 'add' ? '添加' : '扣除'}数量（点）
                </label>
                <input
                  type="number"
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  min="1"
                />
              </div>

              {/* 原因 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">操作原因</label>
                <textarea
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  rows={2}
                  placeholder="请输入操作原因，如：活动赠送、问题补偿等"
                />
              </div>

              {/* 提示 */}
              <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
                {adjustForm.action === 'add' ? '添加' : '扣除'}后余额: 
                <span className="font-bold text-blue-600 ml-1">
                  {adjustForm.action === 'add' 
                    ? selectedUser.credits + adjustForm.amount 
                    : selectedUser.credits - adjustForm.amount} 点
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdjustCredits}
                className={`flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity ${
                  adjustForm.action === 'add' ? 'bg-brand-600' : 'bg-red-600'
                }`}
              >
                确认{adjustForm.action === 'add' ? '添加' : '扣除'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                  setAdjustForm({ amount: 0, action: 'add', reason: '' });
                }}
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
