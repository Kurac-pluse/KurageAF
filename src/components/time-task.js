import { Flex, Box, Grid, Text } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import { useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody } from "@chakra-ui/react";
import Conversation from "./conversation";

export default function TimeTask(props) {
    const playTime = 20;
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [timeLeft, setTimeLeft] = useState(playTime);
    const [startTime, setStartTime] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [conversationStartTime, setConversationStartTime] = useState(null);
    const [resetKey, setResetKey] = useState(0);

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

    const [hasOpened, setHasOpened] = useState(false);

    useEffect(() => {
        if (timeLeft === 0 && !hasOpened) {
            const fetchAndStartConversation = async () => {
                // console.log('fetchAndStartConversation start');
                // まず、id=2のタイマー情報を取得
                const { data, error } = await supabase
                    .from('timer')
                    .select('*')
                    .eq('id', 2)
                    .single();
                // console.log('timer data:', data, 'error:', error);
                if (error) {
                    console.error('タイマー取得エラー:', error);
                    return;
                }
    
                // まだis_runningがfalseならtrueに更新する
                if (!data.is_running) {
                    const { error: updateError } = await supabase
                        .from('timer')
                        .update({
                            is_running: true,
                            start_time: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', 2);
                    // console.log('updateError:', updateError);
                    if (updateError) {
                        console.error('タイマー開始更新エラー:', updateError);
                        return;
                    }
                }
    
                // 再度取得してstart_timeをセットしモーダルを開く
                const { data: newData, error: newError } = await supabase
                    .from('timer')
                    .select('*')
                    .eq('id', 2)
                    .single();
                // console.log('newData:', newData, 'newError:', newError);
    
                    if (!newError && newData.is_running && newData.start_time) {
                        setConversationStartTime(new Date(newData.start_time));
                        setResetKey(prev => prev + 1); // リセットを指示
                        // console.log(pre);s
                        setHasOpened(true);
                        onOpen();
                        // console.log('Modal opened');
                    }
                };

            fetchAndStartConversation();
        }
    }, [timeLeft, onOpen, hasOpened]);

    useEffect(() => {
        const updateTimerState = async () => {
            await supabase.from('timer')
                .update({ is_running: !isOpen })
                .eq('id', 1); // または session_id などの条件に応じて
        };
    
        updateTimerState();
    }, [isOpen]);
        
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
            <Modal closeOnOverlayClick={false} isOpen={isOpen} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader textAlign="center"fontSize="2xl" fontWeight="bold">
                        会話 TIME
                    </ModalHeader>
                    <ModalBody>
                    <Conversation
                        key={resetKey}
                        player={props.player}
                        conversationStartTime={conversationStartTime}
                        resetKey={resetKey}
                        onClose={onClose}
                    />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Flex>
    );
}