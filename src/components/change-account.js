import {
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Flex,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
  } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const tutorialText = `
以下の表を参照し、日本語の意味と入手方法を確認してください。

### A. 採取・採掘・釣り (Gathering / Mining / Fishing)

| アイテム名 (英語) | 日本語訳 | 座標 (X, Y) |
| :--- | :--- | :--- |
| **Ash Wood** | 木材 | **(-1, 0)** |
| **Apple** | リンゴ | **(-1, 0)** |
| **Copper Ore** | 銅鉱石 | **(2, 0)** |
| **Sunflower** | ヒマワリ | **(2, 2)** |
| **Gudgeon** | ガジョン (魚) | **(4, 2)** |
| **Algae** | 藻 (モ) | **(4, 2)** |

### B. 戦闘・ドロップ (Combat / Drops)

| アイテム名 (英語) | 日本語訳 | 座標 (X, Y) |
| :--- | :--- | :--- |
| **Chicken** | 鶏 (肉/卵) | **(0, 1)** |
| **Cow** | 牛 (肉/牛乳) | **(0, 2)** |

### C. クラフト・料理 (Crafting / Cooking)

| アイテム名 (英語) | 日本語訳 | 座標 (X, Y) |
| :--- | :--- | :--- |
| **Wooden Staff** | 木の杖 | **(2, 1)** |
| **Fried Eggs** | 目玉焼き | **(1, 1)** |
| **Cooled Chicken** | 調理した鶏肉 | **(1, 1)** |
| **Small Health Potion** | 小回復薬 | **(2, 3)** |
`;

export default function ChangeAccount(props) {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const navigate = useNavigate()
    const changePage = (num) => {
        if (num === '0'){
            navigate("/")
        } else if (num === '1'){
            navigate("/player1")
        } else {
            navigate("/player2")
        }
    }
    const update = () => {
        navigate(0) // ページ更新
    };

    return (
        <>
            <Flex align="center" gap="4">
                <Menu>
                    <MenuButton as={Button} rightIcon={<ChevronDownIcon />} width="110px">
                        {props.player || 'Select player'}
                    </MenuButton>
                    <MenuList minW="110px">
                        <MenuItem onClick={() => changePage('0')}>Master</MenuItem>
                        <MenuItem onClick={() => changePage('1')}>Player1</MenuItem>
                        <MenuItem onClick={() => changePage('2')}>Player2</MenuItem>
                    </MenuList>
                </Menu>

                <Button onClick={onOpen} width="60px">説明</Button>
                <Button onClick={update} width="60px">更新</Button>
            </Flex>

            <Modal isOpen={isOpen} onClose={onClose} isCentered>
                <ModalOverlay />
                <ModalContent maxW="60vw" w="90vw">
                    <ModalHeader>タスク遂行フェーズ：マニュアル</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody
                        maxH="85vh"
                        overflowY="auto"
                        sx={{
                            '& table': {
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginBottom: '16px',
                            },
                            '& th, & td': {
                            border: '1px solid',
                            padding: '6px 8px',
                            textAlign: 'left',
                            },
                            '& th': {
                            backgroundColor: 'gray.100',
                            },
                            '& p': {
                            marginBottom: '0.11em',
                            },
                            '& h3': {
                            marginTop: '1em',
                            },
                            '& h2': {
                            marginTop: '1em',
                            },
                        }}
                    >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {tutorialText}
                        </ReactMarkdown>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
}
