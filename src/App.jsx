import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Tournaments from './pages/Tournaments'
import Dashboard from './pages/Dashboard'
import Trade from './pages/Trade'
import StockDetail from './pages/StockDetail'
import Quiz from './pages/Quiz'
import Ranking from './pages/Ranking'
import Admin from './pages/admin/Admin'
import TournamentCreate from './pages/admin/TournamentCreate'
import NewsEdit from './pages/admin/NewsEdit'
import TemplateEdit from './pages/admin/TemplateEdit'
import QuizEdit from './pages/admin/QuizEdit'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

const WithLayout = ({ children, adminOnly, requireTournament = true }) => (
  <ProtectedRoute adminOnly={adminOnly} requireTournament={requireTournament}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
)

export default function App() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/tournaments" element={<WithLayout requireTournament={false}><Tournaments /></WithLayout>} />
      <Route path="/"          element={<WithLayout><Dashboard /></WithLayout>} />
      <Route path="/trade"     element={<WithLayout><Trade /></WithLayout>} />
      <Route path="/stock/:stockId" element={<WithLayout><StockDetail /></WithLayout>} />
      <Route path="/quiz"      element={<WithLayout><Quiz /></WithLayout>} />
      <Route path="/ranking"   element={<WithLayout><Ranking /></WithLayout>} />
      <Route path="/admin"     element={<WithLayout adminOnly requireTournament={false}><Admin /></WithLayout>} />
      <Route path="/admin/tournament/new" element={<WithLayout adminOnly requireTournament={false}><TournamentCreate /></WithLayout>} />
      <Route path="/admin/news/new" element={<WithLayout adminOnly requireTournament={false}><NewsEdit /></WithLayout>} />
      <Route path="/admin/news/edit/:slotId" element={<WithLayout adminOnly requireTournament={false}><NewsEdit /></WithLayout>} />
      <Route path="/admin/template/new" element={<WithLayout adminOnly requireTournament={false}><TemplateEdit /></WithLayout>} />
      <Route path="/admin/template/edit/:templateId" element={<WithLayout adminOnly requireTournament={false}><TemplateEdit /></WithLayout>} />
      <Route path="/admin/quiz/new" element={<WithLayout adminOnly requireTournament={false}><QuizEdit /></WithLayout>} />
      <Route path="/admin/quiz/edit/:quizId" element={<WithLayout adminOnly requireTournament={false}><QuizEdit /></WithLayout>} />
      <Route path="*"          element={<WithLayout><Dashboard /></WithLayout>} />
    </Routes>
  )
}
