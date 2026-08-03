const { loadJSON, saveJSON } = require("../utils/json");


module.exports = {

execute:(general, cmd)=>{


const equipments = loadJSON("equipments.json");


const item =
equipments.find(
 e=>e.id === cmd.data.itemId
);


if(!item){

return {
success:false,
message:"装備が存在しません"
};

}



// お金確認

if(general.money < item.price){

return {
success:false,
message:"お金が足りません"
};

}



// 装備欄準備

if(!general.equipment){

general.equipment={
 weapon:null,
 armor:null,
 book:null,
 flag:null
};

}



// 購入

general.money -= item.price;


// 装備する

general.equipment[item.type]=item.id;



return {

success:true,

message:
`🛒 ${item.name}を購入しました！`

};


}

};