// 1:移動, 8:戦闘, 11:回復
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

let cooldown;
export async function fight(character) {
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
      	const response = await fetch(url, options).then((fightResponse) => {
			if (fightResponse.status === 498) {
			  console.log('The character cannot be found on your account.');
			  return;
			} else if (fightResponse.status === 497) {
			  console.log("Your character's inventory is full.");
			  return;
			} else if (fightResponse.status === 499) {
			  console.log('Your character is in cooldown.');
			  return;
			} else if (fightResponse.status === 598) {
			  console.log('No monster on this map.');
			  return;
			} else if (fightResponse.status !== 200) {
			  console.log('An error occurred during the fight.');
			  return;
			}
		
			if (fightResponse.status === 200) {
			  fightResponse.json().then((data) => {
				console.log(
				  'The fight ended successfully. You have ' +
					data.data.fight.result +
					'.'
				);
				cooldown = data.data.cooldown.total_seconds;
				setTimeout(fight, cooldown * 1000);
			  });
			}
		});

      	const data = await response.json();
      	console.log(data);
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
    } catch (error) {
      	console.log(error);
    }
}
