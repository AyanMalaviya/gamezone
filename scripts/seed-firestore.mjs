/**
 * GameZone Firestore Seeder
 * -------------------------
 * Run AFTER setting up Firebase project:
 *   node scripts/seed-firestore.mjs
 *
 * Requires: VITE_FIREBASE_* vars in .env
 * Install dep first: npm install dotenv
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const envFile = readFileSync(envPath, "utf-8");
envFile.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
});

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Station data (14 PS5 + 1 Racing Simulator) ---
const stations = [
  { stationId: 1, type: "PS5", status: "available", currentGame: null, bookedSlots: [], preferredGame: null },
  { stationId: 2, type: "PS5", status: "occupied",  currentGame: "FIFA 25", bookedSlots: ["10:25-11:25", "12:00-13:00"], preferredGame: "FIFA 25" },
  { stationId: 3, type: "PS5", status: "available", currentGame: null, bookedSlots: [], preferredGame: null },
  { stationId: 4, type: "PS5", status: "occupied",  currentGame: "God of War Ragnarök", bookedSlots: ["11:00-12:00"], preferredGame: "God of War Ragnarök" },
  { stationId: 5, type: "PS5", status: "available", currentGame: null, bookedSlots: [], preferredGame: null },
  { stationId: 6, type: "PS5", status: "occupied",  currentGame: "Call of Duty: Warzone", bookedSlots: ["09:00-10:00", "13:00-14:00"], preferredGame: "Call of Duty: Warzone" },
  { stationId: 7, type: "PS5", status: "available", currentGame: null, bookedSlots: [], preferredGame: null },
  { stationId: 8, type: "PS5", status: "available", currentGame: null, bookedSlots: [], preferredGame: null },
  { stationId: 9, type: "PS5", status: "occupied",  currentGame: "Spider-Man 2", bookedSlots: ["14:00-15:00"], preferredGame: "Spider-Man 2" },
  { stationId: 10, type: "PS5", status: "available", currentGame: null, bookedSlots: [], preferredGame: null },
  { stationId: 11, type: "PS5", status: "occupied",  currentGame: "Mortal Kombat 1", bookedSlots: ["10:00-11:00"], preferredGame: "Mortal Kombat 1" },
  { stationId: 12, type: "PS5", status: "available", currentGame: null, bookedSlots: [], preferredGame: null },
  { stationId: 13, type: "PS5", status: "available", currentGame: null, bookedSlots: [], preferredGame: null },
  { stationId: 14, type: "PS5", status: "occupied",  currentGame: "GTA V Enhanced", bookedSlots: ["15:00-16:00", "16:30-17:30"], preferredGame: "GTA V Enhanced" },
  { stationId: 15, type: "Racing Simulator", status: "occupied", currentGame: "Gran Turismo 7", bookedSlots: ["11:30-12:30"], preferredGame: "Gran Turismo 7" },
];

async function seed() {
  console.log("🔥 Seeding Firestore...\n");

  // Seed stations collection
  const stationsCol = collection(db, "stations");
  for (const station of stations) {
    const id = `station_${station.stationId}`;
    await setDoc(doc(stationsCol, id), {
      ...station,
      updatedAt: Timestamp.now(),
    });
    console.log(`✅ stations/${id}`);
  }

  // Seed a dummy admin user profile (update uid after first admin login)
  const usersCol = collection(db, "users");
  await setDoc(doc(usersCol, "REPLACE_WITH_ADMIN_UID"), {
    name: "Admin",
    email: "admin@gamezone.com",
    phone: "",
    hasPhone: false,
    role: "admin",
    createdAt: Timestamp.now(),
  });
  console.log("✅ users/REPLACE_WITH_ADMIN_UID (dummy — update UID after login)");

  console.log("\n🎮 Seeding complete! Collections created: stations, users");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
