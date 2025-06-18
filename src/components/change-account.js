import {
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Flex,
    Box,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
  } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';

// const steps = Array.from({ length: 20 }, (_, i) => ({
//     title: `Step ${i + 1}`,
//     description: `Description ${i + 1}`,
// }))

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
    // const { activeStep } = useSteps({
    //     index: 6,
    //     count: steps.length
    // })

    return (
        <>
        <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} width="110px">
                {props.player || 'Select player'}
            </MenuButton>
            <MenuList>
                <MenuItem onClick={() => changePage('0')}>Master</MenuItem>
                <MenuItem onClick={() => changePage('1')}>Player1</MenuItem>
                <MenuItem onClick={() => changePage('2')}>player2</MenuItem>
            </MenuList>
        </Menu>
        <Box width="20px" />
        <Flex direction="column" alignItems="stretch" width="100%" height="100%" justifyContent="center">
            {/* <Stepper index={activeStep}>
                {steps.map((step, index) => (
                    <Step key={index}>
                        <StepIndicator>
                            <StepStatus
                                complete={<StepIcon />}
                                incomplete={<StepNumber />}
                                active={<StepNumber />}
                            />
                        </StepIndicator>
                        {index < steps.length - 1 && <StepSeparator />}
                    </Step>
                ))}
            </Stepper> */}
            <Button onClick={onOpen} width="60px">説明</Button>

            <Modal isOpen={isOpen} onClose={onClose} isCentered size={'xl'}>
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
                        <br />
                    </ModalBody>
                    <ModalFooter>
                        {/*  */}
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Flex>
        
        </>
    );
}
