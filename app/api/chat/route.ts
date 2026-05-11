import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const formattedMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content,
    }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: '당신은 건강 전문으로 하는 AI 어시스턴트입니다. 사용자의 건강 질문에 대해 따뜻하고 전문적인 조언을 제공해 주세요. 한국의 건강 관련 트렌드와 정보를 고려하여 답변해 주세요.',
          },
          ...formattedMessages,
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    console.log('Groq response:', data);
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || '응답을 생성할 수 없습니다.',
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : '채팅 오류가 발생했습니다.' }, { status: 500 });
  }
}