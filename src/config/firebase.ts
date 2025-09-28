// Firebase Configuration
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDAVopTBDSikDCHqEnljBMfk6ml-rewiSE",
  authDomain: "cryptopay-e04c3.firebaseapp.com",
  projectId: "cryptopay-e04c3",
  storageBucket: "cryptopay-e04c3.firebasestorage.app",
  messagingSenderId: "935827653972",
  appId: "1:935827653972:web:7c2f3c14f4c6d57345f4c1",
  measurementId: "G-L7DXEYRW49"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
