const { loadJSON, saveJSON } = require("../utils/json");
const { simulateBattle } = require("../battle/battle");
const { removeIfDead, removeFromAllDefenders } = require("../utils/defense");
const { addBattleLog } = require("../utils/log");
const { getRankExp, applyRankExp } = require("../utils/rankSystem");

module.exports = {
 execute: (general, cmd, generals) => {

    const cities = loadJSON("cities.json");

    const targetCity = cities.find(c => c.id === cmd.data?.targetCity);

    if (!targetCity) {
      return { success: false, message: "都市が存在しない" };
    }

    // 防衛チェック
    const defenders = generals.filter(
      g => g.cityId === targetCity.id && g.id !== general.id
    );

    if (general.army.count <= 0) {
      return {
        success: false,
        message: "出兵出来ませんでした（兵が0です）"
      };
    }

    let message = "";
    let needSave = false; // ★ 保存フラグ

    // =====================
    // 戦闘あり
    // =====================
    if (defenders.length > 0) {

      const defender = defenders[0];
      const result = simulateBattle(general, defender);

      const exp = getRankExp("move", {
        win: result.winner === "attacker"
      });
      applyRankExp(general, exp);

      addBattleLog(general, result.log);
      addBattleLog(defender, result.log);

      // 兵数反映
      general.army.count = result.attackerRemaining;
      defender.army.count = result.defenderRemaining;

      removeIfDead(general);
      removeIfDead(defender);

      const battleLog = result.log.replace(/\n/g, "<br>");

      needSave = true; // ★ 戦闘したら必ず保存

      // 負け
      if (result.winner !== "attacker") {
        message = `💀 敗北…（階級値+${exp}）<br>${battleLog}`;
      }

      // 勝利（敵まだいる）
      else if (defenders.length > 1) {
        message = `⚔️ 勝利（階級値+${exp}）<br>${battleLog}`;
      }

      // 制圧
      else {
        removeFromAllDefenders(general.id);
        general.cityId = targetCity.id;
        targetCity.owner = general.countryId;

        message = `🏆 ${targetCity.name} 制圧！（階級値+${exp}）<br>${battleLog}`;
      }
    }

    // =====================
    // 無人
    // =====================
    else {

      const exp = getRankExp("move_safe");
      applyRankExp(general, exp);

      removeFromAllDefenders(general.id);
      general.cityId = targetCity.id;
      targetCity.owner = general.countryId;

      message = `${targetCity.name} に到着（無人）（階級値+${exp}）`;

      needSave = true;
    }

    // =====================
    // ★ 最後に1回だけ保存（超重要）
    // =====================
    if (needSave) {
      saveJSON("cities.json", cities);
      saveJSON("generals.json", generals);
    }
console.log("同一チェック:", generals.includes(general));
    return {
      success: true,
      message
    };
  }
};