import fetch from 'node-fetch';
import supabase from "../supabaseClient";

// 環境定数
export const server = process.env.REACT_APP_ARTIFACTS_URL;
export const pilot = ["player1", "player2", "npc1", "npc2", "npc3"];
export const names = ["laplus", "rui", "koyori", "kuroe", "iroha"];
// export const names = ["A-AAAAA", "B-BBBBB", "C-CCCCC", "D-DDDDD", "E-EEEEE"];
export const TURN_DURATION = 30 * 1000;
export const TURNS_PER_PHASE = 6;
export const PHASE_END_BUFFER = 5 * 1000;
export const playTime = 8 * 60;


// 画面右logの表示（FastAPIに依頼）
export async function getCharacterLogs(character) {
    if (!character) {
        console.warn("character is undefined, skip getCharacterLogs");
        return null;
    }
    const url = process.env.REACT_APP_SERVER_URL + "/api/mmo/logs/" + character;
	const options = {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    };

	try {
		const response = await fetch(url, options);
		const data = await response.json();
		return data;
	} catch (error) {
		console.error(error);
	}
}

// statusの表示（FastAPIに依頼）
export async function getCharacterInfo(character) {
    if (!character) {
        console.warn("character is undefined, skip getCharacterInfo");
        return null;
    }
    const url = process.env.REACT_APP_SERVER_URL + "/api/mmo/info/" + character;
	const options = {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    };

	try {
		const response = await fetch(url, options);
		const data = await response.json();
		return data;
	} catch (error) {
		console.error(error);
	}
}

// データ収集用（FastAPIに依頼）
export async function getEx3Data(task) {
    return task;
}

// IDからキャラ名を取得
export const playerToCharName = async (player) => {
    if (player === 'master') return 'master';

    const { data, error } = await supabase
        .from('characters')
        .select('role')
        .eq('name', player)
        .maybeSingle();

    if (error) {
        console.error('playerToCharName error:', error.message);
        return null;
    }

    return data?.role ?? null;
};

// 会話順取得
export const convNumber = async (viewer) => {
    const { data, error } = await supabase
        .from('conversation_setups')
        .select('conversation_order')
        .eq('session_id', 'default_session')
        .maybeSingle();

    if (error || !data) {
        console.error('convNumber fetch error:', error?.message);
        return null;
    }

    const order = data.conversation_order;
    if (!Array.isArray(order)) return null;

    const result = [];

    for (let i = 0; i < 4; i++) {
        let player = order[i]?.[1];

        if (!player) {
            result.push(`${i + 1}:unknown`);
            continue;
        }

        // --- 視点変換（player2視点のみ） ---
        if (viewer === 'player2' && player === 'player2') {
            player = 'player1';
        }

        const charName = await playerToCharName(player);
        result.push(`${i + 1}: ${charName || 'unknown'}`);
    }

    return result.join(', ');
};
