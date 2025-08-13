// server.js
// Small Express + Socket.IO server that supports 3 rooms.
// Deploy this to a host that supports WebSockets (Render, Railway, Fly, etc).

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // allow connections from your frontend domain(s)

// simple health route (useful for deployment checks)
app.get("/", (req, res) => {
  res.send("Socket.IO chat server is running");
});

const httpServer = http.createServer(app);

// create socket.io server
const io = new Server(httpServer, {
  // Optional: configure CORS to limit origins in production
  cors: {
    origin: "*", // change to your Vercel URL in production e.g. https://your-site.vercel.app
    methods: ["GET", "POST"],
  },
});

const ROOMS = ["room-1", "room-2", "room-3"];

io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  // keep track of current room and nickname on this socket
  socket.data.nickname = "Anonymous";
  socket.data.room = null;

  // joinRoom payload: { room: 'room-1', nickname: 'Bob' }
  socket.on("joinRoom", (payload) => {
    const { room, nickname } = payload || {};
    if (!ROOMS.includes(room)) {
      socket.emit("errorMessage", { message: "Invalid room." });
      return;
    }

    // Leave previous room if any
    if (socket.data.room) {
      socket.leave(socket.data.room);
      // notify others in previous room
      socket.to(socket.data.room).emit("systemMessage", {
        message: `${socket.data.nickname} has left the room.`,
      });
    }

    // save nickname and room
    socket.data.nickname = nickname || "Anonymous";
    socket.data.room = room;
    socket.join(room);

    // Confirmation to the joining user
    socket.emit("joined", { room, nickname: socket.data.nickname });

    // Notify room
    socket.to(room).emit("systemMessage", {
      message: `${socket.data.nickname} has joined the room.`,
    });

    console.log(`${socket.id} (${socket.data.nickname}) joined ${room}`);
  });

  // message payload: { text: 'hello' }
  socket.on("message", (payload) => {
    const text = payload && payload.text ? String(payload.text).trim() : "";
    if (!text) return;

    const room = socket.data.room;
    const nickname = socket.data.nickname || "Anonymous";
    if (!room) {
      socket.emit("errorMessage", { message: "You must join a room first." });
      return;
    }

    const msg = {
      text,
      nickname,
      timestamp: Date.now(),
    };

    // send to everyone in room (including sender)
    io.to(room).emit("message", msg);
  });

  socket.on("disconnect", (reason) => {
    console.log("Client disconnected:", socket.id, "reason:", reason);
    const room = socket.data.room;
    const nickname = socket.data.nickname;
    if (room) {
      socket.to(room).emit("systemMessage", {
        message: `${nickname} has disconnected.`,
      });
    }
  });
});

// start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
  console.log("Available rooms:", ROOMS.join(", "));
});
