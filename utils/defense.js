const { loadJSON, saveJSON } = require("./json");

// 全都市から守備を外す
function removeFromAllDefenders(generalId) {
  const cities = loadJSON("cities.json");

  cities.forEach(city => {
    if (!city.defenders) return;

    city.defenders = city.defenders.filter(id => id !== generalId);
  });

  saveJSON("cities.json", cities);
}

// 指定都市に守備追加（1都市制限）
function setDefender(general, cityId) {
  const cities = loadJSON("cities.json");

  // ① 全部外す
  cities.forEach(city => {
    if (!city.defenders) return;
    city.defenders = city.defenders.filter(id => id !== general.id);
  });

  // ② 追加
  const target = cities.find(c => c.id === cityId);
  if (!target) return;

  if (!target.defenders) target.defenders = [];

  if (!target.defenders.includes(general.id)) {
    target.defenders.push(general.id);
  }

  saveJSON("cities.json", cities);
}

// 兵0なら守備解除
function removeIfDead(general) {
  if (general.army.count > 0) return;

  const cities = loadJSON("cities.json");

  cities.forEach(city => {
    if (!city.defenders) return;

    city.defenders = city.defenders.filter(id => id !== general.id);
  });

  saveJSON("cities.json", cities);
}

module.exports = {
  setDefender,
  removeFromAllDefenders,
  removeIfDead
};