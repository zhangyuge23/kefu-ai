'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type Task = {
  id: string;
  name: string;
  status: string;
  credits_cost: number;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  user_id: string;
  user_nickname?: string;
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '等待中', color: 'bg-slate-100 text-slate-700' },
  uploading: { label: '上传中', color: 'bg-blue-100 text-blue-700' },
  extracting: { label: '提取中', color: 'bg-blue-100 text-blue-700' },
  cloning: { label: '克隆中', color: 'bg-yellow-100 text-yellow-700' },
  synthesizing: { label: '合成中', color: 'bg-yellow-100 text-yellow-700' },
  generating: { label: '生成中', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  failed: { label: '失败', color: 'bg-red-100 text-red-700' },
};

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const supabase = createBrowserClient();
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // 获取用户信息
      const userIds = data?.map(t => t.user_id) || [];
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', userIds);

        const userMap = new Map(users?.map(u => [u.id, u.nickname]) || []);

        setTasks(
          (data || []).map(task => ({
            ...task,
            user_nickname: userMap.get(task.user_id) || '未知用户',
          }))
        );
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('获取任务失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(taskId: string) {
    const supabase = createBrowserClient();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'pending',
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      setMessage({ type: 'success', text: '任务已重试' });
      fetchTasks();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '重试失败' });
    }
  }

  async function handleRetryAllFailed() {
    if (!confirm('确定要重试所有失败任务吗？')) return;

    const supabase = createBrowserClient();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'pending',
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'failed');

      if (error) throw error;

      setMessage({ type: 'success', text: '已重试所有失败任务' });
      fetchTasks();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '重试失败' });
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'failed') return task.status === 'failed';
    return task.status === filter;
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
        <h1 className="text-2xl font-bold text-slate-800">任务管理</h1>
        <button
          onClick={handleRetryAllFailed}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          重试所有失败任务
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* 筛选器 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
        >
          全部 ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
        >
          等待中 ({tasks.filter(t => t.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('failed')}
          className={`px-4 py-2 rounded-lg ${filter === 'failed' ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}
        >
          失败 ({tasks.filter(t => t.status === 'failed').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg ${filter === 'completed' ? 'bg-green-600 text-white' : 'bg-white text-green-600'}`}
        >
          已完成 ({tasks.filter(t => t.status === 'completed').length})
        </button>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">任务名称</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">用户</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">状态</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">消耗算力</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">创建时间</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-800">{task.name}</div>
                    <div className="text-xs text-slate-500">{task.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {task.user_nickname || '未知'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusLabels[task.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                      {statusLabels[task.status]?.label || task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {task.credits_cost > 0 ? `${task.credits_cost} 点` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(task.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    {task.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(task.id)}
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      >
                        重试
                      </button>
                    )}
                    {task.status !== 'failed' && task.status !== 'completed' && (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页提示 */}
      {tasks.length >= 100 && (
        <div className="mt-4 text-center text-sm text-slate-500">
          显示最近 100 条任务记录
        </div>
      )}
    </div>
  );
}
