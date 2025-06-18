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

const Player1 = () => {
	const this_player = 'player1'
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
								<Operation player={this_player} />
							</Flex>
							<Box flex="2" border="1px solid black">
								<Log />
							</Box>
						</Flex>
					</Flex>
				</Grid>
			</Box>
		</ChakraProvider>
	);
}
  
export default Player1;
