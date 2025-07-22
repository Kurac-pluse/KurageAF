import { get_character_coordinate } from "../api-call/info";
import { getCharacterNameById, planPromptTemplate} from "../global";

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
        // console.log(prompt);
        console.log(data.response);
        return data.response;

    } catch (err) {
        console.error(`[${npcID}] makePlan error:`, err);
        return null;
    }
}