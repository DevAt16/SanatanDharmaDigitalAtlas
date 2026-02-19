import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const initializeAnalytics = () => {
  const gaId = import.meta.env.VITE_GA_ID
  if (!gaId || typeof window === 'undefined') {
    return
  }

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag(...args) {
    window.dataLayer.push(args)
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(script)

  window.gtag('js', new Date())
  window.gtag('config', gaId)
}

initializeAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
