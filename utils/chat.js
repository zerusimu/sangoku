const { loadJSON, saveJSON } = require("./json");

// =====================
// 全体チャット
// =====================
function addGlobalChat(generalName, message) {
  const chats = loadJSON("chat.json") || {};

  if (!chats.global) {
    chats.global = [];
  }

  chats.global.unshift({
    generalName,
    message,
    time: Date.now()
  });

  chats.global = chats.global.slice(0, 100);

  saveJSON("chat.json", chats);
}

function getGlobalChat() {
  const chats = loadJSON("chat.json") || {};

  return (chats.global || []).slice(0, 30);
}

// =====================
// 国チャット
// =====================
function addCountryChat(countryId, generalName, message) {
  const chats = loadJSON("chat.json") || {};

  if (!chats.country) {
    chats.country = [];
  }

  chats.country.unshift({
    countryId,
    generalName,
    message,
    time: Date.now()
  });

  chats.country = chats.country.slice(0, 100);

  saveJSON("chat.json", chats);
}

function getCountryChat(countryId) {
  const chats = loadJSON("chat.json") || {};

  return (chats.country || [])
    .filter(c => c.countryId === countryId)
    .slice(0, 30);
}

// =====================
// 個人チャット
// =====================
function addPrivateChat(fromId, toId, fromName, message) {
  const chats = loadJSON("chat.json") || {};

  if (!chats.private) {
    chats.private = [];
  }

  chats.private.unshift({
    fromId,
    toId,
    fromName,
    message,
    time: Date.now()
  });

  chats.private = chats.private.slice(0, 300);

  saveJSON("chat.json", chats);
}

function getPrivateChat(userId, targetId) {
  const chats = loadJSON("chat.json") || {};

  return (chats.private || [])
    .filter(c =>
      (c.fromId === userId && c.toId === targetId) ||
      (c.fromId === targetId && c.toId === userId)
    )
    .slice(0, 50);
}

// =====================
// システムチャット
// =====================
function addSystemChat(message) {

  const chats = loadJSON("chat.json") || {};

  if (!chats.system) {
    chats.system = [];
  }

  chats.system.unshift({
    message,
    time: Date.now()
  });

  // 最新300件だけ保存
  chats.system = chats.system.slice(0, 300);

  saveJSON("chat.json", chats);
}

function getSystemChat() {

  const chats = loadJSON("chat.json") || {};

  return (chats.system || []).slice(0, 100);
}








module.exports = {
  addGlobalChat,
  getGlobalChat,

  addCountryChat,
  getCountryChat,

  addPrivateChat,
  getPrivateChat,

  addSystemChat,
  getSystemChat
};