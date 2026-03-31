import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateCreditsCost } from '@/lib/credits';
import { triggerVideoWorkflow } from '@/lib/n8n';

// GET /api/task — 获取当前用户的任务列表
export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/task — 创建任务 + 扣算力 + 触发 n8n
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const admin = createAdminClient();

  // 1. 验证登录
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  // 2. 读取参数
  const body = await req.json();
  const { name, scriptText, sourceVideoUrl, sourceVideoDuration, sourceVideoThumbnail } = body;

  if (!name || !scriptText || !sourceVideoUrl) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  // 3. 计算算力 + 扣减
  const creditsCost = calculateCreditsCost(sourceVideoDuration || 30);

  try {
    const { data: newBalance, error: deductErr } = await admin.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: creditsCost,
      p_task_id: '00000000-0000-0000-0000-000000000000', // 临时占位，后面更新
    });

    if (deductErr) {
      const msg = deductErr.message.includes('算力不足') ? '算力不足，请先充值' : deductErr.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // 4. 创建任务记录
  const { data: task, error: insertErr } = await admin
    .from('tasks')
    .insert({
      user_id: user.id,
      name,
      script_text: scriptText,
      source_video_url: sourceVideoUrl,
      source_video_duration: sourceVideoDuration,
      source_video_thumbnail: sourceVideoThumbnail,
      credits_cost: creditsCost,
      status: 'pending',
    })
    .select()
    .single();

  if (insertErr || !task) {
    return NextResponse.json({ error: '创建任务失败' }, { status: 500 });
  }

  // 5. 触发 n8n 工作流
  const n8nResult = await triggerVideoWorkflow({
    taskId: task.id,
    userId: user.id,
    sourceVideoUrl,
    scriptText,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });

  if (!n8nResult.success) {
    // n8n 触发失败，更新任务状态
    await admin.from('tasks').update({
      status: 'failed',
      error_message: `工作流触发失败: ${n8nResult.error}`,
    }).eq('id', task.id);

    return NextResponse.json({
      error: '任务已创建但工作流触发失败，请稍后重试',
      taskId: task.id,
    }, { status: 500 });
  }

  return NextResponse.json({ success: true, taskId: task.id });
}
