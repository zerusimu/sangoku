module.exports = {
 execute(general, cmd) {
    const MAX_KUNREN = 100;

    if (general.kunren >= MAX_KUNREN) {
      return {
        message: "訓練値が上限のため、これ以上訓練できない"
      };
    }

    general.kunren += 1;

    return {
      message: `訓練を行い、訓練値が ${general.kunren} に上がった`
    };
  }
};




