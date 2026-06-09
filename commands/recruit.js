const { saveJSON } = require("../utils/json");

module.exports = {
  execute: (general, cmd, generals) => {

    const targetName = cmd.data?.target;
    const message = cmd.data?.message;

    if (!targetName) {
      return {
        success: false,
        message: "登用相手を指定してください"
      };
    }

    if (!message) {
      return {
        success: false,
        message: "メッセージを入力してください"
      };
    }

    if (message.length > 200) {
      return {
        success: false,
        message: "メッセージは200文字以内です"
      };
    }

    const target = generals.find(
      g => g.name === targetName
    );

    if (!target) {
      return {
        success: false,
        message: "対象武将が存在しません"
      };
    }

    if (target.id === general.id) {
      return {
        success: false,
        message: "自分には送れません"
      };
    }

    if (!target.recruitOffers) {
      target.recruitOffers = [];
    }

    target.recruitOffers.push({
      id: Date.now(),

      fromId: general.id,
      fromName: general.name,

      countryId: general.countryId,

      message,

      createdAt: Date.now()
    });

    saveJSON("generals.json", generals);

    return {
      success: true,
      message: `${target.name} に登用状を送りました`
    };
  }
};