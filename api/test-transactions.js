import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    console.log('🔍 Testing transactions in database...')
    console.log('🔍 Firebase config:', {
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      hasApiKey: !!process.env.VITE_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.VITE_FIREBASE_AUTH_DOMAIN
    })
    
    // Get all documents from both collections
    console.log('🔍 Querying history collection...')
    const historySnapshot = await getDocs(collection(db, 'history'))
    console.log('🔍 History snapshot size:', historySnapshot.size)
    console.log('🔍 History snapshot empty:', historySnapshot.empty)
    
    console.log('🔍 Querying transactions collection...')
    const transactionsSnapshot = await getDocs(collection(db, 'transactions'))
    console.log('🔍 Transactions snapshot size:', transactionsSnapshot.size)
    console.log('🔍 Transactions snapshot empty:', transactionsSnapshot.empty)
    
    const allHistory = []
    const allTransactions = []
    
    console.log('🔍 Processing history documents...')
    historySnapshot.forEach((doc, index) => {
      console.log(`🔍 History doc ${index}:`, doc.id, doc.exists())
      const data = doc.data()
      console.log(`🔍 History doc ${index} data:`, data)
      allHistory.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
      })
    })
    
    console.log('🔍 Processing transaction documents...')
    transactionsSnapshot.forEach((doc, index) => {
      console.log(`🔍 Transaction doc ${index}:`, doc.id, doc.exists())
      const data = doc.data()
      console.log(`🔍 Transaction doc ${index} data:`, data)
      allTransactions.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
      })
    })
    
    console.log('🔍 Total history entries:', allHistory.length)
    console.log('🔍 Total transaction entries:', allTransactions.length)
    console.log('🔍 Sample history entries:', allHistory.slice(0, 3))
    console.log('🔍 Sample transaction entries:', allTransactions.slice(0, 3))
    
    // Group by user ID
    const historyByUser = {}
    const transactionsByUser = {}
    
    allHistory.forEach(entry => {
      if (!historyByUser[entry.userId]) {
        historyByUser[entry.userId] = []
      }
      historyByUser[entry.userId].push(entry)
    })
    
    allTransactions.forEach(entry => {
      if (!transactionsByUser[entry.userId]) {
        transactionsByUser[entry.userId] = []
      }
      transactionsByUser[entry.userId].push(entry)
    })
    
    console.log('🔍 History by user:', Object.keys(historyByUser))
    console.log('🔍 Transactions by user:', Object.keys(transactionsByUser))
    
    res.status(200).json({
      success: true,
      message: 'Database test completed',
      data: {
        totalHistory: allHistory.length,
        totalTransactions: allTransactions.length,
        historyByUser,
        transactionsByUser,
        allHistory: allHistory.slice(0, 5), // First 5 entries
        allTransactions: allTransactions.slice(0, 5) // First 5 entries
      }
    })
    
  } catch (error) {
    console.error('❌ Error testing transactions:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}
