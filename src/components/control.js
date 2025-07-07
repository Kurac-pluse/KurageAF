import { HStack, Button } from '@chakra-ui/react';
import { names } from '../server/global';
import { game_restart, initial_setting } from '../server/game-setting';
import supabase from '../supabaseClient';

const Control = ({ setIsTimerRunning }) => {
  const shuffle = async () => {
    try {
      const { data, error } = await supabase.from('characters').select('conversation');
      if (error) throw error;

      if (data.some((row) => row.conversation !== 0)) return;

      const storedData = [];
      while (storedData.length < 5) {
        const name = names[Math.floor(Math.random() * 5)];
        if (!storedData.includes(name)) storedData.push(name);
      }

      const playerNames = ['player1', 'player2', 'npc1', 'npc2', 'npc3'];
      for (let i = 0; i < 5; i++) {
        const { error } = await supabase
          .from('characters')
          .update({ role: storedData[i] })
          .eq('name', playerNames[i]);

        if (error) throw error;
      }

      window.location.reload();
    } catch (error) {
      console.error('シャッフルエラー:', error.message);
    }
  };

  const startGame = async () => {
    try {
      const { error } = await supabase
        .from('timer')
        .update({
          start_time: new Date().toISOString(),
          is_running: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
      setIsTimerRunning(true);
    } catch (error) {
      console.error('ゲーム開始エラー:', error.message);
    }
  };

  return (
    <HStack spacing={4} wrap="wrap">
      <Button onClick={shuffle}>キャラクターシャッフル</Button>
      <Button onClick={startGame}>GAME START</Button>
      <Button onClick={game_restart}>GAME RESET</Button>
      <Button onClick={initial_setting}>INITIAL</Button>
    </HStack>
  );
};

export default Control;