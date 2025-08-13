// script.js
const SOCKET_SERVER_URL =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://webchat-5yr5.onrender.com";

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
  return new Date(ts).toLocaleTimeString();
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

// ------------------ Join / Rejoin ------------------
function initSocket() {
  if (socket) return;

  socket = io(SOCKET_SERVER_URL, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.style.display = "none";
  });
  socket.on("disconnect", (reason) => appendSystem("Disconnected: " + reason));

  socket.on("joined", ({ room, nickname }) => {
    appendSystem(`You joined ${room} as ${nickname}`);
    localStorage.setItem("currentRoom", room);
    localStorage.setItem("nickname", nickname);
    loginSection.classList.add("hidden");
    chatSection.classList.remove("hidden");
    roomIndicator.textContent = `Room: ${room}`;
  });

  socket.on("systemMessage", (msg) => appendSystem(msg.message));

  socket.on("message", (msg) =>
    appendMessage(msg.nickname, msg.text, new Date(msg.timestamp))
  );

  socket.on("messageHistory", (history) => {
    messagesDiv.innerHTML = "";
    history.forEach((msg) =>
      appendMessage(msg.nickname, msg.text, new Date(msg.timestamp))
    );
  });

  socket.on("errorMessage", (err) =>
    appendSystem("Error: " + (err.message || err))
  );
}

// ------------------ Auto Reconnect on Refresh ------------------
window.addEventListener("load", () => {
  const savedRoom = localStorage.getItem("currentRoom");
  const savedNick = localStorage.getItem("nickname");

  if (savedRoom) {
    initSocket();
    socket.emit("joinRoom", {
      room: savedRoom,
      nickname: savedNick || "Anonymous",
    });
  }
});

// ------------------ Join Button ------------------
joinBtn.addEventListener("click", () => {
  const nickname = (nicknameInput.value || "").trim() || "Anonymous";
  const room = roomSelect.value;
  if (!room) return alert("Pick a room.");

  initSocket();
  socket.emit("joinRoom", { room, nickname });
});

// ------------------ Leave Button ------------------
leaveBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  localStorage.removeItem("currentRoom");
  localStorage.removeItem("nickname");
  loginSection.classList.remove("hidden");
  chatSection.classList.add("hidden");
});

sendForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = (messageInput.value || "").trim();
  if (!text || !socket) return;
  socket.emit("message", { text });
  messageInput.value = "";
});

window.addEventListener("load", () => {
  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "none";
});
