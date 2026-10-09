import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAvbWQbbWfRMUMWNX7vF3EdCKhQmLSRbLY",
  authDomain: "algohub-bot-2026.firebaseapp.com",
  projectId: "algohub-bot-2026",
  storageBucket: "algohub-bot-2026.firebasestorage.app",
  messagingSenderId: "640100629013",
  appId: "1:640100629013:web:949049c50895d69687ec1c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and set local persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Firebase persistence error:", err);
});

// Initialize Cloud Firestore database
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
};
