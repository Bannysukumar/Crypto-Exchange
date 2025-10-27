import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'

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
    console.log('🔍 Checking user data in database...')
    
    // Get all unique user IDs from history collection
    const historySnapshot = await getDocs(collection(db, 'history'))
    const userIds = new Set()
    const userTransactions = {}
    
    historySnapshot.forEach((doc) => {
      const data = doc.data()
      const userId = data.userId
      userIds.add(userId)
      
      if (!userTransactions[userId]) {
        userTransactions[userId] = []
      }
      
      userTransactions[userId].push({
        id: doc.id,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
      })
    })
    
    console.log('🔍 Unique user IDs in history:', Array.from(userIds))
    console.log('🔍 Transactions per user:', Object.keys(userTransactions).map(uid => ({
      userId: uid,
      count: userTransactions[uid].length,
      sample: userTransactions[uid][0]
    })))
    
    res.status(200).json({
      success: true,
      message: 'User data check completed',
      data: {
        uniqueUserIds: Array.from(userIds),
        userTransactions: Object.keys(userTransactions).map(uid => ({
          userId: uid,
          count: userTransactions[uid].length,
          sample: userTransactions[uid][0]
        }))
      }
    })
    
  } catch (error) {
    console.error('❌ Error checking user data:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}
