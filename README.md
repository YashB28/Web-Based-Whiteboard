Collaborative Web-Based Whiteboard

This project is a real-time collaborative whiteboard built with React, Socket.IO, and a Node.js + SQLite backend. It allows multiple users to draw together in the same room, clear the board, and even save and reload their sessions.


------------

Features

Draw in real time with multiple users
Join a room using a room ID
Change brush color and size
Clear the board for everyone
Save your whiteboard as an image
Load previously saved sessions
Responsive canvas that scales with your screen



------------

How It Works

Frontend (React)

The Whiteboard.jsx component handles the canvas drawing and connects to the backend using Socket.IO.
Whenever you draw, it updates the canvas locally and sends the drawing data to the server, which then broadcasts it to everyone else in the same room.
Saving and loading whiteboards is done through simple API calls to the backend.

Backend (Node.js + Socket.IO)

The backend manages real-time events like joining a room, drawing, and clearing the board.
It also exposes REST endpoints to save or load a whiteboard session. Saved sessions are stored as base64 images in the database.

Database (SQLite)

The db.js file sets up a small SQLite database with two tables:

users – stores unique user names

whiteboard_sessions – stores each room’s saved canvas image

This allows the app to reload past sessions whenever needed.


------------

Running the Project Locally

1. Clone the repository

git clone <your-repo-url>
cd <project-folder>

2. Install dependencies

Backend:

cd server
npm install

Frontend:

cd client
npm install

3. Start the backend

node server.js

4. Start the frontend

npm run dev


------------

Folder Structure

/server
  server.js
  db.js
  whiteboard.db

/client
  Whiteboard.jsx
  App.jsx
  index.jsx


------------

API Endpoints

POST /api/sessions/save
Saves the current whiteboard as a base64 PNG.
GET /api/sessions/:roomId
Loads the saved whiteboard for a given room.


------------

Tech Stack

React
Socket.IO
Node.js
Express
SQLite



