// 6:装備解除, 7:装備
import fetch from 'node-fetch';
import { server, token } from '../global.js';

export async function equip(character, item) {
    const url = server + '/my/' + character + '/action/equip';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + token,
        },
        body: '{"code":' +  item + ',"slot":"weapon","quantity":1}'
    };

    try {
        const response = await fetch(url, options);
        const  data  = await response.json();
        console.log(data);
    } catch (error) {
        console.log(error);
    }
}

export async function unequip(character) {
    const url = server + '/my/' + character + '/action/unequip';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + token,
        },
        body: '{"slot":"weapon","quantity":1}'
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}
