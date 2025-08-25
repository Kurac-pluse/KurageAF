import supabase from "../../supabaseClient";
import { get_character_logs } from "../api-call/info";
import { getCharacterNameById } from "../global";
import { makePlan, refinePlanToJson, makeTask } from "./llm";

export async function generateInitialPlan(npcID) {
    // supabase から自分のtaskを取得
    const npcNumberMap = {
        npc1: 3,
        npc2: 4,
        npc3: 5,
    };

    const number = npcNumberMap[npcID];

    const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('number', number)
        .single();

    if (error) {
        console.error(`[${npcID}] タスク取得エラー`, error);
        return null;
    }
    // console.log(task.name);
    
    // 1回目: 箇条書きのプランを生成
    const rawPlan = await makePlan(npcID, task.name);

    // 2回目: JSON形式に変換
    const jsonPlan = await refinePlanToJson(rawPlan);

    // 返り値として行動プランをJSONで出力
    return jsonPlan;
}

export async function generateNextPlan(npcID, logs){
    // 行動ログから個別で行動目標を定める
    const task = makeTask(npcID, logs);

    // 1回目: 箇条書きのプランを生成
    const rawPlan = await makePlan(npcID, task.name);

    // 2回目: JSON形式に変換
    const jsonPlan = await refinePlanToJson(rawPlan);

    // 返り値として行動プランをJSONで出力
    return jsonPlan;
}

export async function getLogs(npcID){
    // supabase から log の取得
    const name = await getCharacterNameById(npcID);
    const response = await get_character_logs(name);

    if (!response || !Array.isArray(response.data)) {
        console.error("response.data が配列ではありません:", response);
        return '';
    }
    
    const logText = response.data
        .map((entry, i) => `${i + 1}. [${entry.type}] ${entry.description}`)
        .join('\n');
    
    console.log(logText);
    return logText;
}
