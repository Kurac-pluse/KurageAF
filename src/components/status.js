import { useState, useEffect } from 'react';
import { Box, Grid, Flex, Spinner, Text } from '@chakra-ui/react';
import { playerToCharName, getCharacterInfo } from '../api/info';

function Status(props) {
    const [myStatus, setMyStatus] = useState(null);
    const [otherStatus, setOtherStatus] = useState(null);
    const [myCharName, setMyCharName] = useState(null);

    // 自分のステータスを取得
    // 自分のステータスとキャラ名を取得
    useEffect(() => {
        const fetchMyStatus = async () => {
            try {
                const charName = await playerToCharName(props.player);
                // console.log("取得したキャラ名:", charName);
                if (charName !== "master") {
                    setMyCharName(charName); // ← ここで保存
                    const status = await getCharacterInfo(charName);
                    setMyStatus(status);
                } else {
                    setMyStatus("master"); 
                }
                
            } catch (error) {
                console.error('自分のステータス取得中にエラーが発生しました:', error);
                setMyStatus({ error: 'ステータスを取得できませんでした。' });
            }
        };
        fetchMyStatus();
    }, [props.player]);

    // 他のキャラクターのステータスを取得
    useEffect(() => {
        const fetchOtherStatus = async () => {
            if (props.viewChar && props.viewChar !== myCharName) {
                try {
                    const status = await getCharacterInfo(props.viewChar);
                    setOtherStatus(status);
                } catch (error) {
                    console.error('他のキャラクターのステータス取得中にエラーが発生しました:', error);
                    setOtherStatus({ error: 'ステータスを取得できませんでした。' });
                }
            } else {
                setOtherStatus(null); // 同じキャラなら非表示にする
            }
        };
        fetchOtherStatus();
    }, [props.viewChar, myCharName]);


    // ステータスを安全に表示
    const renderStatus = (status) => {
        if (!status || status === "master" || status.error) {
            return <Text>ステータスがありません</Text>;
        }

        return (
            <>
                <Text>名前: {status.name}</Text>
                <Text>
                    体力: {status.hp}
                    &emsp; LV.: {status.level}
                    &emsp; 所持金: {status.gold}
                    &emsp; 座標: [{status.x}, {status.y}]
                </Text>
                <Text>
                    武器: {status.weapon_slot}
                </Text>
                <Text>
                    インベントリ:
                    {status.inventory && status.inventory.length > 0 ? (
                        status.inventory
                            .filter(i => i.quantity > 0)
                            .map((item) => (
                                <Text as="span" key={item.slot} ml={2}>
                                    {item.code} x {item.quantity}
                                </Text>
                            ))
                    ) : (
                        <Text as="span" ml={2}>（空）</Text>
                    )}
                </Text>
            </>
        );
    };

    return (
        <>
            <Box flex="1">
                <Grid p={3}>
                    <h1>自分のステータス</h1>
                    <Flex
                        direction="column"
                        overflowY="auto"
                        maxH="200px"
                        p={3}
                        bg="white"
                        border="1px"
                        borderColor="gray.300"
                        borderRadius="md"
                    >
                        {myStatus ? renderStatus(myStatus) : <Spinner />}
                    </Flex>
                </Grid>
            </Box>
            <Box flex="1">
            {props.viewChar && props.viewChar !== myCharName && (
                <Box flex="1">
                    <Grid p={3}>
                        <h1>{props.viewChar}のステータス</h1>
                        <Flex
                            direction="column"
                            overflowY="auto"
                            maxH="200px"
                            p={3}
                            bg="white"
                            border="1px"
                            borderColor="gray.300"
                            borderRadius="md"
                        >
                            {otherStatus ? renderStatus(otherStatus) : <Spinner />}
                        </Flex>
                    </Grid>
                </Box>
            )}
            </Box>
        </>
    );
}

export default Status;