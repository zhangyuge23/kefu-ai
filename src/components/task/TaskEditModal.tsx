'use client';

import { useState } from 'react';
import AIVideoGenerator from './AIVideoGenerator';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserClient } from '@/lib/supabase/client';

interface TaskEditModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (taskId: string, videoUrl: string) => void;
}

export default function TaskEditModal({ open, onClose, onSuccess }: TaskEditModalProps) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const { profile } = useAuth();
  const supabase = createBrowserClient();

  if (!open) return null;

  const handleTaskCreated = async (newTaskId: string) => {
    setTaskId(newTaskId);
    
    // 在数据库创建任务记录
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          name: 'AI数字人任务',
          status: 'pending',
          script_text: '',
        });
      
      if (error) console.error('创建任务记录失败:', error);
    } catch (err) {
      console.error('创建任务记录失败:', err);
    }
  };

  const handleSuccess = (videoUrl: string) => {
    if (taskId && onSuccess) {
      onSuccess(taskId, videoUrl);
    }
    // 重置状态
    setTimeout(() => {
      setTaskId(null);
      setShowGenerator(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm modal-overlay"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-content">
        <div className="p-6">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">新建生成任务</h2>
              <span className="px-2 py-1 text-xs bg-brand-100 text-brand-700 rounded-full">
                AI 数字人
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 算力提示 */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <span className="text-amber-500">💡</span>
            <div className="text-xs text-amber-700">
              <p className="font-medium">生成数字人视频需要消耗算力</p>
              <p className="mt-1">当前余额：<span className="font-bold">{profile?.credits ?? 0}</span> 点</p>
            </div>
          </div>

          {/* AI 视频生成器 */}
          <AIVideoGenerator onTaskCreated={handleTaskCreated} />
        </div>
      </div>
    </div>
  );
}
