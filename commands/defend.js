const { loadJSON, saveJSON } = require("../utils/json");
const { getRankExp, applyRankExp } = require("../utils/rankSystem");


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

// 守備についたら経験値
const exp = getRankExp("defend");
applyRankExp(general, exp);


  return { message: "城の守備についた" };
}

module.exports = {
  execute
};