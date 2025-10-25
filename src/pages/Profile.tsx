import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { useCryptoPrices } from '../contexts/CryptoPriceContext'
import { TransactionService } from '../services/transactions'
import { updateProfile } from 'firebase/auth'
import toast from 'react-hot-toast'

const Profile: React.FC = () => {
  const [editMode, setEditMode] = useState(false)
  const [profileData, setProfileData] = useState({
    displayName: '',
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTransfers: 0,
    accountAge: 0
  })

  const { currentUser, userProfile, logout, updateUserProfile } = useAuth()
  const { account, isConnected, connectWallet, disconnectWallet, getNetworkStatus } = useWeb3()
  const { convertToINR } = useCryptoPrices()
  const navigate = useNavigate()

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }

    if (userProfile) {
      setProfileData({
        displayName: currentUser.displayName || '',
        name: userProfile.name || '',
        email: userProfile.email || currentUser.email || '',
        phone: userProfile.phone || '',
        address: userProfile.address || ''
      })
    }

    loadUserStats()
  }, [currentUser, userProfile, navigate])

  const loadUserStats = async () => {
    if (!currentUser) return

    try {
      const transactions = await TransactionService.getUserTransactions(currentUser.uid, undefined, 1000)
      
      const deposits = transactions.filter(t => t.type === 'deposit').length
      const withdrawals = transactions.filter(t => t.type === 'withdrawal').length
      const transfers = transactions.filter(t => t.type === 'transfer').length
      
      const accountAge = currentUser.metadata.creationTime 
        ? Math.floor((Date.now() - new Date(currentUser.metadata.creationTime).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      setStats({
        totalDeposits: deposits,
        totalWithdrawals: withdrawals,
        totalTransfers: transfers,
        accountAge
      })
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const handleSaveProfile = async () => {
    if (!currentUser || !userProfile) {
      toast.error('User not found')
      return
    }

    try {
      setLoading(true)

      // Update Firebase Auth profile
      if (profileData.displayName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: profileData.displayName
        })
      }

      // Update Firebase profile using AuthContext
      await updateUserProfile({
        displayName: profileData.displayName,
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address
      })

      setEditMode(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
      toast.error('Logout failed')
    }
  }

  const getTotalPortfolioValue = () => {
    if (!userProfile) return 0

    const inrValue = userProfile.inrBalance
    const btcValue = convertToINR(userProfile.cryptoBalances.BTC, 'BTC')
    const usdtValue = convertToINR(userProfile.cryptoBalances.USDT, 'USDT')
    const bxcValue = convertToINR(userProfile.cryptoBalances.BXC, 'BXC')

    return inrValue + btcValue + usdtValue + bxcValue
  }

  if (!userProfile) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Profile</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>Manage your account settings and view statistics</p>
        </div>

        <div className="grid grid-cols-3" style={{ gap: '2rem' }}>
          {/* Profile Information */}
          <div style={{ gridColumn: 'span 2' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Personal Information</h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Edit Profile
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      {loading ? 'Saving...' : '💾 Save'}
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Display Name
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Enter your display name"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <p style={{ margin: 0, padding: '0.75rem', background: 'black', borderRadius: '8px' }}>
                      {profileData.displayName || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Full Name
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <p style={{ margin: 0, padding: '0.75rem', background: 'black', borderRadius: '8px' }}>
                      {profileData.name || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Email Address
                  </label>
                  <p style={{ margin: 0, padding: '0.75rem', background: 'black', borderRadius: '8px', color: '#666' }}>
                    {profileData.email}
                    <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>(Cannot be changed)</span>
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Phone Number
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <p style={{ margin: 0, padding: '0.75rem', background: 'black', borderRadius: '8px' }}>
                      {profileData.phone || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Address
                  </label>
                  {editMode ? (
                    <textarea
                      value={profileData.address}
                      onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter your address"
                      rows={3}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  ) : (
                    <p style={{ margin: 0, padding: '0.75rem', background: 'black', borderRadius: '8px' }}>
                      {profileData.address || 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Wallet Connection */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Wallet Connection</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '600' }}>MetaMask Wallet</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                      {isConnected && account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                      Network: {getNetworkStatus()}
                    </p>
                  </div>
                  {isConnected ? (
                    <button
                      onClick={disconnectWallet}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={connectWallet}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Account Actions</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  onClick={() => navigate('/history')}
                  style={{
                    padding: '1rem',
                    background: 'black',
                    color: '#333',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  📊 View Transaction History
                </button>
                
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to logout?')) {
                      handleLogout()
                    }
                  }}
                  style={{
                    padding: '1rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>

          {/* Statistics & Portfolio */}
          <div>
            {/* Portfolio Overview */}
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Portfolio Overview</h3>
              
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>Total Portfolio Value</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#007bff' }}>
                  ₹{getTotalPortfolioValue().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>INR</span>
                  <span style={{ fontWeight: '600' }}>₹{userProfile.inrBalance.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>BTC</span>
                  <span style={{ fontWeight: '600' }}>{userProfile.cryptoBalances.BTC.toFixed(8)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>USDT</span>
                  <span style={{ fontWeight: '600' }}>{userProfile.cryptoBalances.USDT.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>BXC</span>
                  <span style={{ fontWeight: '600' }}>{userProfile.cryptoBalances.BXC.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Account Statistics</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Account Age</span>
                  <span style={{ fontWeight: '600' }}>{stats.accountAge} days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Total Deposits</span>
                  <span style={{ fontWeight: '600' }}>{stats.totalDeposits}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Total Withdrawals</span>
                  <span style={{ fontWeight: '600' }}>{stats.totalWithdrawals}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Total Transfers</span>
                  <span style={{ fontWeight: '600' }}>{stats.totalTransfers}</span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Account Info</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: '#666' }}>User ID:</span>
                  <br />
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{currentUser?.uid}</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Member Since:</span>
                  <br />
                  <span>{currentUser?.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'Unknown'}</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Last Sign In:</span>
                  <br />
                  <span>{currentUser?.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile