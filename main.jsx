import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'vite-plugin-pwa/register'
import App from './App'
import './styles.css'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
