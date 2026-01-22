import supabase from "../supabaseClient";
import { getCharacterNameById } from "../utils/global";
import { getLogs } from "./npc-plan";

const NPC_TASK_NUMBER = {
    npc1: 3,
    npc2: 4,
    npc3: 5,
};

export async function getTaskByNpcId(npcID) {
    const number = NPC_TASK_NUMBER[npcID];
    if (!number) return "";

    const { data, error } = await supabase
        .from("tasks")
        .select("name")
        .eq("number", number)
        .single();

    if (error) {
        console.error("[getTaskByNpcId]", error);
        return "";
    }

    return data.name;
}

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

    const task = await getTaskByNpcId(sender);

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
        task: task,
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
