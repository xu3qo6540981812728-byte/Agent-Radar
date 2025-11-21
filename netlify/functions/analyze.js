// netlify/functions/analyze.js

exports.handler = async function(event, context) {
  // 只允許 POST 請求
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 接收前端傳來的選項
    const selections = JSON.parse(event.body);

    // --- 核心數據與邏輯 (原本在前端的機密資料) ---
    
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

    // 計算分數
    let score = 0;
    Object.keys(selections).forEach(key => {
      if (selections[key] && WEIGHTS[key]) {
        score += WEIGHTS[key][selections[key]];
      }
    });

    // 計算雷達圖數據 (傳回給前端繪圖用，但不暴露計算邏輯)
    // 順序必須對應前端的: "性格", "動機", "屋主", "屋況", "價格", "委託"
    const dimensionOrder = ['personality', 'motivation', 'ownerType', 'condition', 'price', 'contract'];
    const radarData = dimensionOrder.map(key => {
        const val = selections[key];
        return val ? RADAR_VALUES[key][val] : 0;
    });

    // 生成文案 (這是最有價值的 IP)
    const { personality, motivation, ownerType, condition, price, contract } = selections;
    let psychology = "";
    let emotionTip = "";
    let teamStrategy = "";

    // --- 文案邏輯開始 (維持您原本的內容) ---
    if (personality === 'tiger') {
      psychology = "【高支配型人格解析】\n此類屋主核心需求是「掌控感」與「效率」。他可能會表現得咄咄逼人，這不是針對你，而是他的行為模式。心理學上的「自利偏差」在他身上很明顯，成功歸自己，失敗歸別人。";
      if (motivation === 'cash' || motivation === 'change') {
        psychology += "\n由於他有明確動機，他的急躁會加倍。這時你不能比他急，但要比他快。所有的回報請省略過程，直接給結果（如：本週帶看3組，出價1組）。";
      } else {
        psychology += "\n因無急迫壓力，他會把你當作下屬使喚。你需要建立「專家權威」，偶爾溫和地拒絕無理要求（如：半夜打電話），反而能贏得他的尊重。";
      }
      emotionTip = "【接地氣破冰法】\n老虎型雖然強勢，但往往是孤獨的領導者。試著在非公事時間（如回報完公事後），突然切換頻道聊一句「大哥/姊，我看您最近這麼忙，身體要顧耶」，這種突如其來的柔軟關懷，往往能瞬間擊穿他堅硬的防線，讓他覺得「你懂他的累」。";
    } else if (personality === 'owl') {
      psychology = "【分析型人格解析】\n此類屋主核心需求是「精確」與「邏輯」。他深受「確認偏誤」影響，只相信自己查到的資料。任何感性的訴求（如：買方很有誠意）對他來說都是廢話，除非你能證明這份誠意值多少錢。";
      if (price === 'challenge' || price === 'high') {
        psychology += "\n面對他的高價堅持，不要口頭爭辯。請準備一份精美的「競品分析表」，列出周邊條件更好但開價更低的物件，用「數據」讓他自己得出「我的開價不合理」的結論。";
      } else {
        psychology += "\n當價格合理時，他會糾結於合約條款與交易安全。請主動展示公司的履約保證流程與特約代書的專業度，消除他的疑慮。";
      }
      emotionTip = "【接地氣破冰法】\n貓頭鷹型看似冷漠，其實是對細節有偏執。試著讚美他整理的房子或資料「很有條理」、「邏輯很棒」，甚至請教他是怎麼歸納的。滿足他的「智力優越感」，他會放下戒心，開始把你當作可以對話的聰明人。";
    } else if (personality === 'peacock') {
      psychology = "【社交型人格解析】\n此類屋主核心需求是「認同」與「舞台」。他受「社會認同」影響深，覺得自己的房子是獨一無二的藝術品。任何對房子的批評，他都會解讀為對他人格的攻擊。";
      if (ownerType === 'investor') {
        psychology += "\n雖是投資客，但他享受的是「獲利的榮耀」。回報時可以像是稱讚這筆交易能讓他賣的多麼有面子，而不僅僅是賺多少錢。";
      } else {
        psychology += "\n面對一般客，請扮演他的粉絲。讓他多講講房子的裝潢理念或家庭故事，你聽得越入神，他對你的信任度越高。";
      }
      emotionTip = "【接地氣破冰法】\n孔雀型情緒起伏大。當他情緒激動（不論是生氣還是興奮）時，別急著談公事。先陪他「演」一段，他生氣你就跟著罵市場，他開心你就跟著笑。等他情緒宣洩完了，你再遞上一杯水切入正題，這時成交率反而最高。";
    } else if (personality === 'koala') {
      psychology = "【和平型人格解析】\n此類屋主核心需求是「安全感」。他最怕做錯決定被家人埋怨。注意：無尾熊雖然好講話，但「決策極慢」，容易因為一句家人的話就反悔。"; 
      psychology += "\n你的角色必須是「保護者」與「推手」。不要逼他做決定，而是幫他「排除恐懼」。例如主動提議：「這件事繁雜，我來幫您向家人說明就好」。";
      emotionTip = "【接地氣破冰法】\n無尾熊型心軟。試著分享一點你自己的小挫折或家庭瑣事（適度示弱），展現你「人味」的一面。建立「我們是同一國」的感覺，他才不會在關鍵時刻躲起來不接電話。";
    }

    let contractStrategy = "";
    if (contract === 'general') {
      contractStrategy = "【委託局勢：一般委託 - 速度戰】\n由於是一般約，屋主窗口多，資訊極度不對稱。成交的關鍵在於「快」與「廣」。\n• 策略核心：不要藏私！只要屋主心態有一點鬆動，立刻通報全店全區配件。寧可讓同事成交賺業績，也不要為了想獨泡而被同業截胡。\n• 風險提示：隨時要有「做白工」的心理準備，對於回報屋主，建議採「高品質有料」，增加屋主覺得你這個房仲不一樣的感受。\n\n";
    } else {
      contractStrategy = "【委託局勢：專任委託 - 價值戰】\n恭喜拿到專任！資訊與發球權在您手上，可以進行更細緻的佈局。\n• 策略核心：營造「稀有性」。不用急著亂槍打鳥，而是過濾出誠意買方。可以大膽建議屋主進行小幅度的整理或清潔，因為這些投入肯定能反映在您幫他談的價格上。\n• 團隊引導：明確告知同事「這間我專任，屋主很信任我」，建立您的主場權威，同事帶看時會更依賴您的收斡建議。\n\n";
    }

    if (price === 'urgent' || (price === 'market' && (condition === 'perfect' || condition === 'needsWork'))) {
      teamStrategy += "目前的局勢是「眾星拱月 (黃金 A 案)」。價格具競爭力，這是成交率最高的類型。\n";
      if (condition === 'needsWork') {
        teamStrategy += "• 給開發的建議：雖然屋況需整理，但價格有空間。請主動計算「裝修成本」與「整理後的價差」給投資型買方參考。\n";
      } else {
        teamStrategy += "• 給開發的建議：完美屋況+好價格，您的任務是「做球給銷售」。不用藏私，盡快將資料發布給全公司。\n";
      }
      teamStrategy += "• 團隊引導：告訴同事這是「秒殺件」，鼓勵大量帶看，甚至可以操作「集中看屋」來創造競價氛圍。";
    } else if (price === 'challenge' || price === 'high') {
      teamStrategy += "目前的局勢是「且戰且走 (價格抗性)」。價格高於行情，銷售同仁信心不足。\n";
      teamStrategy += "• 給開發的建議：切記「不要放棄」，也不要「冷處理」，而是要「恆溫經營」。每週固定回報市場動態（特別是周邊低價成交的實登），等待市場教育屋主。\n";
      teamStrategy += "• 團隊引導：找出房子的一個「無可取代的亮點」（如：無限棟距、稀有格局），用這個亮點說服同事：「雖然貴，但值得帶買方來比較」。";
    } else if (condition === 'flaw' || condition === 'complex') {
      teamStrategy += "目前的局勢是「防守反擊 (特殊案件)」。屋況或產權有瑕疵，風險控管第一。\n";
      teamStrategy += "• 給開發的建議：您的首要任務是「免責」。請務必製作詳細的「現況說明書」，並尋求主管或代書協助確認合約條款。\n";
      teamStrategy += "• 團隊引導：主要鎖定「特殊通路」或「資深投資客」，但可能有少部分客群在一般購屋族身上，取決於價格。";
    } else {
      teamStrategy += "目前的局勢是「多方角力 (需再加工)」。條件不突出，價格也沒優勢，容易被淹沒在市場中。\n";
      teamStrategy += "• 給開發的建議：這是一個需要「加工」的案件。建議與屋主溝通進行「清潔、整理、打掃、修繕」，或者建議「適度降價」來換取關注度。\n";
      teamStrategy += "• 團隊引導：觀察哪個同事手上有「找該區域很久」的準買方，進行點對點的精準配對，持續努力回報與經營服務。";
    }
    teamStrategy = contractStrategy + teamStrategy;
    
    // --- 文案邏輯結束 ---

    // 回傳結果給前端
    return {
      statusCode: 200,
      body: JSON.stringify({
        score,
        analysis: { psychology, emotionTip, teamStrategy },
        radarData // 告訴前端雷達圖要畫多大
      })
    };

  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};
