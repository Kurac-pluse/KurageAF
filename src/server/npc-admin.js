import { useEffect } from 'react';
import supabase from '../supabaseClient';
// import { fetchLogs, generateInitialPlan, generateNextPlan, callApiWithPlan } from './npc-utils';

export function useNpcAct() {
    useEffect(() => {
        const channel = supabase
            .channel('npc-timer')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'timer', filter: 'id=eq.1' },
                async (payload) => {
                    const isRunning = payload.new?.isRunning;
                    if (isRunning) {
                        console.log('[npc-act] isRunning が true になったので処理開始');
                        await startNpcLoop();
                    } else {
                        console.log('[npc-act] isRunning が false なので終了');
                        // 再開処理は行わないため、何もせず終了
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
}

async function startNpcLoop() {
    // 初回プラン生成とAPI呼び出し（必要な場合）
    // const initialPlan = await generateInitialPlan();
    // await callApiWithPlan(initialPlan);

    while (true) {
        const { data: timer, error } = await supabase
            .from('timer')
            .select('isRunning')
            .eq('id', 1)
            .single();

        if (error || !timer?.isRunning) {
            console.log('[npc-act] isRunning が false のためループ終了');
            break;
        }

        // const logs = await fetchLogs();
        // const nextPlan = await generateNextPlan(logs);

        // if (!nextPlan || nextPlan.flag === false) {
        //     console.log('[npc-act] nextPlan が不正または flag が false のためループ終了');
        //     break;
        // }

        // await callApiWithPlan(nextPlan);
    }
}
