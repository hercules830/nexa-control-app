// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Reemplaza el siguiente objeto con la configuración de tu proyecto de Firebase
// que obtuviste en la consola.
const firebaseConfig = {
    apiKey: "AIzaSyAlErON-GjYwiEjto2hysdnW_u-5kSa-Cg",
    authDomain: "nexa-control-negocio.firebaseapp.com",
    projectId: "nexa-control-negocio",
    storageBucket: "nexa-control-negocio.firebasestorage.app",
    messagingSenderId: "588281017340",
    appId: "1:588281017340:web:aa5d8c408e5be276f37879"
  };

// Inicializamos la aplicación de Firebase
const app = initializeApp(firebaseConfig);

// Exportamos los servicios que vamos a necesitar en nuestra aplicación
// db: para interactuar con la base de datos Firestore
// auth: para interactuar con el servicio de Autenticación
export const db = getFirestore(app);
export const auth = getAuth(app);