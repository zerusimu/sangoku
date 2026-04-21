const { loadJSON, saveJSON } = require("../utils/json");
const { simulateBattle } = require("../battle/battle");
const { removeIfDead, removeFromAllDefenders } = require("../utils/defense");
const { addBattleLog } = require("../utils/log");

module.exports = {
  execute: (general, cmd) => {

    const cities = loadJSON("cities.json");
    const generals = loadJSON("generals.json");

    const targetCity = cities.find(c => c.id === cmd.data?.targetCity);

    if (!targetCity) {
      return { success: false, message: "都市が存在しない" };
    }

    // =====================
    // 防衛チェック
    // =====================
    const defenders = generals.filter(
      g => g.cityId === targetCity.id && g.id !== general.id
    );

  // 兵が0なら出兵できない
  if (general.army.count <= 0) {
    return {
      success: false,
      message: "出兵出来ませんでした（兵が0です）"
    };
  }




    // =====================
    // 戦闘あり
    // =====================
    if (defenders.length > 0) {

      const defender = defenders[0];

      const result = simulateBattle(general, defender);


// ★ これ追加（超重要）
console.log("===== 戦闘結果 =====");
console.log("攻撃側:", general.name, "兵:", general.army.count);
console.log("防御側:", defender.name, "兵:", defender.army.count);
console.log("勝者:", result.winner);
console.log("攻撃側残兵:", result.attackerRemaining);
console.log("防御側残兵:", result.defenderRemaining);
console.log("ログ:", result.log);
console.log("battleLog:", result.log);

// ★ここ追加
addBattleLog(general, result.log);
addBattleLog(defender, result.log);




      // 🔥 兵数を反映（超重要）
      general.army.count = result.attackerRemaining;
      defender.army.count = result.defenderRemaining;

      // 🔥 兵0なら守備解除
      removeIfDead(general);
      removeIfDead(defender);

      // 🔥 ログ整形（改行対応）
    const battleLog = result.log.replace(/\n/g, "<br>");

      // ❌ 負け → 移動しない
      if (result.winner !== "attacker") {
        return {
          success: true,
          message: `💀 敗北…<br>${battleLog}`
        };
      }

      // ❌ 敵がまだいる → 移動しない
      if (defenders.length > 1) {
        return {
          success: true,
          message: `⚔️ 勝利<br>${battleLog}`
        };
      }

      // =====================
      // 勝利 → 移動＆占領
      // =====================

      // 守備解除（移動するので）
      removeFromAllDefenders(general.id);

      general.cityId = targetCity.id;

      // 都市の所有者変更
      targetCity.owner = general.countryId;

      saveJSON("cities.json", cities);
      saveJSON("generals.json", generals);

      return {
        success: true,
        message: `🏆 ${targetCity.name} 制圧！<br>${battleLog}`
      };
    }

    // =====================
    // 無人 → 移動＆占領
    // =====================

    removeFromAllDefenders(general.id);

    general.cityId = targetCity.id;
    targetCity.owner = general.countryId;

    saveJSON("cities.json", cities);
    saveJSON("generals.json", generals);

    return {
      success: true,
      message: `${targetCity.name} に到着（無人）`
    };
  }
};