/**
 * POSTリクエストを処理する（外部からのデータ受信用）
 */
function doPost(e) {
  try {
    var contents = e.postData.contents;
    logDebug('doPost called', contents);
    
    var params = JSON.parse(contents);
    
    // APIキーの簡易認証
    var API_KEY = PropertiesService.getScriptProperties().getProperty('SYNC_API_KEY') || "kion_sync_99"; 
    if (params.apiKey !== API_KEY) {
      logDebug('Auth Failed', { received: params.apiKey, expected: API_KEY });
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var result;
    if (params.type === 'weather' || params.type === 'weather_v2') {
      result = syncWeatherData(params.data);
    } else {
      result = syncProfileData(params.data);
    }
    logDebug('Sync result (' + (params.type || 'profile') + ')', result);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    logDebug('Error in doPost', err.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ログをDebugLogシートの一番上に挿入
 */
function logDebug(msg, data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      console.log('Spreadsheet not bound: ' + msg, data);
      return;
    }
    var debugSheet = ss.getSheetByName('DebugLog');
    if (!debugSheet) {
      debugSheet = ss.insertSheet('DebugLog');
      debugSheet.appendRow(['日時', 'メッセージ', 'データ']);
      debugSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f3f3f3');
      debugSheet.setFrozenRows(1);
    }
    debugSheet.insertRowBefore(2);
    debugSheet.getRange(2, 1, 1, 3).setValues([[new Date(), msg, typeof data === 'object' ? JSON.stringify(data) : data]]);
  } catch (e) {
    console.error('logDebug failed', e.toString());
  }
}

/**
 * プロフィールデータ（体格・採寸・外見）をユーザー別のシートに保存
 */
function syncProfileData(data) {
  try {
    logDebug('syncProfileData received', data);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 「WoW_Database」シートを優先使用、なければ最初のシート
    var sheet = ss.getSheetByName('WoW_Database') || ss.getSheets()[0]; 
    if (!sheet) return { success: false, error: 'Sheet not found' };
    
    var timestamp = Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss");
    
    // 1行目のヘッダー（一応確認）
    var header = ['同期日時', '性別', '年代', '身長', '体重', '体格', '骨格', '肩幅', '胸囲', '首回り', '裄丈', '腹囲', 'ウエスト', 'ヒップ', '股下', '太もも', '靴', '手首', '肌の色', '顔の形', '髪型', '髪色'];
    sheet.getRange(1, 1, 1, header.length).setValues([header]);

    // デバッグ用：届いたデータを生でA5セルに書き出し
    sheet.getRange(5, 1).setValue("RAW_DATA: " + JSON.stringify(data));

    // 2行目のデータマッピング修正
    var row = [
      timestamp,
      data.gender || data.body_gender || '',
      data.age || data.body_age || '',
      data.height || '',
      data.weight || '',
      data.body_type || '',
      data.skeletal_type || '',
      data.shoulder || '',
      data.chest || '',
      data.neck || '',
      data.sleeve || '',
      data.belly || '',
      data.waist || '',
      data.hip || '',
      data.inseam || '',
      data.thigh || '',
      data.shoes || '',
      data.wrist || '',
      data.skin_tone || '',
      data.face_shape || '',
      data.hair_style || '',
      data.hair_color || ''
    ];
    sheet.getRange(2, 1, 1, row.length).setValues([row]);
    
    // プロンプト生成に必須の項目（性別、年代、身長、体重）が埋まっているかチェック
    var essentialIndices = [1, 2, 3, 4]; // gender, age, height, weight
    var hasEssential = true;
    for (var j = 0; j < essentialIndices.length; j++) {
      var val = row[essentialIndices[j]];
      if (val === null || val === undefined || val === "") {
        hasEssential = false;
        break;
      }
    }

    if (hasEssential) {
      // 必須項目が埋まっている場合のみプロンプト生成
      var prompt = generateAvatarPrompt(data);
      sheet.getRange(4, 1).setValue(timestamp);
      sheet.getRange(4, 2).setValue(prompt);
      
      // 画像生成もトリガーする場合（必要に応じて）
      // generateAvatarImage(prompt); 
    } else {
      // 必須項目に空欄がある場合は4行目に警告を表示
      sheet.getRange(4, 1).setValue(timestamp);
      sheet.getRange(4, 2).setValue("必須データ（性別・年代・身長・体重）が未入力のためプロンプトを生成しませんでした。");
      console.log("Essential data missing. Skipping prompt generation.");
    }

    
    return { success: true };
  } catch (e) {
    logDebug('syncProfileData ERROR', e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * 気温予測データのみを更新
 */
function syncWeatherData(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // 「WoW_Database」シートを使用
    var sheet = ss.getSheetByName('WoW_Database');
    if (!sheet) {
      sheet = ss.insertSheet('WoW_Database');
    }

    var timestamp = Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss");

    // 7行目: 同期日時と題名
    sheet.getRange(7, 1).setValue(timestamp);
    sheet.getRange(7, 2).setValue("天気予報サマリー（Lv判定込）");
    sheet.getRange(7, 1, 1, 2).setFontWeight('bold').setBackground('#F3F3F3');

    // 8-11行目: 予報データ (6列: 時間, 天気, 気温, 基準Lv, 個人差, 最終Lv)
    if (data.forecast_data && data.forecast_data.length > 0) {
      // データの数に合わせて範囲を動的に取得して書き込み
      sheet.getRange(8, 1, data.forecast_data.length, data.forecast_data[0].length).setValues(data.forecast_data);
      
      // 数値列（D, E, F列）を中央揃えにするなどの装飾
      sheet.getRange(8, 4, 4, 3).setHorizontalAlignment("center");
    }
    
    return { success: true };
  } catch (e) {
    logDebug('syncWeatherData ERROR', e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * 初期設定用：実行するとAPIキーを自動的にスクリプトプロパティに保存します
 * GASエディタ上でこの関数を選択して「実行」してください
 */
/**
 * 初期設定用：APIキーをスクリプトプロパティに保存します。
 * セキュリティのため、実際のキーはここには書かず、GASの設定画面から直接入力するか、
 * 一時的に書いて実行した後はすぐに消去してください。
 */
function setupApiKeys() {
  var scriptProperties = PropertiesService.getScriptProperties();
  
  // キーが未設定の場合のみ、ここを書き換えて一度だけ実行してください
  // scriptProperties.setProperty('GOOGLE_API_KEY', 'YOUR_NEW_KEY_HERE');
  
  scriptProperties.setProperty('SYNC_API_KEY', 'kion_sync_99');
  console.log('設定完了。現在のキーの状態:', scriptProperties.getProperty('GOOGLE_API_KEY') ? '設定済み' : '未設定');
}

/**
 * AI画像生成API（Imagen 3.0）を呼び出し
 */
function generateAvatarImage(prompt) {
  var API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  
  if (!API_KEY) {
    logDebug('Error', 'API_KEY is NULL in PropertiesService');
    throw new Error("API_KEY is not set in Script Properties (GOOGLE_API_KEY)");
  }
  
  logDebug('System Check', 'API_KEY length: ' + API_KEY.length + ' chars. Starts with: ' + API_KEY.substring(0, 4));

  // 検証済み：あなたの環境で動作が確認されたモデル
  var url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=" + API_KEY;
  
  var payload = {
    "instances": [
      {
        "prompt": prompt
      }
    ],
    "parameters": {
      "sampleCount": 1,
      "aspectRatio": "1:1",
      "outputMimeType": "image/png"
    }
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  logDebug('API Call Start', 'Model: imagen-4.0-generate-001');
  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();
  
  logDebug('API Response Received', 'Code: ' + responseCode);
  
  var json;
  try {
    json = JSON.parse(responseText);
  } catch(e) {
    logDebug('JSON Parse Error', responseText);
    throw new Error("Invalid JSON response from API");
  }
  
  if (json.predictions && json.predictions.length > 0) {
    var base64Image = json.predictions[0].bytesBase64Encoded;
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Image), "image/png", "avatar_" + new Date().getTime() + ".png");
    
    var folderName = "WoW_Avatars";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } else {
    logDebug('API Response Error', responseText);
    throw new Error("Image Generation Failed: " + (json.error ? json.error.message : responseText));
  }
}

/**
 * 物理データからAI画像生成用のプロンプトを組み立てる
 */
function generateAvatarPrompt(data) {
  // 必須データが1つでも欠けている場合は生成を拒否する（バックアップガード）
  if (!data.gender && !data.body_gender) return "性別が未入力のため生成できません。";
  if (!data.age && !data.body_age) return "年代が未入力のため生成できません。";

  var skinMap = {"色白":"fair skin", "普通":"natural skin", "小麦色":"tan skin", "褐色":"dark skin"};
  var bodyMap = {"痩せ型":"slender", "普通":"average", "がっちり":"athletic", "ぽっちゃり":"plump", "筋肉質":"muscular"};
  
  var skin = skinMap[data.skin_tone] || data.skin_tone || "";
  var body = bodyMap[data.body_type] || data.body_type || "";
  var genderLabel = data.gender || data.body_gender || "man";
  var age = data.age || data.body_age || "";
  
  var clothing = "topless, wearing only basic minimalist neutral-colored briefs";
  if (genderLabel === "女性") {
    clothing = "wearing minimalist neutral-colored tight-fitting fitness wear, including a compression T-shirt and leggings";
  }
  
  var prompt = "A full-body realistic 3D character model of a " + (genderLabel === "女性" ? "woman" : (genderLabel === "男性" ? "man" : "person")) + " in their " + age + ". ";
  prompt += "Physical details: " + (data.height ? data.height + "cm tall, " : "") + (data.weight ? data.weight + "kg, " : "") + (body ? body + " body type, " : "") + (data.skeletal_type || "") + " bone structure. ";
  prompt += "Appearance: " + (skin ? skin + ", " : "") + (data.face_shape || "") + " face shape, " + (data.hair_style || "") + " hair in " + (data.hair_color || "") + " color. ";
  prompt += "Style: " + clothing + ", showing body silhouette for shape visualization, neutral standing pose, facing front, minimalist white studio background, realistic anatomical details, cinematic lighting, 8k high resolution.";
  
  return prompt;
}
