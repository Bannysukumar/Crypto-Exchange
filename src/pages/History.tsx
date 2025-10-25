import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { TransactionService, Transaction } from '../services/transactions'
import { HistoryService, HistoryEntry } from '../services/history'
import toast from 'react-hot-toast'

const History: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const transactionsPerPage = 10
  const [loading, setLoading] = useState(true)

  const [typeFilter, setTypeFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()

  // Test function to create a history entry
  const testCreateHistoryEntry = async () => {
    if (!currentUser) return
    
    try {
      console.log('🔧 Testing history entry creation...')
      
      // Create a test history entry directly via API
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          type: 'deposit',
          amount: 100,
          currency: 'BXC',
          description: 'Test history entry',
          status: 'completed',
          timestamp: new Date()
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Test history entry created:', result)
        toast.success('Test history entry created!')
        await loadTransactions() // Reload to see the new entry
      } else {
        const error = await response.text()
        console.error('❌ Test history entry failed:', error)
        toast.error('Failed to create test history entry: ' + error)
      }
    } catch (error) {
      console.error('❌ Error creating test history entry:', error)
      toast.error('Error creating test history entry')
    }
  }

  const loadTransactions = useCallback(async () => {
    if (!currentUser) {
      navigate('/')
      return
    }
    
    console.log('🔍 History page - Loading history for user:', currentUser.uid)
    setLoading(true)
    
    try {
      console.log('🔍 Calling HistoryService.getUserHistory...')
      const fetchedHistory = await HistoryService.getUserHistory(currentUser.uid, undefined, 100)
      console.log('🔍 Fetched history:', fetchedHistory.length, fetchedHistory)
      
      // Debug: Log each history entry's details
      fetchedHistory.forEach((entry, index) => {
        console.log(`🔍 History entry ${index}:`, {
          id: entry._id,
          type: entry.type,
          amount: entry.amount,
          currency: entry.currency,
          description: entry.description,
          status: entry.status,
          timestamp: entry.timestamp
        })
      })
      
      setTransactions(fetchedHistory)
      setFilteredTransactions(fetchedHistory)
      
      console.log('🔍 History entries set in state:', fetchedHistory.length)
    } catch (error) {
      console.error('❌ Error loading history:', error)
      toast.error('Error loading history')
      setTransactions([])
      setFilteredTransactions([])
    } finally {
      setLoading(false)
    }
  }, [currentUser, navigate])

  useEffect(() => {
    console.log('🔍 History page - useEffect triggered, loading transactions...')
    loadTransactions()
  }, [loadTransactions])

  useEffect(() => {
    applyFilters()
  }, [transactions, typeFilter, currencyFilter, dateRange, statusFilter, searchTerm])

  const applyFilters = () => {
    let tempFiltered = [...transactions]

    // Filter by type
    if (typeFilter) {
      tempFiltered = tempFiltered.filter(t => t.type === typeFilter)
    }

    // Filter by currency
    if (currencyFilter) {
      tempFiltered = tempFiltered.filter(t => t.currency === currencyFilter)
    }

    // Filter by status
    if (statusFilter) {
      tempFiltered = tempFiltered.filter(t => t.status === statusFilter)
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date()
      let startDate = new Date()
      
      switch (dateRange) {
        case '7days':
          startDate.setDate(now.getDate() - 7)
          break
        case '30days':
          startDate.setDate(now.getDate() - 30)
          break
        case '90days':
          startDate.setDate(now.getDate() - 90)
          break
      }
      
      tempFiltered = tempFiltered.filter(t => t.timestamp >= startDate)
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      tempFiltered = tempFiltered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.currency.toLowerCase().includes(searchLower) ||
        t.type.toLowerCase().includes(searchLower)
      )
    }

    setFilteredTransactions(tempFiltered)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setTypeFilter('')
    setCurrencyFilter('')
    setDateRange('all')
    setStatusFilter('')
    setSearchTerm('')
  }

  const getTransactionStats = () => {
    console.log('🔍 Calculating transaction stats from transactions:', transactions.length, transactions)
    
    const deposits = transactions.filter(t => t.type === 'deposit')
    const withdrawals = transactions.filter(t => t.type === 'withdrawal')
    const transfers = transactions.filter(t => t.type === 'transfer')
    
    console.log('🔍 Transaction type breakdown:', {
      deposits: deposits.length,
      withdrawals: withdrawals.length,
      transfers: transfers.length,
      total: transactions.length
    })
    
    const stats = {
      totalTransactions: transactions.length,
      totalDeposits: deposits.length,
      totalWithdrawals: withdrawals.length,
      totalTransfers: transfers.length,
      totalVolume: transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    }
    
    console.log('🔍 Final stats:', stats)
    return stats
  }

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Type', 'Amount', 'Currency', 'Description', 'Status'],
      ...filteredTransactions.map(t => [
        new Date(t.timestamp).toISOString().split('T')[0],
        t.type,
        t.amount.toString(),
        t.currency,
        t.description,
        t.status
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }


  // Pagination
  const indexOfLastTransaction = currentPage * transactionsPerPage
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction)
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage)

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          style={{
            padding: '0.5rem 0.75rem',
            margin: '0 0.25rem',
            background: currentPage === i ? '#007bff' : '#f8f9fa',
            color: currentPage === i ? 'white' : '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {i}
        </button>
      )
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2rem' }}>
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            padding: '0.5rem 0.75rem',
            margin: '0 0.25rem',
            background: '#f8f9fa',
            color: '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.5 : 1
          }}
        >
          Previous
        </button>
        {pages}
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: '0.5rem 0.75rem',
            margin: '0 0.25rem',
            background: '#f8f9fa',
            color: '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.5 : 1
          }}
        >
          Next
        </button>
      </div>
    )
  }

  const renderTransactionRow = (transaction: Transaction) => (
    <div key={transaction.id} style={{
      padding: '1rem',
      border: '1px solid #eee',
      borderRadius: '8px',
      marginBottom: '0.5rem',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr 2fr 1fr',
      gap: '1rem',
      alignItems: 'center'
    }}>
      <div>
        <p style={{ fontWeight: '600', margin: 0, fontSize: '0.9rem' }}>
          {new Date(transaction.timestamp).toLocaleDateString()}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
          {new Date(transaction.timestamp).toLocaleTimeString()}
        </p>
      </div>
      <div>
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: '500',
          background: transaction.type === 'deposit' ? '#d1ecf1' : 
                      transaction.type === 'withdrawal' ? '#f8d7da' : '#fff3cd',
          color: transaction.type === 'deposit' ? '#0c5460' : 
                 transaction.type === 'withdrawal' ? '#721c24' : '#856404'
        }}>
          {transaction.type}
        </span>
      </div>
      <div>
        <p style={{ 
          fontWeight: '600', 
          margin: 0,
          color: transaction.amount < 0 ? '#dc3545' : 
                 transaction.amount > 0 ? '#28a745' : '#333'
        }}>
          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
        </p>
      </div>
      <div>
        <p style={{ fontWeight: '500', margin: 0 }}>{transaction.currency}</p>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>{transaction.description}</p>
      </div>
      <div>
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: '500',
          background: transaction.status === 'completed' ? '#d4edda' : 
                      transaction.status === 'pending' ? '#fff3cd' : '#f8d7da',
          color: transaction.status === 'completed' ? '#155724' : 
                 transaction.status === 'pending' ? '#856404' : '#721c24'
        }}>
          {transaction.status}
        </span>
      </div>
    </div>
  )

  if (!userProfile) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p>Loading profile...</p>
      </div>
    )
  }

  const stats = getTransactionStats()

  return (
    <div style={{ padding: '2rem 0' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Transaction History</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>View and manage all your transactions</p>
        </div>

        {/* Statistics */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Transaction Statistics</h3>
          <div className="grid grid-cols-4" style={{ gap: '1rem' }}>
            <div className="card text-center">
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Total Transactions</span>
              <span style={{ display: 'block', fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#007bff' }}>
                {stats.totalTransactions}
              </span>
            </div>
            <div className="card text-center">
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Deposits</span>
              <span style={{ display: 'block', fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#28a745' }}>
                {stats.totalDeposits}
              </span>
            </div>
            <div className="card text-center">
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Withdrawals</span>
              <span style={{ display: 'block', fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#dc3545' }}>
                {stats.totalWithdrawals}
              </span>
            </div>
            <div className="card text-center">
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Transfers</span>
              <span style={{ display: 'block', fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#ffc107' }}>
                {stats.totalTransfers}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Filters</h3>
          <div className="grid grid-cols-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Transaction Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="transfer">Transfers</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Currency</label>
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">All Currencies</option>
                <option value="INR">INR</option>
                <option value="BTC">BTC</option>
                <option value="USDT">USDT</option>
                <option value="BXC">BXC</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Search</label>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem' }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
              <button
                onClick={exportTransactions}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Export CSV
              </button>
              <button
                onClick={testCreateHistoryEntry}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Test History API
              </button>
            </div>
          </div>
        </div>


        {/* Transaction List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Transactions ({filteredTransactions.length})</h3>
            <p style={{ color: '#666', margin: 0 }}>
              Showing {indexOfFirstTransaction + 1}-{Math.min(indexOfLastTransaction, filteredTransactions.length)} of {filteredTransactions.length}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#666' }}>No transactions found matching your criteria.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 2fr 1fr',
                gap: '1rem',
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                <div>Date</div>
                <div>Type</div>
                <div>Amount</div>
                <div>Currency</div>
                <div>Description</div>
                <div>Status</div>
              </div>

              {/* Transaction Rows */}
              {currentTransactions.map(renderTransactionRow)}

              {/* Pagination */}
              {renderPagination()}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default History