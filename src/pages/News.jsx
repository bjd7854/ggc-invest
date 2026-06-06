import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function News() {
  const { currentTournament } = useAuth()
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  const loadNews = () => {
    setLoading(true)
    supabase.rpc('get_news_history', { p_limit: 100 })
      .then(({ data, error }) => {
        if (error) {
          console.error('뉴스 조회 실패:', error)
          setNews([])
        } else {
          setNews(data || [])
        }
        setLoading(false)
      })
  }

  useEffect(() => {
    loadNews()
    // 30초마다 자동 새로고침
    const interval = setInterval(loadNews, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">News Archive</div>
          <span className="badge-live text-[9px]">실시간</span>
        </div>
        <div className="flex items-start justify-between gap-3 mt-2">
          <div className="flex-1">
            <h1 className="font-display text-3xl sm:text-4xl">📰 뉴스 기록</h1>
            <p className="text-stone text-sm mt-2">
              {currentTournament?.name || '대회'} 의 모든 뉴스를 시간순으로 확인할 수 있어요
            </p>
          </div>
          <button
            onClick={loadNews}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gold-50 hover:bg-gold-100 text-gold-700 text-xs sm:text-sm font-semibold border border-gold-500/30 whitespace-nowrap"
          >
            🔄 새로고침
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone">
          <div className="text-3xl mb-2">⏳</div>
          <p>불러오는 중…</p>
        </div>
      ) : news.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📰</div>
          <p className="text-stone font-semibold">아직 발행된 뉴스가 없어요</p>
          <p className="text-xs text-stone mt-2">대회가 진행되면 뉴스가 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {news.map(n => <NewsCard key={n.id} news={n} />)}
        </div>
      )}
    </div>
  )
}

function NewsCard({ news }) {
  const time = new Date(news.scheduled_at).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })

  const impacts = Array.isArray(news.impacts) ? news.impacts : []
  // 가격 반영 여부 (백엔드가 반영 전엔 impacts를 빈 배열로 줌)
  const revealed = news.price_applied === true

  return (
    <div className={`card p-4 sm:p-5 ${
      revealed 
        ? 'border-l-4 border-gold-500 bg-gold-50/20' 
        : 'border-l-4 border-stone-300 bg-stone-50/20'
    }`}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl shrink-0">📰</span>
            <h3 className="font-display text-base sm:text-lg font-semibold leading-tight">
              {news.title}
            </h3>
          </div>
          <div className="text-[11px] text-stone mt-1">{time}</div>
        </div>
        {/* 상태 배지 */}
        {revealed ? (
          <span className="text-[10px] px-2 py-1 rounded-full bg-gold-500/15 text-gold-700 font-semibold whitespace-nowrap shrink-0">
            ✓ 반영 완료
          </span>
        ) : (
          <span className="text-[10px] px-2 py-1 rounded-full bg-stone-200 text-stone-600 font-semibold whitespace-nowrap shrink-0">
            🔮 예측하기
          </span>
        )}
      </div>
      
      <p className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-line mb-3 mt-2">
        {news.body || ''}
      </p>
      
      {revealed ? (
        /* ===== 반영 후: 영향 종목 공개 ===== */
        impacts.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gold-500/20">
            <span className="text-[10px] text-stone uppercase tracking-wider mr-1 self-center font-semibold">
              영향:
            </span>
            {impacts.map((imp, idx) => (
              <span 
                key={idx}
                className={`text-xs px-2 py-0.5 rounded font-semibold ${
                  imp.impact_pct > 0 
                    ? 'bg-red-100 text-up' 
                    : imp.impact_pct < 0 
                    ? 'bg-blue-100 text-down' 
                    : 'bg-stone-100 text-stone'
                }`}
              >
                {imp.symbol} {imp.impact_pct > 0 ? '+' : ''}{imp.impact_pct}%
              </span>
            ))}
          </div>
        ) : (
          <div className="pt-3 border-t border-gold-500/20 text-xs text-stone">
            이 뉴스는 특정 종목에 영향을 주지 않았어요
          </div>
        )
      ) : (
        /* ===== 반영 전: 영향 종목 숨김 + 예측 유도 ===== */
        <div className="pt-3 border-t border-stone-200/50">
          <div className="bg-white/60 rounded-lg px-3 py-2.5 text-center">
            <div className="text-sm font-semibold text-charcoal mb-0.5">
              🔮 어떤 종목이 움직일까요?
            </div>
            <div className="text-[11px] text-stone">
              뉴스를 분석해서 예측해보세요! 가격이 반영되면 정답이 공개돼요
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
