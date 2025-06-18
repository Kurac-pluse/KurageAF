import { Box, Grid, Flex, Button } from '@chakra-ui/react';
import { Kbd } from '@chakra-ui/react';
import { walk } from '../server/pc/action.js';
import { player1, player2 } from '../server/global.js';

export default function Move(props) {

    const handleClick = async (direction) => {
        if (props.player === 'player1') {
            walk(player1, direction);
        } else if (props.player === 'player2') {
            walk(player2, direction);
        }
    };

    return (
        <>
        {/* ボタン部分 */}
        <Flex flex="1" direction="column" justify="center" align="center" gap="10px">
            {/* 1行目 */}
            <Flex direction="row" justify="center" align="center" gap="10px">
                <Button
                    onClick={() => handleClick('w')}
                    size="lg"
                    height="60px"
                    width="100px"
                    fontSize="3xl"
                    bg="teal.300"
                    _hover={{ bg: "teal.400" }}
                >
                    <Kbd fontSize="3xl">W</Kbd>
                </Button>
            </Flex>

            {/* 2行目 */}
            <Flex direction="row" justify="center" align="center" gap="10px">
                <Button
                    onClick={() => handleClick('a')}
                    size="lg"
                    height="60px"
                    width="100px"
                    fontSize="3xl"
                    bg="teal.300"
                    _hover={{ bg: "teal.400" }}
                >
                    <Kbd fontSize="3xl">A</Kbd>
                </Button>
                <Button
                    size="lg"
                    height="60px"
                    width="100px"
                    fontSize="3xl"
                    bg="teal.300"
                    _hover={{ bg: "teal.400" }}
                />
                <Button
                    onClick={() => handleClick('d')}
                    size="lg"
                    height="60px"
                    width="100px"
                    fontSize="3xl"
                    bg="teal.300"
                    _hover={{ bg: "teal.400" }}
                >
                    <Kbd fontSize="3xl">D</Kbd>
                </Button>
            </Flex>

            {/* 3行目 */}
            <Flex direction="row" justify="center" align="center" gap="10px">
                <Button
                    onClick={() => handleClick('s')}
                    size="lg"
                    height="60px"
                    width="100px"
                    fontSize="3xl"
                    bg="teal.300"
                    _hover={{ bg: "teal.400" }}
                >
                    <Kbd fontSize="3xl">S</Kbd>
                </Button>
            </Flex>
        </Flex>

        <Box flex="1">
            <Grid p={3}>
                <h1>可能な行動リスト</h1>
                <Flex
                    direction="column"
                    overflowY="auto"
                    maxH="150px"
                    p={3}
                    bg="white"
                    border="1px"
                    borderColor="gray.300"
                    borderRadius="md"
                >
                    <Grid p={1}>
                        <Button bg="teal.300" _hover={{ bg: "teal.400" }} width="30">採集</Button>
                    </Grid>
                    <Grid p={1}>
                        <Button bg="teal.300" _hover={{ bg: "teal.400" }} width="30">戦闘</Button>
                    </Grid>
                    <Grid p={1}>
                        <Button bg="teal.300" _hover={{ bg: "teal.400" }} width="30">○○作成</Button>
                    </Grid>
                    <Grid p={1}>
                        <Button bg="teal.300" _hover={{ bg: "teal.400" }} width="30">○○装備</Button>
                    </Grid>
                </Flex>
            </Grid>
        </Box>

        <Box flex="1">
            <Grid p={3}>
                <h1>最後の行動</h1>
                <h1>木を切る</h1>
            </Grid>
        </Box>
        </>
    );
}
