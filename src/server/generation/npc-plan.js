import supabase from "../../supabaseClient";
import { makePlan } from "./llm";

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
    console.log(task.name);
    // taskを元にチートシートから行動順序をLLMで作成
    const act = makePlan(npcID, task.name);

    // 返り値として {log:行動数, act:[行動順序]} を返す
    return act;
}

export async function generateNextPlan(npcID, logs){
    // 行動記録を元にチートシートから行動手順をLLMで作成
    // 上同様 {num:行動数, act:[行動順序]} を返す
    console.log(npcID, logs);
}

export async function getLogs(npcID){
    // supabase から log の取得
    console.log(npcID);
}
