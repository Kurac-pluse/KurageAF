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

export default function TimeTask({ player }) {
    const playTime = 20;
    const { isOpen, onOpen, onClose } = useDisclosure();

    const [timeLeft, setTimeLeft] = useState(playTime);
    const [playStartTime, setPlayStartTime] = useState(null);
    const [conversationStartTime, setConversationStartTime] = useState(null);
    const [resetKey, setResetKey] = useState(0);
    const [hasOpened, setHasOpened] = useState(false);

    // タイマー状態購読（id:1）
    useEffect(() => {
        const channel = supabase
            .channel("realtime:timer-countdown")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "timer",
                    filter: "id=eq.1"
                },
                (payload) => {
                    const data = payload.new;
                    if (data.start_time) setPlayStartTime(new Date(data.start_time));
                }
            )
            .subscribe();

        const fetchInitial = async () => {
            const { data } = await supabase
                .from("timer")
                .select("*")
                .eq("id", 1)
                .single();
            if (data?.start_time) setPlayStartTime(new Date(data.start_time));
        };

        fetchInitial();
        return () => supabase.removeChannel(channel);
    }, []);

    // モーダル状態購読（id:2）
    useEffect(() => {
        const channel = supabase
            .channel('timer-updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'timer',
                filter: 'id=eq.2',
            }, (payload) => {
                const newIsRunning = payload.new?.is_running;
                if (newIsRunning === true) {
                    onOpen();
                } else if (newIsRunning === false) {
                    onClose();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // 残り時間のカウントダウン処理
    useEffect(() => {
        if (!playStartTime) return;

        const interval = setInterval(() => {
            const now = new Date();
            const elapsed = Math.floor((now - playStartTime) / 1000);
            const remaining = Math.max(0, playTime - elapsed);
            setTimeLeft(remaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [playStartTime]);

    // タイマー終了時、モーダルを起動（id:2のis_runningをtrueに）
    useEffect(() => {
        if (timeLeft !== 0 || hasOpened) return;

        const triggerConversation = async () => {
            const { data, error } = await supabase
                .from("timer")
                .select("*")
                .eq("id", 2)
                .single();

            if (error) return console.error("id:2 読み込み失敗:", error);
            if (!data.is_running) {
                const { error: updateError } = await supabase
                    .from("timer")
                    .update({
                        is_running: true,
                        start_time: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", 2);
                if (updateError) return console.error("id:2 更新失敗:", updateError);
            }

            const { data: latest } = await supabase
                .from("timer")
                .select("*")
                .eq("id", 2)
                .single();

            if (latest?.is_running && latest.start_time) {
                setConversationStartTime(new Date(latest.start_time));
                setResetKey((prev) => prev + 1);
                setHasOpened(true);
                try {
                    const { error } = await supabase
                        .from("timer")
                        .update({ is_running: false })
                        .eq("id", 1);
                    if (error) console.error("id:1 停止失敗:", error);
                } catch (e) {
                        console.error("DB更新エラー:", e);
                }
                // console.log(timeLeft);
                onOpen();
            }
        };

        triggerConversation();
    }, [timeLeft, hasOpened, onOpen]);

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
            <Box flex="5" border="1px solid black" bg="gray.200">
                <Grid p={3}>{/* 右側の表示等 */}</Grid>
            </Box>

            <Modal closeOnOverlayClick={false} isOpen={isOpen} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader textAlign="center" fontSize="2xl" fontWeight="bold">
                        会話 TIME
                    </ModalHeader>
                    <ModalBody>
                        <Conversation
                            player={player}
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