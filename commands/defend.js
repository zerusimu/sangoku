const { loadJSON, saveJSON } = require("../utils/json");

function execute(general, cmd) {
  const cities = loadJSON("cities.json");

  const city = cities.find(c => String(c.id) === String(general.cityId));

  if (!general.cityId) {
    return { message: "都市に所属していません" };
  }

  if (!city) {
    return { message: "都市が見つからない" };
  }

  city.defenders = city.defenders || [];

  if (!city.defenders.includes(general.id)) {
    city.defenders.unshift(general.id);
  }

  saveJSON("cities.json", cities);

  return { message: "城の守備についた" };
}

module.exports = {
  execute
};