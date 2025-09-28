import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Web3Provider } from './contexts/Web3Context'
import { CryptoPriceProvider } from './contexts/CryptoPriceContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Deposit from './pages/Deposit'
import Withdraw from './pages/Withdraw'
import Send from './pages/Send'
import History from './pages/History'
import Profile from './pages/Profile'
import AdminWithdrawals from './pages/AdminWithdrawals'

function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <CryptoPriceProvider>
          <div className="App">
            <Navbar />
            <main>
              <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/deposit" element={
                <ProtectedRoute>
                  <Deposit />
                </ProtectedRoute>
              } />
              <Route path="/withdraw" element={
                <ProtectedRoute>
                  <Withdraw />
                </ProtectedRoute>
              } />
              <Route path="/send" element={
                <ProtectedRoute>
                  <Send />
                </ProtectedRoute>
              } />
              <Route path="/history" element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/admin-withdrawals" element={<AdminWithdrawals />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </CryptoPriceProvider>
      </Web3Provider>
    </AuthProvider>
  )
}

export default App
