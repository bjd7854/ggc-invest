import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, formatKRW } from '../lib/supabase'
import NewsModal from './NewsModal'
import LiveNotificationBar from './LiveNotificationBar'
import { useRealtimeNews } from '../hooks/useRealtime'
import { usePriceTick } from '../hooks/usePriceTick'

export default function Layout({ children }) {
  const { profile, isAdmin, signOut, currentTournament, currentTournamentId, participantMoney, setTournament } = useAuth()
  const nav = useNavigate()
  const [unreadNews, setUnreadNews] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!currentTournamentId || !profile?.id) { setUnreadNews([]); return }
    const load = async () => {
      const { data: news } = await supabase
        .from('news_events')
        .select('*, impacts:news_stock_impacts(*, stock:stocks(name, symbol))')
        .eq('tournament_id', currentTournamentId)
        .eq('is_published', true)
        .order('news_at', { ascending: false })
        .limit(10)
      if (!news?.length) return
      const { data: reads } = await supabase
        .from('news_reads').select('news_id').eq('user_id', profile.id)
      const readIds = new Set((reads || []).map(r => r.news_id))
      setUnreadNews(news.filter(n => !readIds.has(n.id) && n.title !== '(뉴스 미정)'))
    }
    load()
    // 보조: 5분마다 한 번 폴링 (실시간 구독 놓친 경우 대비)
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [currentTournamentId, profile?.id])

  // 🚀 실시간: 뉴스가 새로 공개되면 즉시 알림
  const handleNewNews = useCallback((news) => {
    if (news.title === '(뉴스 미정)') return
    setUnreadNews(prev => {
      // 중복 방지
      if (prev.some(n => n.id === news.id)) return prev
      return [news, ...prev]
    })
  }, [])
  useRealtimeNews(currentTournamentId, handleNewNews)

  // 🚀 클라이언트 트리거: 활성 대회 참가 중일 때만 가격 변동 트리거
  usePriceTick(!!currentTournamentId)

  const handleLogout = async () => { await signOut(); nav('/login') }
  const exitTournament = () => { setTournament(null); nav('/tournaments') }

  const link = ({ isActive }) =>
    `px-3 sm:px-4 py-2 text-sm transition-colors whitespace-nowrap ${
      isActive ? 'text-gold-700 font-semibold' : 'text-charcoal hover:text-gold-700'
    }`

  const mobileLink = ({ isActive }) =>
    `block px-4 py-3 text-sm border-b border-gold-500/10 ${
      isActive ? 'text-gold-700 font-semibold bg-gold-50/50' : 'text-charcoal'
    }`

  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-white border-b border-gold-500/25 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-6 sm:gap-10 min-w-0">
            <div className="flex items-baseline gap-1.5 cursor-pointer shrink-0" onClick={() => nav('/')}>
              <span className="font-display text-base sm:text-xl text-ink">광주여상</span>
              <span className="font-display text-base sm:text-xl text-gold-600">발명 모의 투자 대회</span>
            </div>
            {/* 데스크톱 내비 */}
            {currentTournamentId && (
              <nav className="hidden lg:flex items-center gap-1">
                <NavLink to="/" end className={link}>대시보드</NavLink>
                <NavLink to="/trade" className={link}>거래소</NavLink>
                <NavLink to="/quiz" className={link}>퀴즈</NavLink>
                <NavLink to="/ranking" className={link}>순위표</NavLink>
                {isAdmin && <NavLink to="/admin" className={link}>관리자</NavLink>}
              </nav>
            )}
            {!currentTournamentId && isAdmin && (
              <nav className="hidden lg:flex items-center gap-1">
                <NavLink to="/admin" className={link}>관리자</NavLink>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {currentTournament && (
              <div className="hidden md:flex items-center gap-3 bg-gold-50 px-3 py-1.5 rounded-full border border-gold-500/20">
                {currentTournament.status === 'active' && <span className="badge-live">LIVE</span>}
                <div className="max-w-[180px]">
                  <div className="text-xs text-stone truncate">{currentTournament.name}</div>
                  <div className="num-display text-xs font-semibold text-gold-700">{formatKRW(participantMoney)}</div>
                </div>
                <button onClick={exitTournament} title="대회 나가기" className="btn-ghost text-xs px-2 py-0.5 rounded">🚪</button>
              </div>
            )}
            <button onClick={handleLogout} className="hidden sm:block btn-ghost text-sm px-3 py-1.5 rounded">로그아웃</button>
            {/* 햄버거 (모바일/태블릿) */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden btn-ghost p-2 rounded" aria-label="메뉴">
              <span className="block w-5 h-0.5 bg-charcoal mb-1"></span>
              <span className="block w-5 h-0.5 bg-charcoal mb-1"></span>
              <span className="block w-5 h-0.5 bg-charcoal"></span>
            </button>
          </div>
        </div>
        <div className="gold-rule-solid"></div>

        {/* 모바일 드롭다운 메뉴 */}
        {menuOpen && (
          <div className="lg:hidden bg-white border-t border-gold-500/15 fade-up" onClick={() => setMenuOpen(false)}>
            {currentTournament && (
              <div className="px-4 py-3 bg-gold-50/50 border-b border-gold-500/10">
                <div className="flex items-center gap-2">
                  {currentTournament.status === 'active' && <span className="badge-live">LIVE</span>}
                  <span className="text-sm font-semibold truncate">{currentTournament.name}</span>
                </div>
                <div className="num-display text-sm text-gold-700 font-semibold mt-0.5">{formatKRW(participantMoney)}</div>
              </div>
            )}
            {currentTournamentId && (
              <>
                <NavLink to="/" end className={mobileLink}>📊 대시보드</NavLink>
                <NavLink to="/trade" className={mobileLink}>💱 거래소</NavLink>
                <NavLink to="/quiz" className={mobileLink}>📝 퀴즈</NavLink>
                <NavLink to="/ranking" className={mobileLink}>🏆 순위표</NavLink>
              </>
            )}
            {isAdmin && <NavLink to="/admin" className={mobileLink}>⚙️ 관리자 페이지</NavLink>}
            {currentTournamentId && (
              <button onClick={exitTournament} className="w-full text-left px-4 py-3 text-sm border-b border-gold-500/10 text-stone">
                🚪 대회 나가기
              </button>
            )}
            <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-stone">
              로그아웃
            </button>
          </div>
        )}
      </header>

      <main className="main-container fade-up">
        {children}
      </main>

      <footer className="border-t border-gold-500/15 py-6 mt-10 sm:mt-20 text-center text-xs text-stone px-4">
        © {new Date().getFullYear()} 광주여상 발명 모의 투자 대회
      </footer>

      {unreadNews.length > 0 && (
        <NewsModal
          news={unreadNews[0]}
          onClose={async () => {
            await supabase.rpc('mark_news_read', { p_news_id: unreadNews[0].id })
            setUnreadNews(unreadNews.slice(1))
          }}
          remaining={unreadNews.length - 1}
        />
      )}

      <LiveNotificationBar />
    </div>
  )
}
