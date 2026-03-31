'use client';

import { useState } from 'react';
import VideoUploader from './VideoUploader';

interface TaskEditModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    scriptText: string;
    sourceVideoUrl: string;
    sourceVideoDuration: number;
    sourceVideoThumbnail?: string;
  }) => Promise<void>;
}

export default function TaskEditModal({ open, onClose, onSubmit }: TaskEditModalProps) {
  const [name, setName] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [videoData, setVideoData] = useState<{
    url: string; duration: number; thumbnail: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const canSubmit = name.trim() && scriptText.trim() && videoData && !submitting;

  // 估算生成时间
  const estimatedMinutes = videoData
    ? Math.max(3, Math.round(videoData.duration / 10))
    : 0;

  async function handleSubmit() {
    if (!canSubmit || !videoData) return;
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        scriptText: scriptText.trim(),
        sourceVideoUrl: videoData.url,
        sourceVideoDuration: videoData.duration,
        sourceVideoThumbnail: videoData.thumbnail,
      });
      // 重置表单
      setName('');
      setScriptText('');
      setVideoData(null);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm modal-overlay"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content">
        <div className="p-6">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">新建生成任务</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 表单 */}
          <div className="space-y-5">
            {/* 任务名称 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                任务名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="如：2026年Q1电商推广视频"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* 上传视频 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                上传视频 <span className="text-red-400">*</span>
              </label>
              <VideoUploader
                onUploadComplete={data => setVideoData(data)}
              />
            </div>

            {/* 要说的话 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                要说的话 <span className="text-red-400">*</span>
              </label>
              <textarea
                className="input min-h-[120px] resize-none"
                placeholder="输入数字人要说的内容..."
                value={scriptText}
                onChange={e => setScriptText(e.target.value)}
                maxLength={1000}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-400">
                  {scriptText.length} / 1000 字
                </span>
                {estimatedMinutes > 0 && (
                  <span className="text-xs text-slate-400">
                    预计生成时间 ~{estimatedMinutes} 分钟
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 错误 */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="btn-secondary flex-1">
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="btn-primary flex-1"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  提交中...
                </span>
              ) : '提交任务'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
