import { NextRequest, NextResponse } from 'next/server';

const TOTAL_ITEMS = 20;

const TOPIC_POOL = [
  '혈압 관리', '당뇨 예방', '체중 감량', '스트레스 관리',
  '수면 질 개선', '심혈관 건강', '갱년기 건강', '관절염 완화',
  '간 건강', '면역력 강화', '눈 건강', '소화 건강',
  '피부 건강', '뼈 건강', '갑상선 건강', '빈혈 예방',
  '두통 완화', '요가와 명상', '제철 식품', '건강검진 결과',
];

interface RecommendationItem {
  title: string;
  description: string;
  topic: string;
  category: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(8, Math.max(1, parseInt(searchParams.get('limit') || '4', 10)));

  const start = (page - 1) * limit;
  const end = start + limit;
  const pageTopics = TOPIC_POOL.slice(start, end);

  const items: RecommendationItem[] = pageTopics.map((topic) => ({
    title: topic,
    description: `${topic}에 관한 맞춤 건강 가이드입니다. 전문가의 조언을 바탕으로 일상에서 실천할 수 있는 방법을 소개합니다.`,
    topic,
    category: '건강 정보',
  }));

  const hasMore = end < TOTAL_ITEMS;

  return NextResponse.json({
    ok: true,
    items,
    total: TOTAL_ITEMS,
    page,
    limit,
    hasMore,
  });
}
