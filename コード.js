/**
 * POSTリクエストを処理する（外部からのデータ受信用）
 */
function doPost(e) {
  try {
    var contents = e.postData.contents;
    logDebug('doPost called', contents);
    
    var params = JSON.parse(contents);
    
    // APIキーの簡易認証（スクリプトプロパティから取得）
    var API_KEY = PropertiesService.getScriptProperties().getProperty('SYNC_API_KEY') || "kion_sync_99"; 
    if (params.apiKey !== API_KEY) {
      logDebug('Auth Failed', { received: params.apiKey, expected: API_KEY });
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = syncProfileData(params.data);
    logDebug('syncProfileData result', result);
    
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var debugSheet = ss.getSheetByName('DebugLog');
  if (!debugSheet) {
    debugSheet = ss.insertSheet('DebugLog');
    debugSheet.appendRow(['日時', 'メッセージ', 'データ']);
    debugSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f3f3f3');
  }
  debugSheet.insertRowBefore(2);
  debugSheet.getRange(2, 1, 1, 3).setValues([[new Date(), msg, typeof data === 'object' ? JSON.stringify(data) : data]]);
}

/**
 * プロフィールデータ（体格・採寸・外見）をユーザー別のシートに保存
 */
function syncProfileData(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ユーザーID（ハンドル名）をシート名にする
    var sheetName = data.user_id || 'UnknownUser';
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var header = ['同期日時', '性別', '年代', '身長', '体重', '体格', '骨格', '肩幅', '胸囲', '首回り', '裄丈', '腹囲', 'ウエスト', 'ヒップ', '股下', '太もも', '靴', '手首', '肌の色', '顔の形', '髪型', '髪色'];
      sheet.appendRow(header);
      sheet.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }
    
    var timestamp = Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss");
    var row = [timestamp, data.body_gender||'', data.body_age||'', data.height||'', data.weight||'', data.body_type||'', data.skeletal_type||'', data.shoulder||'', data.chest||'', data.neck||'', data.sleeve||'', data.belly||'', data.waist||'', data.hip||'', data.inseam||'', data.thigh||'', data.shoes||'', data.wrist||'', data.skin_tone||'', data.face_shape||'', data.hair_style||'', data.hair_color||''];
    sheet.getRange(2, 1, 1, row.length).setValues([row]);
    
    // アバター生成用プロンプトの生成
    var prompt = generateAvatarPrompt(data);
    logDebug('Generated Prompt', prompt); // 最新のログ機能を使用

    sheet.getRange(3, 1).setValue("アバター生成用プロンプト");
    sheet.getRange(4, 1).setValue(timestamp); // A4: タイムスタンプ
    sheet.getRange(4, 2).setValue(prompt);    // B4: プロンプト
    
    // 【画像生成と保存】 (A5, A6, B6)
    try {
      sheet.getRange(5, 1).setValue("アバター画像生成中...");
      var imageUrl = generateAvatarImage(prompt);
      var finishTime = Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss");
      sheet.getRange(5, 1).setValue("最新のアバター画像");
      sheet.getRange(6, 1).setValue(finishTime); // A6: 完了タイムスタンプ
      sheet.getRange(6, 2).setValue(imageUrl);   // B6: 画像リンク
      logDebug('Image Generation Success', imageUrl);
    } catch (imgErr) {
      var errorTime = Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss");
      sheet.getRange(5, 1).setValue("画像生成エラー");
      sheet.getRange(6, 1).setValue(errorTime);   // A6: エラー発生時刻
      sheet.getRange(6, 2).setValue(imgErr.toString()); // B6: エラー内容
      logDebug('Image Generation Error', imgErr.toString());
    }
    
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * 初期設定用：実行するとAPIキーを自動的にスクリプトプロパティに保存します
 * GASエディタ上でこの関数を選択して「実行」してください
 */
function setupApiKeys() {
  var scriptProperties = PropertiesService.getScriptProperties();
  
  // あなたが発行した新しいAPIキーを設定（AIzaから始まるキー）
  scriptProperties.setProperty('GOOGLE_API_KEY', 'AIzaSyAvxpLcKQUZvhowaoHvJFhCKMGvv-tGVyk');
  
  // Webhook認証用のキー（固定）
  scriptProperties.setProperty('SYNC_API_KEY', 'kion_sync_99');
  
  console.log('APIキーの設定が完了しました。');
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
  var skinMap = {"色白":"fair skin", "普通":"natural skin", "小麦色":"tan skin", "褐色":"dark skin"};
  var bodyMap = {"痩せ型":"slender", "普通":"average", "がっちり":"athletic", "ぽっちゃり":"plump", "筋肉質":"muscular"};
  
  var skin = skinMap[data.skin_tone] || data.skin_tone || "natural skin";
  var body = bodyMap[data.body_type] || data.body_type || "average";
  var genderLabel = data.body_gender || "";
  
  var clothing = "topless, wearing only basic minimalist neutral-colored briefs";
  if (genderLabel === "女性") {
    clothing = "wearing minimalist neutral-colored tight-fitting fitness wear, including a compression T-shirt and leggings";
  }
  
  var prompt = "A full-body realistic 3D character model of a " + (genderLabel === "女性" ? "woman" : "man") + " in their " + data.body_age + ". ";
  prompt += "Physical details: " + (data.height || "170") + "cm tall, " + (data.weight || "60") + "kg, " + body + " body type, " + (data.skeletal_type || "") + " bone structure. ";
  prompt += "Appearance: " + skin + ", " + (data.face_shape || "") + " face shape, " + (data.hair_style || "") + " hair in " + (data.hair_color || "") + " color. ";
  prompt += "Style: " + clothing + ", showing body silhouette for shape visualization, neutral standing pose, facing front, minimalist white studio background, realistic anatomical details, cinematic lighting, 8k high resolution.";
  
  return prompt;
}
