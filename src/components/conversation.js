import { useEffect, useState, useRef } from 'react';
import {
    Box, Button, Input, VStack, Text, HStack, Flex
} from '@chakra-ui/react';
import { pilot, player_make } from '../server/global';
import supabase from '../supabaseClient';

const TURN_DURATION = 10 * 1000;
const TURNS_PER_PHASE = 4;
// const DELAY_BEFORE_CLOSE = 2 * 1000;

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
    const [ order, setOrder ] = useState([]);
    const [ initiatives, setInitiatives ] = useState([]);
    const [ charNameMap, setCharNameMap ] = useState({});
    const [ remainingTime, setRemainingTime ] = useState(TURN_DURATION / 1000);
	const [ totalTurns, setTotalTurns ] = useState();
    const messagesEndRef = useRef(null);

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
	  }, [order]);

    // タイマー更新とフェーズ・ターンの計算
    useEffect(() => {
        if (!convStartTime || order.length === 0 || initiatives.length === 0) return;

        const interval = setInterval(() => {
            const elapsed = new Date() - new Date(convStartTime);
            const total = Math.floor(elapsed / TURN_DURATION);
			setTotalTurns(total);

            const newPhase = Math.floor(total / TURNS_PER_PHASE);
            const newTurnInPhase = total % TURNS_PER_PHASE;
            const phaseIndex = newPhase % order.length;

            setPhase(phaseIndex);
            setTurn(newTurnInPhase);

            const turnElapsed = elapsed % TURN_DURATION;
            setRemainingTime(Math.ceil((TURN_DURATION - turnElapsed) / 1000));
        }, 250);

        return () => clearInterval(interval);
    }, [convStartTime, order, initiatives]);

	// モーダルの終了条件
	useEffect(() => {
		if(!order.length) return;
		const maxTurns = order.length * TURNS_PER_PHASE;
		if ( player === 'player1' && totalTurns >= maxTurns ) {
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
	}, [totalTurns, player]);

    // メッセージ自動スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollTo(0, messagesEndRef.current.scrollHeight);
    }, [messages, phase]);

    // 現在の会話ペアと先攻判定
    const currentPair = order[phase] || [];
    const initiative = initiatives[phase] ?? 0;

    // ターン判定（先攻・後攻）
    const isPlayerFirst = initiative === 0;
    const isPlayerTurn =
        (turn % 2 === 0 && isPlayerFirst) ||
        (turn % 2 === 1 && !isPlayerFirst);

    // 発言者決定
    const currentSpeaker = isPlayerTurn ? player : currentPair.find((p) => p !== player);

    const filteredMessages = messages.filter(
        (msg) => msg.phase === phase
    );

	// メッセージ送信処理
    const handleSend = () => {
        if (!input.trim()) return;

        const newMessage = {
            phase,
            turn,
            sender: player,
            content: input,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newMessage]);
        setInput('');
    };

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
                {filteredMessages.map((msg, i) => (
                    <Box key={i} mb={2}>
                        <Text fontWeight="bold">{charNameMap[msg.sender] || msg.sender}:</Text>
                        <Text ml={4}>{msg.content}</Text>
                    </Box>
                ))}
            </Box>

            <HStack>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={player === currentSpeaker ? 'メッセージを入力' : `${charNameMap[currentSpeaker] || currentSpeaker} のターンです`}
                    isDisabled={player !== currentSpeaker}
                />
                <Button onClick={handleSend} isDisabled={player !== currentSpeaker}>
                    送信
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
                    {remainingTime}s
                </Box>
            </Flex>
        </VStack>
    );
}