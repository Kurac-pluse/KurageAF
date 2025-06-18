import { Box, Grid, Flex } from '@chakra-ui/react';
import ChangeChar from './change-character.js';
import Status from './status.js';
import Move from './move.js';
import Control from './control.js';
import React from 'react';
import { useState } from 'react';

const Operation = (props) => {

    const [ viewChar, setViewChar ] = useState('');

    return (
        <>
        <Box flex="4" border="1px solid black">
            <Grid p={3}>
                <Flex flex="1" direction="row">
                    <ChangeChar player={props.player} viewChar={viewChar} setViewChar={setViewChar}/>
                </Flex>
            </Grid>
        </Box>
        <Box flex="4" border="1px solid black">
            <Grid p={3}>
                <Flex flex="1" direction="row">
                    <Status player={props.player} viewChar={viewChar}/>
                </Flex>
            </Grid>
        </Box>
        <Box flex="3" border="1px solid black">
            <Grid p={3}>
                <Flex flex="1" direction="row">
                {(() => {
                    if (props.player === 'master') {
                        return <Control player={props.player} />
                    } else {
                        return <Move player={props.player} />;
                    }
                })()}
                </Flex>
            </Grid>
        </Box>
        </>
    );
}

export default Operation
