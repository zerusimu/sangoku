const { loadJSON, saveJSON } = require("../utils/json");
const { simulateBattle } = require("../battle/battle");
const { removeIfDead, removeFromAllDefenders } = require("../utils/defense");
const { addBattleLog } = require("../utils/log");
const { getRankExp, applyRankExp } = require("../utils/rankSystem");
const {
  checkCountryDestroyed
} = require("../utils/country");

const {
  addSystemLog
} = require("../utils/chat");


// =====================
// 自動守備
// =====================
function setAutoDefender(city, general) {
  city.defenders = city.defenders || [];

  if (!city.defenders.includes(general.id)) {
    city.defenders.unshift(general.id);
  }
}


// =====================
// 1戦分の戦闘処理
// =====================
function executeBattle(attacker, defender) {

  const result = simulateBattle(attacker, defender);

  // ---------------------
  // 兵数反映
  // ---------------------
  attacker.army.count = result.attackerRemaining;
  defender.army.count = result.defenderRemaining;

  // ---------------------
  // 戦闘中に0になった場合
  // 忍術2による回復前の判定
  // ---------------------
  if (result.attackerDead) {
    removeIfDead(attacker);
  }

  if (result.defenderDead) {
    removeIfDead(defender);
  }

  return result;
}


// =====================
// 都市制圧処理
// =====================
function conquerCity(general, targetCity, cities, generals, countries) {

  // 制圧前の所有国
  const oldOwner = targetCity.owner;

  // 現在の守備から解除
  removeFromAllDefenders(general.id);

  // 都市を移動
  general.cityId = targetCity.id;

  // 都市制圧
  targetCity.owner = general.countryId;

  // 自動守備
  setAutoDefender(
    targetCity,
    general
  );

  // システムログ
  addSystemLog(
    `🏆 ${general.name} が ${targetCity.name} を制圧しました！`
  );

  // 滅亡判定
  checkCountryDestroyed(
    oldOwner,
    cities,
    generals,
     countries
  );
}


