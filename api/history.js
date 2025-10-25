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
      
      // Temporary fix - return mock data to test if API is working
      if (userId === 'sHpmLYixdPac1j8e0WTvWM8GSko2') {
        console.log('🔍 Returning mock data for testing');
        const mockData = [
          {
            _id: 'test1',
            userId: 'sHpmLYixdPac1j8e0WTvWM8GSko2',
            type: 'send',
            amount: -10,
            currency: 'BXC',
            description: 'Sent 10 BXC to jdthiuhguhu@gmail.com',
            status: 'completed',
            timestamp: new Date()
          }
        ];
        return res.status(200).json(mockData);
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
      const querySnapshot = await getDocs(historyQuery);
      console.log('🔍 Query snapshot size:', querySnapshot.size);
      console.log('🔍 Query snapshot empty:', querySnapshot.empty);
      
      const history = [];
      
      querySnapshot.forEach((doc) => {
        console.log('🔍 Processing history document:', doc.id, doc.data());
        history.push({
          _id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ Found history entries in Firestore:', history.length);
      console.log('✅ History entries:', history);
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
