const { loadJSON } = require("../utils/json");


module.exports = {

execute(general, cmd, data){


    const equipments = loadJSON("equipments.json");


    const item =
    equipments.find(
        e => e.id === cmd.data?.itemId
    );


    if(!item){
        return {
            success:false,
            message:"購入する装備が存在しません"
        };
    }


    if(general.money < item.price){

        return {
            success:false,
            message:
            `${item.name}を購入するお金がありません`
        };

    }


    // 装備欄初期化
    if(!general.equipment){

        general.equipment = {
            weapon:null,
            armor:null,
            book:null,
            flag:null
        };

    }


    // 現在装備
    const oldEquipment =
        general.equipment[item.type];


    let message = "";


    // 下取り
    if(oldEquipment){

        const oldItem =
        equipments.find(
            e => e.id === oldEquipment
        );


        if(oldItem){

            const refund =
            Math.floor(oldItem.price / 2);


            general.money += refund;


            message +=
            `${oldItem.name}を${refund}Gで下取りしました。`;

        }

    }



    // 購入
    general.money -= item.price;


    general.equipment[item.type] = item.id;


    message +=
    `${item.name}を購入しました`;


    return {

        success:true,

        message

    };


}

};