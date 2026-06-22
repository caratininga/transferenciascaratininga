const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = {
  apiKey: "AIzaSyDI1o6y7nRuH4V3HBo1Gfa8FC7Pw41I7nk",
  authDomain: "transferenciascaratininga.firebaseapp.com",
  projectId: "transferenciascaratininga",
  storageBucket: "transferenciascaratininga.firebasestorage.app",
  messagingSenderId: "466468008796",
  appId: "1:466468008796:web:f6a29a0357bb381ac60799"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const productsData = require('./src/productsBase.json');
const catalogItems = productsData
  .filter(p => p['Descrição'] || p['Produto'])
  .map(p => ({
    code: p['Código'] || '-',
    name: p['Descrição'] || p['Produto'],
    group: p['Grupo'] || 'SEM GRUPO'
  }));

async function seed() {
  try {
    await setDoc(doc(db, 'catalog', 'main'), {
      products: catalogItems,
      updatedAt: new Date().toISOString()
    });
    console.log(`Success! ${catalogItems.length} products uploaded to catalog/main`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seed();
