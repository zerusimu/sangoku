const { recruit } = require("../logic/army");

module.exports = {
  execute(general, data) {
    if (!data?.heisyuId || !data?.count) {
      return { success: false, reason: "徴兵データ不足" };
    }

    const result = recruit(
      general,
      data.heisyuId,
      data.count
    );

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      message: `${result.heisyuName} を ${data.count} 人徴兵`
    };
  }
};


