import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, formatKRW, changeRate } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeStocks, useRealtimeHoldings } from '../hooks/useRealtime'

export default function Trade() {
  const { profile, currentTournamentId, participantMoney, refreshParticipant } = useAuth()
  const nav = useNavigate()
  const [stocks, setStocks] = useState([])
  const [holdings, setHoldings] = useState({})
  const [loading, setLoading] = useState(true)
  // 활성화된 거래 카드: { stockId, mode: 'buy'|'sell' }
  const [activeTrade, setActiveTrade] = useState(null)

  const loadAll = async () => {
    const [s, h] = await Promise.all([
      supabase.from('stocks').select('*').order('symbol'),
      supabase.from('holdings').select('stock_id, quantity, avg_buy_price')
        .eq('user_id', profile.id).eq('tournament_id', currentTournamentId)
    ])
    setStocks(s.data || [])
    const map = {}
    ;(h.data || []).forEach(x => { map[x.stock_id] = x })
    setHoldings(map)
    setLoading(false)
  }
  useEffect(() => { if (profile && currentTournamentId) loadAll() }, [profile, currentTournamentId])

  // 🚀 실시간 가격 구독
  const handleStockUpdate = useCallback((updatedStock) => {
    setStocks(prev => prev.map(s => 
      s.id === updatedStock.id ? { ...s, ...updatedStock } : s
    ))
  }, [])
  useRealtimeStocks(handleStockUpdate)

  // 🚀 실시간 보유 주식 구독
  const handleHoldingsChange = useCallback(() => {
    if (profile && currentTournamentId) {
      supabase.from('holdings')
        .select('stock_id, quantity, avg_buy_price')
        .eq('user_id', profile.id)
        .eq('tournament_id', currentTournamentId)
        .then(({ data }) => {
          const map = {}
          ;(data || []).forEach(x => { map[x.stock_id] = x })
          setHoldings(map)
        })
    }
  }, [profile, currentTournamentId])
  useRealtimeHoldings(profile?.id, currentTournamentId, handleHoldingsChange)

  const openTrade = (stockId, mode) => {
    if (activeTrade?.stockId === stockId && activeTrade?.mode === mode) {
      // 같은 버튼 다시 클릭 → 닫기
      setActiveTrade(null)
    } else {
      setActiveTrade({ stockId, mode })
    }
  }
  const closeTrade = () => setActiveTrade(null)

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">Trading Floor</div>
          <span className="badge-live text-[9px]">실시간</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl mt-2">거래소</h1>
        <p className="text-stone text-sm mt-2">매수/매도 버튼을 누르면 카드 바로 옆에 입력창이 펼쳐져요 📈</p>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone">불러오는 중…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {stocks.map(st => {
            const rate = changeRate(st.current_price, st.previous_price)
            const owned = holdings[st.id]?.quantity || 0
            const avgPrice = holdings[st.id]?.avg_buy_price
            const isActive = activeTrade?.stockId === st.id

            return (
              <div key={st.id} className={`card p-4 sm:p-5 transition-all ${isActive ? 'ring-2 ring-gold-500 shadow-gold' : 'hover:shadow-gold'}`}>
                {/* 종목 정보 */}
                <div onClick={() => nav(`/stock/${st.id}`)} className="cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display text-lg sm:text-xl text-ink truncate">{st.name}</div>
                      <div className="text-xs text-stone mt-0.5">{st.symbol} · {st.sector}</div>
                    </div>
                    {owned > 0 && (
                      <div className="bg-gold-100 text-gold-700 text-xs px-2 py-1 rounded font-semibold whitespace-nowrap">
                        {owned}주 보유
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <div className="num-display text-2xl font-bold transition-all duration-300">
                      {formatKRW(st.current_price)}
                    </div>
                    <div className={`num-display text-sm font-semibold ${rate > 0 ? 'text-up' : rate < 0 ? 'text-down' : 'text-stone'}`}>
                      {rate >= 0 ? '▲' : '▼'} {Math.abs(rate).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* 매수/매도 버튼 */}
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openTrade(st.id, 'buy') }}
                    className={`flex-1 py-2 rounded font-semibold text-sm border transition-colors ${
                      isActive && activeTrade?.mode === 'buy'
                        ? 'bg-up text-white border-up'
                        : 'bg-red-50 text-up hover:bg-red-100 border-red-200'
                    }`}
                  >
                    {isActive && activeTrade?.mode === 'buy' ? '닫기' : '매수'}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openTrade(st.id, 'sell') }}
                    disabled={owned === 0}
                    className={`flex-1 py-2 rounded font-semibold text-sm border transition-colors disabled:opacity-30 ${
                      isActive && activeTrade?.mode === 'sell'
                        ? 'bg-down text-white border-down'
                        : 'bg-blue-50 text-down hover:bg-blue-100 border-blue-200'
                    }`}
                  >
                    {isActive && activeTrade?.mode === 'sell' ? '닫기' : '매도'}
                  </button>
                </div>

                {/* 인라인 매매창 (카드 안에 펼쳐짐) */}
                {isActive && (
                  <InlineTradeForm
                    stock={st}
                    mode={activeTrade.mode}
                    owned={owned}
                    avgPrice={avgPrice}
                    cash={participantMoney}
                    tournamentId={currentTournamentId}
                    onClose={closeTrade}
                    onDone={() => { closeTrade(); loadAll(); refreshParticipant() }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ============================================================ */
/* 카드 안에서 펼쳐지는 인라인 매매창                            */
/* ============================================================ */
function InlineTradeForm({ stock, mode, owned, avgPrice, cash, tournamentId, onClose, onDone }) {
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const total = (Number(qty) || 0) * stock.current_price
  const maxBuy = Math.floor(cash / stock.current_price)
  const canConfirm = mode === 'buy' 
    ? qty > 0 && total <= cash 
    : qty > 0 && qty <= owned

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      if (mode === 'buy') {
        const { error } = await supabase.rpc('buy_stock', {
          p_stock_id: stock.id,
          p_quantity: Number(qty),
          p_tournament_id: tournamentId
        })
        if (error) throw error
        setSuccess({ qty: Number(qty), total })
      } else {
        const { error } = await supabase.rpc('sell_stock', {
          p_stock_id: stock.id,
          p_quantity: Number(qty),
          p_tournament_id: tournamentId
        })
        if (error) throw error
        const profit = avgPrice ? (stock.current_price - avgPrice) * Number(qty) : 0
        setSuccess({ qty: Number(qty), total, profit })
      }
      // 1.2초 후 자동 닫기
      setTimeout(() => onDone(), 1200)
    } catch (e) {
      setError(e.message || '거래 실패')
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="mt-3 pt-3 border-t border-gold-500/20 fade-up">
        <div className="bg-gold-50/60 rounded p-3 text-center">
          <div className="text-2xl mb-1">{mode === 'buy' ? '🎉' : '💰'}</div>
          <div className="font-semibold text-sm mb-1">
            {mode === 'buy' ? '매수 완료!' : '매도 완료!'}
          </div>
          <div className="num-display text-xs text-stone">
            {success.qty}주 / {formatKRW(success.total)}
          </div>
          {success.profit !== undefined && (
            <div className={`num-display text-xs mt-1 font-semibold ${success.profit > 0 ? 'text-up' : success.profit < 0 ? 'text-down' : 'text-stone'}`}>
              {success.profit > 0 ? '+' : ''}{formatKRW(success.profit)} {success.profit > 0 ? '수익' : success.profit < 0 ? '손실' : '본전'}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gold-500/20 fade-up space-y-2.5">
      {/* 수량 입력 */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setQty(Math.max(1, Number(qty) - 1))}
          className="btn-ghost w-9 h-9 rounded border border-gold-500/20 text-base shrink-0"
        >−</button>
        <input 
          type="number" 
          min="1" 
          value={qty} 
          onChange={e => setQty(e.target.value)}
          className="input-field num-display flex-1 text-center text-base py-2"
        />
        <button 
          onClick={() => setQty(Number(qty) + 1)}
          className="btn-ghost w-9 h-9 rounded border border-gold-500/20 text-base shrink-0"
        >+</button>
      </div>

      {/* 빠른 비율 버튼 */}
      <div className="flex gap-1">
        {mode === 'buy' ? (
          <>
            <button onClick={() => setQty(Math.max(1, Math.floor(maxBuy * 0.25)))} className="flex-1 text-[10px] btn-ghost py-1 rounded border border-gold-500/15">25%</button>
            <button onClick={() => setQty(Math.max(1, Math.floor(maxBuy * 0.5)))} className="flex-1 text-[10px] btn-ghost py-1 rounded border border-gold-500/15">50%</button>
            <button onClick={() => setQty(Math.max(1, Math.floor(maxBuy * 0.75)))} className="flex-1 text-[10px] btn-ghost py-1 rounded border border-gold-500/15">75%</button>
            <button onClick={() => setQty(Math.max(1, maxBuy))} className="flex-1 text-[10px] btn-ghost py-1 rounded border border-gold-500/15">최대</button>
          </>
        ) : (
          <>
            <button onClick={() => setQty(Math.max(1, Math.floor(owned * 0.25)))} className="flex-1 text-[10px] btn-ghost py-1 rounded border border-gold-500/15">25%</button>
            <button onClick={() => setQty(Math.max(1, Math.floor(owned * 0.5)))} className="flex-1 text-[10px] btn-ghost py-1 rounded border border-gold-500/15">50%</button>
            <button onClick={() => setQty(Math.max(1, Math.floor(owned * 0.75)))} className="flex-1 text-[10px] btn-ghost py-1 rounded border border-gold-500/15">75%</button>
            <button onClick={() => setQty(owned)} className="flex-1 text-[10px] btn-ghost py-1 rounded border border-gold-500/15">전부</button>
          </>
        )}
      </div>

      {/* 총액 */}
      <div className="flex justify-between items-baseline px-2 py-1.5 bg-gold-50/60 rounded text-xs">
        <span className="text-stone">총 {mode === 'buy' ? '매수' : '매도'}금액</span>
        <span className="num-display text-base font-bold">{formatKRW(total)}</span>
      </div>

      {/* 안내/경고 */}
      {mode === 'buy' && total > cash && (
        <div className="text-xs text-up px-1">⚠️ 현금 부족 (보유 {formatKRW(cash)})</div>
      )}
      {mode === 'sell' && qty > owned && (
        <div className="text-xs text-up px-1">⚠️ 보유 수량 초과 (보유 {owned}주)</div>
      )}

      {error && (
        <div className="text-xs text-up px-1">⚠️ {error}</div>
      )}

      {/* 확인 버튼 */}
      <button 
        onClick={submit} 
        disabled={busy || !canConfirm}
        className={`w-full py-2.5 rounded font-semibold text-sm ${
          mode === 'buy' 
            ? 'bg-up text-white hover:opacity-90'
            : 'bg-down text-white hover:opacity-90'
        } disabled:opacity-30`}
      >
        {busy ? '처리 중…' : (mode === 'buy' ? '🛒 매수 확인' : '💰 매도 확인')}
      </button>
    </div>
  )
}

// 호환성: StockDetail.jsx 가 TradeModal 을 import 하므로 유지
export function TradeModal({ stock, initialMode, owned, avgPrice, cash, tournamentId, onClose, onDone }) {
  // 기존 모달은 그대로 (StockDetail 페이지에서 사용)
  const [mode, setMode] = useState(initialMode || 'buy')
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const total = (Number(qty) || 0) * stock.current_price
  const maxBuy = Math.floor(cash / stock.current_price)
  const canConfirm = mode === 'buy' 
    ? qty > 0 && total <= cash 
    : qty > 0 && qty <= owned

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      const rpc = mode === 'buy' ? 'buy_stock' : 'sell_stock'
      const { error } = await supabase.rpc(rpc, {
        p_stock_id: stock.id,
        p_quantity: Number(qty),
        p_tournament_id: tournamentId
      })
      if (error) throw error
      onDone()
    } catch (e) {
      setError(e.message || '거래 실패')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell narrow fade-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="font-display text-lg">{stock.name} {mode === 'buy' ? '매수' : '매도'}</h3>
          <button onClick={onClose} className="btn-ghost px-2 py-0.5 rounded text-2xl leading-none">×</button>
        </div>
        <div className="modal-body space-y-3">
          <div className="text-center">
            <div className="num-display text-2xl font-bold">{formatKRW(stock.current_price)}</div>
            <div className="text-xs text-stone mt-1">현재가</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMode('buy')}
                    className={`flex-1 py-2 rounded text-sm font-semibold ${mode === 'buy' ? 'bg-red-50 text-up' : 'btn-ghost'}`}>매수</button>
            <button onClick={() => setMode('sell')} disabled={owned === 0}
                    className={`flex-1 py-2 rounded text-sm font-semibold disabled:opacity-30 ${mode === 'sell' ? 'bg-blue-50 text-down' : 'btn-ghost'}`}>매도</button>
          </div>
          <div>
            <label className="text-xs text-stone">수량</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
                   className="input-field num-display text-center text-lg mt-1" />
          </div>
          <div className="flex justify-between p-2 bg-gold-50/60 rounded text-sm">
            <span>총 금액</span>
            <span className="num-display font-bold">{formatKRW(total)}</span>
          </div>
          {error && <div className="text-xs text-up">⚠️ {error}</div>}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-ghost flex-1 py-2 rounded border border-gold-500/20">취소</button>
          <button onClick={submit} disabled={busy || !canConfirm}
                  className={`flex-1 py-2 rounded font-semibold ${mode === 'buy' ? 'bg-up text-white' : 'bg-down text-white'} disabled:opacity-30`}>
            {busy ? '처리 중…' : (mode === 'buy' ? '매수' : '매도')}
          </button>
        </div>
      </div>
    </div>
  )
}
