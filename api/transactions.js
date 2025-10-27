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
    console.log('Transactions API called:', req.method, req.url, req.query);
    
    if (req.method === 'GET') {
      const { userId, type, limit } = req.query;
      
      console.log('Fetching transactions from Firestore for user:', userId, 'type:', type, 'limit:', limit);
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Build Firestore query
      let transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      // Add type filter if specified
      if (type) {
        transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          where('type', '==', type),
          orderBy('timestamp', 'desc')
        );
      }
      
      // Add limit if specified
      const limitNum = parseInt(limit) || 100;
      if (limitNum < 1000) {
        transactionsQuery = query(transactionsQuery, limit(limitNum));
      }
      
      const querySnapshot = await getDocs(transactionsQuery);
      const transactions = [];
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        transactions.push({
          _id: doc.id,
          ...docData,
          // Ensure timestamp is properly formatted
          timestamp: docData.timestamp?.toDate ? docData.timestamp.toDate() : docData.timestamp
        });
      });
      
      console.log('Found transactions in Firestore:', transactions.length);
      res.status(200).json(transactions);
    } else if (req.method === 'POST') {
      console.log('🔧 Creating transaction in Firestore');
      const transactionData = req.body;
      console.log('🔧 Transaction data received:', transactionData);
      console.log('🔧 Firebase config check:', {
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        hasApiKey: !!process.env.VITE_FIREBASE_API_KEY,
        hasAuthDomain: !!process.env.VITE_FIREBASE_AUTH_DOMAIN
      });
      
      try {
        // Add transaction to Firestore
        const docRef = await addDoc(collection(db, 'transactions'), {
          ...transactionData,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Also add to history collection
        const historyRef = await addDoc(collection(db, 'history'), {
          ...transactionData,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ Transaction created in Firestore with ID:', docRef.id);
        console.log('✅ History entry created with ID:', historyRef.id);
        res.status(200).json({ 
          success: true, 
          transactionId: docRef.id,
          historyId: historyRef.id,
          message: 'Transaction and history entry created successfully'
        });
      } catch (firebaseError) {
        console.error('❌ Error creating transaction in Firestore:', firebaseError);
        console.error('❌ Firebase error details:', {
          code: firebaseError.code,
          message: firebaseError.message,
          stack: firebaseError.stack
        });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to create transaction',
          details: firebaseError.message,
          code: firebaseError.code
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
      console.log('Firebase error, returning empty transactions array');
      res.status(200).json([]);
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}
