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

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  if (!db.supabase) {
    // Local fallback mode
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

    return res.json({ token, user: toSafeUser(user) });
  }

  try {
    const { data, error } = await db.supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return res.status(401).json({ error: error ? error.message : "Invalid email or password." });
    }

    let user = db.findOne("users", (u) => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "User profile not found in database." });
    }

    if (user.status === "Inactive") {
      return res.status(403).json({ error: "Your account has been deactivated. Contact your administrator." });
    }

    // Update profile with authId if not present
    if (!user.authId) {
      user = db.update("users", user.id, { authId: data.user.id });
    }

    res.json({ token: data.session.access_token, user: toSafeUser(user) });
  } catch (err) {
    console.error("Login route error:", err);
    res.status(500).json({ error: "An error occurred during login." });
  }
});

router.get("/me", authenticate, (req, res) => {
  const user = db.getById("users", req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ data: toSafeUser(user) });
});

// Super Admin can create new users
router.post("/register", authenticate, authorize("Super Admin"), async (req, res) => {
  const { name, email, password, role, team } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password and role are required." });
  }

  const exists = db.findOne("users", (u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: "A user with that email already exists." });

  if (!db.supabase) {
    // Local fallback mode
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = db.insert("users", {
      name,
      email,
      role,
      team: team || null,
      status: "Active",
      passwordHash,
    });
    return res.status(201).json({ data: toSafeUser(user) });
  }

  try {
    const { data: authData, error: authError } = await db.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, team }
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError ? authError.message : "Failed to create authentication user." });
    }

    const user = db.insert("users", {
      authId: authData.user.id,
      name,
      email,
      role,
      team: team || null,
      status: "Active",
      passwordHash: ""
    });

    res.status(201).json({ data: toSafeUser(user) });
  } catch (err) {
    console.error("Register route error:", err);
    res.status(500).json({ error: "Failed to create user account." });
  }
});

router.get("/users", authenticate, (req, res) => {
  const users = db.all("users").map(toSafeUser);
  res.json({ data: users });
});

router.put("/users/:id", authenticate, authorize("Super Admin"), async (req, res) => {
  const { password, ...rest } = req.body;
  const patch = { ...rest };

  const existing = db.getById("users", req.params.id);
  if (!existing) return res.status(404).json({ error: "User not found." });

  if (!db.supabase) {
    // Local fallback mode
    if (password) patch.passwordHash = bcrypt.hashSync(password, 10);
    const user = db.update("users", req.params.id, patch);
    return res.json({ data: toSafeUser(user) });
  }

  try {
    const updateParams = {
      user_metadata: {
        name: rest.name || existing.name,
        role: rest.role || existing.role,
        team: rest.team || existing.team
      }
    };
    if (rest.email) updateParams.email = rest.email;
    if (password) updateParams.password = password;

    if (existing.authId) {
      const { error: authError } = await db.supabase.auth.admin.updateUserById(existing.authId, updateParams);
      if (authError) {
        return res.status(400).json({ error: authError.message });
      }
    }

    const user = db.update("users", req.params.id, patch);
    res.json({ data: toSafeUser(user) });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Failed to update user." });
  }
});

router.delete("/users/:id", authenticate, authorize("Super Admin"), async (req, res) => {
  const existing = db.getById("users", req.params.id);
  if (!existing) return res.status(404).json({ error: "User not found." });

  if (!db.supabase) {
    // Local fallback mode
    const ok = db.remove("users", req.params.id);
    return res.status(204).end();
  }

  try {
    if (existing.authId) {
      const { error: authError } = await db.supabase.auth.admin.deleteUser(existing.authId);
      if (authError) {
        return res.status(400).json({ error: authError.message });
      }
    }
    db.remove("users", req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

module.exports = router;
