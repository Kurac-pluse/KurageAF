import {
    ChakraProvider,
    Box,
    Grid,
    theme,
    Flex,
} from '@chakra-ui/react';
import Operation from '../components/operation.js';
import Log from '../components/log.js';
import ChangeAccount from '../components/change-account.js';
import { useState } from 'react';
import { useNpcAct } from '../utils/npc-admin.js';

const Master = () => {
    const this_player = 'master';
    const [viewChar, setViewChar] = useState('');
    useNpcAct(); // キャラクター操作時間にNPCを行動させる
    return (
        <ChakraProvider theme={theme}>
            <Box textAlign="center" fontSize="xl">
                <Grid minH="100vh" p={3}>
                    <Flex direction="column" flex="1" >
                        <Grid p={3}  border="1px solid black">
                            <Flex direction="row" flex="1">
                                <ChangeAccount player={this_player} />
                            </Flex>
                        </Grid>
                        <Flex direction="row" flex="9">
                            <Flex flex="5" direction="column" border="1px solid black">
                                <Operation
                                    player={this_player}
                                    viewChar={viewChar}
                                    setViewChar={setViewChar}
                                />
                            </Flex>
                            <Box flex="2" border="1px solid black">
                                <Log
                                    player={this_player}
                                    viewChar={viewChar}
                                    setViewChar={setViewChar}
                                />
                            </Box>
                        </Flex>
                    </Flex>
                </Grid>
            </Box>
        </ChakraProvider>
    );
}
  
export default Master;