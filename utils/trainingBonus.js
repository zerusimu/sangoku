function getTrainingBonus(trainingCount) {
  if (trainingCount >= 120) return 1.6;
  if (trainingCount >= 80) return 1.4;
  if (trainingCount >= 40) return 1.2;
  return 1.0;
}

module.exports = { getTrainingBonus };