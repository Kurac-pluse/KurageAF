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
        window.location.reload(); // ページ更新
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

            <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>説明（チュートリアル）</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        20分間、自由にキャラクターを操作してください<br /><br />
                        ＜注意＞<br />
                        　・フィールドでは全部で５人のキャラクターが生活しています。<br />
                        　・人間操作のキャラが２人、AI操作のキャラが3人です。<br />
                        　・相手の操作キャラを当ててください。<br />
                        　・自身の操作キャラが相手にバレないようにしてください。<br />
                        　・<br /><br />
                        〜可能な操作〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜<br />
                        　・キャラクターの移動<br />
                        　・伐採<br />
                        　・採掘<br />
                        　・装備作成<br />
                        　・戦闘<br />
                        〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜<br />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
}
