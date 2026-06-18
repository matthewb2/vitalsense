'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface KakaoDocument {
  title: string;
  contents: string;
  url: string;
  blogname?: string;
  cafename?: string;
  thumbnail?: string;
  datetime: string;
}

interface KakaoResponse {
  documents: KakaoDocument[];
  meta: { total_count: number; pageable_count: number; is_end: boolean };
}

export default function RecommendationSection() {
  const [documents, setDocuments] = useState<KakaoDocument[]>([]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const keywordRef = useRef('');

  const searchKakao = useCallback(async (query: string, pageNum: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/kakao-search?query=${encodeURIComponent(query)}&page=${pageNum}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || '검색 중 오류가 발생했습니다.');
        return;
      }
      const data: KakaoResponse = await res.json();
      if (data.documents) {
        setDocuments((prev) => (pageNum === 1 ? data.documents : [...prev, ...data.documents]));
        setHasMore(!data.meta.is_end);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    // localStorage에서 검색어 히스토리 읽기
    let searchQuery = '';
    try {
      const history: string[] = JSON.parse(localStorage.getItem('vitalsense_search_history') || '[]');
      // 최근 검색어가 있으면 랜덤 선택, 없으면 vitalsense_latest_symptoms 확인
      if (history.length > 0) {
        const idx = Math.floor(Math.random() * history.length);
        searchQuery = history[idx];
      } else {
        const stored = localStorage.getItem('vitalsense_latest_symptoms');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.symptoms?.length > 0) {
            const primary = parsed.symptoms[0];
            const bodyPart = parsed.body_parts?.[0] || '';
            searchQuery = bodyPart ? `${bodyPart} ${primary} 증상` : `${primary} 증상`;
          }
        }
      }
    } catch {}
    if (!searchQuery) searchQuery = '건강 관리 방법';
    setKeyword(searchQuery);
    keywordRef.current = searchQuery;
    searchKakao(searchQuery, 1);
  }, [searchKakao]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => {
            const next = prev + 1;
            const q = keywordRef.current || keyword;
            searchKakao(q, next);
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, searchKakao, keyword]);

  if (initialLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-400 animate-pulse text-sm">
        관련 건강 정보를 검색 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <p className="text-sm text-slate-400 mb-2">{error}</p>
        <p className="text-xs text-slate-300">Kakao REST API 키가 .env 파일에 설정되어 있는지 확인해주세요.</p>
      </div>
    );
  }

  if (documents.length === 0) return null;

  return (
    <section className="pb-8">
      <div className="mb-4">
        <span className="font-semibold text-slate-800">&apos;{keyword}&apos; 키워드 웹 검색</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {documents.map((doc, index) => (
          <a
            key={index}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200"
          >
            <div className="p-4 flex gap-3">
              <div className="flex-1 min-w-0">
                <h3
                  className="font-bold text-slate-800 text-lg line-clamp-2 group-hover:text-emerald-600 transition-colors leading-snug"
                  dangerouslySetInnerHTML={{ __html: doc.title }}
                />
                <p className="text-sm text-slate-400 mt-1 truncate">{doc.url}</p>
                <p
                  className="text-base text-slate-600 mt-2 line-clamp-3 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: doc.contents }}
                />
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-400">
                  <span className="text-sm text-slate-500 truncate">{doc.blogname || doc.cafename || '웹문서'}</span>
                  <span className="text-sm shrink-0 ml-2">{doc.datetime.substring(0, 10).replace(/-/g, '.')}</span>
                </div>
              </div>
              {doc.thumbnail && (
                <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-50 mt-0.5">
                  <img
                    src={doc.thumbnail}
                    alt={doc.title}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
            </div>
          </a>
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              불러오는 중...
            </div>
          ) : (
            <div className="w-full h-4" />
          )}
        </div>
      )}
    </section>
  );
}
