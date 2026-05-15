import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function NewsHistoryModal({ open, onClose }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    supabase.rpc('get_news_history', { p_limit: 50 })
      .then(({ data, error }) => {
        if (error) {
          console.error('뉴스 조회 실패:', error)
          setNews([])
        } else {
          setNews(data || [])
        }
        setLoading(false)
      })
  }, [open])

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9500] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gold-500/20">
          <div>
            <h2 className="font-display text-lg sm:text-xl">📰 뉴스 기록</h2>
            <p className="text-xs text-stone mt-1">발행된 뉴스 모음 (최신순)</p>
          </div>
          <button 
            onClick={onClose}
            className="text-2xl text-stone hover:text-charcoal w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-stone">불러오는 중…</div>
          ) : news.length === 0 ? (
            <div className="text-center py-12 text-stone">
              <div className="text-4xl mb-2">📰</div>
              <p>발행된 뉴스가 없습니다</p>
            </div>
          ) : (
            news.map(n => <NewsItem key={n.id} news={n} />)
          )}
        </div>
      </div>
    </div>
  )
}

function NewsItem({ news }) {
  const time = new Date(news.scheduled_at).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })

  // 뉴스 감성 (호재/악재) 자동 판단
  const impacts = Array.isArray(news.impacts) ? news.impacts : []
  const positiveCount = impacts.filter(i => i.impact_pct > 0).length
  const negativeCount = impacts.filter(i => i.impact_pct < 0).length
  
  const sentiment = positiveCount > negativeCount ? 'positive'
                  : negativeCount > positiveCount ? 'negative'
                  : 'neutral'
  
  const sentimentColor = {
    positive: 'border-l-4 border-up bg-red-50/30',
    negative: 'border-l-4 border-down bg-blue-50/30',
    neutral: 'border-l-4 border-stone-300 bg-stone-50/30'
  }[sentiment]
  
  const sentimentEmoji = {
    positive: '🟢',
    negative: '🔴',
    neutral: '⚪'
  }[sentiment]

  return (
    <div className={`rounded-lg p-4 ${sentimentColor}`}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{news.emoji || sentimentEmoji}</span>
            <h3 className="font-display text-base font-semibold leading-tight">
              {news.title}
            </h3>
          </div>
          <div className="text-[11px] text-stone mt-1">{time}</div>
        </div>
      </div>
      
      <p className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-line mb-3 mt-2">
        {news.body || ''}
      </p>
      
      {impacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-200/50">
          <span className="text-[10px] text-stone uppercase tracking-wider mr-1 self-center">영향:</span>
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
      )}
    </div>
  )
}
