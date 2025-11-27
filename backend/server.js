require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const apiRoutes = require("./routes/api");
const roomHandler = require("./handlers/roomHandler");
const mediaHandler = require("./handlers/mediaHandler");
const { incrementTotalConnections } = require("./store");

// ==================== CONFIGURATION ====================
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Dynamic CORS Origin Handler
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      process.env.FRONTEND_URL
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith(".loca.lt") || origin.endsWith(".devtunnels.ms")) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
};

// ==================== MIDDLEWARE ====================
app.use(morgan("dev"));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== SOCKET SETUP ====================
const io = socketIo(server, {
  cors: corsOptions,
  maxHttpBufferSize: 10e6,
});

// ==================== ROUTES ====================
app.use("/api", apiRoutes(io));
app.get('/health', (req, res) => res.send('ok'));

// ==================== SOCKET LOGIC ====================
io.on("connection", (socket) => {
  incrementTotalConnections();
  console.log(`✅ User connected: ${socket.id}`);

  // Register handlers
  roomHandler(io, socket);
  mediaHandler(io, socket);
});

// ==================== START SERVER ====================
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});