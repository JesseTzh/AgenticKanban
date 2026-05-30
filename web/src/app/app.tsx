import { Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/login-page'
import { BoardPage } from '@/features/board/board-page'
import { DeliveryPage } from '@/features/delivery/delivery-page'
import { ProjectsPage } from '@/features/projects/projects-page'

export function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<ProjectsPage />} path="/" />
      <Route element={<BoardPage />} path="/projects/:projectID" />
      <Route element={<DeliveryPage />} path="/projects/:projectID/repositories" />
    </Routes>
  )
}
