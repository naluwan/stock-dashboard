import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const preferredRegion = 'iad1';

/**
 * 專門呼叫 OpenAI 的 Edge 代理。
 * 因為 Vercel Node.js 函式的 IP 會被 OpenAI 擋（TW region not supported），
 * 改從 Edge runtime 打，IP 在美國所以不會被擋。
 * 由 /api/portfolio/analyze（Node.js）內部 fetch 呼叫，不對外開放。
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: '未設定 OPENAI_API_KEY' }, { status: 500 });
    }

    const { prompt, systemMessage } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: '缺少 prompt' }, { status: 400 });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          ...(systemMessage
            ? [{ role: 'system' as const, content: systemMessage }]
            : []),
          { role: 'user' as const, content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}));
      console.error('OpenAI API error:', JSON.stringify(errData));
      const errMsg = errData?.error?.message || `OpenAI API 錯誤 (${openaiRes.status})`;
      return NextResponse.json({ error: errMsg }, { status: openaiRes.status });
    }

    const data = await openaiRes.json();
    const analysis = data?.choices?.[0]?.message?.content || '';

    if (!analysis) {
      return NextResponse.json({ error: 'AI 回應為空' }, { status: 500 });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('OpenAI proxy error:', error);
    const message = error instanceof Error ? error.message : 'OpenAI 代理失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
