// server/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const db = require("./db");

const app = express();

// Allow JSON bodies
app.use(express.json());

// CORS: allow local dev and Codespaces frontend (port 5173)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://organic-potato-4jg9w56rxqpj27jv-5173.app.github.dev",
    ],
    methods: ["GET", "POST"],
  })
);

// Simple health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* ========= REST API: SAVE / LOAD SESSIONS ========= */

// helper: ensure user exists, return id
function ensureUser(name, callback) {
  if (!name) return callback(null, null);

  db.get("SELECT id FROM users WHERE name = ?", [name], (err, row) => {
    if (err) return callback(err);
    if (row) return callback(null, row.id);

    db.run(
      "INSERT INTO users (name) VALUES (?)",
      [name],
      function (insertErr) {
        if (insertErr) return callback(insertErr);
        callback(null, this.lastID);
      }
    );
  });
}

// POST /api/sessions/save
// body: { roomId, userName, imageData }
app.post("/api/sessions/save", (req, res) => {
  const { roomId, userName, imageData } = req.body || {};
  if (!roomId || !imageData) {
    return res.status(400).json({ error: "roomId and imageData are required" });
  }

  ensureUser(userName, (userErr, userId) => {
    if (userErr) {
      console.error(userErr);
      return res.status(500).json({ error: "Failed to ensure user" });
    }

    // Upsert session (insert or update)
    db.get(
      "SELECT id FROM whiteboard_sessions WHERE room_id = ?",
      [roomId],
      (err, row) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Database error" });
        }

        const now = new Date().toISOString();

        if (row) {
          // update existing
          db.run(
            `
            UPDATE whiteboard_sessions
            SET image_data = ?, updated_at = ?
            WHERE room_id = ?
          `,
            [imageData, now, roomId],
            function (updateErr) {
              if (updateErr) {
                console.error(updateErr);
                return res.status(500).json({ error: "Failed to update session" });
              }
              return res.json({ ok: true, action: "updated" });
            }
          );
        } else {
          // insert new
          db.run(
            `
            INSERT INTO whiteboard_sessions (room_id, image_data, created_by, updated_at)
            VALUES (?, ?, ?, ?)
          `,
            [roomId, imageData, userId, now],
            function (insertErr2) {
              if (insertErr2) {
                console.error(insertErr2);
                return res.status(500).json({ error: "Failed to create session" });
              }
              return res.json({ ok: true, action: "created", id: this.lastID });
            }
          );
        }
      }
    );
  });
});

// GET /api/sessions/:roomId
app.get("/api/sessions/:roomId", (req, res) => {
  const { roomId } = req.params;
  db.get(
    "SELECT room_id, image_data FROM whiteboard_sessions WHERE room_id = ?",
    [roomId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }
      if (!row) {
        return res.status(404).json({ error: "Session not found" });
      }
      return res.json({
        roomId: row.room_id,
        imageData: row.image_data,
      });
    }
  );
});

/* ========= SOCKET.IO REAL-TIME ========= */

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://organic-potato-4jg9w56rxqpj27jv-5173.app.github.dev",
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join_room", ({ roomId, userName }) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId} as ${userName}`);

    socket.to(roomId).emit("user_joined", {
      userName,
      socketId: socket.id,
    });
  });

  socket.on("draw", (data) => {
    const { roomId, x0, y0, x1, y1, color, lineWidth } = data || {};
    if (!roomId) return;

    socket.to(roomId).emit("draw", {
      x0,
      y0,
      x1,
      y1,
      color,
      lineWidth,
    });
  });

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