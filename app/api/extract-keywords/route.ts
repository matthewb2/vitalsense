import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

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
            content: `너는 건강 관리 및 증상 모니터링 앱 '바이탈 센스(VitalSense)'의 핵심 AI 엔진이야.
사용자가 입력한 자연어 문장을 분석하여, 데이터베이스 검색 및 증상 추적에 필요한 핵심 키워드를 JSON 형식으로 추출해줘.

[추출 규칙]
1. symptoms: 사용자가 겪고 있는 구체적인 증상들을 명사 형태로 추출해줘. (예: "머리가 띵하다" -> "두통")
2. body_parts: 증상이 나타나는 신체 부위를 추출해줘. (예: 배, 머리, 가슴 등)
3. duration: 증상의 지속 시간이나 시점이 언급되었다면 추출해줘. (없으면 null)
4. severity: 증상의 심각도나 주관적 강도가 표현되었다면 '상', '중', '하'로 분류해줘. (모호하면 '중', 언급 없으면 null)

[출력 형식]
반드시 다른 설명 없이 오직 아래 구조의 JSON 객체 하나만 반환해야 해.

{
  "symptoms": ["증상1", "증상2"],
  "body_parts": ["부위1"],
  "duration": "지속시간",
  "severity": "상/중/하/null"
}`,
          },
          { role: 'user', content: message },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        max_tokens: 256,
      }),
    });

    const data = await response.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const content = data.choices?.[0]?.message?.content || '';
    let parsed;
    try {
      const cleaned = content.trim().replace(/^```json\s*/, '').replace(/```\s*$/, '');
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { symptoms: [message], body_parts: [], duration: null, severity: null };
    }

    // 중복 단어 제거 및 "증상" 제외
    if (parsed.symptoms) {
      parsed.symptoms = parsed.symptoms.map((s: string) => {
        const words = s.split(/\s+/);
        const seen = new Set<string>();
        return words.filter(w => {
          const lower = w.trim();
          if (!lower || lower === '증상' || seen.has(lower)) return false;
          seen.add(lower);
          return true;
        }).join(' ');
      }).filter(Boolean);
    }

    return NextResponse.json({ ok: true, keywords: parsed });
  } catch (error) {
    console.error('Extract keywords error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : '키워드 추출 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
