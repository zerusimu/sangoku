const heisyuList = require("../data/heisyu.json");

module.exports = {
  execute(general, data) {
    const { heisyuId, count } = data;
    const h = heisyuList.find(h => h.id === heisyuId);
    if (!h) {
      return { success: false, reason: "兵種不明" };
    }

    const money = h.costMoney * count;
    const rice = h.costRice * count;

    if (general.money < money) {
      return { success: false, reason: "金不足" };
    }
    if (general.rice < rice) {
      return { success: false, reason: "米不足" };
    }

    // ★ 実行時に支払い
    general.money -= money;
    general.rice -= rice;

    general.soldiers ||= {};
    general.soldiers[heisyuId] =
      (general.soldiers[heisyuId] || 0) + count;

    return {
      success: true,
      message: `${h.name}を${count}人徴兵`
    };
  }
};

