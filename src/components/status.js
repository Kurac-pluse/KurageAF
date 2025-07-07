import { useState, useEffect } from 'react';
import { Box, Grid, Flex, Spinner, Text } from '@chakra-ui/react';
import { playerToCharName } from '../server/global.js';
import { get_one_character_info } from '../server/api-call/info.js';

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
                    const status = await get_one_character_info(charName);
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
                    const status = await get_one_character_info(props.viewChar);
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
        if (status === "master" || status.error) {
            return <Text>{ 'ステータスがありません' || status?.error }</Text>;
        }
        return (
            <>
                <Text>名前: {status.data.name}</Text>
                <Text>体力: {status.data.hp}</Text>
                <Text>LV.: {status.data.level}</Text>
                <Text>所持金: {status.data.gold}</Text>
                <Text>座標: [{status.data.x}, {status.data.y}]</Text>
                <Text>武器: {status.data.weapon_slot}</Text>
                <Text>盾: {status.data.shield_slot}</Text>
                <Text>頭装備: {status.data.helmet_slot}</Text>
                <Text>胴装備: {status.data.body_armor_slot}</Text>
                <Text>足装備: {status.data.leg_armor_slot}</Text>
                <Text>指輪: {status.data.ring1_slot} {status.data.ring2_slot}</Text>
                <Text>消耗品: {status.data.consumable1_slot} {status.data.consumable2_slot}</Text>
                <Text>インベントリ: ...</Text>
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