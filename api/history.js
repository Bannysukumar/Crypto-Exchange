import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAVopTBDSikDCHqEnljBMfk6ml-rewiSE",
  authDomain: "cryptopay-e04c3.firebaseapp.com",
  databaseURL: "https://cryptopay-e04c3-default-rtdb.firebaseio.com",
  projectId: "cryptopay-e04c3",
  storageBucket: "cryptopay-e04c3.firebasestorage.app",
  messagingSenderId: "935827653972",
  appId: "1:935827653972:web:7c2f3c14f4c6d57345f4c1",
  measurementId: "G-L7DXEYRW49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  console.log('🚀 HISTORY API CALLED:', req.method, req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('🔍 History API called:', req.method, req.url, req.query);
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 History API is working!');
    
    if (req.method === 'GET') {
      const { userId, type, limit } = req.query;
      
      console.log('🔍 Fetching history from Firestore for user:', userId, 'type:', type, 'limit:', limit);
      console.log('🔍 Firebase config:', firebaseConfig);
      console.log('🔍 Database instance:', db);
      
      // Test endpoint - return simple response
      if (req.url === '/api/history/test') {
        console.log('🔍 Test endpoint called');
        return res.status(200).json({ 
          message: 'History API is working!', 
          timestamp: new Date().toISOString(),
          userId: userId || 'no-user-id'
        });
      }
      
      // Debug endpoint - return collection stats
      if (req.url === '/api/history/debug') {
        console.log('🔍 Debug endpoint called');
        
        try {
          // Get all history documents
          const allHistoryQuery = query(collection(db, 'history'));
          const allHistorySnapshot = await getDocs(allHistoryQuery);
          
          // Get all transaction documents  
          const allTransactionsQuery = query(collection(db, 'transactions'));
          const allTransactionsSnapshot = await getDocs(allTransactionsQuery);
          
          const historyDocs = [];
          allHistorySnapshot.forEach((doc) => {
            historyDocs.push({
              id: doc.id,
              data: doc.data()
            });
          });
          
          const transactionDocs = [];
          allTransactionsSnapshot.forEach((doc) => {
            transactionDocs.push({
              id: doc.id,
              data: doc.data()
            });
          });
          
          return res.status(200).json({
            message: 'Debug info',
            historyCollection: {
              totalDocs: allHistorySnapshot.size,
              docs: historyDocs
            },
            transactionsCollection: {
              totalDocs: allTransactionsSnapshot.size,
              docs: transactionDocs
            }
          });
        } catch (error) {
          return res.status(500).json({
            error: 'Debug failed',
            message: error.message
          });
        }
      }
      
      
      if (!userId) {
        console.log('❌ No userId provided');
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Build Firestore query for history collection
      let historyQuery = query(
        collection(db, 'history'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      // Add type filter if specified
      if (type) {
        historyQuery = query(
          collection(db, 'history'),
          where('userId', '==', userId),
          where('type', '==', type),
          orderBy('timestamp', 'desc')
        );
      }
      
      // Add limit if specified
      const limitNum = parseInt(limit) || 100;
      if (limitNum < 1000) {
        historyQuery = query(historyQuery, limit(limitNum));
      }
      
      console.log('🔍 Executing Firestore query...');
      console.log('🔍 Query details:', {
        collection: 'history',
        userId: userId,
        type: type,
        limit: limitNum
      });
      
      // First, let's check if there's any data in the history collection at all
      console.log('🔍 Checking if history collection has any data...');
      const allHistoryQuery = query(collection(db, 'history'));
      const allHistorySnapshot = await getDocs(allHistoryQuery);
      console.log('🔍 Total documents in history collection:', allHistorySnapshot.size);
      
      if (allHistorySnapshot.size > 0) {
        console.log('🔍 Sample history documents:');
        allHistorySnapshot.forEach((doc, index) => {
          if (index < 3) { // Show first 3 documents
            console.log(`🔍 Document ${index}:`, doc.id, doc.data());
          }
        });
      }
      
      // Also check transactions collection
      console.log('🔍 Checking transactions collection...');
      const allTransactionsQuery = query(collection(db, 'transactions'));
      const allTransactionsSnapshot = await getDocs(allTransactionsQuery);
      console.log('🔍 Total documents in transactions collection:', allTransactionsSnapshot.size);
      
      if (allTransactionsSnapshot.size > 0) {
        console.log('🔍 Sample transaction documents:');
        allTransactionsSnapshot.forEach((doc, index) => {
          if (index < 3) { // Show first 3 documents
            console.log(`🔍 Transaction ${index}:`, doc.id, doc.data());
          }
        });
      }
      
      const querySnapshot = await getDocs(historyQuery);
      console.log('🔍 Query snapshot size:', querySnapshot.size);
      console.log('🔍 Query snapshot empty:', querySnapshot.empty);
      
      const history = [];
      
      querySnapshot.forEach((doc) => {
        console.log('🔍 Processing history document:', doc.id, doc.data());
        const docData = doc.data();
        history.push({
          _id: doc.id,
          ...docData,
          // Ensure timestamp is properly formatted
          timestamp: docData.timestamp?.toDate ? docData.timestamp.toDate() : docData.timestamp
        });
      });
      
      console.log('✅ Found history entries in Firestore:', history.length);
      console.log('✅ History entries:', history);
      
      // If no history found, try to get from transactions collection as fallback
      if (history.length === 0) {
        console.log('🔍 No history found, checking transactions collection as fallback...');
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc')
        );
        
        const transactionsSnapshot = await getDocs(transactionsQuery);
        console.log('🔍 Transactions snapshot size:', transactionsSnapshot.size);
        
        const fallbackHistory = [];
        transactionsSnapshot.forEach((doc) => {
          console.log('🔍 Processing transaction document for history:', doc.id, doc.data());
          const docData = doc.data();
          fallbackHistory.push({
            _id: doc.id,
            ...docData,
            timestamp: docData.timestamp?.toDate ? docData.timestamp.toDate() : docData.timestamp
          });
        });
        
        console.log('✅ Found fallback history from transactions:', fallbackHistory.length);
        res.status(200).json(fallbackHistory);
        return;
      }
      
      res.status(200).json(history);
    } else if (req.method === 'POST') {
      console.log('🔧 Creating history entry in Firestore');
      const historyData = req.body;
      console.log('🔧 History data received:', historyData);
      
      try {
        // Add history entry to Firestore
        const docRef = await addDoc(collection(db, 'history'), {
          ...historyData,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ History entry created in Firestore with ID:', docRef.id);
        res.status(200).json({ 
          success: true, 
          historyId: docRef.id,
          message: 'History entry created successfully'
        });
      } catch (firebaseError) {
        console.error('❌ Error creating history entry in Firestore:', firebaseError);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to create history entry',
          details: firebaseError.message
        });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error:', error);
    
    // If Firebase fails completely, return empty array to prevent 500
    if (req.method === 'GET') {
      console.log('Firebase error, returning empty history array');
      res.status(200).json([]);
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}
