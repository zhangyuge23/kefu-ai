'use client';

import { useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

interface VideoUploaderProps {
  onUploadComplete: (data: {
    url: string;
    duration: number;
    thumbnail: string;
  }) => void;
}

export default function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserClient();

  async function handleFile(file: File) {
    setError(null);

    // 验证文件类型
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      setError('请上传 MP4、AVI 或 MOV 格式的视频');
      return;
    }

    // 验证文件大小 (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('视频文件不能超过 100MB');
      return;
    }

    // 获取视频时长和缩略图
    const { duration, thumbnail } = await getVideoMeta(file);
    if (duration < 10) {
      setError('视频时长不能少于 10 秒');
      return;
    }

    // 上传到 Supabase Storage
    setUploading(true);
    setProgress(30);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('请先登录'); setUploading(false); return; }

    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    setProgress(50);

    const { data, error: uploadError } = await supabase.storage
      .from('source-videos')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      setError(`上传失败: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    setProgress(90);

    // 获取签名 URL（7天有效）
    const { data: signedData } = await supabase.storage
      .from('source-videos')
      .createSignedUrl(data.path, 7 * 24 * 60 * 60);

    setProgress(100);
    setUploading(false);
    setPreview(thumbnail);

    if (signedData?.signedUrl) {
      onUploadComplete({
        url: signedData.signedUrl,
        duration,
        thumbnail,
      });
    }
  }

  function getVideoMeta(file: File): Promise<{ duration: number; thumbnail: string }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        video.currentTime = 1; // 跳到第1秒截图
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
        resolve({ duration: video.duration, thumbnail });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => reject(new Error('无法读取视频'));
      video.src = URL.createObjectURL(file);
    });
  }

  return (
    <div>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          uploading
            ? 'border-brand-300 bg-brand-50/50'
            : 'border-slate-200 hover:border-brand-400 hover:bg-brand-50/30'
        }`}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <img src={preview} alt="预览" className="w-40 h-24 object-cover rounded-xl" />
            <span className="text-sm text-emerald-600 font-medium">✅ 视频已上传</span>
            <span className="text-xs text-slate-400">点击重新选择</span>
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-slate-500">上传中 {progress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">📹</span>
            <span className="text-sm font-medium text-slate-600">拖拽视频到这里，或点击选择</span>
            <span className="text-xs text-slate-400">支持 MP4 / AVI / MOV，最大 100MB，时长≥10秒</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-2 px-1">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/avi,video/quicktime"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
