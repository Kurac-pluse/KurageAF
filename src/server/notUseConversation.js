// プレイヤーがキャラを動かすときのAPI操作を記述
import { get_character_coordinate } from './api-call/info.js';
import { names } from './global.js';
import supabase from '../supabaseClient.js';

// もし会話用FlagがFalseで衝突が起きていたら...
// NPCの場合：会話用FlagをTrueに
// PCの場合：会話用FlagをTrueにし、会話モーダルが開く
export async function walked(character) {
    const collisionTarget = await collision_check(character);

    if (collisionTarget) {
        console.log(`${character}が${collisionTarget}と衝突しました！`);

        // 会話フラグをTrueにする
        await setTalkFlagTrue(character);
        await setTalkFlagTrue(collisionTarget);

        // プレイヤーキャラ(player1, player2)の場合だけモーダルを開く
        if (character === 'player1' || character === 'player2') {
            // onOpenModal(); // 対応するプレイヤーの操作しているページで開きたい
        }

        // 一定時間（例：1分後）に会話フラグをFalseに戻す
        setTimeout(async () => {
           await setTalkFlagFalse(character);
        }, 60000); // 60000ミリ秒 = 1分
    }
}

// キャラの衝突判定
export async function collision_check(mycharacter) {
    const coordinates = [];

    for (const character of names) {
        // console.log(character)
        const xy = await get_character_coordinate(character);
        coordinates.push(xy);
    }

    const isEqualArray = (array1, array2) =>
        array1.every((value, index) => value === array2[index]);

    const myIndex = names.indexOf(mycharacter);

    for (let i = 0; i < names.length; i++) {
        if (i === myIndex) continue; // 自分は無視
        // ここに相手の会話FlagがFalseか調べる処理を挟む必要あり
        if (isEqualArray(coordinates[myIndex], coordinates[i])) {
            return names[i]; // 衝突した相手キャラ名を返す
        }
    }
    return null; // 衝突してなければ null
}

// 全キャラクターの会話フラグをリセット
export async function resetTalkFlag() {
    try {
        const { error } = await supabase
            .from('characters')
            .update({ conversation: 0 })
            .neq('conversation', 0); // 0以外のものだけ更新（無駄な書き込み防止）

        if (error) {
            console.error('会話フラグのリセット中にエラーが発生しました:', error.message);
        } else {
            console.log('全キャラクターの会話フラグをリセットしました。');
        }
    } catch (err) {
        console.error('resetTalkFlag 実行時の予期せぬエラー:', err);
    }
}


// 会話フラグをTrueにする
async function setTalkFlagTrue(character) {
    const { error } = await supabase
        .from('characters')
        .update({ conversation: 1 }) // boolean型なら true
        .eq('role', character);
    if (error) console.error(`${character} の会話フラグを True にできませんでした:`, error.message);
}

// 会話フラグをFalseに戻す
async function setTalkFlagFalse(character) {
    const { error } = await supabase
        .from('characters')
        .update({ conversation: 0 }) // boolean型なら false
        .eq('role', character);
    if (error) console.error(`${character} の会話フラグを False にできませんでした:`, error.message);
}

// 指定キャラの会話フラグ（conversation）を取得
export async function getTalkFlag(character) {
    try {
        const { data, error } = await supabase
            .from('characters')
            .select('conversation')
            .eq('role', character)
            .single(); // 一人のキャラだけ取得

        if (error || !data) {
            console.error(`${character} の会話フラグ取得に失敗しました:`, error?.message);
            return null;
        }

        return data.conversation; // 0 or 1（または boolean）
    } catch (err) {
        console.error(`getTalkFlag: ${character} の取得で予期せぬエラー`, err);
        return null;
    }
}
