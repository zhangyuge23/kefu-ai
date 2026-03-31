import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { chatCompletion } from '@/lib/ai-proxy';

// POST /api/ai/chat — AI 文案优化等轻量任务
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { messages, model } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: '缺少 messages 参数' }, { status: 400 });
  }

  try {
    const content = await chatCompletion(messages, { model });
    return NextResponse.json({ content });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
