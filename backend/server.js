require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { initDb } = require("./database");


const authRoutes = require("./routes/auth");
const { router: missionRoutes } = require("./routes/missions");
const settingsRoutes = require("./routes/settings");
const buildTelemetryRouter = require("./routes/telemetry");
const reportRoutes = require("./routes/reports");
const chatRoutes = require("./routes/chat");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/telemetry", buildTelemetryRouter(io));
app.use("/api/reports", reportRoutes);
app.use("/api/chat", chatRoutes);

io.on("connection", (socket) => {
  console.log("Dashboard client connected:", socket.id);
  socket.on("disconnect", () => console.log("Dashboard client disconnected:", socket.id));
});

const PORT = process.env.PORT || 4000;
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`VYOMA backend listening on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});
