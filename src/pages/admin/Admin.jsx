import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { supabase, formatKRW, fmtDateTime } from '../../lib/supabase'
import NumberInput from '../../components/NumberInput'

const TABS = [
  { key: 'tournament', label: '🏆 대회' },
  { key: 'news',       label: '📰 뉴스 발송' },
  { key: 'template',   label: '📋 뉴스 풀' },
  { key: 'quiz',       label: '📝 퀴즈' },
  { key: 'stock',      label: '💹 종목가' },
  { key: 'student',    label: '👥 학생' }
]

export default function Admin() {
  const [tab, setTab] = useState('tournament')
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="text-[11px] tracking-[0.4em] text-gold-600 uppercase">Administrator</div>
        <h1 className="font-display text-3xl sm:text-4xl mt-2">관리자 페이지</h1>
      </div>

      <AdminSummary />
      <SystemSettings />

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 sm:px-4 py-3 text-sm transition-colors relative whitespace-nowrap shrink-0 ${
                    tab === t.key ? 'text-gold-700 font-semibold' : 'text-stone hover:text-charcoal'
                  }`}>
            {t.label}
            {tab === t.key && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-gold-500"></span>}
          </button>
        ))}
      </div>

      {tab === 'tournament' && <TournamentAdmin />}
      {tab === 'news'       && <NewsAdmin />}
      {tab === 'template'   && <TemplateAdmin />}
      {tab === 'quiz'       && <QuizAdmin />}
      {tab === 'stock'      && <StockAdmin />}
      {tab === 'student'    && <StudentAdmin />}
    </div>
  )
}

/* ============================================================= */
/* ⚙️ 시스템 설정 (v8.4 신규)                                    */
/* ============================================================= */
function SystemSettings() {
  const [settings, setSettings] = useState(null)
  const [draft, setDraft] = useState(10)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (data) {
      setSettings(data)
      setDraft(data.idle_cron_interval_minutes || 10)
    }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.rpc('set_idle_interval', { p_minutes: Number(draft) })
      if (error) throw error
      setSavedAt(new Date())
      load()
      setTimeout(() => setSavedAt(null), 3000)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const lastTickAgo = settings?.last_random_at 
    ? Math.round((Date.now() - new Date(settings.last_random_at).getTime()) / 1000)
    : null

  if (!settings) return null

  return (
    <div className="card overflow-hidden">
      {/* 접힌 상태 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gold-50/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>⚙️</span>
          <span className="font-display text-sm sm:text-base">시스템 설정</span>
          <span className="text-xs text-stone">
            (학생 미접속 시 변동: <b className="text-gold-700 num-display">{settings.idle_cron_interval_minutes}분</b>)
          </span>
        </div>
        <span className="text-stone text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="p-4 sm:p-6 border-t border-gold-500/15 space-y-4 bg-gold-50/20">
          <div>
            <h3 className="font-display text-base text-gold-700 mb-1">🎲 가격 변동 주기</h3>
            <p className="text-xs text-stone leading-relaxed">
              학생이 1명이라도 접속해 있으면 <b>1분마다 자동 변동</b>됩니다.<br/>
              아무도 접속 안 했을 때 변동 주기를 설정합니다.
            </p>
          </div>

          <div className="bg-white rounded p-4 border border-gold-500/20">
            <label className="block text-sm font-semibold text-charcoal mb-2">
              💤 학생 미접속 시 변동 주기
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="1440"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="input-field num-display w-32"
              />
              <span className="text-sm text-stone">분마다</span>
              <button
                onClick={save}
                disabled={saving || Number(draft) === settings.idle_cron_interval_minutes}
                className="btn-gold px-4 py-2 rounded text-sm disabled:opacity-30"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
            {savedAt && (
              <div className="text-xs text-up mt-2 fade-up">✅ 저장되었습니다!</div>
            )}
            <p className="text-xs text-stone mt-2">
              💡 추천: 1~5분(빠름) / 10~30분(보통) / 60~120분(느림)
            </p>
          </div>

          <div className="bg-blue-50/40 rounded p-3 border border-blue-500/20 text-xs text-charcoal space-y-1">
            <div className="font-semibold text-down mb-1">📊 작동 원리</div>
            <div>• 학생 접속 중 → 30초마다 클라이언트 트리거 → <b>1분 변동</b></div>
            <div>• 아무도 접속 안 함 → pg_cron → <b>{settings.idle_cron_interval_minutes}분 변동</b></div>
            {lastTickAgo !== null && (
              <div className="pt-1 mt-1 border-t border-blue-500/15 text-stone">
                마지막 변동: {lastTickAgo < 60 ? `${lastTickAgo}초 전` : `${Math.round(lastTickAgo/60)}분 전`}
                {lastTickAgo < 90 && ' 🟢 (학생 접속 중인 듯)'}
                {lastTickAgo >= 90 && lastTickAgo < settings.idle_cron_interval_minutes * 60 + 60 && ' 🟡 (대기 중)'}
              </div>
            )}
          </div>

          <div className="text-xs text-stone leading-relaxed">
            ℹ️ 각 대회의 변동 주기/변동폭은 <b>대회 만들기</b> 페이지에서 설정합니다. 
            여기서는 "전체 시스템의 idle 시간" 만 조절합니다.
          </div>

          <EventBroadcaster />
        </div>
      )}
    </div>
  )
}

/* ============================================================= */
/* 🎉 깜짝 이벤트 발동 (v9.1 신규)                              */
/* ============================================================= */
function EventBroadcaster() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [emoji, setEmoji] = useState('🎉')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const presets = [
    { emoji: '🎉', title: '깜짝 보너스!', message: '5분 안에 매수하면 행운이!' },
    { emoji: '⚡', title: '플래시 세일!', message: '지금이 매수 찬스!' },
    { emoji: '🔥', title: '핫 뉴스 임박!', message: '곧 중요한 뉴스가 발표됩니다' },
    { emoji: '🎁', title: '광주여상 선물!', message: '오늘은 특별한 날이에요' },
    { emoji: '⏰', title: '카운트다운 시작!', message: '대회 마감까지 얼마 남지 않았어요' },
  ]

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      alert('제목과 메시지를 입력해주세요')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.rpc('admin_send_notification', {
        p_title: title,
        p_message: message,
        p_emoji: emoji,
        p_type: 'event'
      })
      if (error) throw error
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setTitle('')
        setMessage('')
      }, 2000)
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  const usePreset = (p) => {
    setEmoji(p.emoji)
    setTitle(p.title)
    setMessage(p.message)
  }

  return (
    <div className="bg-purple-50/40 rounded p-3 border border-purple-500/20">
      <button 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-purple-700"
      >
        <span>🎉 깜짝 이벤트 알림 발동</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-stone">
            모든 학생 화면에 즉시 알림이 표시됩니다. 5초 후 자동 사라짐.
          </p>

          {/* 빠른 템플릿 */}
          <div className="space-y-1">
            <div className="text-xs text-stone">⚡ 빠른 템플릿</div>
            <div className="flex flex-wrap gap-1">
              {presets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => usePreset(p)}
                  className="text-xs px-2 py-1 rounded bg-white border border-purple-500/20 hover:bg-purple-100"
                >
                  {p.emoji} {p.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[80px_1fr] gap-2">
            <input
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className="input-field text-center text-xl"
              maxLength="2"
            />
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
              placeholder="제목 (예: 깜짝 이벤트!)"
            />
          </div>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="input-field"
            placeholder="메시지 내용"
          />

          {/* 미리보기 */}
          {(title || message) && (
            <div>
              <div className="text-xs text-stone mb-1">👀 미리보기</div>
              <div className="bg-gradient-to-r from-gold-500 to-amber-500 text-white rounded-lg p-2 flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{title || '제목'}</div>
                  <div className="text-xs opacity-90">{message || '메시지'}</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={send}
            disabled={busy || sent}
            className="w-full btn-gold py-2 rounded text-sm disabled:opacity-30"
          >
            {sent ? '✅ 발송 완료!' : busy ? '발송 중...' : '🎉 즉시 발동!'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ============================================================= */
/* 📊 관리자 현황 요약 카드 (v8 신규)                            */
/* ============================================================= */
function AdminSummary() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [
      { count: studentCount },
      { count: tournamentActive },
      { count: tournamentTotal },
      { count: newsTotal },
      { count: newsPending },
      { count: templateCount },
      { count: quizCount }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      supabase.from('news_events').select('*', { count: 'exact', head: true }).neq('title', '(뉴스 미정)'),
      supabase.from('news_events').select('*', { count: 'exact', head: true }).eq('title', '(뉴스 미정)').eq('is_published', false),
      supabase.from('news_templates').select('*', { count: 'exact', head: true }),
      supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('is_active', true)
    ])

    // 활성 대회의 총 자산 합계 계산
    const { data: rankings } = await supabase
      .from('tournament_ranking_view')
      .select('total_assets, tournament_id, tournament:tournaments(status)')
    
    const activeTotalAssets = (rankings || [])
      .filter(r => r.tournament?.status === 'active')
      .reduce((sum, r) => sum + (Number(r.total_assets) || 0), 0)
    const activeParticipants = (rankings || [])
      .filter(r => r.tournament?.status === 'active').length

    setSummary({
      studentCount: studentCount || 0,
      tournamentActive: tournamentActive || 0,
      tournamentTotal: tournamentTotal || 0,
      newsTotal: newsTotal || 0,
      newsPending: newsPending || 0,
      templateCount: templateCount || 0,
      quizCount: quizCount || 0,
      activeTotalAssets,
      activeParticipants
    })
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000) // 30초마다 갱신
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="card p-6 text-center text-stone text-sm">
        현황 불러오는 중…
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <SummaryCard
        icon="👥"
        label="가입 학생"
        value={summary.studentCount.toLocaleString('ko-KR')}
        unit="명"
      />
      <SummaryCard
        icon="🏆"
        label="진행 중 대회"
        value={summary.tournamentActive}
        sub={`전체 ${summary.tournamentTotal}개`}
        highlight={summary.tournamentActive > 0}
      />
      <SummaryCard
        icon="💰"
        label="진행 중 총 자산"
        value={formatKRW(summary.activeTotalAssets)}
        sub={`참가 ${summary.activeParticipants}명`}
      />
      <SummaryCard
        icon="📰"
        label="작성된 뉴스"
        value={summary.newsTotal.toLocaleString('ko-KR')}
        sub={summary.newsPending > 0 ? `미정 ${summary.newsPending}` : null}
        warn={summary.newsPending > 0}
      />
      <SummaryCard
        icon="📋"
        label="뉴스 풀"
        value={summary.templateCount.toLocaleString('ko-KR')}
        unit="개"
      />
      <SummaryCard
        icon="📝"
        label="활성 퀴즈"
        value={summary.quizCount.toLocaleString('ko-KR')}
        unit="개"
      />
    </div>
  )
}

function SummaryCard({ icon, label, value, unit, sub, highlight, warn }) {
  return (
    <div className={`card p-3 sm:p-4 ${highlight ? 'border-gold-500/40 bg-gold-50/40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] sm:text-xs tracking-wider text-stone uppercase">{label}</div>
        <div className="text-base sm:text-lg shrink-0">{icon}</div>
      </div>
      <div className="mt-1.5 sm:mt-2">
        <div className="num-display text-base sm:text-lg font-bold text-charcoal break-all">
          {value}
          {unit && <span className="text-xs text-stone ml-1 font-normal">{unit}</span>}
        </div>
        {sub && (
          <div className={`text-[10px] sm:text-xs mt-1 ${warn ? 'text-up font-semibold' : 'text-stone'}`}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================= */
function TournamentAdmin() {
  const nav = useNavigate()
  const [list, setList] = useState([])

  const load = async () => {
    const { data } = await supabase.from('tournaments').select('*').order('start_at', { ascending: false })
    setList(data || [])
  }
  useEffect(() => { load() }, [])

  const end = async (id) => {
    if (!confirm('대회를 강제 종료하시겠어요?')) return
    await supabase.from('tournaments').update({ status: 'ended', end_at: new Date().toISOString() }).eq('id', id)
    load()
  }
  const remove = async (id) => {
    if (!confirm('대회를 삭제하면 참가 기록과 거래 내역도 모두 사라집니다. 진행할까요?')) return
    await supabase.from('tournaments').delete().eq('id', id); load()
  }

  const durationText = (s, e) => {
    const hours = Math.round((new Date(e) - new Date(s)) / 3600000)
    if (hours < 24) return `${hours}시간`
    if (hours < 168) return `${Math.round(hours/24)}일`
    return `${Math.round(hours/24/7)}주`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => nav('/admin/tournament/new')} className="btn-gold px-5 py-2 rounded">
          + 대회 만들기
        </button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table-basic w-full">
            <thead>
              <tr><th>이름</th><th>기간</th><th>상태</th><th>시작</th><th>종료</th><th>뉴스시각</th><th>초기자금</th><th></th></tr>
            </thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id}>
                  <td className="font-semibold">{t.name}</td>
                  <td className="text-sm">{durationText(t.start_at, t.end_at)}</td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded tracking-wider uppercase ${
                      t.status === 'active' ? 'bg-gold-100 text-gold-700' :
                      t.status === 'upcoming' ? 'bg-blue-50 text-down' : 'bg-stone-100 text-stone'
                    }`}>{t.status === 'active' ? '진행' : t.status === 'upcoming' ? '예정' : '종료'}</span>
                  </td>
                  <td className="num-display text-xs whitespace-nowrap">{fmtDateTime(t.start_at)}</td>
                  <td className="num-display text-xs whitespace-nowrap">{fmtDateTime(t.end_at)}</td>
                  <td className="num-display text-xs text-stone">{t.news_times || '-'}</td>
                  <td className="num-display text-sm">{formatKRW(t.initial_money)}</td>
                  <td className="text-right whitespace-nowrap">
                    {t.status === 'active' && (
                      <button onClick={() => end(t.id)} className="btn-ghost text-xs px-2 py-1 rounded">종료</button>
                    )}
                    <button onClick={() => remove(t.id)} className="btn-ghost text-xs px-2 py-1 rounded text-up">삭제</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="8" className="text-center p-10 text-stone">대회가 없습니다. "+ 대회 만들기" 버튼을 눌러보세요!</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ============================================================= */
function NewsAdmin() {
  const nav = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [allNews, setAllNews] = useState([])
  const [selectedT, setSelectedT] = useState('')
  const [filter, setFilter] = useState('empty')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [t, n] = await Promise.all([
      supabase.from('tournaments').select('*').in('status', ['upcoming','active']).order('start_at'),
      supabase.from('news_events').select('*, tournament:tournaments(name), impacts:news_stock_impacts(*, stock:stocks(symbol,name))')
        .order('news_at', { ascending: true })
    ])
    setTournaments(t.data || [])
    setAllNews(n.data || [])
    if (!selectedT && t.data?.[0]) setSelectedT(t.data[0].id)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filteredNews = allNews
    .filter(n => !selectedT || n.tournament_id === selectedT)
    .filter(n => {
      if (filter === 'empty') return n.title === '(뉴스 미정)'
      if (filter === 'filled') return n.title !== '(뉴스 미정)'
      return true
    })

  const remove = async (id) => {
    if (!confirm('이 뉴스를 삭제할까요?')) return
    await supabase.from('news_events').delete().eq('id', id); load()
  }
  const regenerateSlots = async () => {
    if (!selectedT) return alert('대회를 선택해주세요')
    if (!confirm('이 대회의 뉴스 슬롯을 재생성할까요?')) return
    const { data, error } = await supabase.rpc('generate_news_slots', { p_tournament_id: selectedT })
    if (error) return alert(error.message)
    alert(`${data || 0}개의 뉴스 슬롯이 생성되었습니다`)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-wrap">
        <select value={selectedT} onChange={e => setSelectedT(e.target.value)}
                className="input-field text-sm sm:max-w-xs">
          <option value="">-- 대회 선택 --</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
          ))}
        </select>

        <div className="flex gap-1 border border-gold-500/20 rounded p-1 self-start">
          {[
            { k: 'empty',  label: '미정 슬롯' },
            { k: 'filled', label: '작성됨' },
            { k: 'all',    label: '전체' }
          ].map(o => (
            <button key={o.k} onClick={() => setFilter(o.k)}
                    className={`px-3 py-1 text-xs sm:text-sm rounded whitespace-nowrap ${
                      filter === o.k ? 'bg-gold-500 text-white' : 'text-stone hover:bg-gold-50'
                    }`}>
              {o.label}
            </button>
          ))}
        </div>

        <div className="sm:ml-auto flex gap-2 flex-wrap">
          <button onClick={regenerateSlots} className="btn-outline-gold px-3 sm:px-4 py-2 rounded text-xs sm:text-sm">
            🔄 슬롯 재생성
          </button>
          <button 
            onClick={() => nav(`/admin/news/new?tournament=${selectedT}`)} 
            disabled={!selectedT}
            className="btn-gold px-3 sm:px-4 py-2 rounded text-xs sm:text-sm"
          >
            + 즉석 뉴스
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-stone">불러오는 중…</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table-basic w-full">
              <thead>
                <tr><th>시각</th><th>뉴스</th><th>영향</th><th>반영</th><th>상태</th><th></th></tr>
              </thead>
              <tbody>
                {filteredNews.map(n => {
                  const isEmpty = n.title === '(뉴스 미정)'
                  return (
                    <tr key={n.id} className={isEmpty ? 'bg-red-50/30' : ''}>
                      <td className="num-display text-xs whitespace-nowrap">{fmtDateTime(n.news_at)}</td>
                      <td className="max-w-xs">
                        {isEmpty ? (
                          <span className="text-up italic text-sm">⚠️ 미정</span>
                        ) : (
                          <span className="font-semibold text-sm">{n.title}</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {n.impacts?.map(i => (
                          <div key={i.id} className="whitespace-nowrap">
                            {i.stock?.symbol} <span className={i.impact_pct >= 0 ? 'text-up' : 'text-down'}>
                              {i.impact_pct >= 0 ? '+' : ''}{i.impact_pct}%
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="num-display text-xs whitespace-nowrap">{fmtDateTime(n.price_apply_at)}</td>
                      <td>
                        <span className={`text-[10px] px-2 py-1 rounded tracking-wider uppercase whitespace-nowrap ${
                          n.is_applied ? 'bg-gold-100 text-gold-700' :
                          n.is_published ? 'bg-blue-50 text-down' : 'bg-stone-100 text-stone'
                        }`}>
                          {n.is_applied ? '반영' : n.is_published ? '공개' : '대기'}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {!n.is_published && (
                          <button 
                            onClick={() => nav(`/admin/news/edit/${n.id}`)} 
                            className="btn-ghost text-xs px-2 py-1 rounded"
                          >
                            {isEmpty ? '채우기' : '수정'}
                          </button>
                        )}
                        <button onClick={() => remove(n.id)} className="btn-ghost text-xs px-2 py-1 rounded text-up">삭제</button>
                      </td>
                    </tr>
                  )
                })}
                {filteredNews.length === 0 && (
                  <tr><td colSpan="6" className="text-center p-10 text-stone">
                    {filter === 'empty' ? '작성 필요한 슬롯이 없어요 ✨' : '표시할 뉴스가 없습니다'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================= */
function TemplateAdmin() {
  const nav = useNavigate()
  const [list, setList] = useState([])

  const load = async () => {
    const { data } = await supabase.from('news_templates').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }
  useEffect(() => { load() }, [])
  const remove = async (id) => { if (!confirm('삭제?')) return; await supabase.from('news_templates').delete().eq('id', id); load() }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-stone">미리 만들어두면 뉴스 발송 시 빠르게 선택할 수 있어요</p>
        <button onClick={() => nav('/admin/template/new')} className="btn-gold px-5 py-2 rounded">
          + 템플릿 추가
        </button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table-basic w-full">
            <thead><tr><th>제목</th><th>주</th><th>변동</th><th>부</th><th>변동</th><th></th></tr></thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id}>
                  <td className="max-w-xs truncate font-semibold">{t.title}</td>
                  <td className="num-display text-sm">{t.stock_symbol}</td>
                  <td className={`num-display font-semibold text-sm ${t.main_impact_pct >= 0 ? 'text-up' : 'text-down'}`}>
                    {t.main_impact_pct >= 0 ? '+' : ''}{t.main_impact_pct}%
                  </td>
                  <td className="num-display text-stone text-sm">{t.secondary_symbol || '-'}</td>
                  <td className={`num-display text-sm ${t.secondary_impact_pct > 0 ? 'text-up' : t.secondary_impact_pct < 0 ? 'text-down' : 'text-stone'}`}>
                    {t.secondary_impact_pct ? (t.secondary_impact_pct >= 0 ? '+' : '') + t.secondary_impact_pct + '%' : '-'}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button 
                      onClick={() => nav(`/admin/template/edit/${t.id}`)} 
                      className="btn-ghost text-xs px-2 py-1 rounded"
                    >
                      수정
                    </button>
                    <button onClick={() => remove(t.id)} className="btn-ghost text-xs px-2 py-1 rounded text-up">삭제</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="6" className="text-center p-10 text-stone">템플릿이 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ============================================================= */
function QuizAdmin() {
  const nav = useNavigate()
  const [list, setList] = useState([])

  const load = async () => {
    const { data } = await supabase.from('quizzes').select('*').order('week_number', { ascending: false })
    setList(data || [])
  }
  useEffect(() => { load() }, [])
  const remove = async (id) => { if (!confirm('삭제?')) return; await supabase.from('quizzes').delete().eq('id', id); load() }
  const toggle = async (q) => { await supabase.from('quizzes').update({ is_active: !q.is_active }).eq('id', q.id); load() }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => nav('/admin/quiz/new')} className="btn-gold px-5 py-2 rounded">
          + 퀴즈 추가
        </button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table-basic w-full">
            <thead><tr><th>주차</th><th>문제</th><th>정답</th><th>보상</th><th>활성</th><th></th></tr></thead>
            <tbody>
              {list.map(q => (
                <tr key={q.id}>
                  <td className="num-display font-semibold">{q.week_number}</td>
                  <td className="max-w-xs truncate text-sm">{q.question}</td>
                  <td className="num-display text-sm">{q.correct_answer}번</td>
                  <td className="num-display text-sm">{formatKRW(q.reward)}</td>
                  <td><button onClick={() => toggle(q)} className={`text-xs px-2 py-1 rounded tracking-wider uppercase ${q.is_active ? 'bg-gold-100 text-gold-700' : 'bg-stone-100 text-stone'}`}>{q.is_active ? 'ON' : 'OFF'}</button></td>
                  <td className="text-right whitespace-nowrap">
                    <button 
                      onClick={() => nav(`/admin/quiz/edit/${q.id}`)} 
                      className="btn-ghost text-xs px-2 py-1 rounded"
                    >
                      수정
                    </button>
                    <button onClick={() => remove(q.id)} className="btn-ghost text-xs px-2 py-1 rounded text-up">삭제</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="6" className="text-center p-10 text-stone">퀴즈가 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ============================================================= */
function StockAdmin() {
  const [list, setList] = useState([])
  const [edits, setEdits] = useState({})
  const load = async () => { const { data } = await supabase.from('stocks').select('*').order('symbol'); setList(data || []) }
  useEffect(() => { load() }, [])
  const save = async (s) => {
    const p = Number(edits[s.id])
    if (!p || p < 100) return alert('100원 이상의 가격을 입력하세요')
    await supabase.from('stocks').update({ previous_price: s.current_price, current_price: p, updated_at: new Date().toISOString() }).eq('id', s.id)
    await supabase.from('price_history').insert({ stock_id: s.id, price: p })
    setEdits({ ...edits, [s.id]: '' }); load()
  }
  return (
    <div className="card">
      <div className="table-wrap">
        <table className="table-basic w-full">
          <thead><tr><th>종목</th><th>섹터</th><th>직전</th><th>현재</th><th>새가격</th><th></th></tr></thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id}>
                <td><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-stone">{s.symbol}</div></td>
                <td className="text-stone text-xs">{s.sector}</td>
                <td className="num-display text-stone text-sm">{formatKRW(s.previous_price)}</td>
                <td className="num-display font-semibold text-sm">{formatKRW(s.current_price)}</td>
                <td>
                  <NumberInput
                    value={edits[s.id] || ''}
                    onChange={(v) => setEdits({ ...edits, [s.id]: v })}
                    placeholder="새 가격"
                    className="w-32 text-sm"
                  />
                </td>
                <td><button onClick={() => save(s)} className="btn-gold text-xs px-3 py-1.5 rounded">저장</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ============================================================= */
function StudentAdmin() {
  const [students, setStudents] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [selectedTid, setSelectedTid] = useState('')
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  const loadStudents = () => {
    Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('created_at'),
      supabase.from('tournaments').select('*').order('start_at', { ascending: false })
    ]).then(([s, t]) => { setStudents(s.data || []); setTournaments(t.data || []); setLoading(false) })
  }

  useEffect(() => { loadStudents() }, [])

  useEffect(() => {
    if (!selectedTid) { setRanking([]); return }
    supabase.from('tournament_ranking_view').select('*').eq('tournament_id', selectedTid)
      .then(({ data }) => setRanking(data || []))
  }, [selectedTid])

  const deleteStudent = async (student) => {
    const ok = confirm(
      `정말로 "${student.name}" 학생을 삭제하시겠어요?\n\n` +
      `⚠️ 다음 데이터가 모두 삭제됩니다:\n` +
      `  - 거래 내역\n` +
      `  - 보유 주식\n` +
      `  - 대회 참가 기록\n` +
      `  - 뉴스 읽음 기록\n` +
      `  - 로그인 계정\n\n` +
      `이 작업은 되돌릴 수 없습니다!`
    )
    if (!ok) return
    
    setDeleting(student.id)
    try {
      const { error, data } = await supabase.rpc('admin_delete_student', { 
        p_user_id: student.id 
      })
      if (error) throw error
      
      // 목록에서 즉시 제거
      setStudents(prev => prev.filter(s => s.id !== student.id))
      alert(`✅ "${student.name}" 학생이 삭제되었습니다`)
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  const rankMap = Object.fromEntries(ranking.map(r => [r.user_id, r]))

  // 정렬: 대회 선택 시 총자산 내림차순, 아닐 때는 가입일 순
  const sortedStudents = [...students].sort((a, b) => {
    if (selectedTid) {
      const ra = rankMap[a.id]
      const rb = rankMap[b.id]
      const aTotal = ra ? Number(ra.total_assets) : -1
      const bTotal = rb ? Number(rb.total_assets) : -1
      return bTotal - aTotal
    }
    return new Date(a.created_at) - new Date(b.created_at)
  })

  // 합계 계산
  const totals = {
    cash: 0,
    stock: 0,
    total: 0,
    participatingCount: 0
  }
  if (selectedTid) {
    students.forEach(s => {
      const r = rankMap[s.id]
      if (r) {
        totals.cash += Number(r.cash) || 0
        totals.stock += Number(r.stock_value) || 0
        totals.total += Number(r.total_assets) || 0
        totals.participatingCount++
      }
    })
  }

  const download = () => {
    if (students.length === 0) { alert('학생이 없습니다'); return }
    const rows = sortedStudents.map((s, idx) => {
      const r = rankMap[s.id]
      const hasRanking = selectedTid && r
      return {
        '순위': hasRanking ? (idx + 1) : '-',
        '이름': s.name, '학교': s.school, '반': s.class_name, '학번': s.student_number,
        '연락처': s.contact || '',
        '보유 현금': hasRanking ? r.cash : '-',
        '주식 평가액': hasRanking ? r.stock_value : '-',
        '총 자산': hasRanking ? r.total_assets : '-',
        '가입일': new Date(s.created_at).toLocaleDateString('ko-KR')
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length * 2, 12) }))
    const wb = XLSX.utils.book_new()
    const tname = tournaments.find(t => t.id === selectedTid)?.name || '전체'
    XLSX.utils.book_append_sheet(wb, ws, '학생 현황')
    XLSX.writeFile(wb, `investclass_${tname}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="text-sm text-stone">총 <b className="text-ink">{students.length}</b>명</span>
          <select value={selectedTid} onChange={e => setSelectedTid(e.target.value)} className="input-field text-sm sm:max-w-xs">
            <option value="">-- 대회 선택 (선택사항) --</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}
          </select>
        </div>
        <button onClick={download} disabled={students.length === 0} className="btn-gold px-5 py-2 rounded">
          📥 엑셀 다운로드
        </button>
      </div>

      {/* 합계 카드 (대회 선택 시) */}
      {selectedTid && totals.participatingCount > 0 && (
        <div className="card p-4 bg-gold-50/40 border-gold-500/30">
          <div className="text-xs tracking-wider text-gold-700 uppercase mb-2">📊 대회 현황</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-stone">참가자</div>
              <div className="num-display text-base font-bold mt-1">{totals.participatingCount}명</div>
            </div>
            <div>
              <div className="text-xs text-stone">총 보유 현금</div>
              <div className="num-display text-base font-bold mt-1">{formatKRW(totals.cash)}</div>
            </div>
            <div>
              <div className="text-xs text-stone">총 주식 평가액</div>
              <div className="num-display text-base font-bold mt-1">{formatKRW(totals.stock)}</div>
            </div>
            <div>
              <div className="text-xs text-stone">총 자산</div>
              <div className="num-display text-base font-bold mt-1 text-gold-700">{formatKRW(totals.total)}</div>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="card p-12 text-center text-stone">불러오는 중…</div> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table-basic w-full">
              <thead>
                <tr>
                  {selectedTid && <th>순위</th>}
                  <th>이름</th><th>학교</th><th>반</th><th>학번</th><th>연락</th>
                  <th className="text-right">현금</th>
                  <th className="text-right">주식</th>
                  <th className="text-right">총자산</th>
                  <th className="text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s, idx) => {
                  const r = rankMap[s.id]
                  const isTop3 = selectedTid && r && idx < 3
                  const isDeleting = deleting === s.id
                  return (
                    <tr key={s.id} className={isTop3 ? 'bg-gold-50/30' : ''}>
                      {selectedTid && (
                        <td className="num-display font-bold text-sm">
                          {r ? (
                            idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1)
                          ) : '-'}
                        </td>
                      )}
                      <td className="font-semibold text-sm">{s.name}</td>
                      <td className="text-stone text-xs">{s.school}</td>
                      <td className="text-stone text-xs">{s.class_name}</td>
                      <td className="text-stone num-display text-xs">{s.student_number}</td>
                      <td className="text-stone num-display text-xs">{s.contact}</td>
                      <td className="num-display text-right text-sm">{r ? formatKRW(r.cash) : '-'}</td>
                      <td className="num-display text-right text-sm">{r ? formatKRW(r.stock_value) : '-'}</td>
                      <td className="num-display text-right font-semibold text-gold-700 text-sm">{r ? formatKRW(r.total_assets) : '-'}</td>
                      <td className="text-center">
                        <button
                          onClick={() => deleteStudent(s)}
                          disabled={isDeleting}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-up border border-red-200 hover:bg-red-100 disabled:opacity-50"
                        >
                          {isDeleting ? '삭제 중...' : '🗑️ 삭제'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
