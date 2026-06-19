module.exports = {
  execute(general) {

    if ((general.trainingCount || 0) < 160) {
      return {
        message: "特訓は未解放です"
      };
    }

    const up = Math.floor(Math.random() * 16) + 25;

    general.kunren += up;

    if (general.kunren > 150) {
      general.kunren = 150;
    }

    general.trainingCount++;

    return {
      success: true,
      message:
        `特訓を行い訓練値が${up}上昇した`
    };
  }
};