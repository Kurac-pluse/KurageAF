// APIを用いてエージェントの情報を入手し、stringで返す
// 名前、座標、、、、

import fetch from 'node-fetch';
import { server, token, names,  skins } from './global.js';
import { get_character_names } from './api-call/info.js'; 

export async function game_restart() {
    const url1 = server + '/characters/delete';
    const pre_names = await get_character_names();
    console.log(pre_names);
    for (let i=0; i<5; i++) {
        const options = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: 'Bearer ' + token,
            },
            body: '{"name":"' + pre_names[i] +'"}'
        };
        try {
        	const response = await fetch(url1, options);
        	/*const data = */await response.json();
        	// console.log(data);
        } catch (error) {
        	console.error(error);
        }
    }

    await initial_setting();
}


export async function initial_setting() {
	const url = server + '/characters/create';
    for (let i=0; i<5; i++) {
        const options = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: 'Bearer ' + token,
            },
            body: '{"name":"' + names[i] +'","skin":"' + skins[i] + '"}'
          };
          
          try {
            await fetch(url, options);
          } catch (error) {
            console.error(error);
          }
    }
}
