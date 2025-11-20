import { useEffect, useState } from 'react';
import { Flex, VStack, Text, Spinner, Box } from '@chakra-ui/react';
import { get_character_logs } from '../server/api-call/info';

export default function Log({ player, viewChar }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            setLoading(true);
            try {
                const result = await get_character_logs(viewChar);
                setLogs(result?.data || []);
            } catch (err) {
                console.error('ログ取得エラー:', err);
                setLogs([]);
            } finally {
                setLoading(false);
            }
        }

        if (player) fetchLogs();
    }, [player, viewChar]);

    if (loading) {
        return (
            <Flex alignItems="center" justifyContent="center" height="100%">
                <Spinner />
            </Flex>
        );
    }

    if (logs.length === 0) {
        return (
            <Flex alignItems="center" justifyContent="center" height="100%">
                <Text>ログがありません。</Text>
            </Flex>
        );
    }

	return (
		<>
        <Flex
            alignItems="flex-start"
            justifyContent="center"
            height="90vh"
            overflowY="auto"
            p={4}
        >
            <VStack spacing={3} align="start" width="100%">
                {logs.map((log, index) => (
                    <Box
                        key={index}
                        p={3}
                        borderWidth="1px"
                        borderRadius="lg"
                        width="100%"
                        boxShadow="sm"
                    >
                        <Text fontSize="sm" color="gray.500">
                            {new Date(log.created_at).toLocaleString()}
                        </Text>
                        <Text fontWeight="bold">{log.type}</Text>
                        <Text>{log.description}</Text>

                        {typeof log.content === 'string' && log.content.trim() !== '' && (
                            <Text color="gray.600" whiteSpace="pre-wrap">
                                {log.content}
                            </Text>
                        )}
                    </Box>
                ))}
            </VStack>
		</Flex>
		</>
	);
}
