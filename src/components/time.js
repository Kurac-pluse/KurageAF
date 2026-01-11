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
    useDisclosure,
    VStack,
    Divider,
    useClipboard,
    HStack,
} from "@chakra-ui/react";
import supabase from "../supabaseClient";
import Conversation from "./conversation";
import Task from "./task";

const playTime = 8 * 60;
// const playTime = 10;

const CHARACTER_NAMES = [
    "laplus",
    "rui",
    "koyori",
    "kuroe",
    "iroha",
];
const TASK_KEYWORDS = [
    "Algae：藻 (モ)",
    "Apple：リンゴ",
    "Ash Wood：木材",
    "Chicken：鶏 (肉/卵)",
    "Copper Ore：銅鉱石",
    "Cooled Chicken：調理した鶏肉",
    "Cow：牛 (肉/牛乳)",
    "Fried Eggs：目玉焼き",
    "Gudgeon：ガジョン (魚)",
    "Small Health Potion：小回復薬",
    "Sunflower：ヒマワリ",
    "Wooden Staff：木の杖",
];

function CopyRow({ text, isChar = false }) {
    const copyValue = text.split('：')[0];
    const { hasCopied, onCopy } = useClipboard(copyValue);

    if (isChar) {
        return (
            <Flex
                as="button"
                onClick={onCopy}
                flex="1"
                minW="0"
                h="36px"
                align="center"
                justify="center"
                bg={hasCopied ? "blue.100" : "transparent"}
                border="1px solid"
                borderColor={hasCopied ? "blue.200" : "gray.300"}
                color={hasCopied ? "blue.800" : "gray.800"}
                borderRadius="md"
                fontWeight="bold"
                fontSize="14px"
                lineHeight="1"
                letterSpacing="-0.5px"
                px={0}
                transition="all 0.2s"
                _hover={{ 
                    bg: hasCopied ? "blue.100" : "gray.50",
                    transform: "translateY(-1px)"
                }}
                boxShadow="sm"
            >
                {hasCopied ? "Copied" : text}
            </Flex>
        );
    }

    // タスク固有名詞用（変更なし）
    return (
        <Box
            onClick={onCopy}
            cursor="pointer"
            px={3}
            py={2}
            borderRadius="md"
            bg={hasCopied ? "blue.100" : "transparent"}
            _hover={{ bg: hasCopied ? "blue.100" : "gray.50" }}
            transition="all 0.2s"
        >
            <Text fontSize="sm" color={hasCopied ? "blue.800" : "gray.700"} fontWeight={hasCopied ? "bold" : "normal"}>
                {hasCopied ? `${text} Copied` : text}
            </Text>
        </Box>
    );
}

export default function Time({ player }) {
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
                        <Grid templateColumns="350px 1fr" gap={4} h="100%">

                            {/* ===== 左：参照リファレンス（個別コピー） ===== */}
                            <Box
                                border="1px solid gray"
                                borderRadius="md"
                                p={3}
                                bg="white"
                                h="100%"
                                overflowY="auto"
                            >
                            <VStack align="stretch" spacing={6}>
                                {/* キャラクター名 */}
                                <Box>
                                    <Text fontWeight="bold" mb={2}>
                                        会話キャラクター (コピペ用)
                                    </Text>
                                    <HStack spacing={1} w="100%">
                                        {CHARACTER_NAMES.map((name) => (
                                            <CopyRow key={name} text={name} isChar={true} />
                                        ))}
                                    </HStack>
                                </Box>

                                <Divider />

                                {/* タスク固有名詞 */}
                                <Box>
                                    <Text fontWeight="bold" mb={2}>
                                        ゲーム内固有名詞 (コピペ用)
                                    </Text>
                                    <VStack align="stretch" spacing={1}>
                                        {TASK_KEYWORDS.map((word) => (
                                            <CopyRow key={word} text={word} />
                                        ))}
                                    </VStack>
                                </Box>
                            </VStack>
                            </Box>

                            {/* ===== 右：会話本体 ===== */}
                            <Box h="100%">
                                <Conversation
                                    key={convStartTime}
                                    player={player}
                                    convStartTime={convStartTime}
                                />
                            </Box>
                        </Grid>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Flex>
    );
}