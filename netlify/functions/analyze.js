// netlify/functions/analyze.js

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const selections = JSON.parse(event.body);

    // ==========================================
    // 1. 權重設定 (符合您的要求：價格=動機 > 屋況=性格 > 屋主 > 委託)
    // 總分設計約為 100 分，根據重要性分配佔比
    // ==========================================
    const WEIGHTS = {
      // 【Tier 1：決定成交的關鍵】(佔比約 50%)
      // 價格 (Max 25)
      price: { 
        urgent: 25,   // 急售價 (必殺)
        market: 15,   // 行情價 (好談)
        high: 5,      // 略高 (需磨)
        challenge: 0  // 挑戰價 (卡關)
      },
      // 動機 (Max 25)
      motivation: { 
        cash: 25,     // 缺錢 (最急)
        change: 20,   // 換屋 (剛需)
        asset: 10,    // 閒置 (看心情)
        test: 0       // 試探 (極難)
      },

      // 【Tier 2：影響談判難度的變數】(佔比約 30%)
      // 性格 (Max 15) - 這裡的分數代表「好溝通程度」
      personality: { 
        koala: 15,    // 和平型 (配合度高)
        peacock: 12,  // 社交型 (好說話)
        owl: 8,       // 分析型 (毛很多)
        tiger: 5      // 老虎型 (難掌控)
      },
      // 屋況 (Max 15)
      condition: { 
        perfect: 15,  // A案 (免整理)
        needsWork: 10,// B案 (小整理)
        complex: 5,   // 特殊 (客製)
        flaw: 0       // C案 (瑕疵)
      },

      // 【Tier 3：輔助判斷】(佔比約 20%)
      // 屋主種類 (Max 10)
      ownerType: { 
        investor: 10, // 投資客 (理性好談)
        normal: 5     // 一般客 (感性不可控)
      },
      // 委託型態 (Max 10) - 雖然重要，但對於「案件本身好壞」影響較小，主要影響掌控度
      contract: { 
        exclusive: 10, // 專任
        general: 5     // 一般
      }
    };

    // 雷達圖數值 (視覺呈現用，保持原本比例即可)
    const RADAR_VALUES = {
      personality: { tiger: 60, owl: 40, peacock: 70, koala: 90 },
      motivation: { change: 80, cash: 100, asset: 50, test: 20 },
      ownerType: { normal: 80, investor: 40 },
      condition: { perfect: 100, needsWork: 75, complex: 40, flaw: 30 },
      price: { urgent: 100, market: 80, high: 50, challenge: 20 },
      contract: { exclusive: 100, general: 40 }
    };

    // --- 輔助函數：處理多選分數 (取平均) ---
    const getScore = (category, value) => {
        if (!value) return 0;
        const map = WEIGHTS[category];
        if (Array.isArray(value)) {
            const total = value.reduce((sum, v) => sum + (map[v] || 0), 0);
            return value.length > 0 ? total / value.length : 0;
        }
        return map[value] || 0;
    };

    const getRadarValue = (category, value) => {
        if (!value) return 0;
        const map = RADAR_VALUES[category];
        if (Array.isArray(value)) {
             const total = value.reduce((sum, v) => sum + (map[v] || 0), 0);
             return value.length > 0 ? total / value.length : 0;
        }
        return map[value] || 0;
    };

    // --- 計算總分 ---
    let score = 0;
    Object.keys(selections).forEach(key => {
        score += getScore(key, selections[key]);
    });
    score = Math.round(score);

    const dimensionOrder = ['personality', 'motivation', 'ownerType', 'condition', 'price', 'contract'];
    const radarData = dimensionOrder.map(key => Math.round(getRadarValue(key, selections[key])));

    // ==========================================
    // 2. 文案生成邏輯 (深度解析版)
    // ==========================================
    
    const ensureArray = (val) => Array.isArray(val) ? val : [val];
    const pList = ensureArray(selections.personality); // 性格
    const mList = ensureArray(selections.motivation);  // 動機
    const { ownerType, condition, price, contract } = selections;

    let psychology = "";
    let emotionTip = "";
    let teamStrategy = "";

    // --- (1) 心理攻防與談判劇本 (針對多重性格) ---
    if (pList.length > 0) {
        psychology += "【屋主深層心理側寫】\n";
        
        // 判斷是否為「矛盾組合」(例如老虎+無尾熊，既強勢又優柔寡斷)
        const hasDominant = pList.includes('tiger');
        const hasSoft = pList.includes('koala') || pList.includes('peacock');
        const hasAnalytical = pList.includes('owl');

        if (hasDominant && hasSoft) {
            psychology += "⚠️ 注意：此屋主具備「雙重面具」。表面上可能強勢主導(老虎)，但內心其實充滿不安全感(無尾熊/孔雀)。他在談判桌上會先聲奪人，但只要你撐過第一波攻勢，並在私下給予足夠的安全感，他的防線會瞬間瓦解。千萬別被他的大嗓門嚇退。\n\n";
        } else if (hasDominant && hasAnalytical) {
             psychology += "⚠️ 注意：這是最難纏的「精明管理者」組合。他既要掌控權(老虎)，又要摳細節(貓頭鷹)。你不能只給感覺，必須給數據；你不能只給數據，必須給出結論讓他做決定。對付他只有一招：比他更專業、比他更有效率。\n\n";
        }

        pList.forEach(p => {
            if (p === 'tiger') {
                psychology += "➤ 針對「老虎特質」(掌控型)：\n他沒耐心聽過程，只看結果。如果回報時你講「我今天帶看了三組，客人說...」，他會覺得你廢話太多。直接說：「本週帶看三組，一組有出價意願，但我擋下來了，因為價格不到位。」——這才是他要聽的「戰功」。要讓他覺得你是他手上的「利劍」，而不是需要他操心的「負擔」。\n";
            }
            if (p === 'owl') {
                psychology += "➤ 針對「貓頭鷹特質」(分析型)：\n這類人天生懷疑論。你講「行情」他覺得你在匡他，你講「誠意」他覺得不值錢。攻破他的唯一武器是「比較表」。做一張精美的周邊競品分析，列出優缺點，用客觀數據告訴他：「不是我要砍你價，是市場數據顯示目前的開價會讓買方卻步。」讓他自己得出「該降價」的結論。\n";
            }
            if (p === 'peacock') {
                psychology += "➤ 針對「孔雀特質」(社交型)：\n這房子是他的「面子」。千萬不能批評屋況（嫌棄就是打他臉）。用詞要轉換：舊裝潢要說是「復古風」，格局怪要說是「有特色」。議價時要用「捧」的：「大哥，買方真的很喜歡您的品味，但他預算真的有限，能不能當作是交個朋友，成全這對年輕夫妻？」\n";
            }
            if (p === 'koala') {
                psychology += "➤ 針對「無尾熊特質」(和平型)：\n他的死穴是「怕做錯決定」。他這秒答應你，下一秒家人講一句話就反悔。所以你不能只是仲介，要是「家人」。所有的決定要幫他背書：「王大姐您放心，這合約我幫您把關過了，絕對安全。」必要時，你要主動提議去向他的家人做說明，幫他擋子彈。\n";
            }
        });
    }

    // --- (2) 接地氣破冰與情緒策略 ---
    emotionTip += "【江湖一點訣：破冰與信任】\n";
    if (pList.includes('tiger')) {
        emotionTip += "👉 對老虎：適度「示弱」是高招。在他發威完後，淡淡講一句「李大哥，其實我這麼拚也是想幫您處理好，不然我壓力也很大」，這種強者對強者的示弱，反而能贏得他的義氣。\n";
    }
    if (pList.includes('owl')) {
        emotionTip += "👉 對貓頭鷹：展現「同路人」姿態。問他：「您這資料整理得比我還專業，是用什麼軟體弄的？」滿足他的智力優越感，他會把你從「推銷員」升級為「可以對話的人」。\n";
    }
    if (pList.includes('peacock')) {
        emotionTip += "👉 對孔雀：見人說人話。陪他聊當年勇、聊裝潢理念。重點不在內容，在於你眼神要有光，要讓他覺得「終於有人懂這房子的價值了」。\n";
    }
    if (pList.includes('koala')) {
        emotionTip += "👉 對無尾熊：多聊「家常」。別急著談公事，先問小孩、問長輩。建立「我們是自己人」的感覺，關鍵時刻他才不會躲你電話。\n";
    }

    // --- (3) 局勢研判與團隊策略 (核心：動機+價格) ---
    // 判斷案件等級
    let strategyTitle = "";
    let strategyContent = "";
    
    // 定義關鍵變數
    const isUrgent = mList.includes('cash') || mList.includes('change') || price === 'urgent';
    const isHighPrice = price === 'challenge' || price === 'high';
    const isExclusive = contract === 'exclusive';

    teamStrategy += "【局勢總結與操盤手建議】\n";

    if (score >= 80) {
        strategyTitle = "🔥 絕對A案：團隊必爭之地";
        strategyContent = "這案子基本上「閉著眼睛都會賣」。\n• 給開發：你的重點不是賣掉，而是「賣給誰」以及「能不能守住價格」。因為條件太好，買方會蜂擁而至，你要利用這個勢頭，製造「競價」氛圍，讓買方加價。\n• 團隊引導：直接在群組喊話「秒殺件，手慢無」，激發同事的狼性。";
    } else if (score >= 60) {
        strategyTitle = "✨ 潛力B案：需技術性加工";
        strategyContent = "這案子體質不錯，但差臨門一腳（可能是價格略高或屋況需整理）。\n• 給開發：現在是「信心戰」。屋主還在猶豫，買方也在觀望。你需要做的是「縮短認知差距」。如果是價格問題，每週固定回報兩次看屋反饋（嫌貴的聲音），用市場教屋主。\n• 團隊引導：告訴同事「屋主心態在鬆動了」，請大家集中火力帶看，創造人氣來壓迫屋主降價。";
    } else {
        strategyTitle = "❄️ 磨練C案：長期抗戰";
        strategyContent = "這是一場硬仗。可能價格飛天，或者屋況極差。\n• 給開發：切記「不期不待，沒有傷害」。不要花太多時間在這個案子上，把它當作「庫存」和「廣告板」。偶爾關心一下即可，等待屋主自己痛過（賣不掉）之後，再來談降價。\n• 團隊引導：坦白跟同事說「這間屋主還在作夢」，但可以當作「帶看其他的墊腳石」，用這間的缺點來襯托其他A案的優點。";
    }

    teamStrategy += strategyTitle + "\n" + strategyContent + "\n\n";

    // 針對動機的特別補充
    if (isUrgent) {
        teamStrategy += "⚡ 關於動機：\n屋主現在是「熱鍋上的螞蟻」。這是你最大的籌碼！只要買方出價達到「止血點」，屋主就會放。請務必抓緊速度，不要讓屋主冷靜下來思考。\n";
    } else if (mList.includes('test') || mList.includes('asset')) {
        teamStrategy += "🐢 關於動機：\n屋主是「姜太公釣魚」，願者上鉤。這時候千萬別逼他，逼急了他就不賣了。要用「服務」感化他，讓他習慣有你這個人，等哪天他真的想賣時，第一個想到你。\n";
    }

    // 針對合約的特別補充
    if (isExclusive) {
        teamStrategy += "🔒 關於委託：\n拿到專任就是拿到「發球權」。不用急著亂槍打鳥，你可以篩選客人，甚至可以大膽要求屋主做清潔、補油漆，因為這些投資回報都是你的。";
    } else {
        teamStrategy += "⚠️ 關於委託：\n一般約就是「速度戰」。不要藏私！有狀況立刻回報全店，寧可讓同事成交，也不要被外面的同業截胡。資訊流通越快，成交機率越高。";
    }

    // 回傳結果
    return {
      statusCode: 200,
      body: JSON.stringify({
        score,
        analysis: { psychology, emotionTip, teamStrategy },
        radarData 
      })
    };

  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};
