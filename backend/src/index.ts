import dotenv from 'dotenv';
dotenv.config();

// Load env before imports
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initializeSocket } from './socket';

const app = express();

// Create HTTP + Socket server
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins (Render + Vercel)
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Express middlewares
app.use(cors({ origin: "*" }));
app.use(express.json());

// Health endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize all socket listeners
initializeSocket(io);

const PORT = Number(process.env.PORT) || 3001;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});
