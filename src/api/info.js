// APIを用いてエージェントの情報を入手し、stringで返す
// 名前、座標、、、、

import fetch from 'node-fetch';
import { CHAR1, CHAR2, CHAR3, CHAR4, CHAR5, server, token } from '../utils/global.js';

// FastAPIに依頼する関数
// フロントの画面右logの表示と、会話用llm推論の要素で使用
export async function get_character_logs(character) {
    if (!character) {
        console.warn("character is undefined, skip get_character_logs");
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

export async function get_character_coordinate(character) {
    try {
        const datas = await get_characters_info();
        var x_y = Array(2);
        // console.log(datas);

        if (character === CHAR1) {
            x_y[0] = datas[0].x;
            x_y[1] = datas[0].y;
        } else if (character === CHAR2) {
            x_y[0] = datas[1].x;
            x_y[1] = datas[1].y;
        } else if (character === CHAR3) {
            x_y[0] = datas[2].x;
            x_y[1] = datas[2].y;
        } else if (character === CHAR4) {
            x_y[0] = datas[3].x;
            x_y[1] = datas[3].y;
        } else if (character === CHAR5) {
            x_y[0] = datas[4].x;
            x_y[1] = datas[4].y;
        }

        // console.log(x_y);
        return x_y;
    } catch (error) {
        console.log(error);
    }
}

export async function get_character_cooldown(character) {
    try {
        const datas = await get_characters_info();
        var cooldown = 0;

        if (character === CHAR1) {
            cooldown = datas[0].cooldown_expiration;
        } else if (character === CHAR2) {
            cooldown = datas[1].cooldown_expiration;
        } else if (character === CHAR3) {
            cooldown = datas[2].cooldown_expiration;
        } else if (character === CHAR4) {
            cooldown = datas[3].cooldown_expiration;
        } else if (character === CHAR5) {
            cooldown = datas[4].cooldown_expiration;
        }

        // console.log(cooldown);
        return cooldown;
    } catch (error) {
        console.log(error);
    }
}

export async function get_character_names() {
    try {
        const datas = await get_characters_info();
        console.log(datas[0]);
        const names = datas.slice(0, 5).map(data => data.name);
        // console.log(names);
        return names;
    } catch (error) {
        console.log(error);
    }
}

async function get_characters_info() {
    const url = server + '/my/characters';
    const options = {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + token,
        },
    };

    try {
        const response = await fetch(url, options);
        const { data } = await response.json();
        // console.log(typeof(data));
        return data;
    } catch (error) {
        console.log(error);
    }
}

export async function get_one_character_info(character) {
    if (typeof character === 'undefined' || character === null) { return null; }

    const url = server + '/characters/' + character;
    const options = {method: 'GET', headers: {Accept: 'application/json'}};
    //console.log(character);
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data;
        // console.log(data);
    } catch (error) {
        console.error(error);
    }
}
