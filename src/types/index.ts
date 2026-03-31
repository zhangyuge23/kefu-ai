// ============================================
// 数据库类型（与 Supabase 表结构一一对应）
// ============================================

export type TaskStatus =
  | 'pending'
  | 'uploading'
  | 'extracting'
  | 'cloning'
  | 'synthesizing'
  | 'generating'
  | 'completed'
  | 'failed';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  phone: string | null;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  name: string;
  status: TaskStatus;
  source_video_url: string | null;
  source_video_duration: number | null;
  source_video_thumbnail: string | null;
  script_text: string;
  extracted_audio_url: string | null;
  cloned_voice_id: string | null;
  synthesized_audio_url: string | null;
  result_video_url: string | null;
  credits_cost: number;
  error_message: string | null;
  retry_count: number;
  progress: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Order {
  id: string;
  user_id: string;
  product_name: string;
  amount: number;
  credits_amount: number;
  out_trade_no: string;
  trade_no: string | null;
  pay_type: string | null;
  status: OrderStatus;
  callback_raw: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
}

export interface CreditLog {
  id: string;
  user_id: string;
  change_amount: number;
  balance_after: number;
  reason: 'purchase' | 'cdkey' | 'task_consume' | 'refund';
  ref_id: string | null;
  created_at: string;
}

// ============================================
// 前端 UI 类型
// ============================================

export interface TaskStats {
  total: number;
  processing: number;
  completed: number;
  failed: number;
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  pending:      { label: '待处理',   color: 'text-slate-600',  bgColor: 'bg-slate-100',  icon: '⏳' },
  uploading:    { label: '上传中',   color: 'text-blue-600',   bgColor: 'bg-blue-50',    icon: '⬆️' },
  extracting:   { label: '音频分离', color: 'text-indigo-600', bgColor: 'bg-indigo-50',  icon: '🎵' },
  cloning:      { label: '音色克隆', color: 'text-purple-600', bgColor: 'bg-purple-50',  icon: '🔄' },
  synthesizing: { label: '语音合成', color: 'text-violet-600', bgColor: 'bg-violet-50',  icon: '🗣️' },
  generating:   { label: '视频生成', color: 'text-amber-600',  bgColor: 'bg-amber-50',   icon: '🎬' },
  completed:    { label: '已完成',   color: 'text-emerald-600',bgColor: 'bg-emerald-50', icon: '✅' },
  failed:       { label: '失败',     color: 'text-red-600',    bgColor: 'bg-red-50',     icon: '❌' },
};

export interface RechargePackage {
  id: string;
  name: string;
  price: number;        // 元
  credits: number;      // 点数
  popular?: boolean;
}

export const RECHARGE_PACKAGES: RechargePackage[] = [
  { id: 'basic',    name: '基础版', price: 9.9,  credits: 100 },
  { id: 'standard', name: '标准版', price: 49,   credits: 600,   popular: true },
  { id: 'pro',      name: '专业版', price: 99,   credits: 1500 },
];
