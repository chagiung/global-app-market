import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDSAHG179HQzY3c4rb45f6PB4sBrIser3A",
  authDomain: "global-app-42ecd.firebaseapp.com",
  projectId: "global-app-42ecd",
  storageBucket: "global-app-42ecd.firebasestorage.app",
  messagingSenderId: "859817559821",
  appId: "1:859817559821:web:459a746e632131ff67d244",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);