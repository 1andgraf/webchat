// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Socket.IO chat server is running");
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const ROOMS = ["room-1", "room-2", "room-3"];

// ✅ Store message history for each room in memory
const messageHistory = {
  "room-1": [],
  "room-2": [],
  "room-3": [],
};

io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);
  socket.data.nickname = "Anonymous";
  socket.data.room = null;

  socket.on("joinRoom", (payload) => {
    const { room, nickname } = payload || {};
    if (!ROOMS.includes(room)) {
      socket.emit("errorMessage", { message: "Invalid room." });
      return;
    }

    // Leave old room if any
    if (socket.data.room) {
      socket.leave(socket.data.room);
      socket.to(socket.data.room).emit("systemMessage", {
        message: `${socket.data.nickname} has left the room.`,
      });
    }

    socket.data.nickname = nickname || "Anonymous";
    socket.data.room = room;
    socket.join(room);

    socket.emit("joined", { room, nickname: socket.data.nickname });

    // ✅ Send stored messages to new user
    socket.emit("messageHistory", messageHistory[room]);

    socket.to(room).emit("systemMessage", {
      message: `${socket.data.nickname} has joined the room.`,
    });

    console.log(`${socket.id} (${socket.data.nickname}) joined ${room}`);
  });

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

    // ✅ Save to history for that room
    messageHistory[room].push(msg);

    // ✅ Optional: limit to last 100 messages
    if (messageHistory[room].length > 100) {
      messageHistory[room].shift();
    }

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

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
});
