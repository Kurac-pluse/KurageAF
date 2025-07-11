// 推論を行う関数
export async function makeResponse(currentSpeaker) {
    const url = process.env.REACT_APP_LLAMA_SERVER_URL;

    const body = {
        prompt: 'Hello I am ' + currentSpeaker,
        max_tokens: 256,
        temperature: 0.7,
        top_p: 0.9,
    };

    try {
        console.log(process.env.REACT_APP_LLAMA_SERVER_URL);
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

        console.log(data.content);
    } catch (e) {
      console.error("Error calling LLM API:", e);
      return "";
    }
}
