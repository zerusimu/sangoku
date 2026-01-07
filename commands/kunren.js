module.exports = function (general, command) {
  // 最大訓練値
  const MAX_KUNREN = 100;

  // すでに最大なら訓練不可
  if (general.kunren >= MAX_KUNREN) {
    return false;
  }

  // 増加量（15～20）
  const gain = Math.floor(Math.random() * 6) + 15;

  // 実際に増やせる量（100を超えない）
  const newValue = Math.min(
    general.kunren + gain,
    MAX_KUNREN
  );

  // コスト（必要なければ削除OK）
  const costMoney = 0;
  const costRice = 0;

  if (general.money < costMoney || general.rice < costRice) {
    return false;
  }

  general.money -= costMoney;
  general.rice -= costRice;
  general.kunren = newValue;

  return true;
};
