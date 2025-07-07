import supabase from '../supabaseClient';

/**
 * セッションを作成し、その UUID を返す
 * @param {string} name - セッション名（任意の文字列）
 * @returns {string|null} - セッションUUID
 */
export const createSession = async (name) => {
    const { data, error } = await supabase
        .from('sessions')
        .insert([{ name }])
        .select();

    if (error) {
        console.error('セッション作成エラー:', error.message);
        return null;
    }

    return data[0]?.id; // UUID
};

/**
 * メッセージを保存する（DBに insert）
 * @param {Object} params - メッセージ内容
 * @param {string} params.session_id
 * @param {number} params.phase
 * @param {number} params.turn
 * @param {string} params.sender
 * @param {string} params.receiver
 * @param {string} params.content
 */
export const saveMessage = async ({
    session_id,
    phase,
    turn,
    sender,
    receiver,
    content,
}) => {
    if (!session_id) {
        console.log('session_idが指定されていません');
        return false;
    }

    const newMessage = {
        session_id,
        phase,
        turn,
        sender,
        receiver,
        content,
        created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('messages').insert([newMessage]);

    if (error) {
        console.error('メッセージ保存エラー:', error.message);
        return false;
    }
    return true;
};

/**
 * 自分に関係あるメッセージを取得（最新セッションの中から取得）
 * @param {string} player - 自分のプレイヤー名
 * @returns {Array} - メッセージリスト（自分が sender または receiver のもの）
 */
export const fetchMessagesBySession = async (session_id, player) => {

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', session_id)
        .or(`sender.eq.${player},receiver.eq.${player}`)
        .order('phase')
        .order('turn');

    if (error) {
        console.error('メッセージ取得エラー:', error.message);
        return [];
    }

    return data;
};