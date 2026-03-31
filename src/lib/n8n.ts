/**
 * n8n 工作流触发器
 *
 * 架构：Next.js → Webhook 触发 n8n → n8n 编排处理 → n8n 直接写 Supabase
 * 前端通过 Supabase Realtime 订阅任务状态变化，无需回调
 */

interface TriggerWorkflowParams {
  taskId: string;
  userId: string;
  sourceVideoUrl: string;
  scriptText: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
}

/**
 * 触发 n8n 视频生成工作流
 */
export async function triggerVideoWorkflow(params: TriggerWorkflowParams): Promise<{
  success: boolean;
  executionId?: string;
  error?: string;
}> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    throw new Error('N8N_WEBHOOK_URL 未配置');
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookSecret ? { 'X-Webhook-Secret': webhookSecret } : {}),
      },
      body: JSON.stringify({
        // 任务信息
        task_id: params.taskId,
        user_id: params.userId,
        source_video_url: params.sourceVideoUrl,
        script_text: params.scriptText,

        // Supabase 连接信息（n8n 用来更新任务状态和上传文件）
        supabase_url: params.supabaseUrl,
        supabase_key: params.supabaseServiceKey,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `n8n 响应错误: ${res.status} - ${errText}` };
    }

    const data = await res.json();
    return { success: true, executionId: data.executionId };
  } catch (err: any) {
    return { success: false, error: `n8n 调用失败: ${err.message}` };
  }
}

/**
 * n8n Webhook 接收到的数据结构
 * 你在 n8n 中搭建工作流时，Webhook 节点会收到以下 JSON：
 *
 * {
 *   "task_id": "uuid",
 *   "user_id": "uuid",
 *   "source_video_url": "https://xxx.supabase.co/storage/v1/...",
 *   "script_text": "用户输入的文案",
 *   "supabase_url": "https://xxx.supabase.co",
 *   "supabase_key": "service_role_key"
 * }
 *
 * n8n 工作流步骤：
 * 1. Webhook 接收 → 解析参数
 * 2. Supabase 节点 → 更新 tasks.status = 'extracting'
 * 3. HTTP Request → 下载 source_video_url
 * 4. Execute Command → ffmpeg 分离音频
 * 5. HTTP Request → 百炼 API 音色克隆
 * 6. Supabase 节点 → 更新 tasks.status = 'cloning'
 * 7. HTTP Request → 百炼 API 语音合成
 * 8. Supabase 节点 → 更新 tasks.status = 'synthesizing'
 * 9. HTTP Request → 速创 API 视频生成
 * 10. Supabase 节点 → 更新 tasks.status = 'generating'
 * 11. 等待速创回调 / 轮询结果
 * 12. Supabase Storage → 上传最终视频
 * 13. Supabase 节点 → 更新 tasks.status = 'completed', result_video_url = '...'
 *
 * 失败时：
 * - Error 分支 → Supabase 节点更新 tasks.status = 'failed', error_message = '...'
 */
