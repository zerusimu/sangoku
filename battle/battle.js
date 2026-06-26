const { loadJSON } = require("../utils/json");
const skills = require("../data/skills.json");
const formations = require("../data/formations.json");

function ensureSkills(g) {
  if (!g.skills) g.skills = [];
}

function getFormation(id) {
  return formations.find(f => f.id === id);
}

// 兵種タイプ判定
function getType(id) {
  if (id.includes("infantry")) return "infantry";
  if (id.includes("cavalry")) return "cavalry";
  if (id.includes("archer")) return "archer";
  return "other";
}

function chance(percent) {
  return Math.random() * 100 < percent;
}






// 3すくみ補正
function getAdvantage(attackerType, defenderType) {
  if (
    (attackerType === "infantry" && defenderType === "cavalry") ||
    (attackerType === "cavalry" && defenderType === "archer") ||
    (attackerType === "archer" && defenderType === "infantry")
  ) {
    return 2; // 有利
  }
  return 0;
}

function simulateBattle(attacker, defender) {

ensureSkills(attacker);
ensureSkills(defender);



  const heisyu = loadJSON("heisyu.json");


console.log("攻撃兵種:", attacker.army);
console.log("防御兵種:", defender.army);
console.log(
  "防御武将全体:",
  JSON.stringify(defender, null, 2)
);

if (!attacker.army?.type) {
  throw new Error(`${attacker.name} の army.type がありません`);
}

if (!defender.army?.type) {
  throw new Error(`${defender.name} の army.type がありません`);
}

const atkUnit = heisyu.find(
  h => h.id === attacker.army.type
);

const defUnit = heisyu.find(
  h => h.id === defender.army.type
);

if (!atkUnit) {
  throw new Error(
    `${attacker.name} の兵種 ${attacker.army.type} が存在しません`
  );
}

if (!defUnit) {
  throw new Error(
    `${defender.name} の兵種 ${defender.army.type} が存在しません`
  );
}






console.log("atkUnit:", atkUnit);
console.log("defUnit:", defUnit);

if (!atkUnit) {
  throw new Error(
    `攻撃側兵種が見つかりません: ${attacker.army.type}`
  );
}

if (!defUnit) {
  throw new Error(
    `防御側兵種が見つかりません: ${defender.army.type}`
  );
}





  const log = [];

const atkFormation =
  getFormation(attacker.formation || "gyorin");

const defFormation =
  getFormation(defender.formation || "gyorin");


  // =====================
  // 基本ステータス
  // =====================
  let atkPower = atkUnit.params.atk + Math.floor(attacker.str * attacker.str / 10)
    + Math.floor(attacker.int / 10) 
    +  Math.floor(attacker.cha / 10);  

  let atkDef = atkUnit.params.def 
   + Math.floor(attacker.kunren / 10)  ;

  let defPower = defUnit.params.atk + Math.floor(defender.str / 10)
   + Math.floor(defender.int / 10)
   +  Math.floor(defender.cha / 10)  ;
  let defDef = defUnit.params.def 
    + Math.floor(defender.kunren / 10) ;


//----------------------------------------
// 陣形　-----------------------------------
// ----------------------------------------

if (atkFormation.id === "gyorin") {
  atkPower = Math.floor(atkPower * 1.15);
  log.push("🐟 魚鱗の陣発動！攻撃+15%");
}

if (defFormation.id === "gyorin") {
  defPower = Math.floor(defPower * 1.15);
  log.push("🐟 敵軍 魚鱗の陣発動！");
}

if (atkFormation.id === "gankou") {
  atkDef = Math.floor(atkDef * 1.15);
  log.push("🦢 雁行の陣発動！防御+15%");
}

if (defFormation.id === "gankou") {
  defDef = Math.floor(defDef * 1.15);
  log.push("🦢 敵軍 雁行の陣発動！");
}

if (atkFormation.id === "engetsu") {

  const bonus = Math.min(
    40,
    Math.max(
      0,
      defender.army.count - attacker.army.count
    )
  );

  atkPower += bonus;

  log.push(
    `🌙 偃月の陣発動！攻撃+${bonus}`
  );
}

if (defFormation.id === "engetsu") {

  const bonus = Math.min(
    40,
    Math.max(
      0,
      attacker.army.count - defender.army.count
    )
  );

  defPower += bonus;

  log.push(
    `🌙 敵軍 偃月の陣発動！攻撃+${bonus}`
  );
}

if (atkFormation.id === "kakuyoku") {

  const bonus = Math.min(
    40,
    Math.max(
      0,
      attacker.army.count - defender.army.count
    )
  );

  atkPower += bonus;

  log.push(
    `🪽 鶴翼の陣発動！攻撃+${bonus}`
  );
}

if (defFormation.id === "kakuyoku") {

  const bonus = Math.min(
    40,
    Math.max(
      0,
      defender.army.count - attacker.army.count
    )
  );

  defPower += bonus;

  log.push(
    `🪽 敵軍 鶴翼の陣発動！攻撃+${bonus}`
  );
}








// =====================
// 強襲（攻撃側のみ）
// =====================
let assaultRate = 0;

if (attacker.skills?.includes("kyoushuu3")) {
  assaultRate = 0.15;
} else if (attacker.skills?.includes("kyoushuu2")) {
  assaultRate = 0.10;
} else if (attacker.skills?.includes("kyoushuu1")) {
  assaultRate = 0.05;
}

if (assaultRate > 0) {
  defPower = Math.floor(defPower * (1 - assaultRate));
  defDef = Math.floor(defDef * (1 - assaultRate));

  log.push(`💥 強襲発動！相手能力-${Math.floor(assaultRate * 100)}%`);
}








  // 攻撃力差補正
  atkPower += Math.floor((attacker.str - defender.str) / 10);
  defPower += Math.floor((defender.str - attacker.str) / 10);

  // 最低1保証
  atkPower = Math.max(1, atkPower);
  defPower = Math.max(1, defPower);

  // =====================
  // 3すくみ
  // =====================
  const atkType = getType(attacker.army.type);
  const defType = getType(defender.army.type);

  const atkBonus = getAdvantage(atkType, defType);
  const defBonus = getAdvantage(defType, atkType);

  // =====================
  // 最大ダメージ
  // =====================
 const atkMax = Math.max(3, Math.floor(atkPower * 1.2 - defDef * 0.7 + atkBonus));
const defMax = Math.max(3, Math.floor(defPower * 1.2 - atkDef * 0.7 + defBonus));

  // =====================
  // 初期ログ
  // =====================
  log.push(`⚔️ 戦闘開始`);
  log.push(`自分 攻撃:${atkPower} 防御:${atkDef}`);
  log.push(`相手 攻撃:${defPower} 防御:${defDef}`);
  log.push(`最大ダメージ 自:${atkMax} / 相:${defMax}`);

  let atkCount = attacker.army.count;
  let defCount = defender.army.count;

  let turn = 1;

  // =====================
  // 戦闘ループ
  // =====================
while (atkCount > 0 && defCount > 0) {

  let atkDamage = Math.floor(Math.random() * atkMax) + 1;
  let defDamage = Math.floor(Math.random() * defMax) + 1;

// 格闘1（最低保証）
if (attacker.skills.includes("kakutou1")) {
     const rate = attacker.str / 10;
  if (chance(rate)) {
  
    const minDamage = Math.floor(maxDamage / 2);
    atkDamage = Math.max(damage, minDamage);
  }
}

if (defender.skills.includes("kakutou1")) {
     const rate = defender.str / 10;
  if (chance(rate)) {
  
    const minDamage = Math.floor(maxDamage / 2);
    defDamage = Math.max(damage, minDamage);
  }
}


// 格闘2（最大値アップ）
if (attacker.skills.includes("kakutou2")) {
    const rate = attacker.str / 8;
  if (chance(rate)) {
   atkDamage += 1;
  }
}
if (defender.skills.includes("kakutou2")) {
    const rate = defender.str / 8;
  if (chance(rate)) {
   defDamage += 1;
  }
}



// 格闘3（2倍）
if (attacker.skills.includes("kakutou3")) {
   const rate = attacker.str / 12;
  if (chance(rate)) {
  atkDamage *= 2;
  }
}

if (defender.skills.includes("kakutou3")) {
   const rate = defender.str / 12;
  if (chance(rate)) {
  defDamage *= 2;
  }
}


  // =====================
  // 忍術1（防御側ダメージ無効）
  // =====================
  if (defender.skills?.includes("ninzyutu1")) {
    const rate = defender.lea / 8;
    if (chance(rate)) {
      atkDamage = 0;
      log.push("🌀 忍術1発動！相手ダメージ無効！");
    }
  }

  // =====================
  // 忍術1（攻撃側も一応対応）
  // =====================
  if (attacker.skills?.includes("ninzyutu1")) {
    const rate = attacker.lea / 8;
    if (chance(rate)) {
      defDamage = 0;
      log.push("🌀 忍術1発動！自分ダメージ無効！");
    }
  }

  // =====================
  // ダメージ適用
  // =====================
  defCount -= atkDamage;
  atkCount -= defDamage;

  // =====================
  // 忍術3（反撃）
  // =====================
// 防御側の反撃
if (defender.skills?.includes("ninzyutu3")) {
  const rate = defender.lea / 10;
  if (chance(rate)) {
    const counter = atkDamage;
    log.push(`⚡ 防御側 忍術3！反撃 ${counter}ダメージ！`);
  }
}

// 攻撃側の反撃
if (attacker.skills?.includes("ninzyutu3")) {
  const rate = attacker.lea / 10;
  if (chance(rate)) {
    const counter = defDamage;
    log.push(`⚡ 攻撃側 忍術3！反撃 ${counter}ダメージ！`);
  }
}
  // =====================
  // ログ
  // =====================
  log.push(
    `${turn}ターン目 ▶ 自:${atkDamage}ダメ / 相:${defDamage}ダメ`
  );
  log.push(
    `残兵 ▶ 自:${Math.max(0, atkCount)} / 相:${Math.max(0, defCount)}`
  );

  turn++;
}

  // =====================
  // 勝敗
  // =====================
  let winner;

  if (atkCount <= 0 && defCount <= 0) {
    winner = "attacker"; // 相打ちは攻撃勝ち
  } else if (atkCount <= 0) {
    winner = "defender";
  } else {
    winner = "attacker";
  }

  log.push(
    winner === "attacker"
      ? "🏆 攻撃側の勝利！"
      : "💀 防御側の勝利！"
  );

// =====================
// 戦闘中に0になったか記録
// =====================
const attackerDead = atkCount <= 0;
const defenderDead = defCount <= 0;


// =====================
// 忍術2（戦闘後回復）
// =====================
const atkLost = attacker.army.count - Math.max(0, atkCount);
const defLost = defender.army.count - Math.max(0, defCount);

// 攻撃側
if (attacker.skills?.includes("ninzyutu2")) {
  const rate = 0.2 + Math.random() * 0.3;
  const heal = Math.floor(atkLost * rate);
  atkCount += heal;
  log.push(`🌿 忍術2発動！自軍 ${heal}回復`);
}

// 防御側
if (defender.skills?.includes("ninzyutu2")) {
  const rate = 0.2 + Math.random() * 0.3;
  const heal = Math.floor(defLost * rate);
  defCount += heal;
  log.push(`🌿 忍術2発動！敵軍 ${heal}回復`);
}







return {
  winner,
  attackerRemaining: Math.max(0, atkCount),
  defenderRemaining: Math.max(0, defCount),
  defenderDead: Math.max(0, defCount) <= 0,
  attackerDead: Math.max(0, atkCount) <= 0,
  log: log.join("\n")
};
}

module.exports = { simulateBattle };