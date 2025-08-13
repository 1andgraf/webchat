// script.js - frontend behavior for chat
const SOCKET_SERVER_URL = (function () {
  if (location.hostname === "localhost") return "http://localhost:3000";
  return "https://webchat-5yr5.onrender.com"; // replace with your deployed server
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

// format timestamp
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

// append system message
function appendSystem(text) {
  const node = document.createElement("div");
  node.className = "system";
  node.textContent = text;
  messagesDiv.appendChild(node);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// append user message
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

// initialize socket if not created
function initSocket() {
  if (socket) return;

  socket = io(SOCKET_SERVER_URL, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    console.log("Connected to socket server", socket.id);
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

  // ✅ Receive full history when joining a room
  socket.on("messageHistory", (history) => {
    messagesDiv.innerHTML = ""; // clear old messages
    history.forEach((msg) =>
      appendMessage(msg.nickname, msg.text, msg.timestamp)
    );
  });
}

// join button
joinBtn.addEventListener("click", () => {
  const nickname = (nicknameInput.value || "").trim() || "Anonymous";
  const room = roomSelect.value;
  if (!room) return alert("Pick a room.");

  initSocket();
  socket.emit("joinRoom", { room, nickname });

  loginSection.classList.add("hidden");
  chatSection.classList.remove("hidden");
  roomIndicator.textContent = `Room: ${room}`;
  messageInput.focus();
});

// leave button
leaveBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  loginSection.classList.remove("hidden");
  chatSection.classList.add("hidden");
});

// send message
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
