import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import NumberInput from '../../components/NumberInput'

export default function TournamentCreate() {
  const nav = useNavigate()
  const now = new Date()
  const defaultStart = new Date(now.getTime() + 30 * 60000)
  const defaultEnd = new Date(defaultStart.getTime() + 4 * 60 * 60000)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState(toLocalInput(defaultStart))
  const [endAt, setEndAt] = useState(toLocalInput(defaultEnd))
  const [initialMoney, setInitialMoney] = useState(1000000)
  const [newsTimes, setNewsTimes] = useState('10:30,11:30,12:30,13:30')
  const [priceDelay, setPriceDelay] = useState(5)
  // 🎲 랜덤 변동 설정 추가
  const [randomInterval, setRandomInterval] = useState(10)  // 분
  const [randomRange, setRandomRange] = useState(0.3)       // %
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const previewSlots = (() => {
    const parsedTimes = (newsTimes || '').split(',').map(t => t.trim()).filter(t => /^\d{1,2}:\d{2}$/.test(t))
    if (!startAt || !endAt || parsedTimes.length === 0) return []
    const start = new Date(startAt), end = new Date(endAt)
    if (isNaN(start) || isNaN(end) || start >= end) return []
    const slots = []
    const curDay = new Date(start); curDay.setHours(0, 0, 0, 0)
    const lastDay = new Date(end); lastDay.setHours(0, 0, 0, 0)
    let safety = 40
    while (curDay <= lastDay && safety-- > 0) {
      for (const t of parsedTimes) {
        const [h, m] = t.split(':').map(Number)
        const slot = new Date(curDay)
        slot.setHours(h, m, 0, 0)
        if (slot >= start && slot <= end) { slots.push(slot); if (slots.length >= 50) break }
      }
      if (slots.length >= 50) break
      curDay.setDate(curDay.getDate() + 1)
    }
    return slots
  })()

  const durationText = (() => {
    const s = new Date(startAt), e = new Date(endAt)
    if (isNaN(s) || isNaN(e) || s >= e) return null
    const hours = (e - s) / 3600000
    if (hours < 24) return `${hours.toFixed(1)}시간`
    return `${(hours / 24).toFixed(1)}일 (${Math.round(hours)}시간)`
  })()

  // 🎲 랜덤 변동 시뮬레이션 (대회 중 변동 횟수)
  const randomFluctCount = (() => {
    const s = new Date(startAt), e = new Date(endAt)
    if (isNaN(s) || isNaN(e) || s >= e) return 0
    const minutes = (e - s) / 60000
    const interval = Number(randomInterval) || 10
    return Math.floor(minutes / interval)
  })()

  const save = async () => {
    setError('')
    
    const cleanName = (name || '').trim() || '이름 없는 대회'
    const s = new Date(startAt), e = new Date(endAt)
    
    if (isNaN(s) || isNaN(e)) {
      setError('시작 또는 종료 일시가 올바르지 않습니다')
      return
    }
    if (s >= e) {
      setError('종료 시각이 시작 시각보다 뒤여야 합니다')
      return
    }

    setBusy(true)
    try {
      const payload = {
        name: cleanName,
        description: description || '',
        type: 'custom',
        start_at: s.toISOString(),
        end_at: e.toISOString(),
        initial_money: Number(initialMoney) || 1000000,
        news_times: newsTimes || '',
        price_delay_minutes: Number(priceDelay) || 5,
        random_interval_minutes: Number(randomInterval) || 10,
        random_range_pct: Number(randomRange) || 0.3,
        status: s <= new Date() ? 'active' : 'upcoming'
      }

      const { data, error: iErr } = await supabase
        .from('tournaments')
        .insert(payload)
        .select()
        .single()
      
      if (iErr) throw iErr

      if (data?.id && newsTimes) {
        try {
          await supabase.rpc('generate_news_slots', { p_tournament_id: data.id })
        } catch (e) {
          console.warn('슬롯 생성 실패 (대회는 저장됨):', e)
        }
      }

      alert('✅ 대회가 성공적으로 생성되었습니다!')
      nav('/admin')
    } catch (e) {
      setError(e.message || '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/admin')} className="btn-ghost px-3 py-1.5 rounded">← 뒤로</button>
        <div>
          <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">New Tournament</div>
          <h1 className="font-display text-3xl sm:text-4xl mt-1">대회 만들기</h1>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 border-red-200 text-up font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* 기본 정보 */}
      <div className="card p-6 space-y-5">
        <h3 className="font-display text-lg text-gold-700">📌 기본 정보</h3>

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">📝 대회 이름</label>
          <input 
            type="text"
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="input-field text-base" 
            placeholder="예: 2026 광주여상 발명 모의투자 대회" 
            autoFocus
          />
          <p className="text-xs text-stone mt-1">비워두면 "이름 없는 대회"로 저장됩니다</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">📋 설명 (선택)</label>
          <input 
            type="text"
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="input-field" 
            placeholder="예: 중학교 2학년 대상 발명 연계" 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">🟢 시작 일시</label>
            <input 
              type="datetime-local" 
              value={startAt} 
              onChange={e => setStartAt(e.target.value)}
              className="input-field num-display" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">🔴 종료 일시</label>
            <input 
              type="datetime-local" 
              value={endAt} 
              onChange={e => setEndAt(e.target.value)}
              className="input-field num-display" 
            />
          </div>
        </div>

        {durationText && (
          <div className="bg-gold-50/60 border border-gold-500/20 rounded p-3 text-sm">
            ⏱️ 총 대회 기간: <span className="text-gold-700 font-semibold">{durationText}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">💰 초기 자금 (원)</label>
          <NumberInput
            value={initialMoney}
            onChange={(v) => setInitialMoney(v)}
            suffix={true}
          />
          <p className="text-xs text-stone mt-1">예: 1,000,000 (학생 1인당 지급되는 가상 자금)</p>
        </div>
      </div>

      {/* 뉴스 자동 스케줄 */}
      <div className="card p-6 bg-gold-50/30 space-y-4">
        <div>
          <h3 className="font-display text-lg text-gold-700 mb-1">📰 뉴스 자동 스케줄</h3>
          <p className="text-xs text-stone">대회 기간 동안 매일 이 시각에 뉴스가 발송됩니다</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">
            🕐 발송 시각 (콤마 구분, 24시간 형식)
          </label>
          <input 
            type="text"
            value={newsTimes} 
            onChange={e => setNewsTimes(e.target.value)} 
            className="input-field num-display" 
            placeholder="예: 10:30, 11:30, 12:30, 13:30" 
          />
          <p className="text-xs text-stone mt-1">
            💡 짧은 대회: 30분~1시간 간격 / 긴 대회: 하루 2번 (예: "08:30, 16:00")
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">⏳ 가격 반영 딜레이</label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min="1" 
              max="30" 
              value={priceDelay}
              onChange={e => setPriceDelay(e.target.value)}
              className="input-field num-display w-32" 
            />
            <span className="text-sm text-stone">분 뒤에 가격 반영</span>
          </div>
        </div>

        {previewSlots.length > 0 && (
          <div className="bg-white rounded p-3 border border-gold-500/15 text-sm">
            <div className="font-semibold text-gold-700 mb-2">
              📋 자동 생성될 뉴스 슬롯: {previewSlots.length}개
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
              {previewSlots.slice(0, 8).map((s, i) => (
                <div key={i} className="num-display text-stone">
                  · {fmtKorean(s)} → +{priceDelay}분 뒤 가격 반영
                </div>
              ))}
              {previewSlots.length > 8 && (
                <div className="text-stone italic">... 외 {previewSlots.length - 8}개</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🎲 랜덤 가격 변동 */}
      <div className="card p-6 bg-blue-50/30 space-y-4 border-blue-500/20">
        <div>
          <h3 className="font-display text-lg text-down mb-1">🎲 랜덤 가격 변동</h3>
          <p className="text-xs text-stone">뉴스 외에도 주가가 자연스럽게 움직이도록 설정</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">
              🔄 변동 주기 (분)
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="1" 
                max="60" 
                value={randomInterval}
                onChange={e => setRandomInterval(e.target.value)}
                className="input-field num-display w-28" 
              />
              <span className="text-sm text-stone">분마다</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">
              📊 변동폭 (%)
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="0.1"
                min="0.1" 
                max="2" 
                value={randomRange}
                onChange={e => setRandomRange(e.target.value)}
                className="input-field num-display w-28" 
              />
              <span className="text-sm text-stone">% 이내</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded p-3 border border-blue-500/15 text-sm">
          <div className="font-semibold text-down mb-2">
            📊 대회 중 예상 랜덤 변동: 약 {randomFluctCount}회
          </div>
          <div className="text-xs text-stone space-y-1">
            <div>· 매 <b>{randomInterval}분</b>마다 종목들이 <b>±{randomRange}%</b> 내에서 랜덤 변동</div>
            <div>· 뉴스로 변동된 종목은 5분 동안 제외 (중복 방지)</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded p-3 text-xs text-charcoal leading-relaxed">
          💡 <b>추천 설정</b>
          <div className="mt-1 space-y-0.5">
            <div>· <b>짧은 대회 (4시간)</b>: 5~10분 / 0.2~0.3%</div>
            <div>· <b>하루 대회 (8시간)</b>: 10~15분 / 0.3~0.5%</div>
            <div>· <b>긴 대회 (1주일+)</b>: 30~60분 / 0.5~1%</div>
          </div>
        </div>
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
          {busy ? '저장 중…' : '💾 대회 생성'}
        </button>
      </div>
    </div>
  )
}

function toLocalInput(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtKorean(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
