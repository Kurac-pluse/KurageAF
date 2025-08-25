import { get_character_coordinate } from "../api-call/info";
import { getCharacterNameById, planPromptTemplate} from "../global";

const maxRetries = 5;
const retryDelayMs = 5000;

// 会話用の推論を行う関数
export async function makeResponse({
    prompt = '要約',
    sessionId,
    phase,
    turn,
    sender,
    receiver,
}) {
    const url = process.env.REACT_APP_SERVER_URL + "/api/conv";

    const body = {
        prompt,
        session_id: sessionId,
        phase,
        turn,
        sender,
        receiver,
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

        const prompt = planPromptTemplate
            .replace('{{x}}', x)
            .replace('{{y}}', y)
            .replace('{{task}}', task);

        const body = {
            prompt,
            npc_id: npcID,
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

            console.log(`[${npcID}] makePlan response:`, data.response);
            return data.response;
        }

        console.warn(`[${npcID}] makePlan exceeded max retries`);
        return null;

    } catch (err) {
        console.error(`[${npcID}] makePlan error:`, err);
        return null;
    }
}

export async function refinePlanToJson(rawPlan) {
    const url = process.env.REACT_APP_SERVER_URL + "/api/makeJSON";

    const prompt = `
あなたは与えられた行動計画（箇条書きテキスト）を JSON の配列に変換する役割です。
出力は必ず JSON 配列に変換してください。
出力は必ず JSON 配列のみを返してください。
説明文や余計なテキストは一切不要です。

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
        return data.response;

    } catch (e) {
      console.error("Error calling LLM API:", e);
      return "";
    }
}


// タスクを作成する関数
export async function makeTask(npcID, logs) {
    const url = process.env.REACT_APP_SERVER_URL + "/api/task";

    const prompt = `下の行動ログから私が興味を持っていることを推定し、次の行動指針を"必ず1文で"出力してください。\n${logs}`;

    const body = {
        prompt,
        npc_id: npcID,
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
