import { Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/login-page'
import { BoardPage } from '@/features/board/board-page'
import { DeliveryPage } from '@/features/delivery/delivery-page'
import { ProjectsPage } from '@/features/projects/projects-page'
import { AgentKeysPage } from '@/features/agent-keys/agent-keys-page'
import { isDemoMode } from '@/lib/runtime'

export function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<LoginPage />} path="/" />
      <Route element={isDemoMode ? <LoginPage /> : <ProjectsPage />} path="/projects" />
      <Route element={<AgentKeysPage />} path="/agent-keys" />
      <Route element={<BoardPage />} path="/projects/:projectID" />
      <Route element={<DeliveryPage />} path="/projects/:projectID/repositories" />
    </Routes>
  )
}
