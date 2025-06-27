require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const betterSqlite3 = require("better-sqlite3");
const path = require("path");

const app = express();

// Set up EJS for templating
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware for parsing and static files
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Database setup
const db = betterSqlite3("calmconnect.db");
db.pragma("journal_mode = WAL");
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`).run();

// Render registration page
app.get("/", (req, res) => {
  res.render("register", { errors: [], username: "" });
});

// Handle registration
app.post("/register", async (req, res) => {
  const errors = [];
  const username = req.body.username?.trim() || "";
  const password = req.body.password?.trim() || "";

  // Validation
  if (!username) errors.push("You must provide a username.");
  if (username.length < 3 || username.length > 10 || !/^[a-zA-Z0-9]+$/.test(username)) {
    errors.push("Username must be 3–10 characters and alphanumeric.");
  }
  if (!password || password.length < 12 || password.length > 70) {
    errors.push("Password must be between 12–70 characters.");
  }

  if (errors.length > 0) {
    return res.render("register", { errors, username });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashedPassword);
    // Registration successful, show success message
    res.render("register", { errors: ["Registration successful! You can now log in."], username: "" });
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.render("register", { errors: ["Username already taken."], username: "" });
    } else {
      console.error(e);
      res.render("register", { errors: ["Something went wrong. Please try again."], username: "" });
    }
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CalmConnect backend running at http://localhost:${PORT}`);
});
