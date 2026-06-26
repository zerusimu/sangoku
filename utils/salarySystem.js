function getSalary(rankPoint) {
  return 1000 + Math.floor(rankPoint / 800) * 500;
}

function processSalary(general) {

  const now = new Date();

  if (!general.lastSalaryAt) {
    general.lastSalaryAt = now.getTime();
    return;
  }

  const last = new Date(general.lastSalaryAt);

  let rewardCount = 0;

  const cursor = new Date(last);

  cursor.setSeconds(0);
  cursor.setMilliseconds(0);

  while (cursor <= now) {

    const hour = cursor.getHours();

    if (
      hour === 9 ||
      hour === 21
    ) {
      rewardCount++;
    }

    cursor.setDate(
      cursor.getDate() + (hour === 9 ? 0 : 1)
    );

    cursor.setHours(
      hour === 9 ? 21 : 9
    );
  }

  if (rewardCount <= 0) {
    return;
  }

  const reward =
    getSalary(general.rankPoint);

  const total = reward * rewardCount;

  general.money =
    (general.money || 0) + total;

  general.rice =
    (general.rice || 0) + total;

  general.lastSalaryAt =
    now.getTime();

  general.offlineReward = {
    count: rewardCount,
    money: total,
    rice: total
  };
}

module.exports = {
  processSalary
};