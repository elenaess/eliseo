import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBfqU5wDCrTcQQ6s8Q8Skiy5mwK92Fj4sg",
  authDomain: "eliseeo.firebaseapp.com",
  projectId: "eliseeo",
  storageBucket: "eliseeo.firebasestorage.app",
  messagingSenderId: "205610214409",
  appId: "1:205610214409:web:7ca5ea4553f6a6d75f44d8"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);