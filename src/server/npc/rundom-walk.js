import { get_character_cooldown, get_character_coordinate } from "../api-call/info";
import { movement } from "../api-call/api-action";
import { playerToCharName } from "../global";
import { names } from "../global";

export function change_f_flag() {
    localStorage.setItem('npc-flag', JSON.stringify(false));
    let flag = JSON.parse(localStorage.getItem('npc-flag'));
    console.log(flag);
}

export async function random_walk() {
    localStorage.setItem('npc-flag', JSON.stringify(true));
    let flag = JSON.parse(localStorage.getItem('npc-flag'));
    console.log(flag);
    while (1) {
        for (let i=0; i<5; i++) {
            if (names[i] === playerToCharName('player1') || names[i] === playerToCharName('player2')) {
                continue;
            }
            const npc_XY = await get_character_coordinate(names[i]);
            await walk(names[i], npc_XY[0], npc_XY[1]);
        }
        flag = JSON.parse(localStorage.getItem('npc-flag'));
        if (!flag) break;
    }
}

async function walk(character, x, y) {
    const random = Math.floor(Math.random() * 4);
    const cooldown_expiration = new Date(await get_character_cooldown(character));

    while (true) {
        const now_date = new Date(); 
        if (cooldown_expiration.getTime() > now_date.getTime()) {
            await delay(100);
        } else {
            if (random === 0 && x+1 <= 3) {
                await movement(character, x+1, y);
            } else if (random === 1 && x-1 >= -3) {
                await movement(character, x-1, y);
            } else if (random === 2 && y+1 <= 3) {
                await movement(character, x, y+1);
            } else if (random === 3 && y-1 >= -3) {
                await movement(character, x, y-1);
            }
            break;
        }
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// async function collison_check() {
//     const char1_XY = await get_character_coordinate(character1);
//     const char2_XY = await get_character_coordinate(character2);
//     const char3_XY = await get_character_coordinate(character3);
//     const char4_XY = await get_character_coordinate(character4);
//     const char5_XY = await get_character_coordinate(character5);

//     console.log('1', char1_XY);
//     console.log('2', char2_XY);
//     console.log('3', char3_XY);
//     console.log('4', char4_XY);
//     console.log('5', char5_XY);
//     console.log('----------------')

//     const isEqualArray = function (array1, array2) {
//         return array1.every((value, index) => value === array2[index]);
//     };

//     const collisions = [];

//     if (isEqualArray(char1_XY, char2_XY)) {
//         const new_collision = {
//             "coordinate": char1_XY,
//             "first_agent": character1,
//             "second_agent": character2
//         }
//         collisions.push(new_collision);
//     }
//     if (isEqualArray(char1_XY, char3_XY)) {
//         const new_collision = {
//             "coordinate": char1_XY,
//             "first_agent": character1,
//             "second_agent": character3
//         }
//         collisions.push(new_collision);
//     }
//     if (isEqualArray(char1_XY, char4_XY)) {
//         const new_collision = {
//             "coordinate": char1_XY,
//             "first_agent": character1,
//             "second_agent": character4
//         }
//         collisions.push(new_collision);
//     }
//     if (isEqualArray(char1_XY, char5_XY)) {
//         const new_collision = {
//             "coordinate": char1_XY,
//             "first_agent": character1,
//             "second_agent": character5
//         }
//         collisions.push(new_collision);
//     }
//     if (isEqualArray(char2_XY, char3_XY)) {
//         const new_collision = {
//             "coordinate": char2_XY,
//             "first_agent": character2,
//             "second_agent": character3
//         }
//         collisions.push(new_collision);
//     }
//     if (isEqualArray(char2_XY, char4_XY)) {
//         const new_collision = {
//             "coordinate": char2_XY,
//             "first_agent": character2,
//             "second_agent": character4
//         }
//         collisions.push(new_collision);
//     }
//     if (isEqualArray(char2_XY, char5_XY)) {
//         const new_collision = {
//             "coordinate": char2_XY,
//             "first_agent": character2,
//             "second_agent": character5
//         }
//         collisions.push(new_collision);
//     }
//     if (isEqualArray(char3_XY, char4_XY)) {
//         const new_collision = {
//             "coordinate": char3_XY,
//             "first_agent": character3,
//             "second_agent": character4
//         }
//         collisions.push(new_collision);
//     }
//     if (isEqualArray(char3_XY, char5_XY)) {
//         const new_collision = {
//             "coordinate": char3_XY,
//             "first_agent": character3,
//             "second_agent": character5
//         }
//         collisions.push(new_collision);
//     }
//     if (isEqualArray(char4_XY, char5_XY)) {
//         const new_collision = {
//             "coordinate": char4_XY,
//             "first_agent": character4,
//             "second_agent": character5
//         }
//         collisions.push(new_collision);
//     }

//     return collisions;
// }
