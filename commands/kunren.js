module.exports = {
  execute(general, command) {
    const MAX_KUNREN = 100;

    if (general.kunren >= MAX_KUNREN) {
      return false;
    }

    const gain = Math.floor(Math.random() * 6) + 15;
    general.kunren = Math.min(
      general.kunren + gain,
      MAX_KUNREN
    );

    return true;
  }
};

