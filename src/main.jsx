import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { TournamentProvider } from './context/TournamentContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TournamentProvider>
        <App />
      </TournamentProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
