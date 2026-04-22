const { loadJSON } = require("../utils/json"); // ←必ず一番上

module.exports = {
 execute: (general, cmd, generals) => {

    const cities = loadJSON("cities.json");

    const targetCity = cities.find(c => c.id === cmd.data?.targetCity);

    if (!targetCity) {
      return { success: false, message: "都市が存在しない" };
    }

    const currentCity = cities.find(c => c.id === general.cityId);

    if (!currentCity) {
      return { success: false, message: "現在地不明" };
    }

    const dx = Math.abs(currentCity.x - targetCity.x);
    const dy = Math.abs(currentCity.y - targetCity.y);

    const isNeighbor = (dx <= 1 && dy <= 1 && (dx + dy !== 0));

    if (!isNeighbor) {
      return { success: false, message: "隣接していない" };
    }

    general.cityId = targetCity.id;

    return {
      success: true,
      message: `🚶 ${targetCity.name}へ移動`
    };
  }
};