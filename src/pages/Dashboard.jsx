import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase, formatKRW } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Character from '../components/Character'
import { useRealtimeStocks } from '../hooks/useRealtime'

export default function Dashboard() {
  const { profile, currentTournamentId, currentTournament, participantMoney } = useAuth()
  const [holdings, setHoldings] = useState([])
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile || !currentTournamentId) return
    const load = async () => {
      const [h, t] = await Promise.all([
        supabase.from('holdings').select('*, stock:stocks(*)')
          .eq('user_id', profile.id).eq('tournament_id', currentTournamentId),
        supabase.from('transactions').select('*, stock:stocks(*)')
          .eq('user_id', profile.id).eq('tournament_id', currentTournamentId)
          .order('created_at', { ascending: false }).limit(10)
      ])
      setHoldings(h.data || [])
      setTxs(t.data || [])
      setLoading(false)
    }
    load()
  }, [profile, currentTournamentId])

  // 🚀 실시간: 보유 종목의 가격 변동 즉시 반영
  const handleStockUpdate = useCallback((updatedStock) => {
    setHoldings(prev => prev.map(h => 
      h.stock?.id === updatedStock.id 
        ? { ...h, stock: { ...h.stock, ...updatedStock } } 
        : h
    ))
  }, [])
  useRealtimeStocks(handleStockUpdate)

  const stockValue = holdings.reduce((sum, h) => sum + h.quantity * h.stock.current_price, 0)
  const totalAssets = participantMoney + stockValue
  const invested = holdings.reduce((sum, h) => sum + h.quantity * h.avg_buy_price, 0)
  const unrealized = stockValue - invested
  const unrealizedPct = invested ? (unrealized / invested) * 100 : 0

  const moodChar = unrealizedPct >= 5 ? 'heart' : unrealizedPct <= -5 ? 'sad' : 'greet'

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex items-center gap-4 sm:gap-6">
        <Character name={moodChar} size="lg" className="sm:hidden" />
        <Character name={moodChar} size="xl" className="hidden sm:block" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">My Portfolio</div>
          <h1 className="font-display text-2xl sm:text-4xl mt-2 break-words">
            안녕하세요, <span className="text-gold-700">{profile?.name}</span> 님!
          </h1>
          <p className="text-stone text-xs sm:text-sm mt-2">
            {currentTournament?.name} · {profile?.school} · {profile?.class_name}반
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard title="총 자산" value={formatKRW(totalAssets)} accent />
        <SummaryCard title="보유 현금" value={formatKRW(participantMoney)} />
        <SummaryCard title="주식 평가액" value={formatKRW(stockValue)} />
        <SummaryCard
          title="평가 손익"
          value={`${unrealized >= 0 ? '+' : ''}${formatKRW(unrealized)}`}
          sub={`${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(2)}%`}
          color={unrealized > 0 ? 'up' : unrealized < 0 ? 'down' : ''}
        />
      </div>

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-xl sm:text-2xl">보유 종목</h2>
          <Link to="/trade" className="text-sm text-gold-700 hover:underline">거래소로 이동 →</Link>
        </div>
        <div className="card">
          {loading ? (
            <div className="p-10 text-center text-stone">불러오는 중…</div>
          ) : holdings.length === 0 ? (
            <div className="p-8 sm:p-10 text-center">
              <Character name="point" size="md" className="mx-auto mb-3" />
              <p className="text-stone mb-2">아직 보유 중인 종목이 없습니다.</p>
              <Link to="/trade" className="text-gold-700 font-semibold hover:underline">첫 투자 시작하기 →</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table-basic w-full">
                <thead>
                  <tr><th>종목</th><th>수량</th><th>평단</th><th>현재가</th><th>평가액</th><th>수익률</th></tr>
                </thead>
                <tbody>
                  {holdings.map(h => {
                    const value = h.quantity * h.stock.current_price
                    const invest = h.quantity * h.avg_buy_price
                    const rate = invest ? ((value - invest) / invest) * 100 : 0
                    return (
                      <tr key={h.id}>
                        <td>
                          <Link to={`/stock/${h.stock.id}`} className="hover:text-gold-700">
                            <div className="font-semibold text-sm">{h.stock.name}</div>
                            <div className="text-xs text-stone">{h.stock.symbol}</div>
                          </Link>
                        </td>
                        <td className="num-display text-sm">{h.quantity}주</td>
                        <td className="num-display text-sm">{formatKRW(h.avg_buy_price)}</td>
                        <td className="num-display text-sm">{formatKRW(h.stock.current_price)}</td>
                        <td className="num-display font-semibold text-sm">{formatKRW(value)}</td>
                        <td className={`num-display font-semibold text-sm ${rate > 0 ? 'text-up' : rate < 0 ? 'text-down' : ''}`}>
                          {rate >= 0 ? '+' : ''}{rate.toFixed(2)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl sm:text-2xl mb-4">최근 거래</h2>
        <div className="card">
          {txs.length === 0 ? (
            <div className="p-10 text-center text-stone">거래 내역이 없습니다.</div>
          ) : (
            <div className="table-wrap">
              <table className="table-basic w-full">
                <thead>
                  <tr><th>일시</th><th>종목</th><th>구분</th><th>수량</th><th>가격</th><th>금액</th></tr>
                </thead>
                <tbody>
                  {txs.map(t => (
                    <tr key={t.id}>
                      <td className="text-xs text-stone whitespace-nowrap">{new Date(t.created_at).toLocaleString('ko-KR')}</td>
                      <td className="font-semibold text-sm">{t.stock.name}</td>
                      <td>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          t.type === 'buy' ? 'bg-red-50 text-up' : 'bg-blue-50 text-down'
                        }`}>{t.type === 'buy' ? '매수' : '매도'}</span>
                      </td>
                      <td className="num-display text-sm">{t.quantity}</td>
                      <td className="num-display text-sm">{formatKRW(t.price)}</td>
                      <td className="num-display font-semibold text-sm">{formatKRW(t.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ title, value, sub, color, accent }) {
  return (
    <div className={`card p-3 sm:p-6 ${accent ? 'bg-gradient-to-br from-gold-50 to-white border-gold-500/40' : ''}`}>
      <div className="text-[10px] sm:text-xs tracking-wider text-stone uppercase">{title}</div>
      <div className={`num-display mt-1 sm:mt-2 text-base sm:text-2xl font-semibold break-all ${
        color === 'up' ? 'text-up' : color === 'down' ? 'text-down' : 'text-ink'
      }`}>{value}</div>
      {sub && <div className={`num-display text-xs sm:text-sm mt-1 ${
        color === 'up' ? 'text-up' : color === 'down' ? 'text-down' : 'text-stone'
      }`}>{sub}</div>}
    </div>
  )
}
