const { addCountryChat } = require("../utils/chat");

module.exports = {
  execute(general, cmd) {

    const message = (cmd.data?.message || "").trim();

    if (!message) {
      return {
        success: false,
        message: "メッセージを入力してください"
      };
    }

    if (!general.countryId) {
      return {
        success: false,
        message: "国に所属していません"
      };
    }

    addCountryChat(
      general.countryId,
      general.name,
      message
    );

    return {
      success: true,
      message: "チャットを送信しました"
    };
  }
};