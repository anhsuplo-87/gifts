// Khởi tạo Firebase (chỉ auth + firestore). File này được import động → trang ?mock không tải Firebase.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { EMULATOR_PROJECT_ID, firebaseConfig, useEmulator } from './config.ts';

let app: FirebaseApp | null = null;
let auth: Auth;
let db: Firestore;

export function firebase(): { app: FirebaseApp; auth: Auth; db: Firestore; emulator: boolean } {
  const emulator = useEmulator();
  if (!app) {
    app = initializeApp(emulator ? { ...firebaseConfig, projectId: EMULATOR_PROJECT_ID } : firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    if (emulator) {
      const host = location.hostname || '127.0.0.1';
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, 8080);
    }
  }
  return { app, auth, db, emulator };
}
