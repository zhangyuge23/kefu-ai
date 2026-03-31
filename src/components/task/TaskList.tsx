'use client';

import type { Task } from '@/types';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}

export default function TaskList({ tasks, loading, onDelete, onRetry }: TaskListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="flex gap-5">
              <div className="w-32 h-20 rounded-xl bg-slate-100" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="card p-16 text-center">
        <div className="text-5xl mb-4">🎥</div>
        <h3 className="text-lg font-medium text-slate-700 mb-2">还没有任务</h3>
        <p className="text-sm text-slate-400">点击上方按钮创建你的第一个数字人视频</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onDelete={onDelete}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
