// 推論を行う関数
export async function makeResponse(currentSpeaker) {
    const url = process.env.REACT_APP_SERVER_URL;

    const body = { prompt: 'このドキュメントに書かれている内容を要約して' };

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

        console.log(currentSpeaker + ' : ' + data.response);
    } catch (e) {
      console.error("Error calling LLM API:", e);
      return "";
    }
}
