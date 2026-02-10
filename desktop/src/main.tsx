import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initializeI18n } from './i18n'
import './index.css'

// Load translations before first paint so t() has keys (e.g. LoadingScreen)
initializeI18n(null).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
