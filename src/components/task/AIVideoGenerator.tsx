'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type TaskStatus = 'idle' | 'submitting' | 'polling' | 'success' | 'error';

interface AIVideoGeneratorProps {
  onTaskCreated?: (taskId: string, taskName: string) => void;
}

// n8n 接口配置
const CREATE_API_URL = 'https://n8n.aihub888.xyz/webhook/create-digital-human';
const QUERY_API_BASE = 'https://api.wuyinkeji.com/api/async/detail?id=';
const QUERY_API_KEY = '8cyx7Vanb0wEuIRBhBO55KgzGr';

export default function AIVideoGenerator({ onTaskCreated }: AIVideoGeneratorProps) {
  const [status, setStatus] = useState<TaskStatus>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 表单数据
  const [taskName, setTaskName] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState('');
  
  // 轮询状态
  const [pollCount, setPollCount] = useState(0);
  const [lastStatus, setLastStatus] = useState<string>('');
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserClient();
  
  const statusMessages: Record<string, string> = {
    '0': '任务等待中...',
    '1': '视频处理中...',
    '2': '视频生成成功！',
    '3': '任务失败',
  };

  // 清理轮询定时器
  const clearPollInterval = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // 轮询无音科技 API
  const checkWuyinStatus = useCallback(async (id: string) => {
    try {
      const url = `${QUERY_API_BASE}${encodeURIComponent(id)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': QUERY_API_KEY
        }
      });

      const data = await response.json();
      
      if (data.code !== 200 && data.code !== '200') {
        clearPollInterval();
        setErrorMessage(`查询异常: ${data.msg || '未知错误'}`);
        setStatus('error');
        return;
      }

      const taskStatus = data.data?.status;
      setLastStatus(String(taskStatus));

      // status: 0=等待, 1=处理中, 2=成功, 3=失败
      if (taskStatus === 2 || taskStatus === '2') {
        clearPollInterval();
        
        // 🌟 成功：提取视频地址
        let resultUrl = data.data?.video_url || data.data?.url;
        if (!resultUrl && Array.isArray(data.data?.result) && data.data.result.length > 0) {
          resultUrl = data.data.result[0];
        }
        
        if (resultUrl) {
          setVideoUrl(resultUrl);
          setStatus('success');
        } else {
          setErrorMessage('状态成功，但未解析到视频链接');
          setStatus('error');
        }
      } else if (taskStatus === 3 || taskStatus === '3') {
        clearPollInterval();
        const errorMsg = data.data?.message || '后台合成失败';
        setErrorMessage(errorMsg);
        setStatus('error');
      } else {
        // 继续等待
        setPollCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('查询失败:', error);
      // 网络波动容错，继续轮询
    }
  }, [clearPollInterval]);

  // 提交任务到 n8n（直接 POST 视频文件）
  const handleSubmit = async () => {
    if (!taskName.trim()) {
      setErrorMessage('请输入任务名称');
      return;
    }
    if (!videoFile) {
      setErrorMessage('请上传源视频');
      return;
    }
    if (!scriptText.trim() || scriptText.length < 10) {
      setErrorMessage('文案内容需要至少 10 个字');
      return;
    }

    setErrorMessage(null);
    setStatus('submitting');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('请先登录');

      // 1. 直接将视频和文案 POST 给 n8n（使用 FormData）
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('text', scriptText);
      formData.append('user_id', user.id);
      formData.append('task_name', taskName);

      const response = await fetch(CREATE_API_URL, {
        method: 'POST',
        body: formData
      });

      // 读取响应文本
      const rawText = await response.text();

      // 🚨 核心错误拦截
      if (!response.ok) {
        const lowerText = rawText.toLowerCase();
        if (
          lowerText.includes('synthesis failed') ||
          lowerText.includes('过短') ||
          lowerText.includes('not able to process')
        ) {
          throw new Error('⚠️ 文案过短或原视频声音太短（需大于10秒），提取特征失败，请增加文案或换个视频重试！');
        }
        throw new Error(`请求发起失败: ${rawText}`);
      }

      // 2. 解析成功响应提取 taskId
      let payload;
      try {
        payload = JSON.parse(rawText);
        console.log('✅ n8n 响应 (原始):', rawText);
        console.log('✅ n8n 响应 (解析后):', payload);
      } catch {
        payload = rawText;
        console.error('❌ n8n 响应不是有效 JSON:', rawText);
      }

      // 兼容多种格式提取 taskId
      let extractedTaskId = null;

      // 格式1: { data: { id: "xxx" } } - 直接对象
      if (!extractedTaskId && payload?.data?.id) {
        extractedTaskId = payload.data.id;
        console.log('✅ 提取方式1 (payload.data.id):', extractedTaskId);
      }

      // 格式2: { data: { task_id: "xxx" } }
      if (!extractedTaskId && payload?.data?.task_id) {
        extractedTaskId = payload.data.task_id;
        console.log('✅ 提取方式2 (payload.data.task_id):', extractedTaskId);
      }

      // 格式3: { id: "xxx" } - 扁平结构
      if (!extractedTaskId && payload?.id) {
        extractedTaskId = payload.id;
        console.log('✅ 提取方式3 (payload.id):', extractedTaskId);
      }

      // 格式4: { task_id: "xxx" } - 扁平结构
      if (!extractedTaskId && payload?.task_id) {
        extractedTaskId = payload.task_id;
        console.log('✅ 提取方式4 (payload.task_id):', extractedTaskId);
      }

      // 格式5: [{ data: { id: "xxx" } }] - 数组格式
      if (!extractedTaskId && Array.isArray(payload)) {
        console.log('📋 检测到数组格式，尝试提取...');
        if (payload[0]?.data?.id) {
          extractedTaskId = payload[0].data.id;
          console.log('✅ 提取方式5 (payload[0].data.id):', extractedTaskId);
        } else if (payload[0]?.data?.task_id) {
          extractedTaskId = payload[0].data.task_id;
          console.log('✅ 提取方式5b (payload[0].data.task_id):', extractedTaskId);
        } else if (payload[0]?.id) {
          extractedTaskId = payload[0].id;
          console.log('✅ 提取方式5c (payload[0].id):', extractedTaskId);
        }
      }

      // 格式6: 直接在数组第一个元素的 data 中
      if (!extractedTaskId && Array.isArray(payload) && payload[0]?.data) {
        extractedTaskId = payload[0].data;
        console.log('⚠️ 提取方式6 (payload[0].data 整体):', extractedTaskId);
      }

      if (!extractedTaskId) {
        console.error('❌ 无法提取 Task ID，响应结构:', {
          rawText,
          payload,
          payloadType: typeof payload,
          isArray: Array.isArray(payload),
          keys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
        });
        throw new Error('接口未返回有效的 Task ID');
      }

      setTaskId(extractedTaskId);
      setStatus('polling');
      setPollCount(0);
      
      // 通知父组件创建任务记录
      if (onTaskCreated) {
        onTaskCreated(extractedTaskId, taskName);
      }

      // 3. 开始轮询
      checkWuyinStatus(extractedTaskId);
      pollIntervalRef.current = setInterval(() => {
        checkWuyinStatus(extractedTaskId);
      }, 10000);

    } catch (error: any) {
      clearPollInterval();
      setErrorMessage(error.message || '提交任务失败');
      setStatus('error');
    }
  };

  // 处理文件选择
  const handleFileSelect = (file: File) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('请上传 MP4、AVI 或 MOV 格式的视频');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('视频文件不能超过 100MB');
      return;
    }
    
    setVideoFile(file);
    setErrorMessage(null);
    
    // 生成预览
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  // 重置表单
  const handleReset = () => {
    clearPollInterval();
    setStatus('idle');
    setTaskId(null);
    setVideoUrl(null);
    setErrorMessage(null);
    setPollCount(0);
    setLastStatus('');
    setTaskName('');
    setVideoFile(null);
    setVideoPreview(null);
    setScriptText('');
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearPollInterval();
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [clearPollInterval, videoPreview]);

  return (
    <div className="space-y-6">
      {/* 任务名称 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          任务名称 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          className="input"
          placeholder="如：2026年Q1电商推广视频"
          maxLength={100}
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          disabled={status !== 'idle'}
        />
      </div>

      {/* 视频上传 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          上传视频 <span className="text-red-400">*</span>
        </label>
        <div
          onClick={() => status === 'idle' && fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); }}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && status === 'idle') handleFileSelect(file);
          }}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            status !== 'idle' 
              ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
              : videoFile
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-slate-200 hover:border-brand-400 hover:bg-brand-50/30'
          }`}
        >
          {videoPreview ? (
            <div className="flex flex-col items-center gap-3">
              <video 
                src={videoPreview} 
                className="w-40 h-24 object-cover rounded-xl"
                muted 
                playsInline
              />
              <span className="text-sm text-emerald-600 font-medium">✅ 视频已选择</span>
              {status === 'idle' && (
                <span className="text-xs text-slate-400">点击重新选择</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">📹</span>
              <span className="text-sm font-medium text-slate-600">拖拽视频到这里，或点击选择</span>
              <span className="text-xs text-slate-400">支持 MP4 / AVI / MOV，最大 100MB，时长≥10秒</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/avi,video/quicktime"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
      </div>

      {/* 文案输入 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          要说的话 <span className="text-red-400">*</span>
        </label>
        <textarea
          className="input min-h-[120px] resize-none"
          placeholder="输入数字人要说的内容..."
          maxLength={1000}
          value={scriptText}
          onChange={e => setScriptText(e.target.value)}
          disabled={status !== 'idle'}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">{scriptText.length} / 1000 字</span>
          {scriptText.length > 0 && scriptText.length < 10 && (
            <span className="text-xs text-amber-500">至少需要 10 个字</span>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      {/* 提交按钮 */}
      {status === 'idle' && (
        <button
          onClick={handleSubmit}
          disabled={!taskName.trim() || !videoFile || scriptText.length < 10}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          开始生成
        </button>
      )}

      {/* 提交中状态 */}
      {status === 'submitting' && (
        <div className="flex items-center justify-center gap-3 p-4 bg-brand-50 rounded-lg">
          <div className="animate-spin w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full" />
          <span className="text-sm text-brand-600 font-medium">正在提交任务...</span>
        </div>
      )}

      {/* 轮询中状态 */}
      {status === 'polling' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-sm font-medium text-blue-700">任务已提交，正在处理中</span>
            </div>
            <div className="text-xs text-blue-600 space-y-1">
              <p>Task ID: <span className="font-mono">{taskId}</span></p>
              <p>轮询次数: {pollCount} 次</p>
              <p>当前状态: {statusMessages[lastStatus] || '处理中...'}</p>
              <p className="text-blue-500">⏱️ 每 10 秒自动刷新，请耐心等待...</p>
            </div>
          </div>
          
          {/* 进度提示动画 */}
          <div className="flex items-center justify-center gap-1 text-sm text-slate-500">
            <span>处理进度：</span>
            {['接', '收', '中', '⋅⋅⋅'].map((char, i) => (
              <span
                key={i}
                className="animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {char}
              </span>
            ))}
          </div>

          <button
            onClick={clearPollInterval}
            className="w-full px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
        </div>
      )}

      {/* 成功状态 */}
      {status === 'success' && videoUrl && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎉</span>
              <span className="text-sm font-medium text-emerald-700">视频生成成功！</span>
            </div>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg bg-black"
              poster=""
            />
            <div className="mt-3 flex gap-2">
              <a
                href={videoUrl}
                download={`数字人视频_${Date.now()}.mp4`}
                className="flex-1 px-4 py-2 text-sm text-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                ⬇️ 下载视频
              </a>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                🔄 创建新任务
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {status === 'error' && (
        <div className="space-y-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">❌</span>
              <span className="text-sm font-medium text-red-700">生成失败</span>
            </div>
            <p className="text-sm text-red-600">{errorMessage}</p>
            {taskId && (
              <p className="text-xs text-red-400 mt-2">Task ID: {taskId}</p>
            )}
          </div>
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            🔄 重试
          </button>
        </div>
      )}
    </div>
  );
}
