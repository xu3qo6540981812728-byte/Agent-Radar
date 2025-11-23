// netlify/functions/analyze.js

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const selections = JSON.parse(event.body);

    // ==========================================
    // 1. 權重設定 (嚴格遵照：價格=動機 > 屋況=性格 > 屋主 > 委託)
    // ==========================================
    const WEIGHTS = {
      // 【Tier 1：核心 (Max 25)】
      price: { 
        urgent: 25,   // 急售 (秒殺)
        market: 20,   // 行情 (好跑)
        high: 10,     // 略高 (需磨)
        challenge: 0  // 挑戰 (卡關)
      },
      motivation: { 
        cash: 25,     // 缺錢 (極急)
        change: 20,   // 換屋 (剛需)
        asset: 10,    // 閒置 (隨緣)
        test: 0       // 試水溫 (困難)
      },

      // 【Tier 2：產品與溝通 (Max 15)】
      condition: { 
        perfect: 15,  // A案
        needsWork: 12,// B案
        complex: 8,   // 特殊
        flaw: 5       // C案
      },
      personality: { 
        koala: 15,    // 和平型 (好說話)
        peacock: 15,  // 社交型 (好切入)
        owl: 10,      // 分析型 (需數據)
        tiger: 5      // 老虎型 (高壓)
      },

      // 【Tier 3：對象屬性 (Max 10)】
      // 自住客(一般客)比投資客好談，因為有人情味，投資客只看利弊且海放委託
      ownerType: { 
        normal: 10,   // 自住客 (受服務感動)
        investor: 5   // 投資客 (冷血/海放)
      },

      // 【Tier 4：合約型態 (Max 5)】
      // 雖然重要，但依照您的指示，權重排在最後
      contract: { 
        exclusive: 5,  // 專任
        general: 2     // 一般
      }
    };

    // 雷達圖數值 (視覺呈現，保持高對比)
    const RADAR_VALUES = {
      personality: { tiger: 60, owl: 50, peacock: 70, koala: 90 },
      motivation: { change: 80, cash: 100, asset: 60, test: 30 },
      ownerType: { normal: 90, investor: 40 }, // 自住客分數高(好掌控)，投資客分數低
      condition: { perfect: 100, needsWork: 80, complex: 50, flaw: 40 },
      price: { urgent: 100, market: 90, high: 60, challenge: 20 },
      contract: { exclusive: 100, general: 50 }
    };

    // --- 輔助函數 ---
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
    // 文案生成邏輯
    // ==========================================
    
    const ensureArray = (val) => Array.isArray(val) ? val : [val];
    const pList = ensureArray(selections.personality); 
    const mList = ensureArray(selections.motivation);  
    const { ownerType, condition, price, contract } = selections;

    let psychology = "";
    let emotionTip = "";
    let teamStrategy = "";

    // --- 1. 屋主深層心理側寫 (Psychology) ---
    psychology += "【深層心理與決策模式】\n";
    
    // 針對投資客 vs 自住客的心理差異 (依據您的實務觀察調整)
    if (ownerType === 'investor') {
        psychology += "➤ 屋主屬性：投資客 (利益導向)\n此類屋主通常將案件「海放」給多家仲介，對房仲的忠誠度極低。他的心理只有「數字」與「效率」。切記：他不在乎你多辛苦，只在乎你帶回什麼價格。任何的情感勒索（如：我幫您照顧好房子）對他無效，甚至會被視為不專業。\n\n";
    } else {
        psychology += "➤ 屋主屬性：自住客 (情感導向)\n此類屋主對房子有深厚情感，且往往只有這一間資產。他的決策容易受「感受」影響。你的「勤奮回報」與「貼心服務」是能夠打動他的。只要讓他信任你這個人，價格往往比較好談。\n\n";
    }

    if (pList.length > 0) {
        psychology += "➤ 性格特質分析：\n";
        pList.forEach(p => {
            if (p === 'tiger') {
                psychology += "• 老虎型 (掌控)：缺乏耐心，憤怒源於「失控」。開發端需展現「解決問題的能力」，讓他覺得交給你最省事。\n";
            }
            if (p === 'owl') {
                psychology += "• 貓頭鷹 (避險)：猶豫源於「資訊不足」。不要催他，要提供足夠的市場數據讓他自己說服自己。\n";
            }
            if (p === 'peacock') {
                psychology += "• 孔雀型 (面子)：堅持源於「自尊」。千萬別批評屋況，要讓他覺得賣掉這間房子是一件很有面子的事。\n";
            }
            if (p === 'koala') {
                psychology += "• 無尾熊 (依賴)：反覆源於「恐懼」。他需要一個強勢的依靠，你要幫他擋住來自家人的壓力。\n";
            }
        });
    }

    // --- 2. 情緒破冰與溝通 (Emotion) ---
    emotionTip += "【溝通破冰與情緒策略】\n";
    
    // 針對投資客與自住客給予完全不同的建議
    if (ownerType === 'investor') {
        emotionTip += "🛑 對應投資客：少談感情，多談行情。\n不用跟他聊家常，他也不想聽。直接講重點：「張大哥，這週我有兩組誠意買方，出價大約在XX萬，我知道這離您目標有段距離，但考慮到最近XX區的庫存量增加...」—用市場流動性風險來壓迫他。\n";
    } else {
        emotionTip += "💖 對應自住客：先談心情，再談事情。\n每次回報前，先關心他的生活。「李大姊，最近變天了，您身體還好嗎？」讓他感受到溫度。當他覺得你是「自己人」時，你回報的價格抗性（買方嫌貴），他才聽得進去，而不會覺得你在幫買方殺價。\n";
    }
    
   if (pList.includes('tiger')) {
        emotionTip += "⚡ 剋老虎 (以退為進)：\n老虎習慣下指令，你若唯唯諾諾他就看不起你。適時展現專業底線。\n用強勢的底氣贏得他的尊重。\n";
    }
    if (pList.includes('owl')) {
        emotionTip += "🦉 剋貓頭鷹 (請教代替說服)：\n不要試圖辯贏他。把球踢回去。\n讓他自己去想理由，通常他想不出來就會妥協。\n";
    }
    if (pList.includes('peacock')) {
        emotionTip += "🦚 剋孔雀 (惋惜代替讚美)：\n不要一直誇他，要用「遺憾」來包裝。\n讓他覺得你是知音，他會為了「不讓你為難」而願意配合調整價格。\n";
    }
    if (pList.includes('koala')) {
        emotionTip += "🐨 剋無尾熊 (製造恐懼)：\n安撫無效時，必須讓他看到「不決定的後果」。\n用損失厭惡（Loss Aversion）逼他動起來。\n";
    }

    // --- 3. 局勢研判與團隊策略 (Strategy) ---
    teamStrategy += "【局勢研判與操盤手建議】\n";
    
    let statusText = score >= 80 ? "甜蜜成交區 (把握熱度)" : (score >= 50 ? "認知磨合區 (需拉扯)" : "深水區 (需長期抗戰)");
    teamStrategy += `➤ 當前局勢：${statusText} (總分 ${score})\n\n`;

    // 團隊分工 (強調開發與銷售)
    teamStrategy += "🎯 團隊分工戰略：\n";
    if (contract === 'exclusive') {
        teamStrategy += "• 專任委託：開發端擁有發球權。專任就是王道，鼓勵大家放心介紹，讓銷售好好去衝買方出價。\n";
    } else {
        teamStrategy += "• 一般委託：典型的速度戰。投資客海放案件或一般約，資訊極易外洩。開發務必掌握好屋主並旁敲側擊同業的資訊，成交才是王道。\n";
    }

    teamStrategy += "\n⚔️ 針對性操作建議：\n";
    
    // 價格策略
    if (price === 'challenge' || price === 'high') {
        teamStrategy += "• 價格過高：這是最大阻礙。開發端需執行「高頻率回報」。不要怕回報壞消息（嫌貴、地點差），這是在幫屋主「打預防針」。利用大量帶看紀錄（量）來證明價格（價）的不合理。\n";
    } else {
        teamStrategy += "• 價格合理：協助銷售端營造「多組競爭」氛圍，促使買方快速決定。\n";
    }

    // 動機策略
    if (mList.includes('change')) {
        teamStrategy += "• 換屋動機：緊盯他的「時間軸」。如果他新房子交屋在即，那資金壓力就是你的籌碼。如果還沒買，則強調「現金為王」的優勢。\n";
    }
    if (mList.includes('cash')) {
        teamStrategy += "• 資金缺口：這類案件要「快」。屋主耐心有限，若拖太久他可能會尋求其他高利管道或乾脆不賣。所有回報都要強調「速度」與「確定性」。\n";
    }
    if (ownerType === 'investor' && (mList.includes('asset') || mList.includes('test'))) {
        teamStrategy += "• 投資客試水溫：這是最難搞的組合。建議採取「冷處理」或「放置play」。偶爾傳個實登行情給他即可，讓市場告訴他。\n";
    }

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


