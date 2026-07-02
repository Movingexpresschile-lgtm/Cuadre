import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDT-Sdy0AUQKy_TPoVIWjU_lSA8E_gcnyY",
  authDomain: "rutacuadrada-c671e.firebaseapp.com",
  projectId: "rutacuadrada-c671e",
  storageBucket: "rutacuadrada-c671e.firebasestorage.app",
  messagingSenderId: "148123865949",
  appId: "1:148123865949:web:88f1d1d6ce1cc5cdf14eb4",
  measurementId: "G-FLD8H4F0ZH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Sesión persistente indefinida — solo termina al hacer logout explícito
setPersistence(auth, browserLocalPersistence);
