import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function TemplateEdit() {
  const { templateId } = useParams()
  const nav = useNavigate()
  const isNew = !templateId

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [stockSymbol, setStockSymbol] = useState('')
  const [mainImpact, setMainImpact] = useState(5)
  const [secSymbol, setSecSymbol] = useState('')
  const [secImpact, setSecImpact] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [stocks, setStocks] = useState([])

  useEffect(() => {
    // 종목 목록 로드
    supabase.from('stocks').select('symbol, name, sector').order('symbol')
      .then(({ data }) => setStocks(data || []))
  }, [])

  useEffect(() => {
    if (!templateId) return
    supabase.from('news_templates').select('*').eq('id', templateId).single()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title || '')
          setContent(data.content || '')
          setStockSymbol(data.stock_symbol || '')
          setMainImpact(data.main_impact_pct || 5)
          setSecSymbol(data.secondary_symbol || '')
          setSecImpact(data.secondary_impact_pct || 0)
        }
        setLoading(false)
      })
  }, [templateId])

  const save = async () => {
    setError('')

    const cleanTitle = (title || '').trim()
    if (!cleanTitle) {
      setError('템플릿 제목을 입력해주세요')
      return
    }
    if (!stockSymbol.trim()) {
      setError('주 영향 종목을 입력해주세요')
      return
    }

    setBusy(true)
    try {
      const payload = {
        title: cleanTitle,
        content: content || '',
        stock_symbol: stockSymbol.toUpperCase(),
        secondary_symbol: secSymbol ? secSymbol.toUpperCase() : null,
        main_impact_pct: Number(mainImpact) || 0,
        secondary_impact_pct: Number(secImpact) || 0
      }

      const r = templateId
        ? await supabase.from('news_templates').update(payload).eq('id', templateId)
        : await supabase.from('news_templates').insert(payload)

      if (r.error) throw r.error

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
          <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">News Template</div>
          <h1 className="font-display text-3xl sm:text-4xl mt-1">
            {isNew ? '📋 템플릿 추가' : '📋 템플릿 수정'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 border-red-200 text-up font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">
            📝 제목 <span className="text-up">*</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-field"
            placeholder="예: 광주여상, AI 신기술 특허 취득"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">📄 본문</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="input-field"
            rows="4"
            placeholder="뉴스의 상세 내용을 작성하세요"
          />
        </div>
      </div>

      <div className="card p-6 bg-gold-50/30 space-y-4">
        <h3 className="font-display text-lg text-gold-700">📊 주가 영향</h3>

        <div className="space-y-3">
          {/* 주 영향 종목 */}
          <div className="bg-white rounded p-3 border border-gold-500/20">
            <div className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">
              🎯 주 영향 종목 <span className="text-up">*</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
              <select
                value={stockSymbol}
                onChange={e => setStockSymbol(e.target.value)}
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
                  value={mainImpact}
                  onChange={e => setMainImpact(e.target.value)}
                  className="input-field num-display text-center"
                  placeholder="5"
                />
                <span className="text-sm text-stone shrink-0">%</span>
              </div>
            </div>
            {stockSymbol && (
              <div className="text-xs mt-2 px-2 py-1 rounded bg-gold-50">
                {mainImpact > 0 ? (
                  <span className="text-up font-semibold">📈 {stockSymbol} +{mainImpact}% 상승</span>
                ) : mainImpact < 0 ? (
                  <span className="text-down font-semibold">📉 {stockSymbol} {mainImpact}% 하락</span>
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
                value={secSymbol}
                onChange={e => setSecSymbol(e.target.value)}
                className="input-field"
              >
                <option value="">-- 선택 안 함 --</option>
                {stocks
                  .filter(s => s.symbol !== stockSymbol)
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
                  value={secImpact}
                  onChange={e => setSecImpact(e.target.value)}
                  className="input-field num-display text-center"
                  placeholder="0"
                  disabled={!secSymbol}
                />
                <span className="text-sm text-stone shrink-0">%</span>
              </div>
            </div>
            {secSymbol && secImpact != 0 && (
              <div className="text-xs mt-2 px-2 py-1 rounded bg-gold-50">
                {secImpact > 0 ? (
                  <span className="text-up font-semibold">📈 {secSymbol} +{secImpact}% 상승</span>
                ) : (
                  <span className="text-down font-semibold">📉 {secSymbol} {secImpact}% 하락</span>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-stone">
          💡 산업 연관성을 고려해 부 종목도 함께 변동시킬 수 있어요. (예: 외식업 호재 → 배달앱도 동반 상승)
        </p>
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
