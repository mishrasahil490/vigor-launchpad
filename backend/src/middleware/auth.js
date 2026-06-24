const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "vigor-launchpad-dev-secret";

const db = require("../db");

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing authentication token." });
  }
  
  if (!db.supabase) {
    // Local development offline fallback
    try {
      const jwt = require("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "vigor-launchpad-dev-secret";
      const payload = jwt.verify(token, JWT_SECRET);
      
      const profile = db.findOne("users", (u) => u.id === payload.id);
      if (!profile) return res.status(401).json({ error: "User profile not found." });

      req.user = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        team: profile.team,
        permissions: profile.permissions || db.defaultPermissions(profile.role)
      };
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
  }

  try {
    const { data: { user }, error } = await db.supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
    
    // Find the user's custom profile from users table
    let profile = db.findOne("users", (u) => u.authId === user.id || (u.email && u.email.toLowerCase() === user.email.toLowerCase()));
    if (!profile && db.supabase) {
      const { data: dbData, error: dbError } = await db.supabase
        .from("users")
        .select("*")
        .or(`auth_id.eq.${user.id},email.eq.${user.email.toLowerCase()}`)
        .maybeSingle();
      if (!dbError && dbData) {
        const mapped = db.mapFromDb(dbData);
        db.all("users").push(mapped);
        profile = mapped;
      }
    }

    if (!profile) {
      return res.status(401).json({ error: "User profile not found in database." });
    }
    
    req.user = {
      id: profile.id,
      authId: user.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      team: profile.team,
      permissions: profile.permissions || db.defaultPermissions(profile.role)
    };
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ error: "Internal server error during authentication." });
  }
}

/** Restrict a route to one or more roles. Usage: authorize("Super Admin", "Manager") */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

/**
 * Scopes a list of records to what the current user is allowed to see.
 * Super Admin & Finance: see everything.
 * Manager: sees everything for their team (kept simple here as full visibility
 *   minus other managers' private notes - extend with team mapping as needed).
 * Employee: only records where ownerField === their name/id.
 */
function scopeToUser(req, rows, ownerField = "ownerId") {
  const { role, id, name } = req.user;
  if (role === "Super Admin" || role === "Manager" || role === "Finance") return rows;
  return rows.filter((r) => r[ownerField] === id || r[ownerField] === name);
}

function requirePermission(entity, action) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    if (req.user.role === "Super Admin") return next();

    const perms = req.user.permissions;
    if (!perms || !perms.actions?.[entity]?.[action]) {
      return res.status(403).json({ error: `You do not have permission to ${action} ${entity}.` });
    }
    next();
  };
}

module.exports = { authenticate, authorize, requirePermission, scopeToUser, JWT_SECRET };
