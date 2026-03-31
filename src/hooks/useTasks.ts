'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Task, TaskStats } from '@/types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  // 初始加载 + Realtime 订阅
  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new as Task, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t =>
            t.id === (payload.new as Task).id ? (payload.new as Task) : t
          ));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadTasks() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setTasks(data);
    setLoading(false);
  }

  // 创建任务
  const createTask = useCallback(async (params: {
    name: string;
    scriptText: string;
    sourceVideoUrl: string;
    sourceVideoDuration: number;
    sourceVideoThumbnail?: string;
  }) => {
    const res = await fetch('/api/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '创建任务失败');
    return data;
  }, []);

  // 删除任务
  const deleteTask = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/task/${taskId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || '删除失败');
    }
  }, []);

  // 重试任务
  const retryTask = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/task/${taskId}/retry`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || '重试失败');
    }
  }, []);

  // 统计
  const stats: TaskStats = {
    total: tasks.length,
    processing: tasks.filter(t =>
      !['completed', 'failed', 'pending'].includes(t.status)
    ).length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  return {
    tasks,
    stats,
    loading,
    createTask,
    deleteTask,
    retryTask,
    refresh: loadTasks,
  };
}
