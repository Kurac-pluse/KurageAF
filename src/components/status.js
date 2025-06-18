import { useState, useEffect } from 'react';
import { Box, Grid, Flex } from '@chakra-ui/react';
import { playerToCharName } from '../server/global.js';
import { get_one_character_info } from '../server/api-call/info.js'; 

function Status(props) {
    const [myStatus, setMyStatus] = useState(null);  // 初期値を null に変更
    const [otherStatus, setOtherStatus] = useState(null);

    // プレイヤーのステータスを取得する
    useEffect(() => {
        async function fetchMyStatus() {
            try {
                const status = await get_one_character_info(await playerToCharName(props.player));
                // console.log(status);
                setMyStatus(status); // ステートに保存
            } catch (error) {
                console.error('Error fetching my status:', error);
                setMyStatus('エラーが発生しました。');
            }
        }
        fetchMyStatus();
    }, [props.player]);

    // 他のキャラクターのステータスを取得する
    useEffect(() => {
        if (props.viewChar && props.viewChar !== playerToCharName(props.player)) {
            async function fetchOtherStatus() {
                try {
                    const status = await get_one_character_info(props.viewChar);
                    setOtherStatus(status);
                } catch (error) {
                    console.error('Error fetching other character status:', error);
                    setOtherStatus('エラーが発生しました。');
                }
            }
            fetchOtherStatus();
        }
    }, [props.viewChar, props.player]);

    // 自分のステータスを生成する
    const my_status_make = () => {
        // myStatus が null か myStatus.data が存在しない場合の対処
        if (!myStatus || !myStatus.data) {
            return { __html: 'ステータスがありません' };
        }
        const my_str = 
        '名前: ' + myStatus.data.name + '<br>' + 
        '体力: ' + myStatus.data.hp + '<br>' + 
        'LV. : ' + myStatus.data.level + '<br>' + 
        '所持金: ' + myStatus.data.gold + '<br>' + 
        '座標: [ ' + myStatus.data.x + ', ' + myStatus.data.y + ' ]<br>' + 
        '武器: ' + myStatus.data.weapon_slot + '<br>' + 
        '盾: ' + myStatus.data.shield_slot + '<br>' + 
        '頭装備: ' + myStatus.data.helmet_slot + '<br>' + 
        '胴装備: ' + myStatus.data.body_armor_slot + '<br>' + 
        '足装備: ' + myStatus.data.leg_armor_slot + '<br>' + 
        '指輪: ' + myStatus.data.ring1_slot + ' ' + myStatus.data.ring2_slot + '<br>' + 
        '消耗品: ' + myStatus.data.consumable1_slot + ' ' + myStatus.data.consumable2_slot + '<br>' + 
        'インベントリ: ';
        const result = { __html: my_str };
        //console.log(result);  // ログ出力
        return result;
    };

    const other_status_make = () => {
        if (!otherStatus || !otherStatus.data) {
            return { __html: 'ステータスがありません' };
        }
        const other_str = 
        '名前: ' + otherStatus.data.name + '<br>' + 
        '体力: ' + otherStatus.data.hp + '<br>' + 
        'LV. : ' + otherStatus.data.level + '<br>' + 
        '所持金: ' + otherStatus.data.gold + '<br>' + 
        '座標: [ ' + otherStatus.data.x + ', ' + otherStatus.data.y + ' ]<br>' + 
        '武器: ' + otherStatus.data.weapon_slot + '<br>' + 
        '盾: ' + otherStatus.data.shield_slot + '<br>' + 
        '頭装備: ' + otherStatus.data.helmet_slot + '<br>' + 
        '胴装備: ' + otherStatus.data.body_armor_slot + '<br>' + 
        '足装備: ' + otherStatus.data.leg_armor_slot + '<br>' + 
        '指輪: ' + otherStatus.data.ring1_slot + ' ' + otherStatus.data.ring2_slot + '<br>' + 
        '消耗品: ' + otherStatus.data.consumable1_slot + ' ' + otherStatus.data.consumable2_slot + '<br>' + 
        'インベントリ: ';
        return { __html: other_str };
    }

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
                    {/* HTMLとしてレンダリング */}
                    {/* ステータスがまだ取得されていない場合はローディング表示 */}
                    {myStatus ? <div dangerouslySetInnerHTML={my_status_make()} /> : <p>Loading...</p>}
                </Flex>
            </Grid>
        </Box>
        <Box flex="1">
            {props.viewChar !== '' && props.viewChar !== playerToCharName(props.player) && (
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
                        {otherStatus ? <div dangerouslySetInnerHTML={other_status_make()} /> : <p>Loading...</p>}
                    </Flex>
                </Grid>
            )}
        </Box>
        </>
    );
}

export default Status;
