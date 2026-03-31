'use client';

import type { Task } from '@/types';
import TaskStatusBadge from './TaskStatusBadge';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}

export default function TaskCard({ task, onDelete, onRetry }: TaskCardProps) {
  const createdAt = new Date(task.created_at).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="card-hover p-5 flex gap-5">
      {/* 视频缩略图 */}
      <div className="w-32 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {task.source_video_thumbnail ? (
          <img
            src={task.source_video_thumbnail}
            alt={task.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl">🎬</span>
        )}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-slate-800 truncate">{task.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {createdAt}
              {task.source_video_duration && (
                <span className="ml-2">时长 {Math.round(task.source_video_duration)}秒</span>
              )}
              {task.credits_cost > 0 && (
                <span className="ml-2">消耗 {task.credits_cost}点</span>
              )}
            </p>
          </div>
          <TaskStatusBadge status={task.status} />
        </div>

        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{task.script_text}</p>

        {/* 错误信息 */}
        {task.status === 'failed' && task.error_message && (
          <p className="text-xs text-red-500 mt-2 bg-red-50 rounded-lg px-3 py-1.5">
            {task.error_message}
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 mt-3">
          {task.status === 'completed' && task.result_video_url && (
            <a
              href={task.result_video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs py-1.5 px-3"
            >
              下载视频
            </a>
          )}
          {task.status === 'failed' && (
            <button
              onClick={() => onRetry(task.id)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              重试
            </button>
          )}
          <button
            onClick={() => {
              if (confirm('确定要删除这个任务吗？')) onDelete(task.id);
            }}
            className="btn-danger text-xs py-1.5 px-3"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
