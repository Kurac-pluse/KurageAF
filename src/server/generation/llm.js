// 推論を行う関数
export async function makeResponse({
    prompt = '',
    sessionId,
    phase,
    turn,
    sender,
    receiver,
}) {
    const url = process.env.REACT_APP_SERVER_URL + "/api/llm";

    const body = {
        prompt: '要約',
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
