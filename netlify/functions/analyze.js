// netlify/functions/analyze.js

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const selections = JSON.parse(event.body);

    const WEIGHTS = {
      personality: { tiger: 5, owl: 4, peacock: 4, koala: 5 },
      motivation: { change: 20, cash: 25, asset: 10, test: 0 },
      ownerType: { normal: 10, investor: 5 },
      condition: { perfect: 15, needsWork: 12, complex: 5, flaw: 0 },
      price: { urgent: 25, market: 15, high: 5, challenge: 0 },
      contract: { exclusive: 20, general: 5 }
    };

    const RADAR_VALUES = {
      personality: { tiger: 60, owl: 40, peacock: 70, koala: 90 },
      motivation: { change: 80, cash: 100, asset: 50, test: 20 },
      ownerType: { normal: 80, investor: 40 },
      condition: { perfect: 100, needsWork: 75, complex: 40, flaw: 30 },
      price: { urgent: 100, market: 80, high: 50, challenge: 20 },
      contract: { exclusive: 100, general: 40 }
    };

    // --- 1. 輔助函數：處理多選分數 ---
    // 如果是陣列（多選），算平均分；如果是單字串，直接查表
    const getScore = (category, value) => {
        if (!value) return 0;
        const map = WEIGHTS[category];
        if (Array.isArray(value)) {
            // 多選：加總後取平均 (避免分數膨脹)
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

    // --- 2. 計算總分與雷達圖 ---
    let score = 0;
    Object.keys(selections).forEach(key => {
        score += getScore(key, selections[key]);
    });
    // 四捨五入取整數
    score = Math.round(score);

    const dimensionOrder = ['personality', 'motivation', 'ownerType', 'condition', 'price', 'contract'];
    const radarData = dimensionOrder.map(key => {
        return Math.round(getRadarValue(key, selections[key]));
    });

    // --- 3. 生成文案 (支援多選邏輯) ---
    
    // 將單選或多選統一轉為 Array，方便後續判斷 include
    const ensureArray = (val) => Array.isArray(val) ? val : [val];
    
    const pList = ensureArray(selections.personality); // 性格列表
    const mList = ensureArray(selections.motivation);  // 動機列表
    const { ownerType, condition, price, contract } = selections; // 其他單選保持原樣

    let psychology = "";
    let emotionTip = "";
    let teamStrategy = "";

    // [性格解析] 迴圈處理所有被選中的性格
    pList.forEach(p => {
        if (p === 'tiger') {
            psychology += "【高支配型 (老虎) 解析】\n核心需求是「掌控感」。若表現得咄咄逼人，那是他的行為模式。";
            if (mList.includes('cash') || mList.includes('change')) {
                psychology += "因有急迫動機，他會更急躁。請省略過程，直接給結果（如：本週帶看幾組）。\n";
            } else {
                psychology += "因無壓力，他會把你當下屬。需建立專家權威，偶爾溫和拒絕無理要求。\n";
            }
            psychology += "\n"; // 換行區隔不同性格
            emotionTip += "★ 針對老虎：在他非公事時間突顯柔軟關懷（如提醒保重身體），擊穿防線。\n";
        }
        if (p === 'owl') {
            psychology += "【分析型 (貓頭鷹) 解析】\n核心需求是「精確」。深受確認偏誤影響，只信自己查的資料。";
            if (price === 'challenge' || price === 'high') {
                psychology += "面對高價，請準備「競品分析表」，用數據證明他的開價不合理。\n";
            } else {
                psychology += "價格合理時，他會糾結交易安全，請主動展示履約保證流程。\n";
            }
            psychology += "\n";
            emotionTip += "★ 針對貓頭鷹：讚美他整理的資料很有邏輯，滿足他的智力優越感。\n";
        }
        if (p === 'peacock') {
            psychology += "【社交型 (孔雀) 解析】\n核心需求是「認同」。覺得房子是獨一無二的藝術品。";
            if (ownerType === 'investor') {
                psychology += "若是投資客，請稱讚這筆交易讓他多有面子，而不只是賺錢。\n";
            } else {
                psychology += "請扮演粉絲，聽他講裝潢理念，聽得越入神信任度越高。\n";
            }
            psychology += "\n";
            emotionTip += "★ 針對孔雀：情緒起伏大，陪他演一段喜怒哀樂，等宣洩完再遞水談正事。\n";
        }
        if (p === 'koala') {
            psychology += "【和平型 (無尾熊) 解析】\n核心需求是「安全感」。最怕做錯決定被家人罵。"; 
            psychology += "你要當保護者，主動提議：「這件事繁雜，我來幫您向家人說明就好」。\n";
            psychology += "\n";
            emotionTip += "★ 針對無尾熊：分享自己的小挫折或家庭瑣事，展現人味，讓他覺得是同一國的。\n";
        }
    });

    // [動機解析] 若有多重動機，簡單補充
    if (mList.length > 1) {
        psychology += "-------------------\n【複合動機特別注意】\n此屋主擁有多重售屋動機，心態可能在「急售」與「惜售」間擺盪，請務必釐清哪一個是他的「主要痛點」。\n";
    }

    // [委託策略] (維持原樣，因為委託型態通常是單一狀態)
    let contractStrategy = "";
    if (contract === 'general') {
      contractStrategy = "【委託局勢：一般委託 - 速度戰】\n一般約資訊不對稱。成交關鍵在於「快」與「廣」。只要屋主心態鬆動，立刻通報配件，寧可讓同事成交賺業績，也不要被同業截胡。\n\n";
    } else {
      contractStrategy = "【委託局勢：專任委託 - 價值戰】\n專任在手，發球權在您。請營造「稀有性」，過濾誠意買方，並明確告知同事「這間我專任」，建立主場權威。\n\n";
    }

    // [團隊策略] (維持原樣，依據價格與屋況判斷)
    const isGoodProduct = (price === 'urgent' || (price === 'market' && (condition === 'perfect' || condition === 'needsWork')));
    
    if (isGoodProduct) {
      if (contract === 'exclusive') {
        teamStrategy += "目前的局勢是「眾星拱月 (黃金 A 案)」。專任且價格漂亮。請善用優勢讓價格收得漂亮，鼓勵同事大量帶看。\n";
      } else {
        teamStrategy += "目前的局勢是「兵家必爭 (一級戰區)」。物件好但一般約，風險高。這是典型的速度戰，請同事有喜歡趕快出價。\n";
      }
    } else if (price === 'challenge' || price === 'high') {
      teamStrategy += "目前的局勢是「且戰且走 (價格抗性)」。價格高於行情，請恆溫經營，每週回報實登教育屋主，並找出一個無可取代的亮點說服同事。\n";
    } else if (condition === 'flaw' || condition === 'complex') {
      teamStrategy += "目前的局勢是「防守反擊 (特殊案件)」。有瑕疵或產權複雜。首要任務是「免責」，製作現況說明書，鎖定特殊通路或資深投資客。\n";
    } else {
      teamStrategy += "目前的局勢是「多方角力 (需再加工)」。條件價格皆普通。建議與屋主溝通清潔整理或適度降價，並針對找該區很久的買方做精準配對。\n";
    }
    teamStrategy = contractStrategy + teamStrategy;

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
