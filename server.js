// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

// ----------------- MongoDB -----------------
const MONGO_URI =
  "mongodb+srv://1andgraf:1234@webchat.zslpi88.mongodb.net/?retryWrites=true&w=majority&appName=webchat"; // <-- replace with your MongoDB URI
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  nickname: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// ----------------- Express + Socket.IO -----------------
const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Socket.IO chat server running");
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const ROOMS = ["room-1", "room-2", "room-3"];

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.data.nickname = "Anonymous";
  socket.data.room = null;

  socket.on("joinRoom", async ({ room, nickname }) => {
    if (!ROOMS.includes(room)) {
      socket.emit("errorMessage", { message: "Invalid room." });
      return;
    }

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
    socket.to(room).emit("systemMessage", {
      message: `${socket.data.nickname} has joined the room.`,
    });

    // Load last 1000 messages from this room
    try {
      const lastMessages = await Message.find({ room })
        .sort({ timestamp: -1 }) // newest first
        .limit(500);
      socket.emit("messageHistory", lastMessages);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  });

  socket.on("message", async ({ text }) => {
    text = String(text || "").trim();
    if (!text) return;

    const room = socket.data.room;
    const nickname = socket.data.nickname || "Anonymous";
    if (!room) {
      socket.emit("errorMessage", { message: "Join a room first." });
      return;
    }

    const msg = { room, nickname, text, timestamp: new Date() };

    try {
      await Message.create(msg);
    } catch (err) {
      console.error("Error saving message:", err);
    }

    io.to(room).emit("message", msg);
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    const nickname = socket.data.nickname;
    if (room) {
      socket.to(room).emit("systemMessage", {
        message: `${nickname} disconnected.`,
      });
    }
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
  console.log("Rooms:", ROOMS.join(", "));
});
