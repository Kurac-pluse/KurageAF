// 9:武器作成, 10:料理作成
import fetch from 'node-fetch';
import { server, token } from '../global.js';

export async function craft(character, item) {
	const url = server + '/my/' + character + '/action/crafting';
	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: 'Bearer ' + token,
		},
		body: JSON.stringify({
            code: item,
            quantity: 1
        })
	};

	try {
		const response = await fetch(url, options);
		const data = await response.json();
		console.log(data);
		return data;

	} catch (error) {
		console.error(error);
	}
}
