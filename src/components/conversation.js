import { useEffect, useState, useRef } from 'react';
import {
    Box, Button, Input, VStack, Text, HStack,
} from '@chakra-ui/react';
import { player_make } from '../server/global';

// 会話順序をplayer視点に合わせて変換する関数
function convertOrderForPlayer(order, player) {
    if (player === 'player1') return order;

    return order.map(([p1, p2]) => {
        const swapPlayer = (p) => (p === 'player1' ? 'player2' : p === 'player2' ? 'player1' : p);

        const np1 = swapPlayer(p1);
        const np2 = swapPlayer(p2);

        if (np1 === player) return [np1, np2];
        if (np2 === player) return [np2, np1];

        return [np1, np2];
    });
}

// シャッフル関数（今回は未使用）
const shuffle = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const TURN_DURATION = 20 * 1000; // 20秒
const TURNS_PER_PHASE = 6;

export default function Conversation({ player, conversationStartTime }) {
    const [messages, setMessages] = useState([]);
    const [phase, setPhase] = useState(0);
    const [turn, setTurn] = useState(0);
    const [input, setInput] = useState('');
    const [order, setOrder] = useState([]);
    const [initiatives, setInitiatives] = useState([]);
    const [charNameMap, setCharNameMap] = useState({}); // ID -> 名前マップ
    const messagesEndRef = useRef(null);

    // 1. player視点のorderをセットし、先攻ランダム決定
    useEffect(() => {
        const player1Order = [
            ['player1', 'npc1'],
            ['player1', 'npc3'],
            ['player1', 'player2'],
            ['player1', 'npc2'],
        ];

        const newOrder = convertOrderForPlayer(player1Order, player);
        const whoStarts = newOrder.map(() => Math.round(Math.random()));

        setOrder(newOrder);
        setInitiatives(whoStarts);
    }, [player]);

    // 2. orderに出てくる全IDの名前をまとめて取得しマップ作成
    useEffect(() => {
        const fetchAllNames = async () => {
            if (order.length === 0) return;

            // order内の全IDを一意抽出
            const idsSet = new Set();
            order.forEach(([p1, p2]) => {
                idsSet.add(p1);
                idsSet.add(p2);
            });
            const ids = Array.from(idsSet);

            // 全IDに対してplayer_makeを呼ぶ（名前取得）
            const entries = await Promise.all(
                ids.map(async (id) => {
                    const name = await player_make(id);
                    return [id, name || id]; // 名前がなければIDを表示用に
                })
            );

            setCharNameMap(Object.fromEntries(entries));
        };

        fetchAllNames();
    }, [order]);

    // 3. フェーズ・ターンの更新（タイマー処理）
    useEffect(() => {
        if (!conversationStartTime || order.length === 0 || initiatives.length === 0) return;

        const interval = setInterval(() => {
            const elapsed = new Date() - new Date(conversationStartTime);
            const totalTurns = Math.floor(elapsed / TURN_DURATION);

            const newPhase = Math.floor(totalTurns / TURNS_PER_PHASE);
            const newTurnInPhase = totalTurns % TURNS_PER_PHASE;

            // フェーズがorderの範囲外ならループ
            const phaseIndex = newPhase % order.length;

            setPhase(phaseIndex);
            setTurn(newTurnInPhase);
        }, 1000);

        return () => clearInterval(interval);
    }, [conversationStartTime, order, initiatives]);

    // 4. 現在の会話ペアと先攻判定
    const currentPair = order[phase] || [];
    const initiative = initiatives[phase] ?? 0;

    // 5. ターン判定（先攻・後攻）
    const isPlayerFirst = initiative === 0;
    const isPlayerTurn =
        (turn % 2 === 0 && isPlayerFirst) ||
        (turn % 2 === 1 && !isPlayerFirst);

    // 6. 発言者決定
    const currentSpeaker = isPlayerTurn ? player : currentPair.find((p) => p !== player);

    // 7. メッセージの自動スクロール
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [messages, phase]);

    // 8. メッセージ送信処理
    const handleSend = () => {
        if (!input.trim()) return;

        const newMessage = {
            sender: player,
            content: input.trim(),
            phase,
            turn,
            pair: currentPair,
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
                {messages
                    .filter((msg) =>
                        msg.phase === phase &&
                        msg.pair &&
                        msg.pair.includes(player) &&
                        msg.pair.includes(currentPair.find((p) => p !== player))
                    )
                    .map((msg, i) => (
                        <Box key={i} mb={2}>
                            {/* IDではなく名前で表示 */}
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

            <Text fontSize="sm" color="gray.500">
                フェーズ: {phase + 1} / ターン: {turn + 1} / 会話相手: {charNameMap[currentPair.find((p) => p !== player)] || ''} / 現在の発言者: {charNameMap[currentSpeaker] || currentSpeaker}
            </Text>
        </VStack>
    );
}