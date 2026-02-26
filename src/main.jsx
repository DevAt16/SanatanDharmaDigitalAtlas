import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const getOrCreateUid = () => {
  try {
    const stored = localStorage.getItem('jbn-uid')
    if (stored) return stored
    const uid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('jbn-uid', uid)
    return uid
  } catch {
    return null
  }
}

const initializeAnalytics = () => {
  const gaId = import.meta.env.VITE_GA_ID
  if (!gaId || typeof window === 'undefined') {
    return
  }

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag(...args) {
    window.dataLayer.push(args)
  }

  const uid = getOrCreateUid()
  if (uid) window.gtag('set', { user_id: uid })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(script)

  window.gtag('js', new Date())
  window.gtag('config', gaId, {
    user_id: uid || undefined,
    send_page_view: false,
  })
}

initializeAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
