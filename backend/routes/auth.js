const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../database");

const router = express.Router();

function ensureDefaultUser() {
  db.get("SELECT id FROM users LIMIT 1", (err, row) => {
    if (err) {
      console.error("Error checking users:", err);
      return;
    }
    if (!row) {
      const username = process.env.DEFAULT_USERNAME || "admin";
      const password = process.env.DEFAULT_PASSWORD || "vyoma@2026";
      const passwordHash = bcrypt.hashSync(password, 10);
      db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, passwordHash], function(err) {
        if (!err) {
          console.log(`Created default login -> username: "${username}", password: "${password}"`);
          console.log("Change these in the .env file before your team demo.");
        }
      });
    }
  });
}
setTimeout(ensureDefaultUser, 1000); // give time for DB init

router.post("/login", (req, res) => {
  console.log("Login attempt:", req.body);
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  db.get("SELECT id, username, password_hash FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secret', {
      expiresIn: "12h",
    });
    res.json({ token, username: user.username });
  });
});

module.exports = router;
