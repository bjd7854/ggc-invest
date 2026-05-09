import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function LiveNotificationBar() {
  const { currentTournamentId } = useAuth()
  const [notifications, setNotifications] = useState([])

  // 초기 로드: 최근 5분 내 알림
  useEffect(() => {
    if (!currentTournamentId) return
    const load = async () => {
      const { data } = await supabase
        .from('live_notifications')
        .select('*')
        .or(`tournament_id.eq.${currentTournamentId},tournament_id.is.null`)
        .gt('created_at', new Date(Date.now() - 60 * 1000).toISOString())  // 1분 이내만
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (data && data.length > 0) {
        setNotifications(data.map(n => ({ ...n, key: n.id })))
        // 각 알림은 6초 후 자동 제거
        data.forEach(n => {
          setTimeout(() => {
            setNotifications(prev => prev.filter(x => x.id !== n.id))
          }, 6000)
        })
      }
    }
    load()
  }, [currentTournamentId])

  // 실시간 구독: 새 알림이 추가되면 즉시 표시
  const handleNewNotification = useCallback((newNotif) => {
    // 본인 대회 또는 전체 알림(tournament_id is null)만
    if (newNotif.tournament_id && newNotif.tournament_id !== currentTournamentId) return

    setNotifications(prev => {
      // 중복 방지
      if (prev.some(n => n.id === newNotif.id)) return prev
      return [{ ...newNotif, key: newNotif.id }, ...prev].slice(0, 3)
    })

    // 6초 후 자동 제거
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id))
    }, 6000)
  }, [currentTournamentId])

  useEffect(() => {
    if (!currentTournamentId) return

    const channel = supabase
      .channel('live-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_notifications' },
        (payload) => handleNewNotification(payload.new)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentTournamentId, handleNewNotification])

  if (notifications.length === 0) return null

  return (
    <div className="live-notif-container">
      {notifications.map(n => (
        <NotificationCard 
          key={n.key} 
          notification={n} 
          onClose={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
        />
      ))}
    </div>
  )
}

function NotificationCard({ notification, onClose }) {
  const colorMap = {
    jackpot: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
    price_surge: notification.title?.includes('급등') 
      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
    big_profit: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
    news: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    event: 'bg-gradient-to-r from-gold-500 to-amber-500 text-white',
  }
  
  const colorClass = colorMap[notification.type] || 'bg-gradient-to-r from-charcoal to-stone-700 text-white'

  return (
    <div className={`live-notif ${colorClass} fade-up-slide`}>
      <span className="text-xl shrink-0">{notification.emoji || '📢'}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{notification.title}</div>
        <div className="text-xs opacity-90 truncate">{notification.message}</div>
      </div>
      <button 
        onClick={onClose}
        className="opacity-70 hover:opacity-100 px-2 text-lg leading-none shrink-0"
      >
        ×
      </button>
    </div>
  )
}
