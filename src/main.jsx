import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './themes/cv-light-theme.css'
import './themes/cv-dark-theme.css'
import './themes/light-overrides.css'
import './themes/dark-overrides.css'
import './themes/typography-overrides.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
