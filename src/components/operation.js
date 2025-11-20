import { Box, Grid, Flex } from '@chakra-ui/react';
import ChangeChar from './change-character.js';
import Status from './status.js';
import Control from './control.js';
import Time from './time.js';

const Operation = ({ player, viewChar, setViewChar }) => {

    return (
        <>
        <Box flex="4" border="1px solid black">
            <Grid p={3}>
                <Flex flex="1" direction="row">
                    <ChangeChar
                            player={player}
                            viewChar={viewChar}
                            setViewChar={setViewChar}
                        />
                </Flex>
            </Grid>
        </Box>
        <Box flex="4" border="1px solid black">
            <Grid p={3}>
                <Flex flex="1" direction="row">
                    <Status player={player} viewChar={viewChar}/>
                </Flex>
            </Grid>
        </Box>
        <Box flex="3" border="1px solid black">
            <Grid p={3} height="100%">
                <Flex flex="1" direction="row">
                {(() => {
                    if (player === 'master') {
                        return (
                            <Control player={player} />
                        );
                    } else {
                        return (
                            <Time player={player} />
                        );
                    }
                })()}
                </Flex>
            </Grid>
        </Box>
        </>
    );
}

export default Operation