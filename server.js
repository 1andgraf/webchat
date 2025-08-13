const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

// ==== CONFIG ====
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://1andgraf:1234@webchat.zslpi88.mongodb.net/?retryWrites=true&w=majority&appName=webchat";
const PORT = process.env.PORT || 3000;
const ROOMS = ["room-1", "room-2", "room-3"];

// ==== CONNECT TO MONGODB ====
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ==== MESSAGE MODEL ====
const messageSchema = new mongoose.Schema({
  room: String,
  nickname: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// ==== EXPRESS & SOCKET.IO SETUP ====
const app = express();
app.use(cors());
app.get("/", (req, res) =>
  res.send("Socket.IO chat server is running with MongoDB")
);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ==== SOCKET.IO LOGIC ====
io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);
  socket.data.nickname = "Anonymous";
  socket.data.room = null;

  socket.on("joinRoom", async ({ room, nickname }) => {
    if (!ROOMS.includes(room)) {
      socket.emit("errorMessage", { message: "Invalid room." });
      return;
    }

    // Leave previous room
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

    // ✅ Fetch last 50 messages from DB
    const history = await Message.find({ room })
      .sort({ timestamp: 1 })
      .limit(50);
    socket.emit("messageHistory", history);

    socket.to(room).emit("systemMessage", {
      message: `${socket.data.nickname} has joined the room.`,
    });

    console.log(`${socket.data.nickname} joined ${room}`);
  });

  socket.on("message", async ({ text }) => {
    const trimmedText = (text || "").trim();
    if (!trimmedText) return;

    const room = socket.data.room;
    if (!room) {
      socket.emit("errorMessage", { message: "You must join a room first." });
      return;
    }

    const msg = new Message({
      room,
      nickname: socket.data.nickname,
      text: trimmedText,
    });

    await msg.save(); // ✅ Save to DB

    io.to(room).emit("message", msg);
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    const nickname = socket.data.nickname;
    if (room) {
      socket.to(room).emit("systemMessage", {
        message: `${nickname} has disconnected.`,
      });
    }
    console.log("Client disconnected:", socket.id);
  });
});

// ==== START SERVER ====
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
