import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// =======================
// DATABASE
// =======================

const db = new Database("database.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  balance INTEGER DEFAULT 0
)
`).run();

// =======================
// AUTH ROUTE
// =======================

app.post("/api/auth/login", (req, res) => {
  const { email, password, username, isRegister } = req.body;

  try {
    if (isRegister) {
      const insert = db.prepare(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
      );
      insert.run(username, email, password);

      return res.json({ success: true, message: "User registered" });
    } else {
      const user = db
        .prepare("SELECT * FROM users WHERE email = ? AND password = ?")
        .get(email, password);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || "onixsecret",
        { expiresIn: "7d" }
      );

      return res.json({ success: true, token, user });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =======================
// TEST ROUTE
// =======================

app.get("/api/test", (req, res) => {
  res.json({ message: "ONIX backend working 🚀" });
});

// =======================
// SERVE FRONTEND BUILD
// =======================

app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// =======================
// SERVER START
// =======================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔥 ONIX Server running on port ${PORT}`);
});
