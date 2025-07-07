import { useEffect, useState, useRef } from 'react';
import {
    Box, Button, Input, VStack, Text, HStack, Flex
} from '@chakra-ui/react';
import { player_make } from '../server/global';
import supabase from '../supabaseClient';

const TURN_DURATION = 10 * 1000;
const TURNS_PER_PHASE = 4;
const DELAY_BEFORE_CLOSE = 2 * 1000;

// プレイヤー視点に変換
function convertOrderForPlayer(order, player) {
    if (player === 'player1') return order;
    return order.map(([p1, p2]) => {
        const swap = (p) => (p === 'player1' ? 'player2' : p === 'player2' ? 'player1' : p);
        return [swap(p1), swap(p2)];
    });
}

export default function Conversation({ player, conversationStartTime, resetKey, onClose }) {
    const [messages, setMessages] = useState([]);
    const [phase, setPhase] = useState(0);
    const [turn, setTurn] = useState(0);
    const [input, setInput] = useState('');
    const [order, setOrder] = useState([]);
    const [initiatives, setInitiatives] = useState([]);
    const [charNameMap, setCharNameMap] = useState({});
    const [remainingTime, setRemainingTime] = useState(TURN_DURATION / 1000);
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
	
		  const baseOrder = data.conversation_order;
		  const baseInitiatives = data.initiatives;
	
		  const adjustedOrder = convertOrderForPlayer(baseOrder, player);
		  const adjustedInitiatives = baseInitiatives;
	
		  setOrder(adjustedOrder);
		  setInitiatives(adjustedInitiatives);
		};

		fetchConversationSetup();
	  }, [player]);

    // 名前情報取得
	useEffect(() => {
		let isMounted = true;
	
		const fetchNames = async () => {
			const ids = Array.from(new Set(order.flat()));
			const missingIds = ids.filter((id) => !(id in charNameMap));
	
			if (missingIds.length === 0) return;
	
			const entries = await Promise.all(missingIds.map(async (id) => {
				const name = await player_make(id);
				return [id, name || id];
			}));
	
			if (isMounted) {
				setCharNameMap(prev => ({ ...prev, ...Object.fromEntries(entries) }));
			}
		};
	
		if (order.length > 0) fetchNames();
	
		return () => { isMounted = false };
	}, [order, charNameMap]);
	

    // タイマー更新とフェーズ・ターンの計算
    useEffect(() => {
		if (!conversationStartTime) return;
	
		const interval = setInterval(() => {
			const elapsed = new Date() - new Date(conversationStartTime);
			const totalTurns = Math.floor(elapsed / TURN_DURATION);
	
			const newPhase = Math.floor(totalTurns / TURNS_PER_PHASE);
			const newTurn = totalTurns % TURNS_PER_PHASE;
	
			console.log('phase: ', phase, ', turn: ', turn);
			// console.log('nphase: ', newPhase, ', nturn: ', newTurn);

			setPhase(newPhase);
			setTurn(newTurn);
	
			const turnElapsed = elapsed % TURN_DURATION;
			setRemainingTime(Math.ceil((TURN_DURATION - turnElapsed) / 1000));

			if (order.length > 0 && newPhase >= order.length - 1 && newTurn >= TURNS_PER_PHASE - 1) {
				console.log('Timer停止条件に達しました');
				clearInterval(interval); // 先にタイマー止める
				(async () => {
					await supabase
						.from('timer')
						.update({
							is_running: false,
							updated_at: new Date().toISOString(),
						})
						.eq('id', 2);
					onClose();
				})();
			}
		}, 250);
	
		return () => clearInterval(interval);
	}, [conversationStartTime, order, initiatives, phase, turn]);

    // メッセージ自動スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollTo(0, messagesEndRef.current.scrollHeight);
    }, [messages, phase]);

    // // モーダル終了判定
    // useEffect(() => {
    //     if (order.length === 0) return;
	// 	// console.log('phase: ', phase, ', turn: ', turn);
    //     if (phase >= order.length - 1 && turn >= TURNS_PER_PHASE - 1) {
    //         const stopTimer = async () => {
    //             await supabase.from('timer').update({
    //                 is_running: false,
    //                 updated_at: new Date().toISOString(),
    //             }).eq('id', 2);
	// 			onClose();
    //         };
    //         stopTimer();
    //     }
    // }, [phase, turn, onClose, order]);

    // フェーズリセット処理
    useEffect(() => {
        setPhase(0);
        setTurn(0);
        setRemainingTime(TURN_DURATION / 1000);
    }, [resetKey]);

    // 現在の会話情報
    const currentPair = order[phase] || [];
    const initiative = initiatives[phase] ?? 0;
    const isPlayerFirst = initiative === 0;
    const isPlayerTurn = (turn % 2 === 0) === isPlayerFirst;
    const currentSpeaker = isPlayerTurn ? player : currentPair.find((p) => p !== player);

    // メッセージ送信処理
    const handleSend = () => {
        if (!input.trim()) return;
        setMessages((prev) => [...prev, {
            sender: player,
            content: input.trim(),
            phase,
            turn,
            pair: currentPair,
        }]);
        setInput('');
    };

    // メッセージのフィルタリング
    const filteredMessages = messages.filter((msg) =>
        msg.phase === phase &&
        msg.pair &&
        msg.pair.includes(player) &&
        msg.pair.includes(currentPair.find((p) => p !== player))
    );

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