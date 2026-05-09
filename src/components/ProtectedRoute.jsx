import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false, requireTournament = true }) {
  const { user, loading, isAdmin, currentTournamentId } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-stone tracking-widest text-sm">LOADING…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/tournaments" replace />
  if (requireTournament && !currentTournamentId && !adminOnly) {
    return <Navigate to="/tournaments" replace />
  }
  return children
}
