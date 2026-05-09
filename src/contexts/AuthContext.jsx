import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const LS_KEY = 'investclass.currentTournamentId'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [currentTournamentId, setCurrentTournamentId] = useState(
    () => localStorage.getItem(LS_KEY) || null
  )
  const [currentParticipant, setCurrentParticipant] = useState(null)  // {virtual_money} etc
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data || null)
  }, [])

  const fetchParticipant = useCallback(async (uid, tid) => {
    if (!uid || !tid) { setCurrentParticipant(null); return }
    const { data } = await supabase
      .from('tournament_participants')
      .select('*, tournament:tournaments(*)')
      .eq('user_id', uid).eq('tournament_id', tid).maybeSingle()
    setCurrentParticipant(data || null)
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const uid = session?.user?.id
      setUser(session?.user ?? null)
      fetchProfile(uid).then(() => {
        if (currentTournamentId && uid) fetchParticipant(uid, currentTournamentId)
        setLoading(false)
      })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      fetchProfile(session?.user?.id)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile])

  useEffect(() => {
    if (user?.id && currentTournamentId) fetchParticipant(user.id, currentTournamentId)
    else setCurrentParticipant(null)
  }, [user, currentTournamentId, fetchParticipant])

  const setTournament = (tid) => {
    if (tid) localStorage.setItem(LS_KEY, tid)
    else localStorage.removeItem(LS_KEY)
    setCurrentTournamentId(tid)
  }

  const signUp = async ({ email, password, name, studentNumber, className, contact, school }) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const uid = data.user?.id
    if (!uid) throw new Error('회원가입에 실패했습니다')
    const { error: pErr } = await supabase.from('profiles').insert({
      id: uid, name, student_number: studentNumber, class_name: className,
      contact, school, role: 'student'
    })
    if (pErr) throw pErr
    await fetchProfile(uid)
  }

  const signIn = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setTournament(null)
  }

  const refreshParticipant = () =>
    user?.id && currentTournamentId && fetchParticipant(user.id, currentTournamentId)

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isAdmin: profile?.role === 'admin',
      currentTournamentId,
      currentTournament: currentParticipant?.tournament || null,
      participantMoney: currentParticipant?.virtual_money || 0,
      signUp, signIn, signOut,
      setTournament, refreshParticipant,
      refreshProfile: () => user?.id && fetchProfile(user.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider 밖에서 useAuth 사용')
  return ctx
}
