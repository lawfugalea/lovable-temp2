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
      <div className="min-h-screen bg-cozy-bg">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={
            <Layout>
              <DashboardPage />
            </Layout>
          } />
          <Route path="/shopping" element={
            <Layout>
              <ShoppingPage />
            </Layout>
          } />
          <Route path="/finances" element={
            <Layout>
              <FinancesPage />
            </Layout>
          } />
          <Route path="/settings" element={
            <Layout>
              <SettingsPage />
            </Layout>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App