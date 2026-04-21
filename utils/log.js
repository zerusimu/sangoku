function addBattleLog(general, logText) {
  if (!general.battleLog) general.battleLog = [];

  general.battleLog.unshift({
    message: logText,
    time: Date.now()
  });

  if (general.battleLog.length > 50) {
    general.battleLog.pop();
  }
}

module.exports = { addBattleLog };