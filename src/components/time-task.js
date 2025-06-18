import { Flex, Box, Grid, Text } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import { useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button } from "@chakra-ui/react";

export default function TimeTask(props) {
    const playTime = 60;
    const { isOpen, onOpen, onClose } = useDisclosure();


    const [timeLeft, setTimeLeft] = useState(playTime);
    const [startTime, setStartTime] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        const channel = supabase
            .channel('realtime:timer')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'timer',
                },
                (payload) => {
                    const data = payload.new;
                    setStartTime(new Date(data.start_time));
                    setIsRunning(data.is_running);
                }
            )
            .subscribe();

        // 初回取得（ページ更新直後も対応）
        const fetchInitial = async () => {
            const { data, error } = await supabase
                .from('timer')
                .select('*')
                .eq('id', 1)
                .single();
    
            if (!error && data.is_running && data.start_time) {
                setStartTime(new Date(data.start_time));
                setIsRunning(data.is_running);
            }
        };
    
        fetchInitial();
    
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
    
    // 残り時間の計算
    useEffect(() => {
        if (!isRunning || !startTime) return;
    
        const interval = setInterval(() => {
            const now = new Date();
            const diff = Math.floor((now - startTime) / 1000);
            const remaining = Math.max(0, playTime - diff);
            setTimeLeft(remaining);
        }, 1000);
    
        return () => clearInterval(interval);
    }, [isRunning, startTime]);

    useEffect(() => {
        if (timeLeft === 0) {
            onOpen(); // モーダルを開く
        }
    }, [timeLeft]);
    
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    const formatted = timeLeft > 0
        ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : "終了";

    return (
        <Flex direction="row" justify="center" align="stretch" height="100%" width="100%">
            <Box flex="3" border="1px solid black">
                <Grid p={3} placeItems="center" height="100%">
                    <Text fontSize="7xl" fontWeight="bold">{formatted}</Text>
                </Grid>
            </Box>
            <Box flex="5" border="1px solid black" bg="gray.200">
                <Grid p={3}>
                    {/* 右側のコンテンツ */}
                </Grid>
            </Box>

            {/* モーダルの描画 */}
            <Modal isOpen={isOpen} onClose={onClose} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>時間切れ</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                    {props.player === 'player1' && <Text>Player1用の内容</Text>}
                    {props.player === 'player2' && <Text>Player2用の内容</Text>}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Flex>
    );
}
