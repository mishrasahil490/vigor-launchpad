const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authenticate, authorize, JWT_SECRET } = require("../middleware/auth");
const { defaultPermissions } = db;

const router = express.Router();

function toSafeUser(u) {
  const { passwordHash, ...rest } = u;
  // Ensure permissions are always present, using role defaults if not stored
  if (!rest.permissions || typeof rest.permissions !== 'object') {
    rest.permissions = defaultPermissions(rest.role);
  }
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

  // If Supabase is active, clean up any existing auth user with this email first to prevent conflicts
  try {
    const { data: { users: authUsers }, error: listError } = await db.supabase.auth.admin.listUsers({
      perPage: 1000
    });
    if (!listError && authUsers) {
      const existingAuthUser = authUsers.find(au => au.email.toLowerCase() === email.toLowerCase());
      if (existingAuthUser) {
        await db.supabase.auth.admin.deleteUser(existingAuthUser.id);
      }
    }
  } catch (err) {
    console.error("Cleanup of existing auth user failed:", err);
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
      passwordHash: "",
      permissions: defaultPermissions(role)
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
      // If the auth user doesn't exist in Supabase Auth (e.g., deleted during seeding), ignore and proceed to delete from public.users
      if (authError && authError.status !== 404 && !authError.message.toLowerCase().includes("not found")) {
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

// ─── GET permissions for a user ──────────────────────────────────────────────
router.get("/users/:id/permissions", authenticate, (req, res) => {
  const target = db.getById("users", req.params.id);
  if (!target) return res.status(404).json({ error: "User not found." });
  const perms = target.permissions || defaultPermissions(target.role);
  res.json({ data: perms });
});

// ─── PUT permissions for a user ───────────────────────────────────────────────
// Super Admin: can set any permissions for any user
// Manager/Finance: can only set permissions for Employees/sub-roles, and only permissions they themselves have
router.put("/users/:id/permissions", authenticate, async (req, res) => {
  const { role: callerRole, id: callerId } = req.user;
  if (callerRole !== "Super Admin" && callerRole !== "Manager" && callerRole !== "Finance") {
    return res.status(403).json({ error: "Only Super Admin, Manager, or Finance can modify permissions." });
  }

  const target = db.getById("users", req.params.id);
  if (!target) return res.status(404).json({ error: "User not found." });

  // Managers/Finance can only edit Employee/non-admin users
  if (callerRole !== "Super Admin" && (target.role === "Super Admin" || target.role === "Manager")) {
    return res.status(403).json({ error: "You can only manage permissions for Employees." });
  }

  const incoming = req.body;
  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({ error: "Permissions object is required." });
  }

  let finalPermissions = incoming;

  // For non-Super-Admin callers: enforce that they can only grant what they possess
  if (callerRole !== "Super Admin") {
    const caller = db.getById("users", callerId);
    const callerPerms = caller?.permissions || defaultPermissions(callerRole);

    // Filter pages to only those the caller can access
    if (incoming.pages) {
      finalPermissions.pages = (incoming.pages || []).filter((p) =>
        callerPerms.pages.includes(p)
      );
    }

    // Filter actions to only those the caller has
    if (incoming.actions) {
      const filteredActions = {};
      Object.keys(incoming.actions || {}).forEach((entity) => {
        const callerEntityPerms = callerPerms.actions?.[entity] || {};
        const incomingEntityPerms = incoming.actions[entity] || {};
        filteredActions[entity] = {};
        ["view", "create", "edit", "delete", "exportCSV"].forEach((action) => {
          // Can only grant what caller has
          filteredActions[entity][action] = !!(incomingEntityPerms[action] && callerEntityPerms[action]);
        });
        if (incomingEntityPerms.exportCSVExpiresAt) {
          filteredActions[entity].exportCSVExpiresAt = incomingEntityPerms.exportCSVExpiresAt;
        }
      });
      finalPermissions.actions = filteredActions;
    }

    // Limit vigorSpace
    if (incoming.vigorSpace) {
      const callerVS = callerPerms.vigorSpace || {};
      finalPermissions.vigorSpace = {
        canViewZones: incoming.vigorSpace.canViewZones,
        canManageZones: !!(incoming.vigorSpace.canManageZones && callerVS.canManageZones),
        canExportCSV: !!(incoming.vigorSpace.canExportCSV && callerVS.canExportCSV),
      };
    }
  } else {
    // Super Admin: preserve exportCSVExpiresAt values directly from the matrix actions
    if (incoming.actions) {
      Object.keys(incoming.actions).forEach((entity) => {
        if (incoming.actions[entity] && incoming.actions[entity].exportCSVExpiresAt) {
          finalPermissions.actions[entity].exportCSVExpiresAt = incoming.actions[entity].exportCSVExpiresAt;
        }
      });
    }
  }

  db.update("users", target.id, { permissions: finalPermissions });
  const updated = db.getById("users", target.id);
  res.json({ data: toSafeUser(updated) });
});

// ─── Reset Password Confirm (called from /reset-password page with token from email) ─────
// The Supabase reset email sends the user to /reset-password#access_token=xxx&type=recovery
// The frontend extracts the token and posts it here, letting the backend handle the update.
router.post("/reset-password-confirm", async (req, res) => {
  const { accessToken, newPassword } = req.body;
  if (!accessToken || !newPassword) {
    return res.status(400).json({ error: "Access token and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  if (!db.supabase) {
    return res.status(400).json({ error: "Password reset via email is not available in offline mode." });
  }

  try {
    // Use the token to get the user identity
    const { data: { user }, error: userError } = await db.supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return res.status(401).json({ error: "Reset link is invalid or has expired. Please request a new one." });
    }

    // Update the password using admin API
    const { error: updateError } = await db.supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset password confirm error:", err);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

// ─── Forgot Password (sends reset email via Supabase, or confirms for local mode) ─────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  // Always respond with a generic success to prevent user enumeration
  if (!db.supabase) {
    // Local fallback: just confirm the user exists (no email sending)
    const user = db.findOne("users", (u) => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) {
      // Still return success to prevent enumeration
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }
    return res.json({ message: "Password reset is not available in offline mode. Please contact your administrator to reset your password." });
  }

  try {
    const { error } = await db.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.SITE_URL || "http://localhost:5173"}/reset-password`,
    });

    if (error) {
      console.error("Forgot password error:", error.message);
      // Don't expose error details to the client
    }

    // Always return success to prevent user enumeration
    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password route error:", err);
    res.status(500).json({ error: "An error occurred. Please try again later." });
  }
});

// ─── Change Password (authenticated user changes their own password) ──────────
router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  const user = db.getById("users", req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  if (!db.supabase) {
    // Local fallback: verify current password hash then update
    const matches = require("bcryptjs").compareSync(currentPassword, user.passwordHash);
    if (!matches) return res.status(401).json({ error: "Current password is incorrect." });

    const newHash = require("bcryptjs").hashSync(newPassword, 10);
    db.update("users", user.id, { passwordHash: newHash });
    return res.json({ message: "Password changed successfully." });
  }

  try {
    // Verify current password by attempting a sign-in
    const { error: signInError } = await db.supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    // Update password in Supabase Auth using admin API
    const { error: updateError } = await db.supabase.auth.admin.updateUserById(user.authId, {
      password: newPassword,
    });
    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "An error occurred while changing the password." });
  }
});

module.exports = router;

