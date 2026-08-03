const { loadJSON } = require("./json");

const equipments = loadJSON("equipments.json");


function getEquipment(general){

  const result = {
    weapon: null,
    armor: null,
    book: null,
    flag: null
  };


  if(!general.equipment){
    return result;
  }


  Object.keys(result).forEach(type=>{

    const id = general.equipment[type];

    if(!id) return;


    result[type] =
      equipments.find(
        e => e.id === id
      );

  });


  return result;

}



module.exports = {
  getEquipment
};