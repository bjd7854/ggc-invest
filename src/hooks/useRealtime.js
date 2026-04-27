import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * 종목 가격 실시간 구독
 * - stocks 테이블에 변경이 생기면 즉시 콜백 호출
 * - 컴포넌트 언마운트 시 자동 구독 해제
 */
export function useRealtimeStocks(onUpdate) {
  useEffect(() => {
    if (!onUpdate) return

    const channel = supabase
      .channel('realtime-stocks')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stocks' },
        (payload) => {
          // payload.new: 변경 후 새 데이터
          onUpdate(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onUpdate])
}

/**
 * 뉴스 이벤트 실시간 구독
 * - news_events 테이블에 새 뉴스가 공개되면 즉시 콜백 호출
 * - is_published = true 로 바뀌는 순간 감지
 */
export function useRealtimeNews(tournamentId, onNewNews) {
  useEffect(() => {
    if (!tournamentId || !onNewNews) return

    const channel = supabase
      .channel(`realtime-news-${tournamentId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'news_events',
          filter: `tournament_id=eq.${tournamentId}`
        },
        async (payload) => {
          // 새로 공개된 뉴스만 알림
          if (payload.new.is_published && !payload.old.is_published) {
            // 뉴스 + 영향 종목 정보 가져오기
            const { data } = await supabase
              .from('news_events')
              .select('*, impacts:news_stock_impacts(*, stock:stocks(symbol,name))')
              .eq('id', payload.new.id)
              .single()
            if (data) onNewNews(data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, onNewNews])
}

/**
 * 보유 주식 실시간 구독 (선택)
 * - 본인의 holdings 가 변경되면 즉시 반영
 */
export function useRealtimeHoldings(userId, tournamentId, onUpdate) {
  useEffect(() => {
    if (!userId || !tournamentId || !onUpdate) return

    const channel = supabase
      .channel(`realtime-holdings-${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'holdings',
          filter: `user_id=eq.${userId}`
        },
        () => {
          onUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, tournamentId, onUpdate])
}
