const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authenticate, authorize, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

function toSafeUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = db.findOne("users", (u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid email or password." });

  const matches = bcrypt.compareSync(password, user.passwordHash);
  if (!matches) return res.status(401).json({ error: "Invalid email or password." });

  if (user.status === "Inactive") {
    return res.status(403).json({ error: "Your account has been deactivated. Contact your administrator." });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token, user: toSafeUser(user) });
});

router.get("/me", authenticate, (req, res) => {
  const user = db.getById("users", req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ data: toSafeUser(user) });
});

// Super Admin can create new users (employees, managers, finance staff)
router.post("/register", authenticate, authorize("Super Admin"), (req, res) => {
  const { name, email, password, role, team } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password and role are required." });
  }
  const exists = db.findOne("users", (u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: "A user with that email already exists." });

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = db.insert("users", {
    name,
    email,
    role,
    team: team || null,
    status: "Active",
    passwordHash,
  });
  res.status(201).json({ data: toSafeUser(user) });
});

router.get("/users", authenticate, (req, res) => {
  const users = db.all("users").map(toSafeUser);
  res.json({ data: users });
});

router.put("/users/:id", authenticate, authorize("Super Admin"), (req, res) => {
  const { password, ...rest } = req.body;
  const patch = { ...rest };
  if (password) patch.passwordHash = bcrypt.hashSync(password, 10);
  const user = db.update("users", req.params.id, patch);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ data: toSafeUser(user) });
});

router.delete("/users/:id", authenticate, authorize("Super Admin"), (req, res) => {
  const ok = db.remove("users", req.params.id);
  if (!ok) return res.status(404).json({ error: "User not found." });
  res.status(204).end();
});

module.exports = router;
