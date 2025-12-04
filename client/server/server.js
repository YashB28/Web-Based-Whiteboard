// server/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const db = require("./db"); // make sure db.js is in the same folder

const app = express();

// ===== CORS SETUP =====
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://yashb28.github.io",
  "https://yashb28.github.io/Web-Based-Whiteboard",
];

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Allow JSON bodies
app.use(express.json());

// Simple health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ===== HTTP + SOCKET.IO SERVER =====
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io",
});

// ===== REAL-TIME WHITEBOARD LOGIC =====
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // User joins a room
  socket.on("join_room", ({ roomId, userName }) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId} as ${userName}`);

    // Tell others in the room
    socket.to(roomId).emit("user_joined", {
      userName,
      socketId: socket.id,
    });
  });

  // User draws
  socket.on("draw", (data) => {
    const { roomId, x0, y0, x1, y1, color, lineWidth } = data || {};
    if (!roomId) return;

    // Broadcast to other users in the room
    socket.to(roomId).emit("draw", {
      x0,
      y0,
      x1,
      y1,
      color,
      lineWidth,
    });
  });

  // User clears board
  socket.on("clear", (roomId) => {
    if (!roomId) return;
    console.log(`Clear requested in room ${roomId}`);
    socket.to(roomId).emit("clear");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ===== REST API FOR SAVE / LOAD =====

// Save or update a whiteboard session as base64 PNG
app.post("/api/sessions/save", (req, res) => {
  const { roomId, userName, imageData } = req.body || {};
  if (!roomId || !userName || !imageData) {
    return res
      .status(400)
      .json({ error: "roomId, userName and imageData are required." });
  }

  // 1. Ensure user exists (or create)
  db.run(
    `
    INSERT INTO users (name)
    VALUES (?)
    ON CONFLICT(name) DO NOTHING
  `,
    [userName],
    function (err) {
      if (err) {
        console.error("Error inserting user:", err);
        return res.status(500).json({ error: "Failed to upsert user" });
      }

      // Get user id
      db.get(
        `SELECT id FROM users WHERE name = ?`,
        [userName],
        (err2, userRow) => {
          if (err2 || !userRow) {
            console.error("Error fetching user:", err2);
            return res.status(500).json({ error: "Failed to fetch user" });
          }

          const userId = userRow.id;

          // 2. Upsert session by room_id
          db.get(
            `SELECT id FROM whiteboard_sessions WHERE room_id = ?`,
            [roomId],
            (err3, sessionRow) => {
              if (err3) {
                console.error("Error fetching session:", err3);
                return res
                  .status(500)
                  .json({ error: "Failed to fetch session" });
              }

              const now = new Date().toISOString();
              if (!sessionRow) {
                // Insert new session
                db.run(
                  `
                  INSERT INTO whiteboard_sessions (
                    room_id, image_data, created_by, created_at, updated_at
                  )
                  VALUES (?, ?, ?, ?, ?)
                `,
                  [roomId, imageData, userId, now, now],
                  function (err4) {
                    if (err4) {
                      console.error("Error inserting session:", err4);
                      return res
                        .status(500)
                        .json({ error: "Failed to insert session" });
                    }
                    return res.json({
                      message: "Session created",
                      sessionId: this.lastID,
                      action: "created",
                    });
                  }
                );
              } else {
                // Update existing session
                db.run(
                  `
                  UPDATE whiteboard_sessions
                  SET image_data = ?, updated_at = ?
                  WHERE id = ?
                `,
                  [imageData, now, sessionRow.id],
                  function (err5) {
                    if (err5) {
                      console.error("Error updating session:", err5);
                      return res
                        .status(500)
                        .json({ error: "Failed to update session" });
                    }
                    return res.json({
                      message: "Session updated",
                      sessionId: sessionRow.id,
                      action: "updated",
                    });
                  }
                );
              }
            }
          );
        }
      );
    }
  );
});

// Load a whiteboard session by roomId
app.get("/api/sessions/:roomId", (req, res) => {
  const { roomId } = req.params;
  if (!roomId) {
    return res.status(400).json({ error: "roomId is required." });
  }

  db.get(
    `SELECT image_data FROM whiteboard_sessions WHERE room_id = ?`,
    [roomId],
    (err, row) => {
      if (err) {
        console.error("Error fetching session:", err);
        return res.status(500).json({ error: "Failed to fetch session" });
      }

      if (!row || !row.image_data) {
        return res.status(404).json({ error: "No session found for this room" });
      }

      return res.json({ imageData: row.image_data });
    }
  );
});

// ===== START SERVER =====
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
