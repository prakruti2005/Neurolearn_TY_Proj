// Firebase configuration and initialization
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDDngEE_H_9uMpXGPHZG6qRERT9aDeifWk",
  authDomain: "nuerolearn.firebaseapp.com",
  projectId: "nuerolearn",
  storageBucket: "nuerolearn.firebasestorage.app",
  messagingSenderId: "597132645812",
  appId: "1:597132645812:web:ecd1e6dea42a6c91b90ee1",
  measurementId: "G-CWFBBCFMRD"
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
