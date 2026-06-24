require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./src/routes/auth");
const leadRoutes = require("./src/routes/leads");
const clientRoutes = require("./src/routes/clients");
const influencerRoutes = require("./src/routes/influencers");
const campaignRoutes = require("./src/routes/campaigns");
const eventRoutes = require("./src/routes/events");
const vendorRoutes = require("./src/routes/vendors");
const taskRoutes = require("./src/routes/tasks");
const financeRoutes = require("./src/routes/finance");
const dashboardRoutes = require("./src/routes/dashboard");
const reportRoutes = require("./src/routes/reports");
const notificationRoutes = require("./src/routes/notifications");
const searchRoutes = require("./src/routes/search");
const commentRoutes = require("./src/routes/comments");
const vigorSpaceRoutes = require("./src/routes/vigorSpace");
const db = require("./src/db");

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
// Allow local dev origins + the deployed frontend URL (set via FRONTEND_URL env var)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

// ─── Lazy DB Initialization (required for Vercel serverless) ─────────────────
// On a traditional server, db.init() runs once at startup.
// On Vercel, each function invocation may be a cold start, so we initialize
// lazily on the first request and cache the promise so it runs only once
// per function instance.
let dbInitPromise = null;

app.use(async (req, res, next) => {
  if (!dbInitPromise) {
    dbInitPromise = db.init().catch((err) => {
      // Reset so the next request retries
      dbInitPromise = null;
      throw err;
    });
  }
  try {
    await dbInitPromise;
    next();
  } catch (err) {
    console.error("DB initialization failed:", err);
    res.status(503).json({ error: "Service temporarily unavailable. Please retry in a moment." });
  }
});

// ─── Server-Sent Events (SSE) for local development realtime ─────────────────
// SSE works in local dev mode. On Vercel serverless it will time out quickly
// (10s), but the frontend falls back to Supabase Realtime automatically.
const sseClients = [];

app.get("/api/realtime", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  res.write(":\n\n");

  const keepAliveInterval = setInterval(() => {
    res.write(":\n\n");
  }, 30000);

  sseClients.push(res);

  req.on("close", () => {
    clearInterval(keepAliveInterval);
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

db.onChange((change) => {
  const message = `data: ${JSON.stringify(change)}\n\n`;
  sseClients.forEach((clientRes) => {
    clientRes.write(message);
  });
});

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "Vigor Launchpad API" }));

app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/influencers", influencerRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/vigor-space", vigorSpaceRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

// ─── Start server (local development only) ───────────────────────────────────
// When deployed to Vercel, this file is imported as a module — app.listen()
// is NOT called. Vercel handles the HTTP server itself.
if (require.main === module) {
  const PORT = process.env.PORT || 5050;
  db.init()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Vigor Launchpad API running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Failed to initialize database cache:", err);
      app.listen(PORT, () => {
        console.log(`Vigor Launchpad API running in offline fallback mode on http://localhost:${PORT}`);
      });
    });
}

// Export for Vercel serverless
module.exports = app;
