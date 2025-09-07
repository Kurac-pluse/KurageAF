import { useState, useEffect } from "react";
import {
    Flex,
    Box,
    Grid,
    Text,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    useDisclosure
} from "@chakra-ui/react";
import supabase from "../supabaseClient";
import Conversation from "./conversation";
import Task from "./task";

export default function Time({ player }) {
    const playTime = 30;

    const { isOpen, onOpen, onClose } = useDisclosure();
    const [ timeLeft, setTimeLeft ] = useState(playTime);
    const [ playStartTime, setPlayStartTime ] = useState(null);
    const [ convStartTime, setConvStartTime] = useState(null);
    const [ playIsRunning, setPlayIsRunning ] = useState(false);
    const [ convIsRunning, setConvIsRunning] = useState(false);

    // タイマー状態購読（id:1）
    useEffect(() => {
        const fetchTimer = async () => {
            const { data, error } = await supabase
                .from('timer')
                .select('start_time, is_running')
                .eq('id', 1)
                .single();
    
            if (error) {
                console.error('Failed to fetch timer (id=1):', error.message);
            } else {
                setPlayStartTime(data.start_time);
                setPlayIsRunning(data.is_running);
            }
        };
        fetchTimer();

        const channel = supabase
            .channel('play-timer-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'timer',
                    filter: 'id=eq.1',
                },
                (payload) => {
                    const newData = payload.new
                    const oldData = payload.old

                    // start_time または is_running に変更があった場合のみ更新
                    if (
                        newData.start_time !== oldData.start_time ||
                        newData.is_running !== oldData.is_running
                    ) {
                        setPlayStartTime(newData.start_time)
                        setPlayIsRunning(newData.is_running)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // モーダル状態購読（id:2）
    useEffect(() => {
        const fetchTimer = async () => {
            const { data, error } = await supabase
                .from('timer')
                .select('start_time, is_running')
                .eq('id', 2)
                .single();
    
            if (error) {
                console.error('Failed to fetch timer (id=2):', error.message);
            } else {
                setConvStartTime(data.start_time);
                setConvIsRunning(data.is_running);
            }
        };
        fetchTimer();

        const channel = supabase
            .channel('conv-timer-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'timer',
                    filter: 'id=eq.2',
                },
                (payload) => {
                    const newData = payload.new
                    const oldData = payload.old

                    // start_time または is_running に変更があった場合のみ更新
                    if (
                        newData.start_time !== oldData.start_time ||
                        newData.is_running !== oldData.is_running
                    ) {
                        setConvStartTime(newData.start_time)
                        setConvIsRunning(newData.is_running)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // 残り時間のカウントダウン処理
    useEffect(() => {
        if (!playStartTime) return;

        const interval = setInterval(() => {
            const now = new Date();
            const elapsed = Math.floor((now - new Date(playStartTime)) / 1000);
            const remaining = playTime - elapsed;
            setTimeLeft(remaining);

            if (remaining < 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [playStartTime]);

    // タイマー終了時、id:1のis_runningをfalseに、id:2をtrueに
    useEffect(() => {
        if (
            player === 'player1' &&
            timeLeft === 0
        ) {
            const switchTimers1 = async () => {
                try {
                    // 現在の状態を取得
                    const { data: timers, error } = await supabase
                        .from('timer')
                        .select('id, is_running')
                        .in('id', [1, 2]);
            
                    if (error) throw error;
            
                    const timer1 = timers.find(t => t.id === 1);
                    const timer2 = timers.find(t => t.id === 2);
            
                    // すでに切り替わっていたら何もしない
                    if (timer1 && timer2 && timer1.is_running === false && timer2.is_running === true) {
                        return;
                    }
            
                    const now = new Date().toISOString();

                    // 切り替え処理
                    const { error: error1 } = await supabase
                        .from('timer')
                        .update({ is_running: false })
                        .eq('id', 1);
                    if (error1) throw error1;
            
                    const { error: error2 } = await supabase
                        .from('timer')
                        .update({ is_running: true, start_time: now })
                        .eq('id', 2);
                    if (error2) throw error2;
                    // console.log('タイマーの切り替え完了');
                } catch (error) {
                    console.error('タイマー切り替えエラー:', error.message);
                }
            };
            switchTimers1();
        }
    }, [timeLeft, player]);

    // convIsRunning の変化に応じてモーダルを開閉
    useEffect(() => {
        if (!playIsRunning && convIsRunning) {
            onOpen();
        } else {
            onClose();
        }
    }, [onClose, onOpen, playIsRunning, convIsRunning]);

    const formattedTime =
        timeLeft > 0
            ? `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
                timeLeft % 60
            ).padStart(2, "0")}`
            : "終了";

    return (
        <Flex direction="row" justify="center" align="stretch" h="100%" w="100%">
            <Box flex="3" border="1px solid black">
                <Grid p={3} placeItems="center" h="100%">
                    <Text fontSize="7xl" fontWeight="bold">
                        {formattedTime}
                    </Text>
                </Grid>
            </Box>
            <Box flex="5" border="1px solid black">
                <Grid p={3}  placeItems="center" h="100%" bg='gray.100'>
                    <Task player={player} />
                </Grid>
            </Box>

            <Modal closeOnOverlayClick={false} isOpen={isOpen} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader textAlign="center" fontSize="2xl" fontWeight="bold">
                        会話 TIME
                    </ModalHeader>
                    <ModalBody>
                        <Conversation
                            key={convStartTime}
                            player={player}
                            convStartTime={convStartTime}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Flex>
    );
}