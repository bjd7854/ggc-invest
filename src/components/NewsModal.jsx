export default function NewsModal({ news, onClose, remaining = 0 }) {
  // 제목 없는 슬롯은 표시 안 함
  if (!news || news.title === '(뉴스 미정)') return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell news-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="badge-live">NEWS</span>
            <span className="text-xs text-stone tracking-wider uppercase">속보</span>
          </div>
          <button onClick={onClose} className="btn-ghost px-2 py-0.5 rounded text-2xl leading-none">×</button>
        </div>

        <div className="modal-body space-y-4">
          <h2 className="font-display text-xl sm:text-2xl">{news.title}</h2>
          {news.content && <p className="text-sm leading-relaxed text-charcoal">{news.content}</p>}

          {news.impacts && news.impacts.length > 0 && (
            <div className="bg-gold-50/60 border border-gold-500/20 rounded p-4">
              <div className="text-xs tracking-wider text-gold-700 uppercase mb-3">💡 관련 종목</div>
              <div className="space-y-2">
                {news.impacts.map(i => (
                  <div key={i.id} className="flex items-center gap-2">
                    <span className="text-gold-600">·</span>
                    <span className="font-semibold text-sm">{i.stock?.name}</span>
                    <span className="text-xs text-stone">({i.stock?.symbol})</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gold-500/15">
                <p className="text-xs text-charcoal leading-relaxed">
                  🔍 <span className="font-semibold">이 뉴스가 호재일까요, 악재일까요?</span>
                </p>
                <p className="text-xs text-stone mt-1">
                  직접 판단해서 매수/매도를 결정해보세요!
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-gold w-full py-3 rounded">
            확인 {remaining > 0 && `(${remaining}개 더 있어요)`}
          </button>
        </div>
      </div>
    </div>
  )
}
