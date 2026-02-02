import { HStack, VStack, Button, Input, Select } from '@chakra-ui/react';
import { names, pilot } from '../api/info';
import supabase from '../supabaseClient';
import { createSession } from '../api/chat';
import { useEffect, useState } from 'react';

const Control = () => {
    const [sessionName, setSessionName] = useState(() => localStorage.getItem('session_name') || '');
    const [sessionError, setSessionError] = useState('');
    const [taskError, setTaskError] = useState('');
    const [sessionSuccess, setSessionSuccess] = useState('');
    const [taskSuccess, setTaskSuccess] = useState('');
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState('');

    // task一覧取得
    useEffect(() => {
        const fetchTasks = async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select('id, name, number')
                .order('number', { ascending: true });
            if (error) {
                console.error('タスク取得失敗:', error);
                return;
            }
            setTasks(data);
        };
        fetchTasks();
    }, []);

    // ------------------------------------------
    // 処理関数
    // ------------------------------------------

    // ①タスクのシャッフル
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
        // console.log(shuffledNumbers);
        // console.log("完了");
    }

    // ①キャラや会話順などすべてをシャッフル
    const shuffle = async () => {
        try {
            setSessionError('');
            setTaskError('');
            setSessionSuccess('');
            setTaskSuccess('');

            // 空チェック
            if (!sessionName) {
                setSessionError('セッション名を入力してください');
                return;
            }

            // 既存 name チェック
            const { data: existing, error: checkError } = await supabase
                .from('sessions')
                .select('id')
                .eq('name', sessionName)
                .limit(1);

            if (checkError) {
                console.error(checkError);
                setSessionError('セッション名の確認中にエラーが発生しました');
                return;
            }

            if (existing.length > 0) {
                setSessionError('そのセッション名は既に使われています');
                return;
            }

            // session 作成
            const sessionId = await createSession(sessionName);
            if (!sessionId) {
                setSessionError('セッションの作成に失敗しました');
                return;
            }

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
            setSessionSuccess('Session作成完了');
            // window.location.reload();
        } catch (error) {
            console.error('シャッフルエラー:', error.message);
        }
    };

    // ②FastAPIにgameのリセットを依頼
    async function gameRestart() {
        const url = process.env.REACT_APP_SERVER_URL + "/api/mmo/game_restart";

        const response = await fetch(url, {
            method: "POST",
            headers: { Accept: "application/json" },
        });
        if (!response.ok) {
            throw new Error(await response.text());
        }
        return await response.json();
    }

    // ③④FastAPIにflag管理を依頼
    async function gameStart(taskName, modeNum) {
        const url = process.env.REACT_APP_SERVER_URL + "/api/mmo/start";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                task_name: taskName,
                game_mode: modeNum,
            }),
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        return await response.json();
    }

    // ------------------------------------------
    // handle
    // ------------------------------------------

    // ②GAME RESET
    const handleGameReset = async () => {
        try {
            setSessionError('');
            setTaskError('');
            setSessionSuccess('');
            setTaskSuccess('');

            await gameRestart();   // ← 成功 or throw

            setSessionSuccess('ゲームをリセットしました');
        } catch (error) {
            console.error('GAME RESET error:', error);
            setSessionError('ゲームのリセットに失敗しました');
        }
    };

    // ③GAME START
    const handleGameStart = async () => {
        try {
            setSessionError('');
            setTaskError('');
            setSessionSuccess('');
            setTaskSuccess('');

            // 入力チェック
            if (!sessionName) {
                setSessionError('セッション名を入力してください');
                return;
            }

            // name から session を取得
            const { data: session, error } = await supabase
                .from('sessions')
                .select('id')
                .eq('name', sessionName)
                .single();

            if (error || !session) {
                setSessionError('指定されたセッションが見つかりません');
                return;
            }

            const sessionId = session.id;

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

            // FastAPI に start を依頼
            await gameStart("", "0");

            setSessionSuccess('ゲームを開始しました');
        } catch (error) {
            console.error('ゲーム開始エラー:', error);
            setSessionError('ゲーム開始に失敗しました');
        }
    };

    // ④EX3
    const handleStartNpcTask = async () => {
        try {
            setSessionError('');
            setTaskError('');
            setSessionSuccess('');
            setTaskSuccess('');

            if (!selectedTask) {
                setTaskError('タスクを選択してください');
                return;
            }

            // FastAPI に start を依頼
            await gameStart(selectedTask, "1");

            setTaskSuccess(`タスク「${selectedTask}」を開始しました`);
        } catch (error) {
            console.error(error);
            setTaskError('タスク開始に失敗しました');
        }
    };

    // ------------------------------------------
    // JSX
    // ------------------------------------------
    return (
        <>
        <VStack align="start" spacing={4}>
            <HStack spacing={4} wrap="wrap">
                <Input
                    placeholder="例: Aさん, Bさん"
                    value={sessionName}
                    isInvalid={!!sessionError}
                    onChange={(e) => {
                        setSessionName(e.target.value);
                        localStorage.setItem('session_name', e.target.value);
                        setSessionError(''); // 入力中にエラー解除
                        setSessionSuccess('');
                    }}
                />

                <Button onClick={shuffle}>MAKE SESSION</Button>
                <Button onClick={handleGameStart}>GAME START</Button>
                <Button onClick={handleGameReset}>GAME RESET</Button>

                {sessionError && (
                    <div style={{ color: 'red', fontSize: '0.9em' }}>
                        {sessionError}
                    </div>
                )}
                {sessionSuccess && (
                    <div style={{ color: 'green', fontSize: '0.9em' }}>
                        {sessionSuccess}
                    </div>
                )}
            </HStack>

            <HStack spacing={4} mt={4}>
                <Select
                    placeholder="実行するタスクを選択してください"
                    value={selectedTask}
                    onChange={(e) => {
                        setSelectedTask(e.target.value);
                        setTaskError('');
                        setTaskSuccess('')
                    }}
                    width="360px"
                    isInvalid={!!taskError}
                >
                    {tasks.map(task => (
                        <option key={task.id} value={task.name}>
                            {task.name}
                        </option>
                    ))}
                </Select>
                <Button colorScheme="teal" onClick={handleStartNpcTask}>
                    選択したタスクで実験開始
                </Button>
                {taskError && (
                    <div style={{ color: 'red', fontSize: '0.9em' }}>
                        {taskError}
                    </div>
                )}
                {taskSuccess && (
                    <div style={{ color: 'green', fontSize: '0.9em' }}>
                        {taskSuccess}
                    </div>
                )}
            </HStack>
        </VStack>
        </>
    );
};

export default Control;