const { loadJSON, saveJSON } = require("../utils/json");
const { getRankExp, applyRankExp } = require("../utils/rankSystem");

function execute(general, cmd) {
  const cities = loadJSON("cities.json");
  const city = cities.find(
    c => String(c.id) === String(general.cityId)
  );

  if (!general.cityId) {
    return { message: "都市に所属していません" };
  }

  if (!city) {
    return { message: "都市が見つからない" };
  }

  // =====================
  // 自国都市チェック
  // =====================
  if (city.owner !== general.countryId) {
    return {
      message: "自国の都市でないため守備につけません"
    };
  }

  city.defenders = city.defenders || [];

  if (city.defenders.includes(general.id)) {
    return {
      message: "既に守備についています"
    };
  }

  city.defenders.unshift(general.id);

  saveJSON("cities.json", cities);

  // 守備についたら経験値
  const exp = getRankExp("defend");
  applyRankExp(general, exp);

  return {
    message: `城の守備についた（階級値+${exp}）`
  };
}

module.exports = {
  execute
};