import { Box } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import { names } from '../server/global';
import { game_restart, initial_setting } from '../server/game-setting';
import { random_walk } from '../server/npc/rundom-walk';
import { change_f_flag } from '../server/npc/rundom-walk';
import supabase from '../supabaseClient';

const Control = () => {
    const shuffle = async () => {
        try {
            const { data, error } = await supabase
            .from('characters')
            .select('conversation');
            if (error) throw error;
            //console.log(data);

            for(let i=0; i<5; i++){
                if (data[i].conversation !== 0) {
                    console.log('会話中のためキャラクターシャッフルはできません');
                }
            }
        } catch (error) {
            console.error('データベースでエラーが発生しました:', error.message);
        }

        const storedData = Array(5);
        let random_name;
        for (let i=0; i<5; i++) {
            do {
                random_name = names[Math.floor(Math.random() * 5)];
            } while (random_name === storedData[0] || random_name === storedData[1] || random_name === storedData[2] || random_name === storedData[3] || random_name === storedData[4]);
            storedData[i] = random_name;
        }
        console.log(storedData);

        try {
            const { error1 } = await supabase
            .from('characters')
            .update({ role: storedData[0] })
            .eq('name', 'player1');
            const { error2 } = await supabase
            .from('characters')
            .update({ role: storedData[1] })
            .eq('name', 'player2');
            const { error3 } = await supabase
            .from('characters')
            .update({ role: storedData[2] })
            .eq('name', 'npc1');
            const { error4 } = await supabase
            .from('characters')
            .update({ role: storedData[3] })
            .eq('name', 'npc2');
            const { error5 } = await supabase
            .from('characters')
            .update({ role: storedData[4] })
            .eq('name', 'npc3');

            if (error1) throw error1;
            if (error2) throw error2;
            if (error3) throw error3;
            if (error4) throw error4;
            if (error5) throw error5;

            window.location.reload();
        } catch (error) {
            console.error('データベースでエラーが発生しました:', error.message);
        }
    };

    return (
        <>
        <Button onClick={shuffle}>キャラクターシャッフル</Button>
        <Box width='100px'> </Box>
        <Button onClick={random_walk}>GAME START</Button>
        <Box width='100px'> </Box>
        <Button onClick={change_f_flag}>GAME STOP</Button>
        <Box width='100px'> </Box>
        <Button onClick={game_restart}>GAME RESET</Button>
        <Box width='100px'> </Box>
        <Button onClick={initial_setting}>INITIAL</Button>
        </>
    );
}

export default Control
