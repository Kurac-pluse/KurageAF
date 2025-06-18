import React, { useEffect } from 'react';
import { AppRoutes } from './Routers.js';
import { BrowserRouter } from 'react-router-dom';
import supabase from './supabaseClient.js';

export default function App() {
  useEffect(() => {
    // データベースを初期化する関数
    const initializeDatabase = async () => {
      try {
        // データがすでに存在するか確認
        const { data, error: selectError } = await supabase
          .from('characters')
          .select('*')
          .limit(1);
  
        if (selectError) throw selectError;
  
        // データが存在する場合はスキップ
        if (data && data.length > 0) {
          return;
        }
        const initialData = [
          { name: 'player1', role: 'laplus', conversation: 0 },
          { name: 'player2', role: 'rui', conversation: 0 },
          { name: 'npc1', role: 'koyori', conversation: 0 },
          { name: 'npc2', role: 'kuroe', conversation: 0 },
          { name: 'npc3', role: 'iroha', conversation: 0 },
        ];

        // Supabaseのテーブルにデータを挿入
        const { error } = await supabase.from('characters').insert(initialData);

        if (error) throw error;
      } catch (error) {
        console.error('データベースの初期化中にエラーが発生しました:', error.message);
      }
    };

    // 初期化処理を実行
    initializeDatabase();
  }, []);

  return (
    <>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
    </>
  );
}
