// 1:移動, 2:釣り, 3:伐採, 4:採掘, 5:採集, 6:装備解除, 7:装備, 8:戦闘,
// 9:武器作成, 10:料理作成, 11:回復

// plan = {
//     "type":0,
//     "info":{
//         "Coordinates":[0,0],
//         "item":"",
//     },
// }
import { equip, unequip } from "../api-call/equipment";
import { gather } from "../api-call/gathering";
import { get_character_cooldown } from "../api-call/info";
import { fight, heal, movement } from "../api-call/moving";
import { craft } from "../api-call/shop";
import { getCharacterNameById } from "../global";

// 指定秒数待機するヘルパー関数
function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// クールダウン対応 callApiWithPlan
export async function callApiWithPlan(npcID, plan, isRunningRef){
    if (typeof plan !== 'string') {
        console.error('plan が文字列ではありません:', plan);
        return;
    }

    let actions;

    try {
        actions = typeof plan === "string" ? JSON.parse(plan) : plan;
    } catch (err) {
        console.error("plan のパースに失敗しました:", err, plan);
        return;
    }

    const character = await getCharacterNameById(npcID);

    for (const action of actions) {
        if (!isRunningRef.current) {
            console.log(`[${npcID}] is_running が false のため中断`);
            break;
        }

        const { type , info } = action;
        const { Coordinates = [0, 0], item = "" } = info || {};
        console.log(`[${npcID}] 実行中のアクション: type=${type}, info=${JSON.stringify(info)}`);

        // characterCooldownEnd はクールダウン終了のタイムスタンプ（秒またはミリ秒）
        let cooldownEndTime = await get_character_cooldown(character);

        // 現在時刻との差を秒で計算
        let now = Date.now(); // ミリ秒
        let cooldownSeconds = (cooldownEndTime - now) / 1000;

        if (cooldownSeconds > 0) {
            console.log(`[${npcID}] 現在クールダウン中: ${cooldownSeconds.toFixed(2)} 秒待機`);
            while (cooldownSeconds > 0) {
                if (!isRunningRef.current) {
                    console.log(`[${npcID}] クールダウン中に is_running false 検出、中断`);
                    return;
                }
                await wait(1); // 1秒ごとにチェック
                cooldownSeconds -= 1;
            }
        }

        let result;
        try {
            // kokodewait
            if (type === 1) {
                result = await movement(character, Coordinates[0], Coordinates[1]);
            } else if ([2, 3, 4, 5].includes(type)) {
                result = await gather(character);
            } else if (type === 6) {
                result = await unequip(character, item);
            } else if (type === 7) {
                result = await equip(character, item);
            } else if (type === 8) {
                result = await fight(character);
            } else if ([9, 10].includes(type)) {
                result = await craft(character, item);
            } else if (type === 11) {
                result = await heal(character);
            }
        } catch (err) {
            console.error(`[${npcID}] アクション実行中にエラーが発生:`, err);
        }

        // クールダウンの待機
        const apiCooldown = result?.data?.cooldown?.total_seconds ?? 30;
        console.log(`[${npcID}] クールダウン: ${apiCooldown} 秒待機`);

        for (let i = 0; i < apiCooldown; i++) {
            if (!isRunningRef.current) {
                console.log(`[${npcID}] クールダウン中に is_running false 検出、中断`);
                return;
            }
            await wait(1); // 1秒ずつチェック
        }
    }
}
