import { get_character_coordinate } from '../api-call/info.js';
import { movement } from '../api-call/api-action.js';

export async function walk(character, direction) {
    const XY = await get_character_coordinate(character);
    if (direction === 'w') {
        await movement(character, XY[0], XY[1]-1);
    } else if (direction === 'a') {
        await movement(character, XY[0]-1, XY[1]);
    } else if (direction === 's') {
        await movement(character, XY[0], XY[1]+1);
    } else if (direction === 'd') {
        await movement(character, XY[0]+1, XY[1]);
    }
}
