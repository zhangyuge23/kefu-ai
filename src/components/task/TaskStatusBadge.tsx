'use client';

import { TASK_STATUS_CONFIG, type TaskStatus } from '@/types';

export default function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = TASK_STATUS_CONFIG[status];
  const isAnimating = !['completed', 'failed', 'pending'].includes(status);

  return (
    <span className={`badge ${config.bgColor} ${config.color}`}>
      {isAnimating && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.color.replace('text-', 'bg-')}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color.replace('text-', 'bg-')}`}></span>
        </span>
      )}
      {config.icon} {config.label}
    </span>
  );
}
