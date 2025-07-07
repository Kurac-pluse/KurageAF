import { useEffect, useState, useRef } from 'react';
import {
  Box, Button, Input, VStack, Text, HStack,
} from '@chakra-ui/react';
import { playerToCharName } from '../server/global';

// 会話順序をplayer視点に合わせて変換する関数
function convertOrderForPlayer(order, player) {
  if (player === 'player1') return order;

  return order.map(([p1, p2]) => {
    // player1 <-> player2 を入れ替え
    const swapPlayer = (p) => (p === 'player1' ? 'player2' : p === 'player2' ? 'player1' : p);

    const np1 = swapPlayer(p1);
    const np2 = swapPlayer(p2);

    // playerが先頭になるように並び替え
    if (np1 === player) return [np1, np2];
    if (np2 === player) return [np2, np1];

    // それ以外はそのまま
    return [np1, np2];
  });
}

// シャッフル関数
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
  const [charName, setCharName] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // player1視点の会話ペア例（本来は外部から渡すかstateで管理）
    const player1Order = [
      ['player1', 'npc1'],
      ['player1', 'npc3'],
      ['player1', 'player2'],
      ['player1', 'npc2'],
    ];

    // playerに合わせて会話ペアを変換
    const newOrder = convertOrderForPlayer(player1Order, player);

    // 先攻はランダムに決める
    const whoStarts = newOrder.map(() => Math.round(Math.random()));

    setOrder(newOrder);
    setInitiatives(whoStarts);
  }, [player]);

  // フェーズ・ターンの更新
  useEffect(() => {
    if (!conversationStartTime || order.length === 0 || initiatives.length === 0) return;

    const interval = setInterval(() => {
      const elapsed = new Date() - new Date(conversationStartTime);
      const totalTurns = Math.floor(elapsed / TURN_DURATION);

      const newPhase = Math.floor(totalTurns / TURNS_PER_PHASE);
      const newTurnInPhase = totalTurns % TURNS_PER_PHASE;

      // フェーズがorderの範囲外ならループさせる（必要なら）
      const phaseIndex = newPhase % order.length;

      setPhase(phaseIndex);
      setTurn(newTurnInPhase);
    }, 1000);

    return () => clearInterval(interval);
  }, [conversationStartTime, order, initiatives]);

  // 現在の会話ペアと先攻判定
  const currentPair = order[phase] || [];
  const initiative = initiatives[phase] ?? 0; // 0 = player先攻, 1 = 相手先攻

  // 自分が先攻かどうか
  const isPlayerFirst = initiative === 0;

  // ターン判定
  // 偶数ターンは先攻のターン、奇数ターンは後攻のターン
  const isPlayerTurn =
    (turn % 2 === 0 && isPlayerFirst) ||
    (turn % 2 === 1 && !isPlayerFirst);

  // 発言者は自分か相手
  const currentSpeaker = isPlayerTurn ? player : currentPair.find((p) => p !== player);

  // 対戦相手の名前を取得
  useEffect(() => {
    const fetchCharName = async () => {
      const opponentId = currentPair?.find((p) => p !== player);
      if (opponentId) {
        const name = await playerToCharName(opponentId);
        setCharName(name);
      } else {
        setCharName('');
      }
    };
    fetchCharName();
  }, [currentPair, player]);

  useEffect(() => {
	if (messagesEndRef.current) {
	  // スクロールを一番下へ
	  messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
	}
  }, [messages, phase]);

  	// メッセージ送信処理
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
				ref={messagesEndRef}  // 自動スクロール
			>
			{messages
			.filter((msg) =>
				// 表示は現在のペアの会話のみ
				msg.phase === phase &&
				msg.pair &&
				((msg.pair.includes(player) && msg.pair.includes(charName)) || // 念のためcharNameではなくidで管理すればベター
				msg.pair.includes(player))
			)
			.map((msg, i) => (
				<Box key={i} mb={2}>
				<Text fontWeight="bold">{msg.sender}:</Text>
				<Text ml={4}>{msg.content}</Text>
				</Box>
			))}
			</Box>

			<HStack>
				<Input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder={player === currentSpeaker ? 'メッセージを入力' : `${currentSpeaker} のターンです`}
					isDisabled={player !== currentSpeaker}
				/>
				<Button onClick={handleSend} isDisabled={player !== currentSpeaker}>
					送信
				</Button>
			</HStack>

			<Text fontSize="sm" color="gray.500">
				フェーズ: {phase + 1} / ターン: {turn + 1} / 相手: {charName} / 発言者: {currentSpeaker}
			</Text>
		</VStack>
  	);
}