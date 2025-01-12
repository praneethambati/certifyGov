import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, getDocs, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDygu3UJ0HDesCZ7ND8uAEiQgFcO03zjgE',
  authDomain: 'certman-acb88.firebaseapp.com',
  projectId: 'certman-acb88',
  storageBucket: 'certman-acb88.appspot.com',
  messagingSenderId: '551254391299',
  appId: '1:551254391299:ios:ac98e11a1b7afa48022c36',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
