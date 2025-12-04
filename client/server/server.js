// server/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

// Allow JSON bodies
app.use(express.json());

// Allow CORS from frontend (localhost:5173 in local dev)
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);

// Simple health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Create HTTP server and wrap Express app
const server = http.createServer(app);

// Attach Socket.IO to HTTP server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// --- REAL-TIME LOGIC ---

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // When a user joins a room
  socket.on("join_room", ({ roomId, userName }) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId} as ${userName}`);

    // Notify others in the room
    socket.to(roomId).emit("user_joined", {
      userName,
      socketId: socket.id,
    });
  });

  // When a client draws a stroke
  socket.on("draw", (data) => {
    const { roomId, x0, y0, x1, y1, color, lineWidth } = data || {};
    if (!roomId) return;

    // Broadcast to all OTHER clients in the same room
    socket.to(roomId).emit("draw", {
      x0,
      y0,
      x1,
      y1,
      color,
      lineWidth,
    });
  });

  // When a client clears the board
  socket.on("clear", (roomId) => {
    if (!roomId) return;
    console.log(`Clear requested in room ${roomId}`);
    socket.to(roomId).emit("clear");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});