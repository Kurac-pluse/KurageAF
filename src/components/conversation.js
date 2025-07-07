import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Input,
    VStack,
    Text,
    HStack,
} from '@chakra-ui/react';

const participants = ['human', 'npc1', 'npc2', 'npc3']
const TURN_DURATION = 5 * 1000; // 30秒

export default function Conversation({ player, conversationStartTime }) {
    const [messages, setMessages] = useState([]);
    const [turn, setTurn] = useState(0);
    const [input, setInput] = useState('');

    const currentSpeaker = participants[turn % participants.length];

    // conversationStartTime から turn を常に再計算
    useEffect(() => {
		// console.log(conversationStartTime);
		if (!conversationStartTime) {
			console.warn('conversationStartTime が未定義です');
			return;
		}
	
		const parsedStart = new Date(conversationStartTime);
		if (isNaN(parsedStart)) {
			console.error('conversationStartTime のパースに失敗:', conversationStartTime);
			return;
		}
		const interval = setInterval(() => {
			const now = new Date();
			const elapsed = now - new Date(conversationStartTime);
			const turnCount = Math.floor(elapsed / TURN_DURATION);
			const currentTurn = turnCount % 2;
			setTurn(currentTurn);
		}, 1000);
		return () => clearInterval(interval);
	}, [conversationStartTime]);
	

    const handleSend = () => {
        if (!input.trim()) return;

        const newMessage = {
            sender: player,
            content: input,
            turn,
        };

        setMessages((prev) => [...prev, newMessage]);
        setInput('');
    };

    return (
        <VStack spacing={4} align="stretch" p={4}>
            <Box border="1px solid gray" borderRadius="md" p={4} h="500px" overflowY="scroll">
                {messages.map((msg, i) => (
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
                    placeholder={
                        player === currentSpeaker ? 'メッセージを入力' : `${currentSpeaker} のターンです`
                    }
                    isDisabled={player !== currentSpeaker}
                />
                <Button onClick={handleSend} isDisabled={player !== currentSpeaker}>
                    送信
                </Button>
            </HStack>

            <Text fontSize="sm" color="gray.500">
                現在のターン: {turn} / 会話相手: {currentSpeaker}
            </Text>
        </VStack>
    );
}