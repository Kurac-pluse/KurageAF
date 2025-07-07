import { HStack, Button } from '@chakra-ui/react';
import { names, pilot } from '../server/global';
import { game_restart, initial_setting } from '../server/game-setting';
import supabase from '../supabaseClient';
import { createSession } from '../server/chat';

const Control = () => {

    const shuffle = async () => {
        try {
            const { data, error } = await supabase.from('characters').select('conversation');
            if (error) throw error;

            if (data.some((row) => row.conversation !== 0)) return;

            const storedData = [];
            while (storedData.length < 5) {
                const name = names[Math.floor(Math.random() * 5)];
                if (!storedData.includes(name)) storedData.push(name);
            }

            const playerNames = ['player1', 'player2', 'npc1', 'npc2', 'npc3'];
            for (let i = 0; i < 5; i++) {
                const { error } = await supabase
                    .from('characters')
                    .update({ role: storedData[i] })
                    .eq('name', playerNames[i]);

                if (error) throw error;
            }

            // 会話順と先攻を決めて Supabase に保存
            const allParticipants = pilot;
            const pairs = [];

            const shuffledOthers = [...allParticipants];
            for (let i = shuffledOthers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
            }

            // プレイヤーが自分以外と1対1で会話する形（player1主体）
            for (const other of shuffledOthers) {
                if (other !== 'player1') {
                    pairs.push(['player1', other]);
                }
            }

            // 各会話に対して先攻(0 or 1)をランダムに決定
            const initiatives = pairs.map(() => Math.round(Math.random()));

            // Supabase に保存
            const { error: convError } = await supabase
                .from('conversation_setups')
                .upsert([
                    {
                        session_id: 'default_session',
                        conversation_order: pairs,
                        initiatives,
                        created_by: 'master',
                    },
                ])
                .eq('session_id', 'default_session');

            if (convError) throw convError;

            window.location.reload();
        } catch (error) {
            console.error('シャッフルエラー:', error.message);
        }
    };

    const startGame = async () => {
        try {
            const now = new Date().toISOString();
      
            const { error } = await supabase.from('timer').update({
                is_running: true,
                start_time: now
            }).eq('id', 1);
      
            if (error) throw error;
            const session = await createSession('default_session');
            if (!session) {
                console.error('セッション作成に失敗しました');
                return;
            }
        } catch (error) {
            console.error('ゲーム開始エラー:', error.message);
        }
    };

    return (
        <HStack spacing={4} wrap="wrap">
            <Button onClick={shuffle}>キャラクターシャッフル</Button>
            <Button onClick={startGame}>GAME START</Button>
            <Button onClick={game_restart}>GAME RESET</Button>
            <Button onClick={initial_setting}>INITIAL</Button>
        </HStack>
    );
};

export default Control;