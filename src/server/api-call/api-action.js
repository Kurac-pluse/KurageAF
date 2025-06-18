import fetch from 'node-fetch';
import { server, token } from '../global.js';

export async function movement(character, x, y) {
    const url = server + '/my/' + character + '/action/move';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: '{"x":' + x + ',"y":' + y + '}', //change the position here
    };
    // console.log(x, y);
    try {
      const response = await fetch(url, options);
      const { data } = await response.json();
      const cooldown = data.cooldown.total_seconds;
      return cooldown;
    } catch (error) {
      console.log(error);
    }
}