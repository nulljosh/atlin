import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { FiltersProvider } from './context/FiltersContext'
import { PlaceProvider } from './context/PlaceContext'
import { I18nProvider } from './i18n'
import './styles/index.css'
import { migrateStorage } from './lib/migrateStorage'

migrateStorage()


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <FavoritesProvider>
            <PlaceProvider>
              <FiltersProvider>
                <App />
              </FiltersProvider>
            </PlaceProvider>
          </FavoritesProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
)
