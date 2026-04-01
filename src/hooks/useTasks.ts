'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Task, TaskStats } from '@/types';

// 无音科技 API 配置
const QUERY_API_BASE = 'https://api.wuyinkeji.com/api/async/detail?id=';
const QUERY_API_KEY = '8cyx7Vanb0wEuIRBhBO55KgzGr';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    return () => {
      supabase.removeChannel(channel);
      stopPolling();
    };
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

  // 轮询单个任务状态
  const pollTaskStatus = useCallback(async (taskId: string): Promise<{
    status: 'success' | 'error' | 'processing';
    videoUrl?: string;
    errorMessage?: string;
  }> => {
    try {
      const url = `${QUERY_API_BASE}${encodeURIComponent(taskId)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': QUERY_API_KEY
        }
      });

      const data = await response.json();

      if (data.code !== 200 && data.code !== '200') {
        throw new Error(`查询异常: ${data.msg || '未知错误'}`);
      }

      const taskStatus = data.data?.status;

      // status: 0=等待, 1=处理中, 2=成功, 3=失败
      if (taskStatus === 2 || taskStatus === '2') {
        // 🌟 成功：提取视频地址
        let resultUrl = data.data?.video_url || data.data?.url;
        if (!resultUrl && Array.isArray(data.data?.result) && data.data.result.length > 0) {
          resultUrl = data.data.result[0];
        }

        if (resultUrl) {
          return { status: 'success', videoUrl: resultUrl };
        } else {
          return { status: 'error', errorMessage: '状态成功，但未解析到视频链接' };
        }
      } else if (taskStatus === 3 || taskStatus === '3') {
        // ❌ 失败：提取报错原因
        const errorMsg = data.data?.message || '后台合成失败';
        return { status: 'error', errorMessage: errorMsg };
      }

      // ⏳ 状态为 0 或 1：继续处理中
      return { status: 'processing' };
    } catch (error) {
      console.error(`任务 ${taskId} 查询失败:`, error);
      // 网络波动容错，继续轮询
      return { status: 'processing' };
    }
  }, []);

  // 更新任务到数据库
  const updateTaskInDB = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) {
      console.error('更新任务失败:', error);
    }
  }, [supabase]);

  // 轮询所有处理中的任务
  const pollProcessingTasks = useCallback(async () => {
    const processingTasks = tasks.filter(t =>
      !['completed', 'failed'].includes(t.status) && t.id
    );

    if (processingTasks.length === 0) {
      return;
    }

    console.log(`轮询 ${processingTasks.length} 个处理中的任务...`);

    for (const task of processingTasks) {
      const result = await pollTaskStatus(task.id);

      if (result.status === 'success' && result.videoUrl) {
        await updateTaskInDB(task.id, {
          status: 'completed',
          result_video_url: result.videoUrl,
          completed_at: new Date().toISOString()
        });
        console.log(`✅ 任务 ${task.id} 已完成`);
      } else if (result.status === 'error') {
        await updateTaskInDB(task.id, {
          status: 'failed',
          error_message: result.errorMessage
        });
        console.error(`❌ 任务 ${task.id} 失败:`, result.errorMessage);
      }
    }
  }, [tasks, pollTaskStatus, updateTaskInDB]);

  // 开始轮询
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      return; // 已经在轮询
    }

    console.log('开始轮询任务状态...');
    pollIntervalRef.current = setInterval(() => {
      pollProcessingTasks();
    }, 10000); // 每 10 秒轮询一次
  }, [pollProcessingTasks]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      console.log('停止轮询任务状态');
    }
  }, []);

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
    startPolling,
    stopPolling,
    pollProcessingTasks,
  };
}
