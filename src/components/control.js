import { HStack, Button, Input } from '@chakra-ui/react';
import { names, pilot } from '../utils/global';
import { game_restart, initial_setting } from '../utils/game-setting';
import supabase from '../supabaseClient';
import { createSession } from '../utils/chat';
import { useState } from 'react';

const Control = () => {
    const [sessionName, setSessionName] = useState('');

    const shuffleTaskNumbers = async() => {
        // 1. 全タスクを取得
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('id');
      
        if (error) {
          console.error('タスク取得失敗:', error);
          return;
        }
      
        // 2. シャッフル用の number 配列を作成
        const count = tasks.length;
        const shuffledNumbers = Array.from({ length: count }, (_, i) => i + 1)
          .sort(() => Math.random() - 0.5);
      
        // 3. id と number をペアにして UPDATE
        for (let i = 0; i < count; i++) {
          const taskId = tasks[i].id;
          const number = shuffledNumbers[i];
      
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ number })
            .eq('id', taskId);
      
          if (updateError) {
            console.error(`タスクID ${taskId} の更新失敗:`, updateError);
          }
        }
        console.log(shuffledNumbers);
        console.log("完了");
    }

    const shuffle = async () => {
        try {
            if (!sessionName) {
                console.log("session_name埋めて");
                return;
            }

            // session 作成
            const sessionId = await createSession(sessionName);
            if (!sessionId) return;

            // localStorage は「管理者用の一時参照」
            localStorage.setItem('session_id', sessionId);

            // roleをランダムに並び替えて配列に格納
            const storedData = [];
            while (storedData.length < 5) {
                const name = names[Math.floor(Math.random() * 5)];
                if (!storedData.includes(name)) storedData.push(name);
            }

            for (let i = 0; i < 5; i++) {
                const { error } = await supabase
                    .from('characters')
                    .update({ role: storedData[i] }) // 割り当てる役割
                    .eq('name', pilot[i]);     // 対象キャラ

                if (error) throw error;
            }

            // 会話ペア作成
            const pairs = [];
            const shuffledOthers = [...pilot];

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

            // 会話順
            const initiatives = pairs.map(() => Math.round(Math.random()));

            // Supabase に保存
            const { error: convError } = await supabase
                .from('conversation_setups')
                .upsert([
                    {
                        session_id: 'default_session',
                        conversation_order: pairs, // 会話順
                        initiatives,               // 先攻情報
                    },
                ])
                .eq('session_id', 'default_session');

            if (convError) throw convError;

            await shuffleTaskNumbers();
            window.location.reload();
        } catch (error) {
            console.error('シャッフルエラー:', error.message);
        }
    };

    const startGame = async () => {
        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) return;

            // 他セッションを finished
            await supabase
            .from('sessions')
            .update({ status: 'finished' })
            .neq('id', sessionId);

            // この session を running
            await supabase
            .from('sessions')
            .update({ status: 'running' })
            .eq('id', sessionId);

            // ③ timer 開始
            const now = new Date().toISOString();
            await supabase.from('timer').update({
                start_time: now,
                is_running: true,
            }).eq('id', 1);

        } catch (error) {
            console.error('ゲーム開始エラー:', error.message);
        }
    };

    return (
        <HStack spacing={4} wrap="wrap">
            <Input
                placeholder="例: Aさん, Bさん"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
            />
            <Button onClick={shuffle}>MAKE SESSION</Button>
            <Button onClick={startGame}>GAME START</Button>
            <Button onClick={game_restart}>GAME RESET</Button>
            <Button onClick={initial_setting}>INITIAL</Button>
        </HStack>
    );
};

export default Control;