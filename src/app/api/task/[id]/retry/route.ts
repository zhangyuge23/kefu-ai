import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { triggerVideoWorkflow } from '@/lib/n8n';

// POST /api/task/[id]/retry
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  // 查询任务
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  if (task.status !== 'failed') {
    return NextResponse.json({ error: '只有失败的任务可以重试' }, { status: 400 });
  }

  // 重置状态
  await admin.from('tasks').update({
    status: 'pending',
    error_message: null,
    retry_count: task.retry_count + 1,
    updated_at: new Date().toISOString(),
  }).eq('id', params.id);

  // 重新触发 n8n
  const result = await triggerVideoWorkflow({
    taskId: task.id,
    userId: user.id,
    sourceVideoUrl: task.source_video_url!,
    scriptText: task.script_text,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });

  if (!result.success) {
    await admin.from('tasks').update({
      status: 'failed',
      error_message: `重试失败: ${result.error}`,
    }).eq('id', params.id);
  }

  return NextResponse.json({ success: true });
}
