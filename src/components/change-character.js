import { Box, Grid, Flex, Image } from '@chakra-ui/react';
import { names } from '../api/info';
import { useEffect, useState, useCallback } from 'react';
import supabase from '../supabaseClient';

function ChangeChar(props) {
    // 'player1' | 'player2' | 'npc1' | 'npc2' | 'npc3' | null
    const [CHAR1, CHAR2, CHAR3, CHAR4, CHAR5] = names;
    const [Char1, setChar1] = useState(null);
    const [Char2, setChar2] = useState(null);
    const [Char3, setChar3] = useState(null);
    const [Char4, setChar4] = useState(null);
    const [Char5, setChar5] = useState(null);

    // Supabase の行を state に反映（name = 操作者、role = キャラ名）
    const applyCharacters = useCallback((rows) => {
        rows.forEach(({ name, role }) => {
            switch (role) {
                case CHAR1:
                    setChar1(name);
                    break;
                case CHAR2:
                    setChar2(name);
                    break;
                case CHAR3:
                    setChar3(name);
                    break;
                case CHAR4:
                    setChar4(name);
                    break;
                case CHAR5:
                    setChar5(name);
                    break;
                default:
                    break;
            }
        });
    }, [CHAR1, CHAR2, CHAR3, CHAR4, CHAR5]);

    // 初期ロード + Realtime 購読
    useEffect(() => {
        const loadCharacters = async () => {
            const { data } = await supabase
                .from('characters')
                .select('name, role');

            if (data) {
                applyCharacters(data);
            }
        };
        loadCharacters();

        const channel = supabase
            .channel('characters-watch')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'characters',
                },
                (payload) => {
                    if (payload.new) {
                        applyCharacters([payload.new]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [applyCharacters]);

    // 表示タグ生成
    const tags = (() => {
        const chars = [Char1, Char2, Char3, Char4, Char5];

        // master：すべて表示（操作者 or AI）
        if (props.player === 'master') {
            return chars.map((c) => c ?? 'AI');
        }

        // player1 / player2：自分だけ表示
        return chars.map((c) => (c === props.player ? '自分' : '?'));
    })();

    const clickedStyle = {
        border: 'solid 2px #329eff',
        borderRadius: '20px',
        padding: '3px',
        margin: '0px',
    };
    const unClickedStyle = {
        border: 'solid 2px #ffffff',
        borderRadius: '20px',
        padding: '3px',
        margin: '0px',
    };

    // 共通関数
    const onSelectChar = (char) => {
        props.setViewChar(char);
    };

    return (
        <>
            <Box flex="1">
                <Grid
                    bg="white"
                    _hover={{ bg: 'gray.100', color: 'black' }}
                    onClick={() => onSelectChar(CHAR1)}
                    style={CHAR1 === props.viewChar ? clickedStyle : unClickedStyle}
                >
                    <strong>{tags[0]}</strong>
                    <Flex alignItems="center" justifyContent="center">
                        <Image src="/images/laplus.png" boxSize="200px" />
                    </Flex>
                    <strong>{CHAR1}</strong>
                </Grid>
            </Box>

            <Box flex="1">
                <Grid
                    bg="white"
                    _hover={{ bg: 'gray.100', color: 'black' }}
                    onClick={() => onSelectChar(CHAR2)}
                    style={CHAR2 === props.viewChar ? clickedStyle : unClickedStyle}
                >
                    <strong>{tags[1]}</strong>
                    <Flex alignItems="center" justifyContent="center">
                        <Image src="/images/rui.png" boxSize="200px" />
                    </Flex>
                    <strong>{CHAR2}</strong>
                </Grid>
            </Box>

            <Box flex="1">
                <Grid
                    bg="white"
                    _hover={{ bg: 'gray.100', color: 'black' }}
                    onClick={() => onSelectChar(CHAR3)}
                    style={CHAR3 === props.viewChar ? clickedStyle : unClickedStyle}
                >
                    <strong>{tags[2]}</strong>
                    <Flex alignItems="center" justifyContent="center">
                        <Image src="/images/koyori.png" boxSize="200px" />
                    </Flex>
                    <strong>{CHAR3}</strong>
                </Grid>
            </Box>

            <Box flex="1">
                <Grid
                    bg="white"
                    _hover={{ bg: 'gray.100', color: 'black' }}
                    onClick={() => onSelectChar(CHAR4)}
                    style={CHAR4 === props.viewChar ? clickedStyle : unClickedStyle}
                >
                    <strong>{tags[3]}</strong>
                    <Flex alignItems="center" justifyContent="center">
                        <Image src="/images/kuroe.png" boxSize="200px" />
                    </Flex>
                    <strong>{CHAR4}</strong>
                </Grid>
            </Box>

            <Box flex="1">
                <Grid
                    bg="white"
                    _hover={{ bg: 'gray.100', color: 'black' }}
                    onClick={() => onSelectChar(CHAR5)}
                    style={CHAR5 === props.viewChar ? clickedStyle : unClickedStyle}
                >
                    <strong>{tags[4]}</strong>
                    <Flex alignItems="center" justifyContent="center">
                        <Image src="/images/iroha.png" boxSize="200px" />
                    </Flex>
                    <strong>{CHAR5}</strong>
                </Grid>
            </Box>
        </>
    );
}

export default ChangeChar;
