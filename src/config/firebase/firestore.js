import { getFirestore } from "firebase/firestore";
import { app } from "./index.js";

export const db = getFirestore(app);