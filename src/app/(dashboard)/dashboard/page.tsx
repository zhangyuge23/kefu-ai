'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import TaskList from '@/components/task/TaskList';
import TaskEditModal from '@/components/task/TaskEditModal';
import { useTasks } from '@/hooks/useTasks';

export default function DashboardPage() {
  const { tasks, stats, loading, createTask, deleteTask, retryTask } = useTasks();
  const [showModal, setShowModal] = useState(false);

  const STAT_CARDS = [
    { label: '总任务', value: stats.total, color: 'text-brand-600', bg: 'bg-brand-50', icon: '📊' },
    { label: '处理中', value: stats.processing, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⚡' },
    { label: '已完成', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
    { label: '失败', value: stats.failed, color: 'text-red-600', bg: 'bg-red-50', icon: '❌' },
  ];

  return (
    <>
      <TopBar title="任务列表" breadcrumb="任务管理" />

      <div className="p-8 space-y-6">
        {/* 统计面板 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(card => (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-medium">{card.label}</div>
                  <div className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</div>
                </div>
                <div className={`w-11 h-11 rounded-2xl ${card.bg} flex items-center justify-center text-xl`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 新建按钮 */}
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <span className="text-lg leading-none">+</span>
          新建生成任务
        </button>

        {/* 任务列表 */}
        <TaskList
          tasks={tasks}
          loading={loading}
          onDelete={async (id) => {
            try { await deleteTask(id); } catch (e: any) { alert(e.message); }
          }}
          onRetry={async (id) => {
            try { await retryTask(id); } catch (e: any) { alert(e.message); }
          }}
        />
      </div>

      {/* 新建弹窗 */}
      <TaskEditModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={createTask}
      />
    </>
  );
}
