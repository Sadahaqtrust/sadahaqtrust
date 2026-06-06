import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDJhkplMHiL4U_HexS5qYlDCFwy8-ZxTPI",
  authDomain: "digitalrohatk.firebaseapp.com",
  projectId: "digitalrohatk",
  appId: "1:857615267349:web:d4d1c6393dc9f49ac1801c"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
