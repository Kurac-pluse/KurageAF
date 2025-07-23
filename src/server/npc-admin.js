import { useEffect } from 'react';
import supabase from '../supabaseClient';
import { getLogs, generateInitialPlan, generateNextPlan } from './generation/npc-plan';
import { callApiWithPlan } from './generation/npc-act';

export function useNpcAct() {
    useEffect(() => {
        const channel = supabase
            .channel('npc-timer')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'timer', filter: 'id=eq.1' },
                async (payload) => {
                    const isRunning = payload.new?.is_running;
                    // console.log('is_running : ', isRunning);
                    if (isRunning) {
                        console.log('[npc-act] isRunning が true になったので処理開始');
                        await Promise.all([
                            startNpcLoop('npc1'),
                            startNpcLoop('npc2'),
                            startNpcLoop('npc3'),
                        ]);
                    } else {
                        console.log('[npc-act] isRunning が false なので終了');
                        // 再開処理は行わないため、何もせず終了
                    }
                }
            )
            .subscribe((status) => {
                console.log(status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
}

async function startNpcLoop(npcID) {
    // 初回プラン生成とAPI呼び出し（必要な場合）
    const initialPlan = await generateInitialPlan(npcID);
    await callApiWithPlan(npcID, initialPlan);

    while (true) {
        const { data: timer, error } = await supabase
            .from('timer')
            .select('is_running')
            .eq('id', 1)
            .single();

        if (error || !timer?.is_running) {
            console.log(`[${npcID}] isRunning が false のためループ終了`);
            break;
        }

        const logs = await getLogs(npcID);
        const nextPlan = await generateNextPlan(npcID, logs);

        // if (!nextPlan || nextPlan.flag === false) {
        //     console.log(`[${npcID}] nextPlan が不正または flag が false のためループ終了`);
        //     break;
        // }

        // await callApiWithPlan(npcID, nextPlan);
        
        break; // デバック用
    }
}
