import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase, fmtDateTime } from '../../lib/supabase'

export default function NewsEdit() {
  const { slotId } = useParams()
  const [searchParams] = useSearchParams()
  const tournamentIdFromQuery = searchParams.get('tournament')
  const nav = useNavigate()

  const [slot, setSlot] = useState(null)
  const [templates, setTemplates] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)

  // 폼 필드
  const [mode, setMode] = useState('template')
  const [templateId, setTemplateId] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [customContent, setCustomContent] = useState('')
  const [customSymbol, setCustomSymbol] = useState('')
  const [customImpact, setCustomImpact] = useState(5)
  const [customSymbol2, setCustomSymbol2] = useState('')
  const [customImpact2, setCustomImpact2] = useState(0)
  const [newsAt, setNewsAt] = useState(toLocalInput(new Date(Date.now() + 5 * 60000)))
  const [priceAt, setPriceAt] = useState(toLocalInput(new Date(Date.now() + 10 * 60000)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isNew = !slotId

  useEffect(() => {
    const load = async () => {
      // 템플릿 목록 로드
      const { data: tmpl } = await supabase.from('news_templates').select('*').order('title')
      setTemplates(tmpl || [])
      
      // 종목 목록 로드
      const { data: stockList } = await supabase.from('stocks').select('symbol, name, sector').order('symbol')
      setStocks(stockList || [])

      // 기존 슬롯이면 데이터 로드
      if (slotId) {
        const { data } = await supabase
          .from('news_events')
          .select('*, impacts:news_stock_impacts(*, stock:stocks(symbol,name))')
          .eq('id', slotId)
          .single()
        if (data) {
          setSlot(data)
          if (data.title && data.title !== '(뉴스 미정)') {
            setCustomTitle(data.title)
            setCustomContent(data.content || '')
            setMode('custom')
          }
          if (data.impacts?.[0]) {
            setCustomSymbol(data.impacts[0].stock?.symbol || '')
            setCustomImpact(data.impacts[0].impact_pct || 5)
          }
          if (data.impacts?.[1]) {
            setCustomSymbol2(data.impacts[1].stock?.symbol || '')
            setCustomImpact2(data.impacts[1].impact_pct || 0)
          }
          setNewsAt(toLocalInput(new Date(data.news_at)))
          setPriceAt(toLocalInput(new Date(data.price_apply_at)))
        }
      }
      setLoading(false)
    }
    load()
  }, [slotId])

  const save = async () => {
    setError('')
    setBusy(true)
    try {
      if (slotId) {
        // 기존 슬롯 채우기
        if (mode === 'template' && !templateId) {
          throw new Error('템플릿을 선택해주세요')
        }
        const { error } = await supabase.rpc('fill_news_slot', {
          p_news_id: slotId,
          p_template_id: mode === 'template' ? templateId : null,
          p_title: mode === 'custom' ? customTitle : null,
          p_content: mode === 'custom' ? customContent : null,
          p_stock_symbol: mode === 'custom' ? customSymbol : null,
          p_main_impact_pct: mode === 'custom' ? Number(customImpact) : null,
          p_secondary_symbol: mode === 'custom' ? (customSymbol2 || null) : null,
          p_secondary_impact_pct: mode === 'custom' ? Number(customImpact2) : null
        })
        if (error) throw error
      } else {
        // 즉석 뉴스
        if (!tournamentIdFromQuery) {
          throw new Error('대회가 지정되지 않았습니다')
        }
        if (mode === 'template') {
          if (!templateId) throw new Error('템플릿을 선택해주세요')
          const { error } = await supabase.rpc('create_news_from_template', {
            p_tournament_id: tournamentIdFromQuery,
            p_template_id: templateId,
            p_news_at: new Date(newsAt).toISOString(),
            p_price_apply_at: new Date(priceAt).toISOString()
          })
          if (error) throw error
        } else {
          const { data: ne, error: e1 } = await supabase.from('news_events').insert({
            tournament_id: tournamentIdFromQuery,
            title: customTitle,
            content: customContent,
            news_at: new Date(newsAt).toISOString(),
            price_apply_at: new Date(priceAt).toISOString()
          }).select().single()
          if (e1) throw e1

          const impacts = []
          const { data: main } = await supabase.from('stocks')
            .select('id').eq('symbol', customSymbol.toUpperCase()).maybeSingle()
          if (main) impacts.push({
            news_id: ne.id, stock_id: main.id, impact_pct: Number(customImpact)
          })
          if (customSymbol2) {
            const { data: sec } = await supabase.from('stocks')
              .select('id').eq('symbol', customSymbol2.toUpperCase()).maybeSingle()
            if (sec) impacts.push({
              news_id: ne.id, stock_id: sec.id, impact_pct: Number(customImpact2)
            })
          }
          if (impacts.length > 0) {
            await supabase.from('news_stock_impacts').insert(impacts)
          }
        }
      }

      alert('✅ 저장되었습니다!')
      nav('/admin')
    } catch (e) {
      setError(e.message || '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="card p-12 text-center text-stone">불러오는 중…</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/admin')} className="btn-ghost px-3 py-1.5 rounded">← 뒤로</button>
        <div>
          <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">News Editor</div>
          <h1 className="font-display text-3xl sm:text-4xl mt-1">
            {slotId ? '📋 슬롯 채우기' : '📰 즉석 뉴스 추가'}
          </h1>
          {slot && (
            <p className="text-xs text-stone mt-2">
              슬롯 시각: {fmtDateTime(slot.news_at)} → 반영 {fmtDateTime(slot.price_apply_at)}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 border-red-200 text-up font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* 즉석 뉴스인 경우 시각 선택 */}
      {isNew && (
        <div className="card p-6 space-y-4">
          <h3 className="font-display text-lg">⏰ 시각 설정</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">
                🟢 뉴스 공개 시각
              </label>
              <input
                type="datetime-local"
                value={newsAt}
                onChange={e => setNewsAt(e.target.value)}
                className="input-field num-display"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">
                📊 가격 반영 시각
              </label>
              <input
                type="datetime-local"
                value={priceAt}
                onChange={e => setPriceAt(e.target.value)}
                className="input-field num-display"
              />
            </div>
          </div>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <h3 className="font-display text-lg">📝 뉴스 내용</h3>

        {/* 모드 선택 */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('template')}
            className={`flex-1 py-3 rounded font-semibold ${
              mode === 'template'
                ? 'bg-gold-50 text-gold-700 border-2 border-gold-500'
                : 'btn-ghost border-2 border-transparent bg-stone-50'
            }`}
          >
            📋 뉴스 풀에서 선택
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-3 rounded font-semibold ${
              mode === 'custom'
                ? 'bg-gold-50 text-gold-700 border-2 border-gold-500'
                : 'btn-ghost border-2 border-transparent bg-stone-50'
            }`}
          >
            ✍️ 직접 작성
          </button>
        </div>

        {mode === 'template' ? (
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">
              뉴스 템플릿 선택
            </label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className="input-field"
            >
              <option value="">-- 템플릿을 선택하세요 --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  [{t.stock_symbol} {t.main_impact_pct >= 0 ? '+' : ''}{t.main_impact_pct}%] {t.title}
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-stone mt-2">
                💡 먼저 관리자 → 뉴스 풀에서 템플릿을 만들어주세요
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">뉴스 제목</label>
              <input
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="input-field"
                placeholder="예: 광주여상, 신제품 출시로 주가 급등"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">본문</label>
              <textarea
                value={customContent}
                onChange={e => setCustomContent(e.target.value)}
                className="input-field"
                rows="4"
                placeholder="뉴스 본문 내용을 작성해주세요"
              />
            </div>

            <div className="bg-gold-50/40 rounded p-4 space-y-4">
              <h4 className="font-semibold text-gold-700">📊 주가 영향</h4>

              <div className="space-y-3">
                {/* 주 영향 종목 */}
                <div className="bg-white rounded p-3 border border-gold-500/20">
                  <div className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">
                    🎯 주 영향 종목
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
                    <select
                      value={customSymbol}
                      onChange={e => setCustomSymbol(e.target.value)}
                      className="input-field"
                    >
                      <option value="">-- 종목 선택 --</option>
                      {stocks.map(s => (
                        <option key={s.symbol} value={s.symbol}>
                          {s.symbol} · {s.name} ({s.sector})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        value={customImpact}
                        onChange={e => setCustomImpact(e.target.value)}
                        className="input-field num-display text-center"
                        placeholder="5"
                      />
                      <span className="text-sm text-stone shrink-0">%</span>
                    </div>
                  </div>
                  {customSymbol && (
                    <div className="text-xs mt-2 px-2 py-1 rounded bg-gold-50">
                      {customImpact > 0 ? (
                        <span className="text-up font-semibold">📈 {customSymbol} +{customImpact}% 상승</span>
                      ) : customImpact < 0 ? (
                        <span className="text-down font-semibold">📉 {customSymbol} {customImpact}% 하락</span>
                      ) : (
                        <span className="text-stone">변동 없음</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 부 영향 종목 (선택) */}
                <div className="bg-white rounded p-3 border border-gold-500/20">
                  <div className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">
                    🔗 부 영향 종목 (선택)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
                    <select
                      value={customSymbol2}
                      onChange={e => setCustomSymbol2(e.target.value)}
                      className="input-field"
                    >
                      <option value="">-- 선택 안 함 --</option>
                      {stocks
                        .filter(s => s.symbol !== customSymbol)
                        .map(s => (
                          <option key={s.symbol} value={s.symbol}>
                            {s.symbol} · {s.name} ({s.sector})
                          </option>
                        ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        value={customImpact2}
                        onChange={e => setCustomImpact2(e.target.value)}
                        className="input-field num-display text-center"
                        placeholder="0"
                        disabled={!customSymbol2}
                      />
                      <span className="text-sm text-stone shrink-0">%</span>
                    </div>
                  </div>
                  {customSymbol2 && customImpact2 != 0 && (
                    <div className="text-xs mt-2 px-2 py-1 rounded bg-gold-50">
                      {customImpact2 > 0 ? (
                        <span className="text-up font-semibold">📈 {customSymbol2} +{customImpact2}% 상승</span>
                      ) : (
                        <span className="text-down font-semibold">📉 {customSymbol2} {customImpact2}% 하락</span>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-stone">
                  💡 산업 연관성을 고려해 부 종목도 함께 변동시킬 수 있어요. (예: 외식업 호재 → 배달앱도 동반 상승)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 sticky bottom-4 bg-ivory/90 backdrop-blur-sm p-3 rounded-lg border border-gold-500/20">
        <button
          onClick={() => nav('/admin')}
          className="btn-ghost flex-1 py-3 rounded border border-gold-500/20"
        >
          취소
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="btn-gold flex-[2] py-3 rounded text-base"
        >
          {busy ? '저장 중…' : '💾 저장'}
        </button>
      </div>
    </div>
  )
}

function toLocalInput(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
