// 1:移動, 2:釣り, 3:伐採, 4:採掘, 5:採集, 6:装備解除, 7:装備, 8:戦闘,
// 9:武器作成, 10:料理作成, 11:回復

// plan = {
//     "type ": 0,
//     "info": {
//         "Coordinates": [0,0],
//         "item":"",
//     },
// }
import supabase from "../../supabaseClient";
import { equip, unequip } from "../api-call/equipment";
import { gather } from "../api-call/gathering";
import { fight, heal, movement } from "../api-call/moving";
import { craft } from "../api-call/shop";
import { getCharacterNameById } from "../global";

// Supabase から is_running を取得
async function isRunning() {
    const { data, error } = await supabase
        .from('timer')
        .select('is_running')
        .eq('id', 1)
        .single();

    if (error) {
        console.error('is_running チェック時にエラー:', error);
        return false;
    }

    return data?.is_running === true;
}

// 指定秒数待機するヘルパー関数
function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// クールダウン対応 callApiWithPlan
export async function callApiWithPlan(npcID, plan){
    if (typeof plan !== 'string') {
        console.error('plan が文字列ではありません:', plan);
        return;
    }

    let actions;

    try {
        if (typeof plan === "string") {
            // plan が JSON文字列の場合
            actions = JSON.parse(plan);
        } else if (Array.isArray(plan)) {
            // 既に配列ならそのまま
            actions = plan;
        } else {
            console.error("plan が不正な形式です:", plan);
            return;
        }
    } catch (err) {
        console.error("plan のパースに失敗しました:", err, plan);
        return;
    }

    const character = getCharacterNameById(npcID);

    for (const action of actions) {
        const stillRunning = await isRunning();
        if (!stillRunning) {
            console.log(`[${npcID}] is_running が false のため中断`);
            break;
        }

        const { type , info } = action;
        const { Coordinates = [0, 0], item = "" } = info || {};
        console.log(`実行中のアクション: type=${type}, info=${JSON.stringify(info)}`);

        let result;
        try {
            if (type === 1) {
                result = await movement(Coordinates[0], Coordinates[1]);
            } else if (type === 2 || type === 3 || type === 4 || type === 5) {
                result = await gather(character);
            } else if (type === 6) {
                result = await unequip(character, item);
            } else if (type === 7) {
                result = await equip(character, item);
            } else if (type === 8) {
                result = await fight(character);
            } else if (type === 9 || type === 10) {
                result = await craft(character, item);
            } else if (type === 11) {
                result = await heal(character);
            }
        } catch (err) {
            console.error(`[${npcID}] アクション実行中にエラーが発生:`, err);
            continue; // 次の行動へスキップ
        }

        // クールダウンの待機
        const cooldownSeconds = result?.data?.cooldown?.total_seconds ?? 1;
        console.log(`[${npcID}] クールダウン: ${cooldownSeconds} 秒待機`);

        for (let i = 0; i < cooldownSeconds; i++) {
            const stillRunningDuringCooldown = await isRunning();
            if (!stillRunningDuringCooldown) {
                console.log(`[${npcID}] クールダウン中に is_running false 検出、中断`);
                return;
            }
            await wait(1); // 1秒ずつチェック
        }
    }
}
