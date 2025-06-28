require('dotenv').config(); // Load environment variables
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const betterSqlite3 = require("better-sqlite3"); // Optional backup

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWTSECRET = process.env.JWTSECRET;

// ✅ Validate JWT Secret
if (!JWTSECRET || JWTSECRET.length < 32) {
    console.error("❌ JWTSECRET missing or insecure. Set a long secret in .env");
    process.exit(1);
}

// ✅ PostgreSQL Pool Setup
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
    console.error('PostgreSQL Error:', err);
    process.exit(1);
});

async function connectDbAndVerify() {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL Connected. Time:', res.rows[0].now);
    } catch (err) {
        console.error('❌ PostgreSQL Connection Error:', err.message);
        process.exit(1);
    }
}
connectDbAndVerify();

async function createUsersTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            )
        `);
        console.log("✅ PostgreSQL users table ready.");
    } catch (err) {
        console.error("❌ Table creation failed:", err.message);
        process.exit(1);
    }
}
createUsersTable();

// ✅ Optional: SQLite fallback setup
const db = betterSqlite3("ourApp.db");
db.pragma("journal_mode = WAL");
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`).run();

// ✅ Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin.startsWith('file://')) return callback(null, true);
        const allowed = [`http://localhost:${PORT}`, 'http://127.0.0.1:5500'];
        if (allowed.includes(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname)));

// ✅ JWT Auth Middleware
app.use(async (req, res, next) => {
    try {
        const token = req.cookies["our simple app"];
        if (token) {
            const decoded = jwt.verify(token, JWTSECRET);
            const userRes = await pool.query('SELECT id, email FROM users WHERE id = $1', [decoded.id]);
            req.user = userRes.rows[0] || false;
        } else {
            req.user = false;
        }
    } catch {
        req.user = false;
        res.clearCookie("our simple app");
    }
    res.locals.user = req.user;
    next();
});

// ✅ Routes

// Home redirect
app.get('/', (req, res) => {
    res.redirect(req.user ? '/dashboard.html' : '/login.html');
});

// Register
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email and password are required.' });

    try {
        const exists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (exists.rows.length)
            return res.status(409).json({ success: false, message: 'Email already registered.' });

        const hashed = await bcrypt.hash(password, 10);
        const insert = await pool.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
            [email, hashed]
        );

        const token = jwt.sign({ id: insert.rows[0].id, email: insert.rows[0].email }, JWTSECRET, { expiresIn: '1d' });
        res.cookie("our simple app", token, {
            httpOnly: true, secure: false, sameSite: "Lax", maxAge: 86400000
        });

        res.status(201).json({ success: true, message: 'Registered successfully.', redirectUrl: '/dashboard.html' });
    } catch (err) {
        console.error("❌ Registration Error:", err.message);
        res.status(500).json({ success: false, message: 'Registration failed.' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email and password are required.' });

    try {
        const result = await pool.query('SELECT id, email, password FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password)))
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWTSECRET, { expiresIn: '1d' });
        res.cookie("our simple app", token, {
            httpOnly: true, secure: false, sameSite: "Lax", maxAge: 86400000
        });

        res.status(200).json({ success: true, message: 'Login successful.', redirectUrl: '/dashboard.html' });
    } catch (err) {
        console.error("❌ Login Error:", err.message);
        res.status(500).json({ success: false, message: 'Login failed.' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie("our simple app");
    res.json({ success: true, message: 'Logged out successfully.', redirectUrl: '/login.html' });
});

// Dashboard (protected)
app.get('/dashboard.html', (req, res, next) => {
    if (!req.user) return res.redirect('/login.html');
    next(); // Serve static file
});

// API: User Info
app.get('/api/user-info', (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated.' });
    res.json({ success: true, user: { id: req.user.id, email: req.user.email } });
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running: http://localhost:${PORT}`);
    console.log(`🔐 Login page: http://localhost:${PORT}/login.html`);
});
