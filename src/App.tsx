import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/index'
import DashboardPage from './pages/dashboard'
import ShoppingPage from './pages/shopping'
import FinancesPage from './pages/finances'
import SettingsPage from './pages/settings'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/finances" element={<FinancesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App