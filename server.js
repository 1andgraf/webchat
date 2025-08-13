// server.js
const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const MONGO_URI =
  "mongodb+srv://username:password@cluster0.mongodb.net/myDB?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Message schema
const messageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  nickname: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// Express setup
const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Socket.IO chat server is running");
});

const httpServer = http.createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: "*", // update in production
    methods: ["GET", "POST"],
  },
});

const ROOMS = ["room-1", "room-2", "room-3"];

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.data.nickname = "Anonymous";
  socket.data.room = null;

  // joinRoom: { room, nickname }
  socket.on("joinRoom", async ({ room, nickname }) => {
    if (!ROOMS.includes(room)) {
      socket.emit("errorMessage", { message: "Invalid room." });
      return;
    }

    // leave previous room
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

    console.log(`${socket.id} (${socket.data.nickname}) joined ${room}`);

    try {
      // send last 50 messages in ascending order
      const lastMessages = await Message.find({ room })
        .sort({ timestamp: 1 })
        .limit(50);
      socket.emit("messageHistory", lastMessages); // ✅ match frontend
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  });

  // new message: { text }
  // new message: { text }
  socket.on("message", async ({ text }) => {
    text = text?.trim();
    if (!text) return;

    const room = socket.data.room;
    const nickname = socket.data.nickname || "Anonymous";

    if (!room) {
      socket.emit("errorMessage", { message: "You must join a room first." });
      return;
    }

    const msg = { room, nickname, text, timestamp: new Date() };

    try {
      // save to MongoDB
      await Message.create(msg);

      // Keep only last 100 messages per room
      const count = await Message.countDocuments({ room });
      if (count > 100) {
        // delete oldest messages
        const excess = count - 100;
        await Message.find({ room })
          .sort({ timestamp: 1 })
          .limit(excess)
          .then((oldMessages) =>
            oldMessages.forEach((m) => m.deleteOne().catch(console.error))
          );
      }
    } catch (err) {
      console.error("Error saving message:", err);
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
  console.log("Available rooms:", ROOMS.join(", "));
});
