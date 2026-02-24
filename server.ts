import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("onix.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    google_id TEXT UNIQUE,
    username TEXT,
    balance REAL DEFAULT 0,
    energy REAL DEFAULT 21600, -- 6 hours in seconds
    last_energy_update INTEGER,
    level INTEGER DEFAULT 1,
    hashrate_multiplier REAL DEFAULT 1,
    referral_code TEXT UNIQUE,
    referred_by INTEGER,
    is_mining INTEGER DEFAULT 0,
    last_mining_start INTEGER,
    total_mined REAL DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at INTEGER
  );

  -- Add password column if it doesn't exist (for existing databases)
  PRAGMA table_info(users);
`);

// Check if password column exists, if not add it
const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const hasPassword = tableInfo.some(col => col.name === 'password');
if (!hasPassword) {
  db.exec("ALTER TABLE users ADD COLUMN password TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER,
    referred_id INTEGER,
    earnings REAL DEFAULT 0,
    FOREIGN KEY(referrer_id) REFERENCES users(id),
    FOREIGN KEY(referred_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO global_settings (key, value) VALUES ('base_mining_rate', '0.0001');
  INSERT OR IGNORE INTO global_settings (key, value) VALUES ('daily_emission_cap', '10000');
`);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const JWT_SECRET = process.env.JWT_SECRET || "onix-secret-key";
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is not set. Using default insecure secret.");
}

// --- Auth Middleware ---
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- Auth Routes ---
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, username, isRegister } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (isRegister) {
      if (!username || username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const result = db.prepare(`
        INSERT INTO users (email, password, username, referral_code, created_at, last_energy_update)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(email, hashedPassword, username, referralCode, Date.now(), Date.now());

      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, user });
    } else {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, user });
    }
  } catch (err: any) {
    console.error("Auth error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// --- User Routes ---
app.get("/api/user/me", authenticate, (req: any, res) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/mining/start", authenticate, (req: any, res) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.energy <= 0) return res.status(400).json({ error: "No energy" });
    
    db.prepare("UPDATE users SET is_mining = 1, last_mining_start = ?, last_energy_update = ? WHERE id = ?")
      .run(Date.now(), Date.now(), req.user.id);
    
    res.json({ success: true });
  } catch (err: any) {
    console.error("Start mining error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/mining/stop", authenticate, (req: any, res) => {
  try {
    db.prepare("UPDATE users SET is_mining = 0 WHERE id = ?").run(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Stop mining error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Mining Logic & WebSocket ---
const clients = new Map<number, WebSocket>();

wss.on("connection", (ws, req) => {
  let userId: number | null = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());
    if (data.type === "auth") {
      try {
        const decoded = jwt.verify(data.token, JWT_SECRET) as any;
        userId = decoded.id;
        clients.set(userId!, ws);
      } catch (e) {}
    }
  });

  ws.on("close", () => {
    if (userId) clients.delete(userId);
  });
});

// Background task for mining and energy
setInterval(() => {
  const now = Date.now();
  const baseMiningRate = parseFloat(db.prepare("SELECT value FROM global_settings WHERE key = 'base_mining_rate'").get().value);
  
  const activeMiners = db.prepare("SELECT * FROM users WHERE is_mining = 1").all() as any[];
  
  activeMiners.forEach(user => {
    const elapsedSeconds = (now - user.last_energy_update) / 1000;
    if (elapsedSeconds < 1) return;

    let energyConsumed = elapsedSeconds;
    let newEnergy = Math.max(0, user.energy - energyConsumed);
    let isMining = newEnergy > 0 ? 1 : 0;

    const reward = baseMiningRate * user.hashrate_multiplier * user.level * elapsedSeconds;
    
    db.prepare(`
      UPDATE users 
      SET balance = balance + ?, 
          total_mined = total_mined + ?, 
          energy = ?, 
          is_mining = ?, 
          last_energy_update = ? 
      WHERE id = ?
    `).run(reward, reward, newEnergy, isMining, now, user.id);

    // Referral commission (7%)
    if (user.referred_by) {
      const commission = reward * 0.07;
      db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(commission, user.referred_by);
      db.prepare("UPDATE referrals SET earnings = earnings + ? WHERE referrer_id = ? AND referred_id = ?")
        .run(commission, user.referred_by, user.id);
    }

    // Notify client
    const ws = clients.get(user.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "update",
        balance: user.balance + reward,
        energy: newEnergy,
        isMining
      }));
    }
  });

  // Energy refill for non-mining users
  const idleUsers = db.prepare("SELECT * FROM users WHERE is_mining = 0 AND energy < 21600").all() as any[];
  idleUsers.forEach(user => {
    const elapsedSeconds = (now - user.last_energy_update) / 1000;
    if (elapsedSeconds < 1) return;

    const refillRate = 1; // 1 energy per second
    const newEnergy = Math.min(21600, user.energy + (elapsedSeconds * refillRate));
    
    db.prepare("UPDATE users SET energy = ?, last_energy_update = ? WHERE id = ?")
      .run(newEnergy, now, user.id);

    const ws = clients.get(user.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "update", energy: newEnergy }));
    }
  });

  // Broadcast global stats
  const totalMinersOnline = activeMiners.length;
  const totalMined = db.prepare("SELECT SUM(total_mined) as total FROM users").get().total || 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "global_stats",
        online: totalMinersOnline,
        totalMined
      }));
    }
  });
}, 1000);

// --- Admin Routes ---
app.get("/api/admin/users", authenticate, (req: any, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  } catch (err: any) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Vite Middleware ---
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});
