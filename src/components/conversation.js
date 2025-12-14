import { useEffect, useState, useRef, useMemo } from 'react';
import {
    Box, Button, Input, VStack, Text, HStack, Flex
} from '@chakra-ui/react';
import { pilot, player_make } from '../utils/global';
import supabase from '../supabaseClient';
import { fetchMessagesBySession, saveMessage } from '../utils/chat';
import { makeResponse } from '../api/llm';

const TURN_DURATION = 30 * 1000;
const TURNS_PER_PHASE = 6;
const PHASE_END_BUFFER = 5 * 1000;

// プレイヤー視点に変換
function convertOrderForPlayer(order, initiatives, player) {
    if (player === 'player1') return [order, initiatives];

    const swap = (p) => {
        if (p === 'player1') return 'player2';
        if (p === 'player2') return 'player1';
        return p;
    };
    const convertedOrder = order.map(([p1, p2]) => [swap(p1), swap(p2)]);
    const convertedInitiatives = order.map((_, i) => 
        initiatives[i] === 0 ? 1 : 0
    );
    return [convertedOrder, convertedInitiatives];
}

export default function Conversation({ player, convStartTime }) {
    const [ messages, setMessages ] = useState([]);
    const [ phase, setPhase ] = useState(0);
    const [ turn, setTurn ] = useState(0);
    const [ input, setInput ] = useState('');
	const [isLocked, setIsLocked] = useState(false);
    const [ order, setOrder ] = useState([]);
    const [ initiatives, setInitiatives ] = useState([]);
    const [ charNameMap, setCharNameMap ] = useState({});
    const [ remainingTime, setRemainingTime ] = useState(TURN_DURATION / 1000);
	const [ totalTurns, setTotalTurns ] = useState();
	const [sessionId, setSessionId] = useState(() => localStorage.getItem('session_id') || null);
    const messagesEndRef = useRef(null);
	const npcResponseRef = useRef(null);

    // 会話順と先攻を初期化
    useEffect(() => {
        const fetchConversationSetup = async () => {
            const { data, error } = await supabase
                .from('conversation_setups')
                .select('conversation_order, initiatives')
                .eq('session_id', 'default_session')
                .single();

            if (error) {
                console.error('会話セットアップの取得に失敗しました:', error);
                return;
            }
			// console.log('[Setup]', { order: data.conversation_order, initiatives: data.initiatives });
            const baseOrder = data.conversation_order;
            const baseInitiatives = data.initiatives;

            const [adjustedOrder, adjustedInitiatives] = convertOrderForPlayer(
				baseOrder,
				baseInitiatives,
				player
			);
			// console.log('[Adjusted]', { adjustedOrder, adjustedInitiatives });
            setOrder(adjustedOrder);
            setInitiatives(adjustedInitiatives);
        };

        fetchConversationSetup();
    }, [player]);

	// 名前の配列を作成
    useEffect(() => {
		const fetchAllNames = async () => {
		  if (order.length === 0) return;

		  const entries = await Promise.all(
			pilot.map(async (id) => {
			  const name = await player_make(id);
			  return [id, name || id];
			})
		  );

		  setCharNameMap(Object.fromEntries(entries));
		};

		fetchAllNames();
	  }, [order.length]);

    // タイマー更新とフェーズ・ターンの計算
    useEffect(() => {
		// convStartTime（会話開始時刻）、order（発話順序）、initiatives（先攻情報）
		// のいずれかが未設定の場合は処理を行わない
		if (!convStartTime || order.length === 0 || initiatives.length === 0) return;

		// 各フェーズの総時間 = (1ターンの長さ × ターン数) + フェーズ終了時のバッファ時間
		const PHASE_DURATION = TURNS_PER_PHASE * TURN_DURATION + PHASE_END_BUFFER;

		// 一定間隔（250msごと）で経過時間を監視し、フェーズやターンの状態を更新する
		const interval = setInterval(() => {
			// 会話開始からの経過時間（ミリ秒）
			const elapsed = new Date() - new Date(convStartTime);

			// 経過時間から現在のフェーズ番号を算出
			// 経過時間 ÷ フェーズ時間 でフェーズのインデックスを得る
			// order.length で割った余りを取ることで、ループにも対応
			const phaseIndex = Math.floor(elapsed / PHASE_DURATION) % order.length;

			// 現在のフェーズ内で経過した時間（ミリ秒）
			const elapsedInPhase = elapsed % PHASE_DURATION;

			// バッファ時間中（フェーズ終了から次のフェーズ開始まで）は更新をスキップする
			if (elapsedInPhase >= TURNS_PER_PHASE * TURN_DURATION) return;

			// 現在フェーズ内のターン番号（0始まり）
			const turnInPhase = Math.floor(elapsedInPhase / TURN_DURATION);

			// 現在ターン内で経過した時間（ミリ秒）
			const turnElapsed = elapsedInPhase % TURN_DURATION;

			// フェーズとターンの状態を更新
			setPhase(phaseIndex);   // 現在のフェーズ番号
			setTurn(turnInPhase);   // 現在のターン番号

			// 現在ターンの残り時間（秒単位）を計算して更新
			setRemainingTime(Math.floor((TURN_DURATION - turnElapsed) / 1000));

			// 純粋な経過ターン数を算出
			// 例: フェーズ1のターン3 → 1×TURNS_PER_PHASE + 3 = 8ターン目
			const pureTurns = phaseIndex * TURNS_PER_PHASE + turnInPhase;

			// 累積ターン数としてstateを更新
			setTotalTurns(pureTurns);
		}, 250);

		// コンポーネントがアンマウントされた際にintervalを解除してメモリリークを防ぐ
		return () => clearInterval(interval);
	}, [convStartTime, order.length, initiatives]);

	// モーダルの終了条件
	useEffect(() => {
		if(!order.length) return;
		const maxTurns = order.length * TURNS_PER_PHASE;
		if ( player === 'player1' && totalTurns >= maxTurns -1 ) {
			const switchTimers2 = async () => {
				try {
					// 現在の状態を取得
					const { data: timers, error } = await supabase
						.from('timer')
						.select('id, is_running')
						.eq('id', 2);

					if (error) throw error;
					if (!timers || timers.length === 0) return;

					const timer2 = timers[0];

					// すでに切り替わっていたら何もしない
					if (timer2 && timer2.is_running === false) {
						return;
					}
					// console.log("max: ", maxTurns);
					// console.log("total: ", totalTurns);
					const { error: error2 } = await supabase
						.from('timer')
						.update({ is_running: false })
						.eq('id', 2);

					if (error2) throw error2;
				} catch (error) {
					console.error('タイマー切り替えエラー:', error.message);
				}
			};
			switchTimers2();
		}
	}, [totalTurns, player, order.length]);

    // メッセージ自動スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollTo(0, messagesEndRef.current.scrollHeight);
    }, [messages, phase]);

    // 現在の会話ペアと先攻判定
    const currentPair = useMemo(() => order[phase] || [], [order, phase]);
    const initiative = initiatives[phase] ?? 0;

    // ターン判定（先攻・後攻）
    const isPlayerFirst = initiative === 0;
    const isPlayerTurn =
        (turn % 2 === 0 && isPlayerFirst) ||
        (turn % 2 === 1 && !isPlayerFirst);

    // 発言者決定
    const currentSpeaker = isPlayerTurn ? player : currentPair.find((p) => p !== player);

	// セッションIDの更新
	useEffect(() => {
		const handleStorage = (e) => {
		  	if (e.key === 'session_id') {
				setSessionId(e.newValue);
		  	}
		};
		window.addEventListener('storage', handleStorage);

		return () => {
		  	window.removeEventListener('storage', handleStorage);
		};
	}, []);

	// メッセージのDB登録
	useEffect(() => {
	const fetchMessages = async () => {
		if (!player) return;
		const msgs = await fetchMessagesBySession(sessionId, player);
		setMessages(msgs);
	};
	fetchMessages();
	}, [player, sessionId]);

	// メッセージ送信処理
	useEffect(() => {
		if (remainingTime > 0) return;
		if (player !== currentSpeaker) return;
		if (!input.trim()) return; // 入力が空なら送信しない

		console.log(`[AUTO-SEND] ${player} のターン終了 → 自動送信`);
		const autoSend = async () => {
			const newMessage = {
				session_id: sessionId,
				phase: phase,
				turn: turn,
				sender: player,
				receiver: currentPair.find((p) => p !== player),
				content: input,
			};

			try {
				const success = await saveMessage(newMessage);
				if (success) {
					setInput('');
					setIsLocked(false);
				}
			} catch (err) {
				console.error('自動送信中に例外が発生:', err);
			}
		};

		autoSend();
	}, [remainingTime, player, currentSpeaker, currentPair, input, phase, sessionId, turn]);

	// ボタンによるテキストボックスの固定
    const handleConfirm = async () => {
        // 編集状態の切り替え
        setIsLocked(prev => !prev);
	};

	// リアルタイム処理
	useEffect(() => {
		if (!player) return;

		const channel = supabase
			.channel('messages_realtime')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'messages',
				},
				(payload) => {
					const newMsg = payload.new;
					// 最新セッションのメッセージか確認（必要に応じてsession_idのチェックを追加）
					setMessages((prev) => [...prev, newMsg]);
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [player]);

	// NPCのターンを検知し、推論を行う
	useEffect(() => {
		if (!currentSpeaker) return;
		if (!['npc1', 'npc2', 'npc3'].includes(currentSpeaker)) return;

		// 推論タスクを開始してPromiseを保持
		npcResponseRef.current = makeResponse({
			sessionId,
			phase,
			turn,
			sender: currentSpeaker,
			receiver: player,
		});
	}, [phase, turn, currentSpeaker, sessionId, player]);

	// ターンが終了した瞬間に推論結果を反映
	useEffect(() => {
		if (remainingTime > 0) return;
		if (!['npc1', 'npc2', 'npc3'].includes(currentSpeaker)) return;

		const handleNpcEndTurn = async () => {
			console.log(`[NPC推論完了待機] ${currentSpeaker} のターン終了`);

			try {
				// 推論結果を取得
				const result = await npcResponseRef.current;
				if (!result) return;

				const newMessage = {
					session_id: sessionId,
					phase,
					turn,
					sender: currentSpeaker,
					receiver: player,
					content: result,
				};

				// DBに保存して反映
				const success = await saveMessage(newMessage);
				if (success) {
					console.log(`[NPC自動送信] ${currentSpeaker}: ${result}`);
				}
			} catch (err) {
				console.error('NPC推論反映エラー:', err);
			} finally {
				npcResponseRef.current = null; // クリーンアップ
			}
		};

		handleNpcEndTurn();
	}, [remainingTime, currentSpeaker, phase, turn, sessionId, player]);

    return (
        <VStack spacing={4} align="stretch" p={4}>
            <Box
                border="1px solid gray"
                borderRadius="md"
                p={4}
                h="500px"
                overflowY="auto"
                ref={messagesEndRef}
            >
                {messages
					.filter((msg) => msg.phase === phase)
					.map((msg, i) => (
                    	<Box key={i} mb={2}>
                        	<Text fontWeight="bold">{charNameMap[msg.sender] || msg.sender}:</Text>
                        	<Text ml={4}>{msg.content}</Text>
                    	</Box>
                	))
				}
            </Box>

            <HStack>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
						player === currentSpeaker ? isLocked ?
						'確定中（編集不可）':
						'メッセージを入力':
						`${charNameMap[currentSpeaker] || currentSpeaker} のターンです`
					}
                    isDisabled={player !== currentSpeaker || isLocked}
                />
                <Button
					onClick={handleConfirm}
					colorScheme={isLocked ? 'gray' : 'blue'}
					isDisabled={player !== currentSpeaker}
				>
					{isLocked ? '編集に戻す' : '確定'}
				</Button>
            </HStack>

            <Flex fontSize="sm" color="gray.500" align="center" gap={2}>
                <Text>
                    フェーズ: {phase + 1} / ターン: {turn + 1} / 会話相手: {charNameMap[currentPair.find((p) => p !== player)] || ''} /
                    現在の発言者: {charNameMap[currentSpeaker] || currentSpeaker}
                </Text>
                <Box
                    px={2}
                    bg="blue.100"
                    borderRadius="md"
                    fontWeight="bold"
                    color="blue.700"
                    minW="30px"
                    textAlign="center"
                >
                    {remainingTime}s後に自動送信
                </Box>
            </Flex>
        </VStack>
    );
}