import { get_character_logs } from "../api/info";
import { getCharacterNameById } from "../utils/global";

export async function getLogs(npcID){
    const name = await getCharacterNameById(npcID);
    const response = await get_character_logs(name);

    if (!response || !Array.isArray(response.data)) {
        console.error("response.data が配列ではありません:", response);
        return '';
    }

    const logText = response.data
        .map((entry, i) => `${i + 1}. [${entry.type}] ${entry.description}`)
        .join('\n');

    // console.log(logText);
    return logText;
}
