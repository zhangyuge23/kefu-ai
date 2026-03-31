'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCredits: 0,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalCdkeys: 0,
    unusedCdkeys: 0,
    usedCdkeys: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const supabase = createBrowserClient();
    
    try {
      // 获取用户统计
      const { count: userCount, sum: totalCredits } = await supabase
        .from('profiles')
        .select('id, credits', { count: 'exact', head: true })
        .then(async ({ count, data }) => {
          const { data: allData } = await supabase.from('profiles').select('credits');
          return {
            count: count || 0,
            sum: allData?.reduce((acc, cur) => acc + (cur.credits || 0), 0) || 0
          };
        });

      // 获取任务统计
      const { count: taskCount, data: taskData } = await supabase
        .from('tasks')
        .select('status', { count: 'exact' });
      
      const completedTasks = taskData?.filter(t => t.status === 'completed').length || 0;
      const failedTasks = taskData?.filter(t => t.status === 'failed').length || 0;

      // 获取CDKey统计
      const { count: cdkeyCount, data: cdkeyData } = await supabase
        .from('cdkeys')
        .select('*', { count: 'exact' });
      
      const unusedCdkeys = cdkeyData?.filter(c => !c.redeemed_by).length || 0;
      const usedCdkeys = cdkeyData?.filter(c => c.redeemed_by).length || 0;

      setStats({
        totalUsers: userCount || 0,
        totalCredits: totalCredits || 0,
        totalTasks: taskCount || 0,
        completedTasks,
        failedTasks,
        totalCdkeys: cdkeyCount || 0,
        unusedCdkeys,
        usedCdkeys,
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
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
      <h1 className="text-2xl font-bold text-slate-800 mb-6">数据概览</h1>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 用户统计 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">总用户数</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.totalUsers}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        {/* 算力统计 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">平台总算力</p>
              <p className="text-3xl font-bold text-brand-600 mt-1">{stats.totalCredits.toLocaleString()}</p>
            </div>
            <div className="text-4xl">⚡</div>
          </div>
        </div>

        {/* 任务统计 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">总任务数</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.totalTasks}</p>
              <p className="text-xs text-slate-500 mt-1">
                完成: {stats.completedTasks} | 失败: {stats.failedTasks}
              </p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </div>

        {/* CDKey统计 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">兑换码总数</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.totalCdkeys}</p>
              <p className="text-xs text-slate-500 mt-1">
                已用: {stats.usedCdkeys} | 未用: {stats.unusedCdkeys}
              </p>
            </div>
            <div className="text-4xl">🎫</div>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/admin/cdkey" className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="text-2xl mb-2">🎫</div>
            <div className="font-medium text-slate-800">CDKey管理</div>
            <div className="text-sm text-slate-500">生成、查看、删除兑换码</div>
          </a>
          <a href="/admin/users" className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-slate-800">用户管理</div>
            <div className="text-sm text-slate-500">查看用户、调整算力</div>
          </a>
          <a href="/admin/tasks" className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium text-slate-800">任务管理</div>
            <div className="text-sm text-slate-500">查看任务、重试失败任务</div>
          </a>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-2xl mr-3">💡</div>
          <div>
            <h3 className="font-medium text-blue-800 mb-1">使用提示</h3>
            <p className="text-sm text-blue-700">
              您当前使用的是管理员账号，可以访问所有管理功能。如需添加其他管理员，请联系开发者。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
