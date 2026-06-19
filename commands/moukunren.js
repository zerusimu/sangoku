const { getRankExp, applyRankExp } = require("../utils/rankSystem");

module.exports = {
  execute: (general) => {

    if (general.rankPoint < 5000) {
      return {
        message: "階級値が足りません"
      };
    }

const exp = getRankExp("moukunren");
applyRankExp(general, exp);






if (general.kunren >= 100) {
  return {
    message: `訓練値が上限のため、これ以上訓練できない（階級値+${exp}）`
  };
}



    const up = Math.floor(Math.random() * 10) + 30;
const bonus = getTrainingBonus(
  general.trainingCount || 0
);

const finalUp = Math.floor(up * bonus);

general.kunren += finalUp;

general.trainingCount =
  (general.trainingCount || 0) + 1;
    if (general.kunren > 100) {
      general.kunren = 100;
    }

    
    return {
      success: true,
      message: `猛訓練を行い、訓練値が${finalUp}上がり${general.kunren}になった（階級値+${exp})`
    };
  }
};