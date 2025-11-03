import supabase from "../../supabaseClient";
import { get_character_coordinate } from "../api-call/info";
import { getCharacterNameById } from "../global";
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
    const url = process.env.REACT_APP_SERVER_URL + "/api/makeJSON";

    const prompt = `
あなたは与えられた行動計画（箇条書きテキスト）を JSON 配列に変換する役割です。

typeの対応表 
1:移動, 2:釣り, 3:伐採, 4:採掘, 5:採集, 6:装備解除, 7:装備, 8:Chickenと戦闘 Cowと戦闘, 9:武器制作, 10:調理, 11:回復

必須ルール:
- 出力は必ず JSON 配列のみ
- 説明文や余計な文字を入れない
- コードブロック (...json 等) を絶対に出さない

【出力フォーマット】
[
  {
    "type": 0,
    "info": {
      "Coordinates": [0, 0],
      "item": ""
    }
  },
  ...
]

⚠️注意:
- 出力は JSON 配列のみ
- 説明文やコメントは禁止
- JSON 以外の文字は一切出力しない

入力:
${rawPlan}

出力（JSON のみ）:
`;

    const body = {
        prompt,
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
        let cleaned = data.response.trim();

        // コードブロック除去
        cleaned = cleaned.replace(/```(?:json)?/g, "").trim();

        // JSON 部分だけ抽出
        const match = cleaned.match(/\[.*\]/s);
        if (match) cleaned = match[0];

        // 最終チェック
        JSON.parse(cleaned); // パースできなければ例外
        return cleaned;

    } catch (e) {
    console.error("Error calling LLM API:", e);
    }
}


// タスクを作成する関数
export async function makeTask(npcID, logs) {
    const url = process.env.REACT_APP_SERVER_URL + "/api/task";

    const prompt = `下の行動ログから私が興味を持っていることを推定し、次の行動指針を"必ず1文で"出力してください。\n${logs}`;

    const body = {
        prompt,
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
            return data.response;

        } catch (err) {
            console.error(`[${npcID}] makeTask error:`, err);
            return null;
        }
    }

    console.warn(`[${npcID}] makeTask exceeded max retries`);
    return null;
}
