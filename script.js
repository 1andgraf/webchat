// script.js - frontend behavior for chat
// IMPORTANT: set SOCKET_SERVER_URL to your deployed socket server URL, e.g.
// const SOCKET_SERVER_URL = "https://your-socket-server.example.com";
const SOCKET_SERVER_URL = (function () {
  // helpful default for local development:
  if (location.hostname === "localhost") return "http://localhost:3000";
  // For production, instruct the user to set this in the deployed frontend (or edit below)
  // Replace the placeholder with your server URL after you deploy the server.
  return "https://webchat-5yr5.onrender.com";
})();

let socket = null;

const loginSection = document.getElementById("login-section");
const chatSection = document.getElementById("chat-section");
const joinBtn = document.getElementById("join-btn");
const leaveBtn = document.getElementById("leave-btn");
const nicknameInput = document.getElementById("nickname");
const roomSelect = document.getElementById("room-select");
const messagesDiv = document.getElementById("messages");
const roomIndicator = document.getElementById("room-indicator");
const sendForm = document.getElementById("send-form");
const messageInput = document.getElementById("message-input");

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function appendSystem(text) {
  const node = document.createElement("div");
  node.className = "system";
  node.textContent = text;
  messagesDiv.appendChild(node);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendMessage(nickname, text, ts) {
  const wrapper = document.createElement("div");
  wrapper.className = "msg";
  wrapper.innerHTML = `
    <div class="meta"><strong>${escapeHtml(
      nickname
    )}</strong> · <span>${formatTime(ts)}</span></div>
    <div class="text">${escapeHtml(text)}</div>
  `;
  messagesDiv.appendChild(wrapper);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// simple escaping
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m];
  });
}

joinBtn.addEventListener("click", () => {
  const nickname = (nicknameInput.value || "").trim() || "Anonymous";
  const room = roomSelect.value;

  if (!room) return alert("Pick a room.");

  // If no socket yet, create socket
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"], // Socket.IO will pick best available
    });

    socket.on("connect", () => {
      console.log("connected to socket server", socket.id);
    });

    socket.on("disconnect", (reason) => {
      appendSystem("Disconnected from server: " + reason);
    });

    socket.on("joined", (payload) => {
      appendSystem(`You joined ${payload.room} as ${payload.nickname}`);
    });

    socket.on("systemMessage", (payload) => {
      appendSystem(payload.message);
    });

    socket.on("message", (msg) => {
      appendMessage(msg.nickname, msg.text, msg.timestamp);
    });

    socket.on("errorMessage", (err) => {
      appendSystem("Error: " + (err.message || JSON.stringify(err)));
    });
  }

  // send join request
  socket.emit("joinRoom", { room, nickname });

  // UI switch
  loginSection.classList.add("hidden");
  chatSection.classList.remove("hidden");
  roomIndicator.textContent = `Room: ${room}`;
  messageInput.focus();

  // clear messages area
  messagesDiv.innerHTML = "";
});

leaveBtn.addEventListener("click", () => {
  if (!socket) return;
  // simply reload to reset client-side state, or we could emit leave and go back to join UI
  socket.disconnect();
  socket = null;
  loginSection.classList.remove("hidden");
  chatSection.classList.add("hidden");
});

sendForm.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const text = (messageInput.value || "").trim();
  if (!text) return;
  if (!socket) {
    alert("Not connected.");
    return;
  }
  socket.emit("message", { text });
  messageInput.value = "";
});
