function getSalary(rankPoint) {
  const bonusLevel = Math.floor(rankPoint / 800);

  return 1000 + bonusLevel * 500;
}

module.exports = {
  getSalary
};