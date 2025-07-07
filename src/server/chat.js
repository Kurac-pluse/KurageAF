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
    phase,
    turn,
    sender,
    receiver,
    content,
}) => {
    // sessions テーブルから最新のセッションを1件取得
    const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (sessionError || !sessionData) {
        console.error('セッション取得エラー:', sessionError?.message || 'セッションが見つかりません');
        return;
    }
    const session_id = sessionData.id;
    console.log(session_id);

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
    }
};

/**
 * 特定セッションの中で自分と関連のあるメッセージを取得（フェーズ順・ターン順でソート）
 * @param {string} session_id - セッションUUID
 * @param {string} player - 自分のプレイヤー名
 * @returns {Array} - メッセージリスト（自分が sender または receiver のもの）
 */
export const fetchMessagesBySession = async (session_id, player) => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', session_id)
        .or(`sender.eq.${player},receiver.eq.${player}`)  // ← ここで sender か receiver が自分のものだけ
        .order('phase')
        .order('turn');

    if (error) {
        console.error('メッセージ取得エラー:', error.message);
        return [];
    }

    return data;
};