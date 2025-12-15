// 1:移動, 8:戦闘, 11:回復
import fetch from 'node-fetch';
import { server, token } from '../utils/global.js';
import { get_character_coordinate } from './info.js';

export async function movement(character, x, y) {
    try {
        // 現在座標を取得
        const current = await get_character_coordinate(character);

        // 目的座標が現在座標と同じならキャンセル
        if (current[0] === x && current[1] === y) {
            console.log(`[${character}] 現在座標と同じなので移動キャンセル: [${x}, ${y}]`);
            return null; // 移動不要
        }

        const url = server + '/my/' + character + '/action/move';
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: 'Bearer ' + token,
            },
            body: JSON.stringify({ x, y }),
        };

        const response = await fetch(url, options);
        const { data } = await response.json();
        return data;

    } catch (error) {
        console.log(error);
    }
}

let cooldown;
export async function fight(character) {
    // 座標チェック
    const current = await get_character_coordinate(character);
    if (!(
        (current[0] === 0 && current[1] === 1) ||
        (current[0] === 0 && current[1] === 2)
    )) {
        console.log(
            `[${character}] 現在地 ${current} は戦闘可能マスではないためキャンセル`
        );
        return null;
    }

	const url = server + '/my/' + character + '/action/fight';
    const options = {
      	method: 'POST',
      	headers: {
        	'Content-Type': 'application/json',
        	Accept: 'application/json',
        	Authorization: 'Bearer ' + token,
      	},
      	body: undefined,
    };

    try {
      	const response = await fetch(url, options);

		if (response.status === 498) {
			console.log('The character cannot be found on your account.');
			return null;
		} else if (response.status === 497) {
			console.log("Your character's inventory is full.");
			return null;
		} else if (response.status === 499) {
			console.log('Your character is in cooldown.');
			return null;
		} else if (response.status === 598) {
			console.log('No monster on this map.');
			return null;
		} else if (response.status !== 200) {
			console.log('An error occurred during the fight.');
			return null;
		}

		const data = await response.json();
		console.log(
		'The fight ended successfully. You have ' + data.data.fight.result + '.');

		cooldown = data.data.cooldown.total_seconds;
		setTimeout(() => fight(character), cooldown * 1000);

		return data;
    } catch (error) {
      	console.log(error);
    }
}

export async function heal(character) {
	const url = server + '/my/' + character + '/action/rest';
    const options = {
      	method: 'POST',
      	headers: {
        	'Content-Type': 'application/json',
        	Accept: 'application/json',
        	Authorization: 'Bearer ' + token,
      	},
      	body: undefined,
    };

    try {
      	const response = await fetch(url, options);
      	const data = await response.json();
		console.log(data);
		return data;
    } catch (error) {
      	console.log(error);
    }
}
