import { Box, Grid, Flex, Image } from '@chakra-ui/react';
import { CHAR1, CHAR2, CHAR3, CHAR4, CHAR5 } from '../utils/global.js';
import { player1, player2 } from '../utils/global.js';

function ChangeChar(props) {

    const tag = () => {
        // console.log(typeof(player1));
        if (props.player === 'player1') {
            const defaultTags = ['?', '?', '?', '?', '?'];
            if (player1 === CHAR1) {
                defaultTags[0] = '自分';
            } else if (player1 === CHAR2) {
                defaultTags[1] = '自分';
            } else if (player1 === CHAR3) {
                defaultTags[2] = '自分';
            } else if (player1 === CHAR4) {
                defaultTags[3] = '自分';
            } else if (player1 === CHAR5) {
                defaultTags[4] = '自分';
            }
            return defaultTags;
        } else if (props.player === 'player2') {
            const defaultTags = ['?', '?', '?', '?', '?'];
            if (player2 === CHAR1) {
                defaultTags[0] = '自分';
            } else if (player2 === CHAR2) {
                defaultTags[1] = '自分';
            } else if (player2 === CHAR3) {
                defaultTags[2] = '自分';
            } else if (player2 === CHAR4) {
                defaultTags[3] = '自分';
            } else if (player2 === CHAR5) {
                defaultTags[4] = '自分';
            }
            return defaultTags;
        } else {
            const defaultTags = ['AI', 'AI', 'AI', 'AI', 'AI'];
            if (player1 === CHAR1) {
                defaultTags[0] = 'player1';
            } else if (player1 === CHAR2) {
                defaultTags[1] = 'player1';
            } else if (player1 === CHAR3) {
                defaultTags[2] = 'player1';
            } else if (player1 === CHAR4) {
                defaultTags[3] = 'player1';
            } else if (player1 === CHAR5) {
                defaultTags[4] = 'player1';
            }
            if (player2 === CHAR1) {
                defaultTags[0] = 'player2';
            } else if (player2 === CHAR2) {
                defaultTags[1] = 'player2';
            } else if (player2 === CHAR3) {
                defaultTags[2] = 'player2';
            } else if (player2 === CHAR4) {
                defaultTags[3] = 'player2';
            } else if (player2 === CHAR5) {
                defaultTags[4] = 'player2';
            }
            return defaultTags;
        }
    };
    const tags = tag();

    const clickedStyle = {
        border: "solid 2px #329eff",
        borderRadius: "20px",
        padding: "3px",
        margin: "0px"
    }
    const unClickedStyle = {
        border: "solid 2px #ffffff",
        borderRadius: "20px",
        padding: "3px",
        margin: "0px"
    }

    return (
        <>
        <Box flex="1">
            <Grid 
                p={0} 
                _hover={{ bg: "gray.100", color: "black" }}
                bg="white"
                onClick={() => {props.setViewChar(CHAR1)}}
                style={CHAR1 === props.viewChar ? clickedStyle : unClickedStyle}
            >
                <strong>{tags[0]}</strong>
                <Flex alignItems="center" justifyContent="center" height="100%">
                    <Image src="/images/laplus.png" boxSize="200px" objectFit="cover" />
                </Flex>
                <strong>{CHAR1}</strong>
            </Grid>
        </Box>
        <Box flex="1">
            <Grid 
                p={0} 
                _hover={{ bg: "gray.100", color: "black" }} 
                bg="white"
                onClick={() => {props.setViewChar(CHAR2)}}
                style={CHAR2 === props.viewChar ? clickedStyle : unClickedStyle}
            >
                <strong>{tags[1]}</strong>
                <Flex alignItems="center" justifyContent="center" height="100%">
                    <Image src="/images/rui.png" boxSize="200px" objectFit="cover" />
                </Flex>
                <strong>{CHAR2}</strong>
            </Grid>
        </Box>
        <Box flex="1">
            <Grid 
                p={0} 
                _hover={{ bg: "gray.100", color: "black" }} 
                bg="white"
                onClick={() => {props.setViewChar(CHAR3)}}
                style={CHAR3 === props.viewChar ? clickedStyle : unClickedStyle}
            >
                <strong>{tags[2]}</strong>
                <Flex alignItems="center" justifyContent="center" height="100%">
                    <Image src="/images/koyori.png" boxSize="200px" objectFit="cover" />
                </Flex>
                <strong>{CHAR3}</strong>
            </Grid>
        </Box>
        <Box flex="1">
            <Grid 
                p={0} 
                _hover={{ bg: "gray.100", color: "black" }} 
                bg="white"
                onClick={() => {props.setViewChar(CHAR4)}}
                style={CHAR4 === props.viewChar ? clickedStyle : unClickedStyle}
            >
                <strong>{tags[3]}</strong>
                <Flex alignItems="center" justifyContent="center" height="100%">
                    <Image src="/images/kuroe.png" boxSize="200px" objectFit="cover" />
                </Flex>
                <strong>{CHAR4}</strong>
            </Grid>
        </Box>
        <Box flex="1">
            <Grid 
                p={0} 
                _hover={{ bg: "gray.100", color: "black" }} 
                bg="white"
                onClick={() => {props.setViewChar(CHAR5)}}
                style={CHAR5 === props.viewChar ? clickedStyle : unClickedStyle}
            >
                <strong>{tags[4]}</strong>
                <Flex alignItems="center" justifyContent="center" height="100%">
                    <Image src="/images/iroha.png" boxSize="200px" objectFit="cover" />
                </Flex>
                <strong>{CHAR5}</strong>
            </Grid>
        </Box>
        </>
    );
}

export default ChangeChar;
