interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * 调用 AI Proxy（OpenAI 兼容格式）
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<string> {
  const res = await fetch(`${process.env.AI_PROXY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options?.model || 'gpt-4o-mini',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API Error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * 优化视频脚本文案
 */
export async function optimizeScript(rawText: string): Promise<string> {
  return chatCompletion([
    {
      role: 'system',
      content: '你是一个专业的视频文案优化师。请优化用户提供的口播文案，使其更适合视频录制：语句流畅自然、节奏感好、适合朗读。保持原意，不要添加无关内容。直接返回优化后的文案，不要任何解释。',
    },
    { role: 'user', content: rawText },
  ]);
}
