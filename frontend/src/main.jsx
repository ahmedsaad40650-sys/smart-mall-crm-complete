import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/language.css'
import './i18n/config'
import './firebase' // Ensure Firebase is initialized early
import { ThemeProvider } from './components/ThemeProvider'
import { LanguageProvider } from './i18n/LanguageProvider'
import GlobalErrorBoundary from './components/GlobalErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <GlobalErrorBoundary>
    <React.StrictMode>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </React.StrictMode>
  </GlobalErrorBoundary>,
)
