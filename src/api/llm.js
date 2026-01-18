import supabase from "../supabaseClient";
import { get_character_coordinate } from "./info";
import { getCharacterNameById } from "../utils/global";
import { getLogs } from "./npc-plan";

const maxRetries = 5;
const retryDelayMs = 5000;

// 会話用の推論を行う関数
export async function makeResponse({
    sessionId,
    phase,
    turn,
    sender,
    receiver,
}) {
    const url = process.env.REACT_APP_SERVER_URL + "/api/conv";

    const { data: latestLogs, error: latestError } = await supabase
        .from("messages")
        .select("content")
        .eq("session_id", sessionId)
        .eq("phase", phase)
        .or(`and(sender.eq.${sender},receiver.eq.${receiver}),and(sender.eq.${receiver},receiver.eq.${sender})`)
        .order("turn", { ascending: false })
        .limit(1);

    if (latestError) {
        console.error("Error fetching latest message:", latestError);
        return "";
    }

    const latestPrompt = latestLogs?.[0]?.content || "";
    // console.log(latestPrompt);

    const logs = await getLogs(sender);
    // console.log(logs);

    const sen_char_name = await getCharacterNameById(sender);
    const rec_char_name = await getCharacterNameById(receiver);

    // supabase から自分のtaskを取得
    const npcNumberMap = {
        npc1: 3,
        npc2: 4,
        npc3: 5,
    };
    const number = npcNumberMap[sender];

    const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('number', number)
        .single();
    
    if (taskError) {
        console.error(`[${sender}] タスク取得エラー`, taskError);
        return null;
    }

    const body = {
        prompt: latestPrompt,
        log: logs,
        session_id: sessionId,
        phase,
        turn,
        sender,
        receiver,
        sen_char_name,
        rec_char_name,
        task: task.name,
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log(sender + ' : ' + data.response);
        return data.response || "（応答を生成できませんでした）";

    } catch (e) {
      console.error("Error calling LLM API:", e);
      return "";
    }
}

// プランを作成する関数
export async function makePlan(npcID, task) {
    const url = process.env.REACT_APP_SERVER_URL + "/api/plan";

    try {
        const name = await getCharacterNameById(npcID);
        const coord = await get_character_coordinate(name);
        const [x, y] = coord;

        const body = {
            // prompt,
            x: String(x),
            y: String(y),
            task: String(task ?? ""),
        };

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();

            if (data.status === "processing") {
                console.log(`[${npcID}] makePlan still processing... retrying in ${retryDelayMs}ms`);
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
                continue;
            }

            // console.log(`[${npcID}] makePlan response:`, data.response);
            return data.response;
        }

        console.warn(`[${npcID}] makePlan exceeded max retries`);
        return null;

    } catch (err) {
        console.error(`[${npcID}] makePlan error:`, err);
        return null;
    }
}

// JSONに変換する関数
export async function refinePlanToJson(rawPlan) {
    try {
        const res = await fetch(
            process.env.REACT_APP_SERVER_URL + "/api/makeJSON",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ raw_plan: rawPlan }),
            }
        );

        const data = await res.json();

        if (!Array.isArray(data.json)) {
            console.error("makeJSON failed:", data);
            return [];
        }

        return data.json;

    } catch (e) {
        console.error("refinePlanToJson error:", e);
        return [];
    }
}


// タスクを作成する関数
export async function makeTask(npcID, logs) {
    const url = process.env.REACT_APP_SERVER_URL + "/api/task";

    const body = {
        prompt: logs
    };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();

            if (data.status === "processing") {
                console.log(`[${npcID}] Task processing, retrying in ${retryDelayMs}ms...`);
                await new Promise((r) => setTimeout(r, retryDelayMs));
                continue;  // 再リトライ
            }

            console.log(data.response);
            return { name: data.response };

        } catch (err) {
            console.error(`[${npcID}] makeTask error:`, err);
            return null;
        }
    }

    console.warn(`[${npcID}] makeTask exceeded max retries`);
    return null;
}