// =====================
// 出兵
// =====================
module.exports = {

  execute: (general, cmd, generals) => {

    const cities = loadJSON("cities.json");
    const countries = loadJSON("countries.json");

    const targetCity = cities.find(
      c => c.id === cmd.data?.targetCity
    );

    if (!targetCity) {
      return {
        success: false,
        message: "都市が存在しない"
      };
    }

// =====================
// 宣戦布告チェック
// =====================

// 自分の国
const attackerCountry = countries.find(
  c => c.id === general.countryId
);

// 攻撃先の国
const defenderCountry = countries.find(
  c => c.id === targetCity.owner
);

// 自国・無所属都市なら戦争チェック不要
if (
  defenderCountry &&
  defenderCountry.id !== general.countryId
) {

  const atWar =
    attackerCountry?.wars?.includes(defenderCountry.id);

  if (!atWar) {
    return {
      success: false,
      message: `⚔️ ${defenderCountry.name} に宣戦布告していないため、出兵できません`
    };
  }
}



    // =====================
    // 防衛武将
    // =====================
    const defenders = generals.filter(
      g =>
        targetCity.defenders?.includes(g.id) &&
        g.id !== general.id
    );


    // =====================
    // 兵力チェック
    // =====================
    if (general.army.count <= 0) {
      return {
        success: false,
        message: "出兵出来ませんでした（兵が0です）"
      };
    }


    let message = "";
    let needSave = false;


    // ==================================================
    // 戦闘あり
    // ==================================================
    if (defenders.length > 0) {

      // ==================================================
      // 第1戦
      // ==================================================

      const defender1 = defenders[0];

      const result1 =
        executeBattle(
          general,
          defender1
        );


      // ---------------------
      // ログ
      // ---------------------
      addBattleLog(
        general,
        result1.log
      );

      addBattleLog(
        defender1,
        result1.log
      );


      // ---------------------
      // 第1戦の経験値
      // ---------------------
      const exp1 = getRankExp(
        "move",
        {
          win: result1.winner === "attacker"
        }
      );

      applyRankExp(
        general,
        exp1
      );


      needSave = true;


      // ---------------------
      // 第1戦敗北
      // ---------------------
      if (result1.winner !== "attacker") {

        const battleLog =
          result1.log.replace(/\n/g, "<br>");

        message =
          `💀 敗北…（階級値+${exp1}）<br>${battleLog}`;

      }


      // ==================================================
      // 第1戦勝利
      // ==================================================
      else {

        // ---------------------
        // 第1戦勝利ログ
        // ---------------------
        let totalLog =
          result1.log;


        // ==================================================
        // 鋒矢の陣
        // ==================================================
        if (
          general.formation === "housi" &&
          defenders.length > 1
        ) {

          const defender2 = defenders[1];


          // ---------------------
          // 鋒矢発動
          // ---------------------
          const houyanozinLog =
            `🔺 鋒矢の陣発動！\n` +
            `⚔️ 第2戦開始！\n` +
            `🛡️ 守備：${defender2.name}`;

          totalLog +=
            "\n" +
            houyanozinLog;


          // battleLog
          addBattleLog(
            general,
            houyanozinLog
          );

          addBattleLog(
            defender2,
            houyanozinLog
          );


          // ==================================================
          // 第2戦
          // ==================================================

          const result2 =
            executeBattle(
              general,
              defender2
            );


          // ---------------------
          // 第2戦ログ
          // ---------------------
          addBattleLog(
            general,
            result2.log
          );

          addBattleLog(
            defender2,
            result2.log
          );


          totalLog +=
            "\n" +
            result2.log;


          // ---------------------
          // 第2戦経験値
          // ---------------------
          const exp2 =
            getRankExp(
              "move",
              {
                win:
                  result2.winner === "attacker"
              }
            );

          applyRankExp(
            general,
            exp2
          );


          needSave = true;


          // ==================================================
          // 第2戦敗北
          // ==================================================

          if (
            result2.winner !== "attacker"
          ) {

            message =
              `💀 第1戦勝利後、第2戦で敗北… ` +
              `（階級値+${exp1 + exp2}）<br>` +
              totalLog;

          }


          // ==================================================
          // 第2戦勝利
          // ==================================================

          else {

            conquerCity(
              general,
              targetCity,
              cities,
              generals,
               countries
            );


            message =
              `🏆 ${targetCity.name} 制圧！ ` +
              `(鋒矢の陣・2連勝)` +
              `（階級値+${exp1 + exp2}）<br>` +
              totalLog;
          }


        }


        // ==================================================
        // 通常の陣形
        // ==================================================
        else {

          // ---------------------
          // 守備武将が残っている
          // ---------------------
          if (defenders.length > 1) {

            const battleLog =
              result1.log.replace(/\n/g, "<br>");

            message =
              `⚔️ 勝利（階級値+${exp1}）<br>` +
              `${battleLog}`;

          }


          // ---------------------
          // 守備武将を全滅
          // ---------------------
          else {

            conquerCity(
              general,
              targetCity,
              cities,
              generals,
               countries
            );


            const battleLog =
              result1.log.replace(/\n/g, "<br>");

            message =
              `🏆 ${targetCity.name} 制圧！` +
              `（階級値+${exp1}）<br>` +
              `${battleLog}`;
          }

        }

      }


    }


    // ==================================================
    // 無人都市
    // ==================================================
    else {

      const exp =
        getRankExp("move_safe");

      applyRankExp(
        general,
        exp
      );


      conquerCity(
        general,
        targetCity,
        cities,
        generals,
         countries
      );


      message =
        `${targetCity.name} に到着（無人）` +
        `（階級値+${exp}）`;

      needSave = true;
    }


    // ==================================================
    // 最後に1回だけ保存
    // ==================================================
    if (needSave) {

      saveJSON(
        "cities.json",
        cities
      );

      saveJSON(
        "generals.json",
        generals
      );
    }


    console.log(
      "同一チェック:",
      generals.includes(general)
    );


    return {
      success: true,
      message
    };
  }
};