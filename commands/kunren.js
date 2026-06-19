const { getRankExp, applyRankExp } = require("../utils/rankSystem");
const { getTrainingBonus } = require("../utils/trainingBonus");

module.exports = {
  execute(general, cmd) {

    const MAX_KUNREN = 100;

// ★ 最初に経験値
const exp = getRankExp("kunren");
applyRankExp(general, exp);

if (general.kunren >= MAX_KUNREN) {
  return {
    message: `訓練値が上限のため、これ以上訓練できない（階級値+${exp}）`
  };
}

    // ★ 10〜15ランダム
    const up = Math.floor(Math.random() * 6) + 10;
const bonus = getTrainingBonus(
  general.trainingCount || 0
);

const finalUp = Math.floor(up * bonus);

general.kunren += finalUp;
general.trainingCount =
  (general.trainingCount || 0) + 1;
    // ★ 上限処理
    if (general.kunren > MAX_KUNREN) {
      general.kunren = MAX_KUNREN;
    }


    return {
      message: `訓練を行い、訓練値が ${finalUp} 上がり ${general.kunren} になった（階級値+${exp}）`
    };
  }
};