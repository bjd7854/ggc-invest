import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { supabase, formatKRW, changeRate, fmtDateTime } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Character from '../components/Character'
import { TradeModal } from './Trade'

export default function StockDetail() {
  const { stockId } = useParams()
  const nav = useNavigate()
  const { profile, currentTournamentId, participantMoney, refreshParticipant } = useAuth()
  const [stock, setStock] = useState(null)
  const [history, setHistory] = useState([])
  const [holding, setHolding] = useState(null)
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [tradeMode, setTradeMode] = useState(null)

  const loadAll = async () => {
    if (!stockId || !profile) return
    const [s, h, hd, n] = await Promise.all([
      supabase.from('stocks').select('*').eq('id', stockId).single(),
      supabase.from('price_history').select('*')
        .eq('stock_id', stockId).order('recorded_at', { ascending: false }).limit(100),
      currentTournamentId
        ? supabase.from('holdings').select('*')
          .eq('user_id', profile.id).eq('tournament_id', currentTournamentId).eq('stock_id', stockId).maybeSingle()
        : Promise.resolve({ data: null }),
      currentTournamentId
        ? supabase.from('news_stock_impacts')
          .select('*, news:news_events(*)').eq('stock_id', stockId)
          .order('id', { ascending: false }).limit(20)
        : Promise.resolve({ data: [] })
    ])
    setStock(s.data)
    setHistory((h.data || []).reverse())
    setHolding(hd.data)
    setNews((n.data || []).filter(x => x.news?.tournament_id === currentTournamentId && x.news?.title !== '(뉴스 미정)'))
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [stockId, profile, currentTournamentId])

  if (loading) return <div className="card p-12 text-center text-stone">불러오는 중…</div>
  if (!stock) return (
    <div className="card p-12 text-center">
      <Character name="confused" size="lg" className="mx-auto mb-3" />
      <p>종목을 찾을 수 없어요.</p>
      <Link to="/trade" className="text-gold-700 hover:underline mt-3 inline-block">거래소로 돌아가기 →</Link>
    </div>
  )

  const rate = changeRate(stock.current_price, stock.previous_price)
  const ownedQty = holding?.quantity || 0

  const chartData = history.map(h => ({
    time: new Date(h.recorded_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    price: h.price
  }))
  const avgPrice = holding?.avg_buy_price

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={() => nav(-1)} className="btn-ghost text-sm px-3 py-1 rounded">← 뒤로</button>

      <div className="card p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-stone tracking-widest uppercase">{stock.symbol} · {stock.sector}</div>
            <h1 className="font-display text-2xl sm:text-3xl mt-1 break-words">{stock.name}</h1>
            <p className="text-sm text-stone mt-2">{stock.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="num-display text-2xl sm:text-3xl font-bold">{formatKRW(stock.current_price)}</div>
            <div className={`num-display text-sm font-semibold mt-1 ${rate > 0 ? 'text-up' : rate < 0 ? 'text-down' : 'text-stone'}`}>
              {rate >= 0 ? '▲' : '▼'} {Math.abs(rate).toFixed(2)}%
            </div>
          </div>
        </div>

        {ownedQty > 0 && (
          <div className="bg-gold-50/60 border border-gold-500/20 rounded p-3 sm:p-4 mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div>
              <div className="text-[10px] sm:text-xs text-stone uppercase tracking-wider">보유</div>
              <div className="num-display font-semibold mt-1">{ownedQty}주</div>
            </div>
            <div>
              <div className="text-[10px] sm:text-xs text-stone uppercase tracking-wider">평단</div>
              <div className="num-display font-semibold mt-1">{formatKRW(holding.avg_buy_price)}</div>
            </div>
            <div>
              <div className="text-[10px] sm:text-xs text-stone uppercase tracking-wider">손익</div>
              <div className={`num-display font-semibold mt-1 ${
                stock.current_price > holding.avg_buy_price ? 'text-up' : stock.current_price < holding.avg_buy_price ? 'text-down' : ''
              }`}>
                {stock.current_price >= holding.avg_buy_price ? '+' : ''}
                {formatKRW((stock.current_price - holding.avg_buy_price) * ownedQty)}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={() => setTradeMode('buy')}
                  className="flex-1 py-2.5 sm:py-3 rounded bg-red-50 text-up font-semibold hover:bg-red-100 border border-red-200">
            매수
          </button>
          <button onClick={() => setTradeMode('sell')} disabled={ownedQty === 0}
                  className="flex-1 py-2.5 sm:py-3 rounded bg-blue-50 text-down font-semibold hover:bg-blue-100 border border-blue-200 disabled:opacity-30">
            매도
          </button>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <h2 className="font-display text-xl sm:text-2xl mb-4">📈 가격 변동 추이</h2>
        {chartData.length < 2 ? (
          <div className="p-12 text-center text-stone">아직 가격 변동 기록이 부족해요</div>
        ) : (
          <div className="w-full" style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBD89B" opacity={0.4} />
                <XAxis dataKey="time" stroke="#846831" fontSize={10}
                       tickFormatter={(v, i) => i % Math.ceil(chartData.length / 5) === 0 ? v : ''} />
                <YAxis stroke="#846831" fontSize={10}
                       tickFormatter={(v) => v.toLocaleString('ko-KR')}
                       domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #C9A961', borderRadius: 6, fontSize: 12 }}
                  formatter={(v) => formatKRW(v)}
                  labelStyle={{ color: '#846831', fontWeight: 600 }}
                />
                {avgPrice && (
                  <ReferenceLine y={avgPrice} stroke="#1E5BA8" strokeDasharray="5 3"
                                 label={{ value: `내 평단 ${formatKRW(avgPrice)}`, fill: '#1E5BA8', fontSize: 10, position: 'right' }} />
                )}
                <Line type="monotone" dataKey="price" stroke="#C9A961" strokeWidth={2.5}
                      dot={{ r: 2, fill: '#C9A961' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-stone mt-3">최근 {chartData.length}개 데이터</p>
      </div>

      {news.length > 0 && (
        <div className="card p-4 sm:p-6">
          <h2 className="font-display text-xl sm:text-2xl mb-2">📰 이 종목 관련 뉴스</h2>
          <p className="text-xs text-stone mb-4">뉴스 내용을 보고 가격 변동을 예측해보세요 🔍</p>
          <div className="space-y-3">
            {news.map(n => (
              <div key={n.id} className="border-l-4 border-gold-500/40 pl-3 sm:pl-4 py-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base">{n.news?.title}</div>
                  <div className="text-xs text-stone mt-0.5">{fmtDateTime(n.news?.news_at)}</div>
                </div>
                {n.news?.content && (
                  <p className="text-xs sm:text-sm text-stone mt-2">{n.news.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tradeMode && (
        <TradeModal
          stock={stock}
          initialMode={tradeMode}
          owned={ownedQty}
          cash={participantMoney}
          tournamentId={currentTournamentId}
          onClose={() => setTradeMode(null)}
          onDone={() => { setTradeMode(null); loadAll(); refreshParticipant() }}
        />
      )}
    </div>
  )
}
