const fs = require("fs");
const path = require("path");

function loadJSON(file) {
  const filePath = path.join(__dirname, "..", "data", file);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveJSON(file, data) {
  const filePath = path.join(__dirname, "..", "data", file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { loadJSON, saveJSON };