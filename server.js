require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const betterSqlite3 = require("better-sqlite3");
const cookieParser = require("cookie-parser");

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(cookieParser());

// ✅ Middleware: Decode JWT from cookie
app.use((req, res, next) => {
  try {
    const decoded = jwt.verify(req.cookies["our simple app"], process.env.JWTSECRET);
    req.user = decoded;
  } catch (err) {
    req.user = false;
  }
  res.locals.user = req.user;
  next();
});

// ✅ Setup DB
const db = betterSqlite3("ourApp.db");
db.pragma("journal_mode = WAL");

// Create users table if it doesn't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`).run();

// ✅ GET: Homepage (Register/Login page)
app.get("/", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("homepage", {
    errors: [],
    username: null
  });
});

// ✅ GET: Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.user) return res.redirect("/");
  res.render("dashboard", {
    username: req.user.username
  });
});

// ✅ POST: Register
app.post("/register", async (req, res) => {
  const errors = [];
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();

  if (!username) errors.push("You must provide a username.");
  if (username.length < 3 || username.length > 10 || !/^[a-zA-Z0-9]+$/.test(username))
    errors.push("Username must be 3–10 characters and alphanumeric.");

  if (!password || password.length < 12 || password.length > 70)
    errors.push("Password must be between 12–70 characters.");

  if (errors.length > 0) {
    return res.render("homepage", { errors, username: null });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const insert = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const result = insert.run(username, hashedPassword);

    const user = db.prepare("SELECT * FROM users WHERE rowid = ?").get(result.lastInsertRowid);

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWTSECRET, {
      expiresIn: "1d"
    });

    res.cookie("our simple app", token, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.redirect("/dashboard");
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.render("homepage", { errors: ["Username already taken."], username: null });
    } else {
      console.error("❌ Registration Error:", e);
      res.render("homepage", { errors: ["Something went wrong."], username: null });
    }
  }
});

// ✅ GET: Logout
app.get("/logout", (req, res) => {
  res.clearCookie("our simple app");
  res.redirect("/");
});

// ✅ Server Start
app.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});
