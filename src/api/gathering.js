// 2:釣り, 3:伐採, 4:採掘, 5:採集
import fetch from 'node-fetch';
import { server, token } from '../utils/global.js';

export async function gather(character) {
    const url = server + '/my/' + character + '/action/gathering';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + token,
        },
        body: undefined
    };

    try {
        const response = await fetch(url, options);
        const  data  = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.log(error);
    }
}
