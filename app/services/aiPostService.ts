// 백엔드 게시판 API의 규격이 { title, content, author }라고 가정합니다.
const API_URL = process.env.API_URL + '/posts/';

export const sendHealthQuestionAsPost = async (question: string, healthMetrics: any) => {
  const userId = "user_123"; // 실제 구현 시 인증 정보에서 가져옴

  // 1. 의미 기반 검색을 위한 구조화된 데이터 생성
  const structuredData = {
    type: "AI_CONSULTATION",
    version: "1.0",
    payload: {
      question,
      timestamp: new Date().toISOString(),
      metrics: {
        bp: healthMetrics.bloodPressure, // 혈압
        hr: healthMetrics.heartRate,      // 심박수
      },
      // 추후 벡터화를 위한 텍스트 소스
      searchContext: `증상: ${question} | 혈압: ${healthMetrics.bloodPressure} | 심박: ${healthMetrics.heartRate}`
    }
  };

  // 2. 기존 게시판 API 호출
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `AI 건강 상담: ${question.substring(0, 15)}...`,
        content: JSON.stringify(structuredData), // JSON을 문자열로 변환하여 본문에 주입
        author: userId
      }),
    });

    if (!response.ok) throw new Error('전송 실패');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};