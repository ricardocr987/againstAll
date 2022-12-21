import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = { 
    projectId: 'againstall-6f76d',
    databaseURL: 'https://againstall-6f76d.firebaseio.com/' 
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const functions = getFunctions(app);

export { firestore, functions };
