import { useState, useEffect } from 'react'

export default function InstallPWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [platform, setPlatform] = useState(null)

  useEffect(() => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (isStandalone) return

    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (days < 7) return
    }

    const ua = window.navigator.userAgent
    const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
    if (iOS) {
      setPlatform('ios')
      setTimeout(() => setShowPrompt(true), 5000)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform('android')
      setTimeout(() => setShowPrompt(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="pwa-prompt-backdrop" onClick={handleDismiss}>
      <div className="pwa-prompt" onClick={e => e.stopPropagation()}>
        <button onClick={handleDismiss} className="pwa-prompt-close">×</button>

        <div className="text-center">
          <div className="pwa-prompt-icon">📱</div>
          <h3 className="font-display text-lg sm:text-xl text-charcoal mt-2">
            앱처럼 빠르게 사용하세요!
          </h3>
          <p className="text-sm text-stone mt-2">
            홈 화면에 추가하면 더 편리하게 이용할 수 있어요
          </p>
        </div>

        {platform === 'android' && (
          <div className="space-y-3 mt-5">
            <ul className="text-xs text-stone space-y-1.5 bg-gold-50/40 rounded p-3">
              <li>✨ 홈 화면 아이콘으로 빠르게 접속</li>
              <li>⚡ 실시간 알림 받기</li>
              <li>📶 빠른 로딩 속도</li>
            </ul>
            <button
              onClick={handleInstall}
              className="btn-gold w-full py-3 rounded font-semibold"
            >
              📱 홈 화면에 추가
            </button>
            <button
              onClick={handleDismiss}
              className="w-full text-xs text-stone py-1"
            >
              나중에
            </button>
          </div>
        )}

        {platform === 'ios' && (
          <div className="space-y-3 mt-5">
            <div className="bg-gold-50/40 rounded p-3 space-y-2 text-sm text-charcoal">
              <p className="font-semibold mb-2">📲 추가 방법</p>
              <div className="flex items-center gap-2">
                <span className="bg-gold-500/20 text-gold-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span className="text-xs">화면 아래쪽 <b>공유</b> 버튼 <span className="text-base">⤴</span> 누르기</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-gold-500/20 text-gold-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span className="text-xs"><b>홈 화면에 추가</b> 선택 <span className="text-base">📱</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-gold-500/20 text-gold-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span className="text-xs">우측 상단 <b>추가</b> 누르기</span>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="btn-gold w-full py-3 rounded font-semibold"
            >
              알겠어요!
            </button>
            <button
              onClick={handleDismiss}
              className="w-full text-xs text-stone py-1"
            >
              나중에 (7일간 표시 안 함)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
