import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import { AppProviders } from '@/app/providers'
import { initializeTheme } from '@/theme'
import '@/index.css'

initializeTheme()

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>,
)
