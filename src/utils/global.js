// エージェントの情報を仮置きする
// 変数の値をどこまで保持できるか不明のため、過信しない
// どこからでも呼び出す、環境変数の役割
import supabase from "../supabaseClient";

export const server = process.env.REACT_APP_ARTIFACTS_URL;
export const token = process.env.REACT_APP_ARTIFACTS_TOKEN;

export const CHAR1 = 'laplus';
export const CHAR2 = 'rui';
export const CHAR3 = 'koyori';
export const CHAR4 = 'kuroe';
export const CHAR5 = 'iroha';
// export const CHAR1 = 'A-AAAAA';
// export const CHAR2 = 'B-BBBBB';
// export const CHAR3 = 'C-CCCCC';
// export const CHAR4 = 'D-DDDDD';
// export const CHAR5 = 'E-EEEEE';

export const addNames = () => {
    const pre_names = [];
    pre_names.push(CHAR1, CHAR2, CHAR3, CHAR4, CHAR5);
    return pre_names;
}

export const names = addNames();
// console.log(names[0], names[1], names[2], names[3], names[4]);

export const player_make = async (name) => {
    try {
        const { data, error } = await supabase
            .from('characters')
            .select('role')
            .eq('name', name);
        if (error) throw error;
        if (data.length > 0) {
            //console.log('取得した値:', data[0]['role']);
            return data[0]['role']; // 指定列の値を返す
        } else {
            console.log('指定した行が見つかりません');
            return null;
        }
    } catch (error) {
        console.error('データベースでエラーが発生しました:', error.message);
    }
}

export const player1 = await player_make('player1');
export const player2 = await player_make('player2');

export const playerToCharName = async (player) => {
    if (player === 'player1') {
        return await player1;
    } else if (player === 'player2') {
        return await player2;
    } else {
        return "master";
    }
}

export async function getCharacterNameById(npcID) {
    const { data, error } = await supabase
      .from('characters')
      .select('role')
      .eq('name', npcID)
      .single();

    if (error) {
      console.error('名前の取得に失敗:', error);
      return null;
    }

    return data.role;
}

export const pilot = ["player1", "player2", "npc1", "npc2", "npc3"];
