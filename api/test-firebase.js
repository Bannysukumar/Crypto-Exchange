import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore'

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
    console.log('🔍 Testing Firebase connection...')
    console.log('🔍 Firebase config:', {
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      hasApiKey: !!process.env.VITE_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.VITE_FIREBASE_AUTH_DOMAIN,
      hasStorageBucket: !!process.env.VITE_FIREBASE_STORAGE_BUCKET,
      hasMessagingSenderId: !!process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      hasAppId: !!process.env.VITE_FIREBASE_APP_ID
    })
    
    // Test basic Firebase connection
    console.log('🔍 Testing basic Firebase connection...')
    const testCollection = collection(db, 'history')
    console.log('🔍 Test collection created:', testCollection.path)
    
    // Try to get a specific document that we know exists
    console.log('🔍 Trying to get a specific document...')
    const testDoc = doc(db, 'history', '03oZxNXoVq60v2mxsn4u')
    const testDocSnapshot = await getDoc(testDoc)
    console.log('🔍 Test document exists:', testDocSnapshot.exists())
    console.log('🔍 Test document data:', testDocSnapshot.data())
    
    // Try to get all documents
    console.log('🔍 Trying to get all documents from history collection...')
    const allDocsSnapshot = await getDocs(collection(db, 'history'))
    console.log('🔍 All docs snapshot size:', allDocsSnapshot.size)
    console.log('🔍 All docs snapshot empty:', allDocsSnapshot.empty)
    
    // Get first few documents
    const firstFewDocs = []
    allDocsSnapshot.forEach((doc, index) => {
      if (index < 3) {
        firstFewDocs.push({
          id: doc.id,
          exists: doc.exists(),
          data: doc.data()
        })
      }
    })
    
    res.status(200).json({
      success: true,
      message: 'Firebase connection test completed',
      data: {
        config: {
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
          hasApiKey: !!process.env.VITE_FIREBASE_API_KEY,
          hasAuthDomain: !!process.env.VITE_FIREBASE_AUTH_DOMAIN
        },
        testDocument: {
          exists: testDocSnapshot.exists(),
          data: testDocSnapshot.data()
        },
        allDocuments: {
          size: allDocsSnapshot.size,
          empty: allDocsSnapshot.empty,
          firstFew: firstFewDocs
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Error testing Firebase:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      stack: error.stack
    })
  }
}
