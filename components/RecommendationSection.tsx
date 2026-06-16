'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface RecommendationItem {
  title: string;
  description: string;
  topic: string;
  category: string;
}

interface RecommendResponse {
  ok: boolean;
  items: RecommendationItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export default function RecommendationSection() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchRecommendations = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recommendations?page=${pageNum}&limit=4`);
      const data: RecommendResponse = await res.json();
      if (data.ok) {
        setRecommendations((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations(1);
  }, [fetchRecommendations]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchRecommendations(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchRecommendations]);

  if (initialLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-400 animate-pulse text-sm">
        맞춤 건강 정보를 불러오는 중...
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <section className="pb-8">
      <div className="mb-4">
        <span className="font-semibold text-slate-800">추천 건강 콘텐츠</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recommendations.map((item, index) => (
          <div
            key={index}
            className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 p-5"
          >
            <div className="flex flex-col h-full">
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit mb-2">
                {item.category}
              </span>
              <h3 className="font-bold text-slate-800 text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed flex-1">
                {item.description}
              </p>
            </div>
          </div>
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
