function getRankExp(commandType, result) {
  switch (commandType) {
    case "kunren":
      return 15;


    case "move_safe":
      return 15;

    case "move":
       return result.win ? 25 : 15;

      case "tyouhei":
        return 15;

    default:
      return 0;
  }
}

function applyRankExp(general, exp) {
  general.rankExp = (general.rankExp || 0) + exp;

  // レベルアップ処理（例）
  while (general.rankExp >= getNextRankExp(general.rank)) {
    general.rankExp -= getNextRankExp(general.rank);
    general.rank++;
  }
}

function getNextRankExp(rank) {
  return 100 + rank * 20;
}

module.exports = {
  getRankExp,
  applyRankExp
};