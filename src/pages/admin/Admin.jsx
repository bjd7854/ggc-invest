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
  { key: 'roulette',   label: '🎰 룰렛' },
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
      {tab === 'roulette'   && <RouletteAdmin />}
      {tab === 'student'    && <StudentAdmin />}
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
// 이 파일은 Admin.jsx 안의 StockAdmin 함수를 교체하는 코드입니다
// Admin.jsx 의 기존 StockAdmin 함수 (function StockAdmin() {...}) 를
// 아래 코드로 교체하세요
function StockAdmin() {
  const [list, setList] = useState([])
  const [edits, setEdits] = useState({})  // 가격 수정용
  const [editingInfo, setEditingInfo] = useState(null)  // 종목 정보 수정 중인 ID
  const [infoEdit, setInfoEdit] = useState({ name: '', symbol: '', sector: '', description: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ symbol: '', name: '', sector: '', description: '', initial_price: 10000 })
  const [busy, setBusy] = useState(false)
  
  // 시스템 변동 설정
  const [volatility, setVolatility] = useState(2.0)
  const [fluctuationEnabled, setFluctuationEnabled] = useState(true)
  
  const load = async () => { 
    const { data } = await supabase.from('stocks').select('*').order('symbol')
    setList(data || []) 
    
    // 시스템 설정도 로드
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle()
    if (settings) {
      setVolatility(settings.global_volatility_pct || 2.0)
      setFluctuationEnabled(settings.fluctuation_enabled !== false)
    }
  }
  
  useEffect(() => { load() }, [])

  // 가격 수정
  const savePrice = async (s) => {
    const p = Number(edits[s.id])
    if (!p || p < 100) return alert('100원 이상의 가격을 입력하세요')
    const roundedPrice = Math.round(p / 10) * 10  // 10원 단위
    await supabase.from('stocks').update({ 
      previous_price: s.current_price, 
      current_price: roundedPrice, 
      updated_at: new Date().toISOString() 
    }).eq('id', s.id)
    await supabase.from('price_history').insert({ stock_id: s.id, price: roundedPrice })
    setEdits({ ...edits, [s.id]: '' })
    load()
  }

  // 가격 직접 지정 (빠른 % 버튼용)
  const savePriceDirect = async (s, newPrice) => {
    const roundedPrice = Math.max(100, Math.round(newPrice / 10) * 10)
    await supabase.from('stocks').update({ 
      previous_price: s.current_price, 
      current_price: roundedPrice, 
      updated_at: new Date().toISOString() 
    }).eq('id', s.id)
    await supabase.from('price_history').insert({ stock_id: s.id, price: roundedPrice })
    load()
  }

  // 종목 정보 수정 시작
  const startEditInfo = (s) => {
    setEditingInfo(s.id)
    setInfoEdit({ 
      name: s.name, 
      symbol: s.symbol, 
      sector: s.sector || '', 
      description: s.description || '' 
    })
  }

  // 종목 정보 저장
  const saveInfo = async (s) => {
    if (!infoEdit.name.trim() || !infoEdit.symbol.trim()) {
      return alert('종목명과 종목코드는 필수입니다')
    }
    setBusy(true)
    try {
      const { error } = await supabase.rpc('admin_update_stock', {
        p_stock_id: s.id,
        p_name: infoEdit.name.trim(),
        p_symbol: infoEdit.symbol.trim().toUpperCase(),
        p_sector: infoEdit.sector.trim() || null,
        p_description: infoEdit.description.trim() || null
      })
      if (error) throw error
      setEditingInfo(null)
      load()
    } catch (e) {
      alert('저장 실패: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  // 종목 생성
  const createStock = async () => {
    const f = createForm
    if (!f.symbol.trim() || !f.name.trim()) {
      return alert('종목코드와 종목명은 필수입니다')
    }
    if (!f.initial_price || f.initial_price < 100) {
      return alert('초기 가격은 100원 이상이어야 합니다')
    }
    setBusy(true)
    try {
      const { error } = await supabase.rpc('admin_create_stock', {
        p_symbol: f.symbol.trim().toUpperCase(),
        p_name: f.name.trim(),
        p_sector: f.sector.trim() || '기타',
        p_description: f.description.trim() || '',
        p_initial_price: Number(f.initial_price)
      })
      if (error) throw error
      setShowCreate(false)
      setCreateForm({ symbol: '', name: '', sector: '', description: '', initial_price: 10000 })
      load()
      alert('✅ 종목이 생성되었습니다')
    } catch (e) {
      alert('생성 실패: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  // 종목 삭제
  const deleteStock = async (s) => {
    if (!confirm(
      `정말로 "${s.name}" (${s.symbol}) 종목을 삭제하시겠어요?\n\n` +
      `⚠️ 다음 데이터가 모두 삭제됩니다:\n` +
      `  - 가격 히스토리\n` +
      `  - 뉴스 영향 기록\n` +
      `  - 이 종목의 모든 거래 내역\n\n` +
      `※ 학생이 보유 중이면 삭제 불가 (먼저 매도 처리 필요)\n` +
      `이 작업은 되돌릴 수 없습니다!`
    )) return
    
    try {
      const { error } = await supabase.rpc('admin_delete_stock', { p_stock_id: s.id })
      if (error) throw error
      load()
      alert(`✅ "${s.name}" 종목이 삭제되었습니다`)
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    }
  }

  // 변동폭 변경
  const updateVolatility = async (newPct) => {
    try {
      await supabase.rpc('set_global_volatility', { p_pct: Number(newPct) })
      setVolatility(Number(newPct))
    } catch (e) {
      alert('변경 실패: ' + e.message)
    }
  }

  // 변동 ON/OFF
  const toggleFluctuation = async () => {
    const newState = !fluctuationEnabled
    try {
      await supabase.rpc('toggle_fluctuation', { p_enabled: newState })
      setFluctuationEnabled(newState)
    } catch (e) {
      alert('변경 실패: ' + e.message)
    }
  }

  // 즉시 변동 실행
  const forceTick = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_force_tick')
      if (error) throw error
      load()
      alert(`✅ ${data?.count || 0}개 종목 즉시 변동 완료!`)
    } catch (e) {
      alert('실패: ' + e.message)
    }
  }

  return (
    <div className="space-y-4">
      
      {/* ⭐ 시스템 1분 변동 설정 카드 */}
      <div className="card p-5 bg-gradient-to-br from-gold-50/60 to-amber-50/40 border-2 border-gold-500/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg flex items-center gap-2">
            ⚡ 1분 변동 시스템
          </h3>
          <span className={`text-xs px-2 py-1 rounded font-semibold ${
            fluctuationEnabled 
              ? 'bg-green-100 text-green-700' 
              : 'bg-stone-100 text-stone'
          }`}>
            {fluctuationEnabled ? '🟢 활성화' : '⏸️ 일시정지'}
          </span>
        </div>
        
        <div className="space-y-3">
          {/* 변동폭 슬라이더 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-charcoal">변동폭</label>
              <span className="num-display text-lg font-bold text-gold-700">
                ±{volatility.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={volatility}
              onChange={(e) => updateVolatility(e.target.value)}
              className="w-full accent-gold-600"
            />
            <div className="flex justify-between text-[10px] text-stone mt-1">
              <span>잔잔 0.5%</span>
              <span>보통 2%</span>
              <span>활발 5%</span>
            </div>
          </div>
          
          {/* 빠른 설정 버튼 */}
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => updateVolatility(1)} className="text-xs py-2 rounded bg-white hover:bg-gold-50 border border-gold-500/20">
              1.0%<br/><span className="text-[10px] text-stone">잔잔</span>
            </button>
            <button onClick={() => updateVolatility(2)} className="text-xs py-2 rounded bg-white hover:bg-gold-50 border border-gold-500/20">
              2.0%<br/><span className="text-[10px] text-stone">보통</span>
            </button>
            <button onClick={() => updateVolatility(3)} className="text-xs py-2 rounded bg-white hover:bg-gold-50 border border-gold-500/20">
              3.0%<br/><span className="text-[10px] text-stone">활발</span>
            </button>
            <button onClick={() => updateVolatility(5)} className="text-xs py-2 rounded bg-red-50 hover:bg-red-100 border border-red-300 text-up">
              5.0%<br/><span className="text-[10px]">💥 이벤트</span>
            </button>
          </div>
          
          {/* 컨트롤 버튼 */}
          <div className="flex gap-2">
            <button 
              onClick={toggleFluctuation}
              className={`flex-1 py-2 rounded text-sm font-semibold ${
                fluctuationEnabled 
                  ? 'bg-stone-100 text-stone hover:bg-stone-200'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {fluctuationEnabled ? '⏸️ 일시정지' : '▶️ 재개'}
            </button>
            <button 
              onClick={forceTick}
              className="flex-1 py-2 rounded text-sm font-semibold bg-gold-500 text-white hover:bg-gold-600"
            >
              ⚡ 즉시 변동
            </button>
          </div>
          
          <p className="text-[11px] text-stone leading-relaxed">
            💡 변동폭은 1분마다 적용됩니다. 활발(3%) 이상은 학생들이 어지러울 수 있어요. 
            <br/>이벤트(5%)는 깜짝 이벤트 시에만 사용 권장!
          </p>
        </div>
      </div>

      {/* 종목 목록 */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-gold-500/20">
          <h3 className="font-display text-lg">📊 종목 관리 ({list.length}개)</h3>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn-gold py-1.5 px-3 rounded text-sm"
          >
            {showCreate ? '✕ 취소' : '+ 새 종목'}
          </button>
        </div>

        {/* 종목 생성 폼 */}
        {showCreate && (
          <div className="p-4 bg-gold-50/30 border-b border-gold-500/20 space-y-3">
            <h4 className="font-semibold text-sm">✨ 새 종목 만들기</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                placeholder="종목코드 (예: HALL)"
                value={createForm.symbol}
                onChange={e => setCreateForm({ ...createForm, symbol: e.target.value.toUpperCase() })}
                className="input-field num-display"
                maxLength="6"
              />
              <input
                placeholder="종목명 (예: 한류엔터)"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                className="input-field"
              />
              <input
                placeholder="섹터 (예: 엔터테인먼트)"
                value={createForm.sector}
                onChange={e => setCreateForm({ ...createForm, sector: e.target.value })}
                className="input-field"
              />
              <input
                type="number"
                placeholder="초기 가격 (원)"
                value={createForm.initial_price}
                onChange={e => setCreateForm({ ...createForm, initial_price: e.target.value })}
                className="input-field num-display"
                step="100"
                min="100"
              />
            </div>
            <textarea
              placeholder="종목 설명 (선택)"
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              className="input-field"
              rows="2"
            />
            <button 
              onClick={createStock} 
              disabled={busy}
              className="btn-gold w-full py-2 rounded text-sm font-semibold"
            >
              {busy ? '생성 중...' : '✨ 종목 생성'}
            </button>
          </div>
        )}

        {/* 종목 카드 그리드 (모바일 친화) */}
        <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map(s => {
            const rate = s.previous_price
              ? ((s.current_price - s.previous_price) / s.previous_price) * 100
              : 0
            const isEditing = editingInfo === s.id
            const quickPrices = [-5, -1, +1, +5]  // 퍼센트 빠른 조정

            return (
              <div 
                key={s.id} 
                className="rounded-xl border border-gold-500/20 bg-white p-4 shadow-sm"
              >
                {isEditing ? (
                  /* ===== 정보 수정 모드 ===== */
                  <div className="space-y-2">
                    <div className="text-xs text-stone uppercase tracking-wider mb-1">종목 정보 수정</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={infoEdit.symbol}
                        onChange={e => setInfoEdit({...infoEdit, symbol: e.target.value.toUpperCase()})}
                        className="input-field num-display text-sm py-2"
                        placeholder="코드"
                        maxLength="6"
                      />
                      <input
                        value={infoEdit.sector}
                        onChange={e => setInfoEdit({...infoEdit, sector: e.target.value})}
                        className="input-field text-sm py-2"
                        placeholder="섹터"
                      />
                    </div>
                    <input
                      value={infoEdit.name}
                      onChange={e => setInfoEdit({...infoEdit, name: e.target.value})}
                      className="input-field text-sm py-2 w-full"
                      placeholder="종목명"
                    />
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => saveInfo(s)} 
                        disabled={busy}
                        className="flex-1 py-2 rounded-lg bg-gold-500 text-white text-sm font-semibold"
                      >
                        💾 저장
                      </button>
                      <button 
                        onClick={() => setEditingInfo(null)} 
                        className="flex-1 py-2 rounded-lg bg-stone-100 text-stone text-sm font-semibold"
                      >
                        ✕ 취소
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ===== 일반 모드 ===== */
                  <>
                    {/* 헤더: 종목명 + 현재가 */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-base sm:text-lg truncate">{s.name}</div>
                        <div className="text-xs text-stone mt-0.5">
                          <span className="num-display">{s.symbol}</span>
                          {s.sector && <span> · {s.sector}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="num-display text-lg font-bold">{formatKRW(s.current_price)}</div>
                        <div className={`text-xs font-semibold ${rate > 0 ? 'text-up' : rate < 0 ? 'text-down' : 'text-stone'}`}>
                          {rate >= 0 ? '▲' : '▼'} {Math.abs(rate).toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* 빠른 % 조정 버튼 */}
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {quickPrices.map(pct => {
                        const newP = Math.round(s.current_price * (1 + pct/100) / 10) * 10
                        return (
                          <button
                            key={pct}
                            onClick={() => savePriceDirect(s, newP)}
                            className={`py-2 rounded-lg text-xs font-semibold border ${
                              pct > 0 
                                ? 'bg-red-50 text-up border-red-200 hover:bg-red-100' 
                                : 'bg-blue-50 text-down border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            {pct > 0 ? '+' : ''}{pct}%
                          </button>
                        )
                      })}
                    </div>

                    {/* 직접 가격 입력 (큰 입력창) */}
                    <div className="flex gap-2 mb-3">
                      <NumberInput
                        value={edits[s.id] || ''}
                        onChange={(v) => setEdits({ ...edits, [s.id]: v })}
                        placeholder="직접 입력 (원)"
                        className="text-base py-2.5 flex-1"
                      />
                      <button 
                        onClick={() => savePrice(s)} 
                        className="btn-gold py-2.5 px-4 rounded-lg text-sm font-semibold whitespace-nowrap"
                      >
                        💰 변경
                      </button>
                    </div>

                    {/* 정보 수정 / 삭제 */}
                    <div className="flex gap-2 pt-2 border-t border-gold-500/10">
                      <button 
                        onClick={() => startEditInfo(s)} 
                        className="flex-1 py-1.5 rounded-lg text-xs bg-gold-50 text-gold-700 border border-gold-500/20 hover:bg-gold-100"
                      >
                        ✏️ 정보 수정
                      </button>
                      <button 
                        onClick={() => deleteStock(s)} 
                        className="flex-1 py-1.5 rounded-lg text-xs bg-red-50 text-up border border-red-200 hover:bg-red-100"
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
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

/* ============================================================= */
/* 🎰 룰렛 이벤트 관리 (v21 복구)                                  */
/* ============================================================= */
function RouletteAdmin() {
  const [activeEvent, setActiveEvent] = useState(null)
  const [stats, setStats] = useState(null)
  const [busy, setBusy] = useState(false)

  const [title, setTitle] = useState('🎰 깜짝 룰렛 이벤트!')
  const [prize1, setPrize1] = useState(50000)
  const [prize2, setPrize2] = useState(100000)
  const [prize3, setPrize3] = useState(200000)
  const [prize4, setPrize4] = useState(400000)
  const [maxSpins, setMaxSpins] = useState(1)
  const [entryCost, setEntryCost] = useState(0)
  const [duration, setDuration] = useState(10)

  const loadActive = async () => {
    const { data } = await supabase.rpc('get_active_roulette')
    setActiveEvent(data?.[0] || null)
  }

  const loadStats = async (eventId) => {
    if (!eventId) { setStats(null); return }
    const { data } = await supabase.rpc('admin_get_roulette_stats', { p_event_id: eventId })
    setStats(data)
  }

  useEffect(() => {
    loadActive()
    const interval = setInterval(loadActive, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeEvent) loadStats(activeEvent.id)
    else setStats(null)
  }, [activeEvent])

  const startRoulette = async () => {
    if (!prize1 || !prize2 || !prize3 || !prize4) return alert('모든 금액을 입력해주세요')
    if (prize1 < 0 || prize2 < 0 || prize3 < 0 || prize4 < 0) return alert('금액은 0 이상이어야 합니다')

    if (!confirm(
      `룰렛 이벤트를 시작할까요?\n\n` +
      `상금: ${formatKRW(prize1)} / ${formatKRW(prize2)} / ${formatKRW(prize3)} / ${formatKRW(prize4)}\n` +
      `참여 횟수: ${maxSpins}회\n` +
      `참여 비용: ${entryCost > 0 ? formatKRW(entryCost) + '원' : '무료'}\n` +
      `활성 시간: ${duration}분`
    )) return

    setBusy(true)
    try {
      const { error } = await supabase.rpc('admin_create_roulette', {
        p_prize_1: Number(prize1),
        p_prize_2: Number(prize2),
        p_prize_3: Number(prize3),
        p_prize_4: Number(prize4),
        p_max_spins: Number(maxSpins),
        p_entry_cost: Number(entryCost),
        p_duration_minutes: Number(duration),
        p_title: title || '🎰 룰렛 이벤트'
      })
      if (error) throw error
      alert('🎰 룰렛 이벤트 시작!')
      loadActive()
    } catch (e) {
      alert('시작 실패: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const endRoulette = async () => {
    if (!activeEvent) return
    if (!confirm('진행 중인 룰렛을 즉시 종료할까요?')) return
    try {
      await supabase.rpc('admin_end_roulette', { p_event_id: activeEvent.id })
      loadActive()
      alert('룰렛이 종료되었습니다')
    } catch (e) {
      alert('종료 실패: ' + e.message)
    }
  }

  return (
    <div className="space-y-4">
      {activeEvent && (
        <div className="card p-5 bg-gradient-to-br from-gold-50/70 to-amber-50/50 border-2 border-gold-500/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg">{activeEvent.title}</h3>
              <p className="text-xs text-stone mt-1">
                종료 예정: {new Date(activeEvent.ends_at).toLocaleString('ko-KR')}
              </p>
            </div>
            <span className="badge-live text-[10px]">진행 중</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <RoulettePrizeSlot num={1} prize={activeEvent.prize_1} count={stats?.slot_1_count || 0} />
            <RoulettePrizeSlot num={2} prize={activeEvent.prize_2} count={stats?.slot_2_count || 0} />
            <RoulettePrizeSlot num={3} prize={activeEvent.prize_3} count={stats?.slot_3_count || 0} />
            <RoulettePrizeSlot num={4} prize={activeEvent.prize_4} count={stats?.slot_4_count || 0} />
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-white/60 rounded p-2">
                <div className="text-[10px] text-stone uppercase">참여자</div>
                <div className="num-display font-bold">{stats.participants}명</div>
              </div>
              <div className="bg-white/60 rounded p-2">
                <div className="text-[10px] text-stone uppercase">총 참여</div>
                <div className="num-display font-bold">{stats.total_spins}회</div>
              </div>
              <div className="bg-white/60 rounded p-2">
                <div className="text-[10px] text-stone uppercase">순 지급</div>
                <div className="num-display font-bold text-gold-700">{formatKRW(stats.net_distributed)}</div>
              </div>
            </div>
          )}

          <button onClick={endRoulette} className="w-full py-2 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold">
            ⏹️ 즉시 종료
          </button>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg">🎰 새 룰렛 이벤트 만들기</h3>
          {activeEvent && (
            <span className="text-xs text-stone bg-stone-100 px-2 py-1 rounded">
              새로 만들면 기존 이벤트 자동 종료
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-stone uppercase tracking-wider mb-1">이벤트 제목</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="🎰 깜짝 룰렛 이벤트!" />
          </div>

          <div>
            <label className="block text-xs text-stone uppercase tracking-wider mb-2">4칸 상금 (균등 25% 확률)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <RoulettePrizeInput num={1} value={prize1} onChange={setPrize1} />
              <RoulettePrizeInput num={2} value={prize2} onChange={setPrize2} />
              <RoulettePrizeInput num={3} value={prize3} onChange={setPrize3} />
              <RoulettePrizeInput num={4} value={prize4} onChange={setPrize4} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-stone uppercase tracking-wider mb-1">참여 횟수</label>
              <NumberInput value={maxSpins} onChange={setMaxSpins} className="num-display" />
            </div>
            <div>
              <label className="block text-xs text-stone uppercase tracking-wider mb-1">참여 비용 (원)</label>
              <NumberInput value={entryCost} onChange={setEntryCost} placeholder="0 = 무료" className="num-display" />
            </div>
            <div>
              <label className="block text-xs text-stone uppercase tracking-wider mb-1">활성 시간 (분)</label>
              <NumberInput value={duration} onChange={setDuration} className="num-display" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-stone uppercase tracking-wider mb-2">빠른 설정</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { setPrize1(50000); setPrize2(100000); setPrize3(200000); setPrize4(400000); }}
                className="text-xs py-2 rounded bg-gold-50 hover:bg-gold-100 border border-gold-500/20">
                💰 표준<br/><span className="text-[10px] text-stone">5/10/20/40만</span>
              </button>
              <button onClick={() => { setPrize1(10000); setPrize2(50000); setPrize3(100000); setPrize4(200000); }}
                className="text-xs py-2 rounded bg-gold-50 hover:bg-gold-100 border border-gold-500/20">
                🪙 작게<br/><span className="text-[10px] text-stone">1/5/10/20만</span>
              </button>
              <button onClick={() => { setPrize1(100000); setPrize2(300000); setPrize3(500000); setPrize4(1000000); }}
                className="text-xs py-2 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-up">
                🎆 크게<br/><span className="text-[10px]">10/30/50/100만</span>
              </button>
            </div>
          </div>

          <button onClick={startRoulette} disabled={busy} className="btn-gold w-full py-3 rounded font-bold">
            {busy ? '시작 중...' : '🎰 룰렛 이벤트 시작!'}
          </button>
        </div>
      </div>

      <div className="card p-4 bg-stone-50/50">
        <p className="text-xs text-stone leading-relaxed">
          💡 <strong>룰렛 안내</strong><br/>
          - 학생들에게 자동 알림 전송<br/>
          - 4칸 균등 확률 (각 25%)<br/>
          - 학생은 거래소에서 참여<br/>
          - 활성 시간 동안만 참여 가능, 자동 종료<br/>
          - 참여 비용 설정 시 학생 잔액에서 차감
        </p>
      </div>
    </div>
  )
}

function RoulettePrizeInput({ num, value, onChange }) {
  return (
    <div>
      <div className="text-[10px] text-stone mb-1">{num}번 칸</div>
      <NumberInput value={value} onChange={onChange} className="num-display" />
    </div>
  )
}

function RoulettePrizeSlot({ num, prize, count }) {
  return (
    <div className="bg-white/80 rounded p-2 text-center">
      <div className="text-[9px] text-stone uppercase">{num}번 칸</div>
      <div className="num-display font-bold text-sm sm:text-base text-gold-700">{formatKRW(prize)}</div>
      <div className="text-[10px] text-stone mt-1">{count}명 당첨</div>
    </div>
  )
}
