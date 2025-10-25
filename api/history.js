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
    console.log('History API called:', req.method, req.url, req.query);
    
    if (req.method === 'GET') {
      const { userId, type, limit } = req.query;
      
      console.log('Fetching history from Firestore for user:', userId, 'type:', type, 'limit:', limit);
      
      if (!userId) {
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
      
      const querySnapshot = await getDocs(historyQuery);
      const history = [];
      
      querySnapshot.forEach((doc) => {
        history.push({
          _id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('Found history entries in Firestore:', history.length);
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
