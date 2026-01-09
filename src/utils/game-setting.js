import fetch from 'node-fetch';

export async function game_restart() {
	const url = process.env.REACT_APP_SERVER_URL + "/api/mmo/game_restart";

  	const response = await fetch(url, {
    	method: "POST",
    	headers: { Accept: "application/json" },
  	});

  	if (!response.ok) {
    	throw new Error(await response.text());
  	}

  	return await response.json();
}
