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
  general.rankPoint = (general.rankPoint || 0) + exp;
}

function getNextRankExp(rank) {
  return 100 + rank * 20;
}

module.exports = {
  getRankExp,
  applyRankExp
};