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

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

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

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Vigor Launchpad API running on http://localhost:${PORT}`);
});
