// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpVCWdASks0pqfvdbbHCjdzJii5vU19J8",
  authDomain: "healthweb-95c11.firebaseapp.com",
  projectId: "healthweb-95c11",
  storageBucket: "healthweb-95c11.firebasestorage.app",
  messagingSenderId: "699762925564",
  appId: "1:699762925564:web:f86c3fa97358babd925c79",
  measurementId: "G-7JV31MTTPD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function getHelplines() {
const snapshot = await getDocs(collection(db, "helplines"));
return snapshot.docs.map(doc => doc.data());
}
