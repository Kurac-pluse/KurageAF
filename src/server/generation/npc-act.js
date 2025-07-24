// 行動数だけ繰り返し API を叩く
export async function callApiWithPlan(_npcID, plan){
    if (typeof plan !== 'string') {
        console.error('plan が文字列ではありません:', plan);
        return;
    }

    // 改行で分割し、空行を除外
    // const actions = plan
    //     .split('\n')
    //     .map(line => line.trim())
    
    // for (const action of actions) {
        // 各行動に対してAPI呼び出しなどの処理を記述
        // console.log(`実行中のアクション: ${action}`);

        // 呼び出すAPIの分岐処理
        // if () {
        //     //
        // } else if() {
        //     //
        // }
    // }
}
