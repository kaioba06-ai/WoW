// ============================================================
// アバター画像の自動アーカイブ機構
// 「WoW_Avatars」フォルダ → 不要になった画像は「WoW_Avatars_確認用」へ移動
// 完全削除はせず、人間が見て削除する運用を想定
// ============================================================

var AVATAR_FOLDER_NAME = 'WoW_Avatars';
var AVATAR_ARCHIVE_FOLDER_NAME = 'WoW_Avatars_確認用';

/**
 * 確認用フォルダ取得（無ければ作成）
 */
function getAvatarArchiveFolder_() {
  var folders = DriveApp.getFoldersByName(AVATAR_ARCHIVE_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(AVATAR_ARCHIVE_FOLDER_NAME);
}

/**
 * URL から Drive ファイルIDを抽出
 */
function extractDriveFileId_(url) {
  if (!url || typeof url !== 'string') return null;
  var m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * セルの =IMAGE() 式 or 素のURL から Drive ファイルIDを抽出
 */
function extractIdFromCell_(range) {
  var formula = range.getFormula();
  var url = '';
  if (formula) {
    var fm = formula.match(/=IMAGE\("([^"]+)"\)/i);
    if (fm) url = fm[1];
  }
  if (!url) {
    var v = range.getValue();
    if (typeof v === 'string' && v.indexOf('http') === 0) url = v;
  }
  return extractDriveFileId_(url);
}

/**
 * 全ユーザーシートを走査し、現在「使用中」の画像ID一覧を返す
 */
function collectInUseImageIds_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inUse = {};
  var sheets = ss.getSheets();
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    if (name === 'DebugLog') return;
    // B5: アバター本体
    var avId = extractIdFromCell_(sheet.getRange(5, 2));
    if (avId) inUse[avId] = true;
    // U9:U12: コーデ着替えアバター
    for (var r = 9; r <= 12; r++) {
      var id = extractIdFromCell_(sheet.getRange(r, 21));
      if (id) inUse[id] = true;
    }
    // C14:C17: シーン画像
    for (var r2 = 14; r2 <= 17; r2++) {
      var id2 = extractIdFromCell_(sheet.getRange(r2, 3));
      if (id2) inUse[id2] = true;
    }
  });
  return inUse;
}

/**
 * 「WoW_Avatars」内で現在使われていない画像を「確認用」フォルダへ移動
 * GASエディタから1回実行して既存ゴミを片付ける
 */
function archiveUnusedAvatars() {
  var inUse = collectInUseImageIds_();
  var sourceFolders = DriveApp.getFoldersByName(AVATAR_FOLDER_NAME);
  if (!sourceFolders.hasNext()) {
    logDebug('archiveUnusedAvatars', 'WoW_Avatars folder not found, nothing to do');
    return { moved: 0, kept: 0 };
  }
  var sourceFolder = sourceFolders.next();
  var archive = getAvatarArchiveFolder_();
  var files = sourceFolder.getFiles();
  var moved = 0;
  var kept = 0;
  while (files.hasNext()) {
    var f = files.next();
    if (inUse[f.getId()]) {
      kept++;
    } else {
      f.moveTo(archive);
      moved++;
    }
  }
  logDebug('archiveUnusedAvatars done', 'moved=' + moved + ' kept=' + kept);
  return { moved: moved, kept: kept };
}

/**
 * 指定IDの画像を確認用フォルダへ移動（前世代の画像を整理する用）
 */
function archiveImageById_(fileId) {
  if (!fileId) return;
  try {
    var file = DriveApp.getFileById(fileId);
    var archive = getAvatarArchiveFolder_();
    file.moveTo(archive);
  } catch (e) {
    // 既に消えてる等は無視
    logDebug('archiveImageById_ skip', fileId + ' : ' + e.toString());
  }
}

/**
 * POSTリクエストを処理する（外部からのデータ受信用）
 */
/**
 * GETリクエスト処理（シーン画像URL取得用）
 * ?action=scenes&apiKey=X&user_id=Y で C14:C17 のURLを返す
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var API_KEY = PropertiesService.getScriptProperties().getProperty('SYNC_API_KEY') || "kion_sync_99";

    if (params.apiKey !== API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === 'archive_unused') {
      var result = archiveUnusedAvatars();
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: result }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === 'scenes') {
      var userId = params.user_id;
      if (!userId) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'user_id required' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(userId);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'User sheet not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      // C14:C17 のIMAGE式からURLを抽出。なければ素のセル値も拾う
      var scenes = [];
      var locations = [];
      var poses = [];
      for (var r = 14; r <= 17; r++) {
        var formula = sheet.getRange(r, 3).getFormula();
        var match = formula.match(/=IMAGE\("([^"]+)"\)/);
        var raw = match ? match[1] : null;
        var browserUrl = null;
        if (raw) {
          var idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/) || raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (idMatch) {
            browserUrl = 'https://drive.google.com/thumbnail?id=' + idMatch[1] + '&sz=w2000';
          } else {
            browserUrl = raw;
          }
        }
        scenes.push(browserUrl);
        locations.push(sheet.getRange(r, 1).getValue() || '');
        poses.push(sheet.getRange(r, 2).getValue() || '');
      }

      // 完了シグナル: 4枚全部に有効な画像URLがあるか
      var ready = scenes.length === 4 && scenes.every(function(u){ return u && typeof u === 'string' && u.indexOf('http') === 0; });
      // 最新生成時刻（A5タイムスタンプを流用、なければ現在）
      var generatedAt = sheet.getRange(5, 1).getValue();
      if (generatedAt instanceof Date) generatedAt = generatedAt.toISOString();
      else generatedAt = String(generatedAt || '');

      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          ready: ready,
          generatedAt: generatedAt,
          scenes: scenes,
          locations: locations,
          poses: poses
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

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

    // ユーザーID（ハンドル名）をシート名にする
    var sheetName = data.user_id || 'UnknownUser';

    // ハンドル変更検出: previous_user_id が指定されていれば、旧シートをリネーム
    var prevId = data.previous_user_id || '';
    if (prevId && prevId !== sheetName) {
      var prevSheet = ss.getSheetByName(prevId);
      if (prevSheet) {
        var newExists = ss.getSheetByName(sheetName);
        if (!newExists) {
          // 新シートがまだ無い → 旧シートをリネーム（データ完全保持）
          prevSheet.setName(sheetName);
          logDebug('Renamed sheet', prevId + ' -> ' + sheetName);
        } else {
          // 新シートが既に存在 → 旧シートを削除（重複を整理）
          ss.deleteSheet(prevSheet);
          logDebug('Deleted old sheet', prevId);
        }
      }
    }

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var timestamp = Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss");

    // 1行目のヘッダー
    var header = ['同期日時', '性別', '年代', '身長', '体重', '体格', '骨格', '肩幅', '胸囲', '首回り', '裄丈', '腹囲', 'ウエスト', 'ヒップ', '股下', '太もも', '靴', '手首', '肌の色', '顔の形', '髪型', '髪色'];
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    sheet.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#f3f3f3');
    sheet.setFrozenRows(1);

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

    // シートを真のデータソースとして再読み込み
    // （クライアント送信値がそのままセットされた直後だが、シート経由にすることで
    //  「シートを直接編集した時もアバター生成に反映される」設計にする）
    var sheetRow = sheet.getRange(2, 1, 1, row.length).getValues()[0];
    var sheetData = {
      gender:        sheetRow[1],
      age:           sheetRow[2],
      height:        sheetRow[3],
      weight:        sheetRow[4],
      body_type:     sheetRow[5],
      skeletal_type: sheetRow[6],
      shoulder:      sheetRow[7],
      chest:         sheetRow[8],
      neck:          sheetRow[9],
      sleeve:        sheetRow[10],
      belly:         sheetRow[11],
      waist:         sheetRow[12],
      hip:           sheetRow[13],
      inseam:        sheetRow[14],
      thigh:         sheetRow[15],
      shoes:         sheetRow[16],
      wrist:         sheetRow[17],
      skin_tone:     sheetRow[18],
      face_shape:    sheetRow[19],
      hair_style:    sheetRow[20],
      hair_color:    sheetRow[21]
    };

    // プロンプトに使う全フィールドが埋まっているかチェック（1つでも空なら生成しない）
    var promptFields = [sheetData.gender, sheetData.age, sheetData.height, sheetData.weight,
                        sheetData.body_type, sheetData.skeletal_type, sheetData.skin_tone,
                        sheetData.face_shape, sheetData.hair_style, sheetData.hair_color];
    var allFilled = promptFields.every(function(v) { return v !== null && v !== undefined && v !== ""; });

    if (allFilled) {
      var prompt = generateAvatarPrompt(sheetData);
      sheet.getRange(3, 1).setValue("アバター生成用プロンプト");
      sheet.getRange(4, 1).setValue(timestamp);
      sheet.getRange(4, 2).setValue(prompt);

      // 画像生成
      try {
        // 前のアバターを確認用フォルダへ退避
        var prevAvatarId = extractIdFromCell_(sheet.getRange(5, 2));
        if (prevAvatarId) archiveImageById_(prevAvatarId);

        sheet.getRange(5, 1).setValue("画像生成中...");
        var imageUrl = generateAvatarImage(prompt);
        sheet.getRange(5, 1).setValue(timestamp);
        // B5 にはセル内に画像表示できる =IMAGE() 形式で挿入
        var idMatchAv = imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        var imageDisplayUrl = idMatchAv
          ? 'https://drive.google.com/thumbnail?id=' + idMatchAv[1] + '&sz=w1000'
          : imageUrl;
        sheet.getRange(5, 2).setFormula('=IMAGE("' + imageDisplayUrl + '")');
        sheet.setRowHeight(5, 280);
        if (sheet.getColumnWidth(2) < 250) sheet.setColumnWidth(2, 280);
        logDebug('Avatar Image Generated', imageUrl);
      } catch (imgErr) {
        sheet.getRange(5, 1).setValue(timestamp);
        sheet.getRange(5, 2).setValue("画像生成エラー: " + imgErr.toString());
        logDebug('Avatar Image Error', imgErr.toString());
      }
    } else {
      var missing = ["性別","年代","身長","体重","体格","骨格","肌の色","顔の形","髪型","髪色"]
        .filter(function(_, i) { return !promptFields[i]; }).join("・");
      sheet.getRange(4, 1).setValue(timestamp);
      sheet.getRange(4, 2).setValue("未入力項目があるため生成スキップ：" + missing);
    }

    // 気温感度を A6〜A8 に書き込む
    var sensitivityMap = {
      "極度の寒がり": -2,
      "寒がり": -1,
      "普通": 0,
      "暑がり": 1,
      "極度の暑がり": 2
    };
    var sensitivityVal = sensitivityMap.hasOwnProperty(data.temp_sensitivity)
      ? sensitivityMap[data.temp_sensitivity]
      : 0;
    sheet.getRange(6, 1).setValue("気温への感度");
    sheet.getRange(7, 1).setValue(timestamp);
    sheet.getRange(7, 2).setValue(sensitivityVal);

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
  // 多重実行ロック（既に動いている同期があればスキップ）
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    logDebug('syncWeatherData skipped', 'another instance is running');
    return { success: false, error: 'Another sync in progress' };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // ユーザーシートに書き込む（プロフィールと同じシート）
    var sheetName = data.user_id || 'UnknownUser';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var timestamp = Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss");

    // 8行目: 列見出し（A: 生成開始タイムスタンプ、B〜F: 予報、G〜T: 部位別、U: コーデ画像）
    var bHeader = ['体感気温', '服装Lv', '個人感度', '補正後Lv', '天気'];
    var bodyHeader = ['頭', '顔', '耳', '首', 'インナー', 'アウター', '手首', '手指', '腰', '脚', '脚～足首', '足', '手', '小物'];
    sheet.getRange(8, 1).setValue(timestamp); // 生成開始タイムスタンプ
    sheet.getRange(8, 2, 1, bHeader.length).setValues([bHeader]);
    sheet.getRange(8, 7, 1, bodyHeader.length).setValues([bodyHeader]);
    sheet.getRange(8, 21).setValue('コーデ画像');
    sheet.getRange(8, 1, 1, 21)
         .setFontWeight('bold')
         .setBackground('#f3f3f3')
         .setHorizontalAlignment('center');

    // 9-12行目: [時刻, 体感気温(素), 服装Lv(素), 天気] の4時点
    //   A:時刻  B:体感気温  C:素のLv  D:個人感度(=B7参照)  E:=C-D  F:天気
    if (data.forecast_data && data.forecast_data.length > 0) {
      var src = data.forecast_data.slice(0, 4);
      while (src.length < 4) src.push(['', '', '', '']);

      // A〜C列: 時刻・体感気温・素のLv
      var abc = src.map(function(r){ return [r[0], r[1], r[2]]; });
      sheet.getRange(9, 1, 4, 3).setValues(abc);

      // D列: 個人感度（B7を参照）
      sheet.getRange(9, 4, 4, 1).setFormulas([
        ['=$B$7'], ['=$B$7'], ['=$B$7'], ['=$B$7']
      ]);

      // E列: =C-D （感度補正後のLv）
      sheet.getRange(9, 5, 4, 1).setFormulas([
        ['=C9-D9'], ['=C10-D10'], ['=C11-D11'], ['=C12-D12']
      ]);

      // F列: 天気（日本語）
      var f = src.map(function(r){ return [r[3] || '']; });
      sheet.getRange(9, 6, 4, 1).setValues(f);

      // B〜F列を中央揃え
      sheet.getRange(9, 2, 4, 5).setHorizontalAlignment("center");

      // 旧13行目（5件目の残骸）を消去
      sheet.getRange(13, 1, 1, 20).clearContent();

      // コーデ・画像生成は明示的なフラグがある時のみ実行
      // (data.regenerate_outfits === true の時だけ生成、それ以外は予報のみ更新でリターン)
      if (data.regenerate_outfits !== true) {
        logDebug('Outfit regeneration skipped', 'regenerate_outfits flag is false');
        return { success: true, message: 'forecast only updated' };
      }

      // G9:T12 にコーディネート4案を生成
      try {
        // プロフィール情報を2行目から読み取り
        var profileRow = sheet.getRange(2, 1, 1, 22).getValues()[0];
        var profile = {
          gender: profileRow[1],
          age: profileRow[2],
          body_type: profileRow[5],
          skeletal_type: profileRow[6]
        };
        // 個人感度（B7）
        var sensitivity = Number(sheet.getRange(7, 2).getValue()) || 0;

        // 4行分のスロット情報
        var slots = src.map(function(r) {
          var rawLv = Number(r[2]) || 0;
          var adjLv = Math.max(1, Math.min(10, rawLv - sensitivity));
          return {
            time: r[0],
            temp: r[1],
            weather: r[3],
            lv: adjLv
          };
        });

        var outfits = generateOutfitsForForecast(slots, profile);

        var partKeys = ['頭','顔','耳','首','インナー','アウター','手首','手指','腰','脚','脚～足首','足','手','小物'];
        var grid = [];
        for (var i = 0; i < 4; i++) {
          var o = outfits[i] || {};
          grid.push(partKeys.map(function(k) { return o[k] || ''; }));
        }
        sheet.getRange(9, 7, 4, partKeys.length).setValues(grid);
        sheet.getRange(9, 7, 4, partKeys.length).setVerticalAlignment('top').setWrap(true);
        logDebug('Outfits written', 'rows 9-12, cols G-T');

        // U9:U12 に着替えアバター画像を生成
        try {
          // B5 は =IMAGE("...") 式または素のURLのいずれか。両対応で抽出
          var baseFormulaCell = sheet.getRange(5, 2);
          var baseFormula = baseFormulaCell.getFormula();
          var baseUrl = '';
          if (baseFormula) {
            var bm = baseFormula.match(/=IMAGE\("([^"]+)"\)/i);
            if (bm) baseUrl = bm[1];
          }
          if (!baseUrl) {
            var rawVal = baseFormulaCell.getValue();
            if (typeof rawVal === 'string' && rawVal.indexOf('http') === 0) baseUrl = rawVal;
          }
          if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.indexOf('http') !== 0) {
            sheet.getRange(9, 21, 4, 1).setValues([['ベース画像なし'],['ベース画像なし'],['ベース画像なし'],['ベース画像なし']]);
            logDebug('Outfit image skipped', 'B5 is not a valid URL');
          } else {
            // U列幅と行高を調整
            sheet.setColumnWidth(21, 200);
            for (var rh = 9; rh <= 12; rh++) sheet.setRowHeight(rh, 200);

            var baseBlob = fetchDriveImageAsBlob(baseUrl);
            for (var k = 0; k < 4; k++) {
              try {
                // 前のコーデ画像を確認用フォルダへ退避
                var prevOutfitId = extractIdFromCell_(sheet.getRange(9 + k, 21));
                if (prevOutfitId) archiveImageById_(prevOutfitId);

                sheet.getRange(9 + k, 21).setValue('画像生成中...');
                SpreadsheetApp.flush();
                var imgUrl = generateOutfitImage(baseBlob, outfits[k] || {}, profile, sheetName, k + 1);
                sheet.getRange(9 + k, 21).setFormula('=IMAGE("' + imgUrl + '")');
                logDebug('Outfit image generated', 'slot ' + (k+1) + ': ' + imgUrl);
              } catch (ie) {
                var msg = ie.toString();
                var cellText = (msg.indexOf('SAFETY') !== -1)
                  ? 'セーフティでブロック'
                  : '画像生成失敗';
                sheet.getRange(9 + k, 21).setValue(cellText);
                logDebug('Outfit image FAILED', 'slot ' + (k+1) + ': ' + msg);
              }
            }
          }
        } catch (uerr) {
          logDebug('Outfit image stage FAILED', uerr.toString());
        }

        // 13行目: シーン演出の列見出し（A:ロケーション B:ポーズ C:シーン画像）
        sheet.getRange(13, 1).setValue('ロケーション');
        sheet.getRange(13, 2).setValue('ポーズ');
        sheet.getRange(13, 3).setValue('シーン画像');
        sheet.getRange(13, 1, 1, 3)
             .setFontWeight('bold')
             .setBackground('#f3f3f3')
             .setHorizontalAlignment('center');

        // 14-17行目: シーン演出
        try {
          // U9-U12 のアバター画像URLを取得
          var outfitUrls = [];
          for (var u = 9; u <= 12; u++) {
            var f = sheet.getRange(u, 21).getFormula();
            var m = f.match(/=IMAGE\("([^"]+)"\)/);
            outfitUrls.push(m ? m[1] : null);
          }

          // 4スロット分のロケーション+ポーズを一括生成
          var scenes = generateScenesForOutfits(outfits, slots, profile);
          logDebug('Scenes generated', JSON.stringify(scenes).substring(0, 500));

          // A14:B17 にロケーション/ポーズを書き込み
          var lpRows = [];
          for (var si = 0; si < 4; si++) {
            var sc = scenes[si] || { location: '', pose: '' };
            lpRows.push([sc.location, sc.pose]);
          }
          sheet.getRange(14, 1, 4, 2).setValues(lpRows);
          sheet.getRange(14, 1, 4, 2).setVerticalAlignment('top').setWrap(true);

          // C列の幅と行高を調整（メインカード想定の縦長）
          sheet.setColumnWidth(3, 350);
          sheet.setColumnWidth(1, 200);
          sheet.setColumnWidth(2, 200);
          for (var rh = 14; rh <= 17; rh++) sheet.setRowHeight(rh, 450);

          // C14:C17 にシーン画像を生成
          for (var sk = 0; sk < 4; sk++) {
            try {
              if (!outfitUrls[sk]) {
                sheet.getRange(14 + sk, 3).setValue('元コーデ画像なし');
                continue;
              }
              sheet.getRange(14 + sk, 3).setValue('シーン画像生成中...');
              // 前のシーン画像を確認用フォルダへ退避
              var prevSceneId = extractIdFromCell_(sheet.getRange(14 + sk, 3));
              if (prevSceneId) archiveImageById_(prevSceneId);

              SpreadsheetApp.flush();
              var srcBlob = fetchDriveImageAsBlob(outfitUrls[sk]);
              var sceneUrl = generateSceneImage(srcBlob, scenes[sk] || {}, profile, slots[sk], sheetName, sk + 1);
              sheet.getRange(14 + sk, 3).setFormula('=IMAGE("' + sceneUrl + '")');
              logDebug('Scene image generated', 'slot ' + (sk+1) + ': ' + sceneUrl);
            } catch (se) {
              var smsg = se.toString();
              var sCellText = (smsg.indexOf('SAFETY') !== -1) ? 'セーフティでブロック' : 'シーン画像失敗';
              sheet.getRange(14 + sk, 3).setValue(sCellText);
              logDebug('Scene image FAILED', 'slot ' + (sk+1) + ': ' + smsg);
            }
          }
        } catch (serr) {
          logDebug('Scene stage FAILED', serr.toString());
        }
      } catch (oerr) {
        logDebug('Outfit generation FAILED', oerr.toString());
        // 失敗時は "-" で埋める（既存予報は壊さない）
        var dash = [];
        for (var j = 0; j < 4; j++) dash.push(['-','-','-','-','-','-','-','-','-','-','-','-','-','-']);
        sheet.getRange(9, 7, 4, 14).setValues(dash);
      }
    }

    return { success: true };
  } catch (e) {
    logDebug('syncWeatherData ERROR', e.toString());
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (le) { /* ignore */ }
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
  // 画像APIアダプタ層経由（フェーズ1で抽象化）
  // 旧: Imagen 4 を直接呼び出し → 新: ImageProvider_generate() に委譲
  var result = ImageProvider_generate({
    prompt: prompt,
    aspectRatio: '1:1',
    outputName: 'avatar_' + new Date().getTime() + '.png',
    outputFolder: 'WoW_Avatars'
  });
  return result.url;
}

/**
 * シートのデータをそのままプロンプトに反映するシンプル版
 */
function generateAvatarPrompt(data) {
  // 英語訳マップ（日本語→英語のみ。形容詞の盛り付けはしない）
  var skinMap = {
    "色白":"fair skin", "普通":"natural skin tone", "小麦色":"tan skin", "褐色":"dark skin"
  };
  var bodyMap = {
    "やせ型":"slim", "普通":"average build", "筋肉質":"muscular", "ぽっちゃり":"plus-size", "がっちり":"sturdy"
  };
  var skeletalMap = {
    "ストレート":"straight", "ウェーブ":"wave", "ナチュラル":"natural", "わからない":"natural"
  };
  var faceMap = {
    "卵型":"oval", "丸顔":"round", "面長":"long", "逆三角形":"heart-shaped",
    "oval":"oval", "round":"round", "oblong":"long", "heart":"heart-shaped"
  };
  var hairStyleMap = {
    "ベリーショート":"very short", "ショート":"short", "ミディアム":"medium-length", "ロング":"long", "ボブ":"bob",
    "very-short":"very short", "short":"short", "medium":"medium-length", "long":"long", "bob":"bob"
  };
  var hairColorMap = {
    "ブラック":"black", "ダークブラウン":"dark brown", "ライトブラウン":"light brown", "ブロンド":"blond", "グレー/白":"gray",
    "black":"black", "dark-brown":"dark brown", "light-brown":"light brown", "blond":"blond", "gray":"gray"
  };
  var ageMap = {
    "10代":"teens", "20代":"20s", "30代":"30s", "40代":"40s", "50代":"50s", "60代以上":"60s or older"
  };

  var gender   = data.gender === "女性" ? "woman" : (data.gender === "男性" ? "man" : "person");
  var age      = ageMap[data.age] || data.age || '';
  var height   = data.height ? data.height + " cm tall" : '';
  var weight   = data.weight ? "weighing " + data.weight + " kg" : '';
  var body     = bodyMap[data.body_type] || data.body_type || '';
  var skeletal = (skeletalMap[data.skeletal_type] || data.skeletal_type || '');
  var skin     = skinMap[data.skin_tone] || data.skin_tone || '';
  var face     = faceMap[data.face_shape] || data.face_shape || '';
  var hairSt   = hairStyleMap[data.hair_style] || data.hair_style || '';
  var hairCol  = hairColorMap[data.hair_color] || data.hair_color || '';

  var clothing = (data.gender === "女性")
    ? "wearing a plain neutral fitted tank top and leggings"
    : "topless, wearing only plain neutral briefs";

  var parts = [
    "A full-body photorealistic image of a " + gender,
    age ? "in their " + age : '',
    height,
    weight,
    body ? body + " body type" : '',
    skeletal ? skeletal + " bone structure" : '',
    skin,
    face ? face + " face shape" : '',
    hairSt ? hairSt + " " + hairCol + " hair" : ''
  ].filter(function(x){ return x; });

  var prompt = parts.join(", ") + ". ";
  prompt += clothing + ". Standing pose, facing camera, plain white studio background, 8K photorealistic. ";
  prompt += "The image must contain no text, no numbers, no labels of any kind.";

  return prompt;
}

/**
 * Gemini で4時間帯×14部位のコーディネートを一括生成
 * @param {Array<{time, temp, weather, lv}>} slots 4要素
 * @param {{gender, age, body_type, skeletal_type}} profile
 * @param {{violations, directive}=} prevCritique 前回の批評（リトライ時のみ渡す）
 * @return {Array<Object>} outfits（各要素は部位名→アイテム文字列）
 */
function generateOutfitsForForecast(slots, profile, prevCritique) {
  var API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  if (!API_KEY) throw new Error("GOOGLE_API_KEY not set");

  var levelGuide = [
    "Lv.10 40℃以上 酷暑: 空調服・日傘必須、極めて薄手で通気性の良い服",
    "Lv.9 35-39℃ 猛暑: 涼感素材(接触冷感)、吸水速乾、サングラス、ネッククーラー",
    "Lv.8 30-34℃ 真夏: ノースリーブ、リネン素材、日差し対策の帽子",
    "Lv.7 25-29℃ 夏日: 半袖1枚(Tシャツ・半袖シャツ・通気性の良いパンツ)",
    "Lv.6 20-24℃ 快適: 半袖+薄手の羽織り、または長袖1枚(寒暖差対策)",
    "Lv.5 15-19℃ 涼しい: 長袖シャツ、薄手のカーディガン、スウェット",
    "Lv.4 10-14℃ 肌寒い: トレンチコート、厚手のカーディガン、ジャケット",
    "Lv.3 5-9℃ 真冬: ウールコート、ニット、冬用インナー(ヒートテック等)",
    "Lv.2 0-4℃ 凍える: ダウンコート、マフラー、手袋、裏起毛",
    "Lv.1 0℃未満 極寒: 極厚ダウン、厚手インナー重ね着、スノーブーツ、イヤーマフ"
  ].join("\n");

  var slotsText = slots.map(function(s, i) {
    return (i + 1) + '. ' + s.time + ' / 体感' + s.temp + '℃ / ' + (s.weather || '不明') + ' / Lv.' + s.lv;
  }).join("\n");

  var partDef = [
    '- 頭: 帽子全般(キャップ/ニット帽/ハット/ベレー帽/サンバイザー)、ヘアバンド、ヘアアクセ。※サングラスは顔へ',
    '- 顔: サングラス、メガネ、マスク、フェイスシールド。※ピアスは耳へ',
    '- 耳: イヤリング、ピアス、イヤーカフ、イヤーマフ、ヘッドホン',
    '- 首: マフラー、ストール、スカーフ、ネックレス、チョーカー、ネックウォーマー、ネクタイ',
    '- インナー: Tシャツ、長袖カットソー、シャツ、ブラウス、ヒートテック、タンクトップ、1枚着のニット/セーター',
    '- アウター: コート、ジャケット、ブルゾン、カーディガン、羽織りパーカー、ベスト、レインコート',
    '- 手首: 腕時計、ブレスレット、バングル',
    '- 手指: 手袋、ミトン、リング',
    '- 腰: ベルト、ウエストバッグ、ウエストポーチ、サスペンダー',
    '- 脚: メインのボトムス1点(パンツ/スカート/ショートパンツ/単体着用レギンス)',
    '- 脚～足首: 靴下、タイツ、ストッキング、レッグウォーマー(脚に重ねるもの)',
    '- 足: スニーカー、ブーツ、ローファー、パンプス、サンダル、レインブーツ',
    '- 手: 持ち運ぶもの(ハンドバッグ/トート/クラッチ/傘/リュック)',
    '- 小物: 香水、ハンカチ、メガネチェーン、キーケース、ブローチ、他に分類できないアイテム'
  ].join('\n');

  var promptText = [
    'あなたは高級ファッションブランド「WoW」のチーフスタイリスト。',
    '4つの時間帯に1案ずつ、合計4案のコーディネートを提案する。',
    '',
    '════════════════════════════════════════',
    '🚨 最重要ルール: ペアワイズ・サムネイル並列テスト 🚨',
    '════════════════════════════════════════',
    'ユーザーは4案を縦に並んだサムネイル一覧として 0.5秒で見渡す。',
    'その瞬間に4案がそれぞれ完全に異なる印象として記憶される必要がある。',
    '',
    '【必須プロセス】 出力する前に必ず以下を頭の中で行う:',
    '',
    'STEP 1: 4案の初稿を作る',
    'STEP 2: 全6ペアを点検する',
    '   ペア(1,2) ペア(1,3) ペア(1,4) ペア(2,3) ペア(2,4) ペア(3,4)',
    'STEP 3: 各ペアに自問:',
    '   「この2案を並べたとき、パッと見で取り違える可能性があるか?」',
    '   判定軸: 色味/明度/彩度/シルエット/主役/全体ムード のいずれか1つでも似ていればNG',
    'STEP 4: 1ペアでもNGがあれば、その片方を別物に再設計 → STEP 2 に戻る',
    'STEP 5: 全6ペアが "明らかに異なる" になったら出力',
    '',
    '⚠️ 過去の失敗例(これらは全てNG): ⚠️',
    '- 案2「クリーム×ブラウン」と案4「セージグリーン×クリーム」 → 両方"温かい中明度アースカラー"で被り',
    '- 案1「黒ロングコート」と案3「緑ロングコート」 → 主役が両方"ロングコート"で被り',
    '- 案A「ベージュ系」と案B「キャメル系」 → 両方"温かいニュートラル"で被り',
    '- 案A「ダークネイビー」と案B「チャコール」 → 両方"暗い無彩色寄り"で被り',
    '',
    '【強制セルフ宣言】 各案には以下のラベルを必ず付ける:',
    '- color_descriptor: 色味・トーンを一文(例: "酸味のあるライムグリーンと黒のコントラスト")',
    '- mood_descriptor: 全体ムード・時代感・文化的レファレンスを一文(例: "90年代パリのアンダーグラウンドクラブ")',
    '提出前に4案のラベルを並べて見て、意味的に近いラベルが2つ以上あれば該当案を作り直す。',
    '',
    '════════════════════════════════════════',
    '【ユーザー情報】',
    '════════════════════════════════════════',
    '性別: ' + (profile.gender || '不明'),
    '年代: ' + (profile.age || '不明'),
    '体格: ' + (profile.body_type || '不明'),
    '骨格: ' + (profile.skeletal_type || '不明'),
    '※性別が明示されている場合、その性別向けのアイテム(シルエット・カット・カラー)で揃える。',
    '※男性ユーザーであっても、無難なブラウン/ベージュ/グレー量産型に逃げないこと。',
    '※ただし「攻めすぎ・奇抜・前衛アート的」も避ける。目指すは "洗練されたお洒落" — 雑誌や高感度ブランドのキャンペーンに載るレベル。',
    '',
    '════════════════════════════════════════',
    '【気象データ(4時間帯)】',
    '════════════════════════════════════════',
    slotsText,
    '',
    '⚠️ 時間帯とテイスト・色味・ムードを絶対に連動させないこと。',
    '「朝だから淡色」「夜だから暗色」「スロット1はモード、スロット2はストリート」のような',
    '時間順での自動割り当ては完全に禁止。',
    '色味・テイスト・ムードは時間軸と完全に独立して4案分先に決め、最後にランダムに時間スロットへ振り分けること。',
    '',
    '════════════════════════════════════════',
    '【サーマルレベル対応(必須遵守)】',
    '════════════════════════════════════════',
    levelGuide,
    '',
    '════════════════════════════════════════',
    '【トレンド: 進行形で先取り(ただし着られるレベルで)】',
    '════════════════════════════════════════',
    '目指す方向: "ファッション感度の高い人が実際に着てて、雑誌やSNSで保存される" 仕上がり。',
    'ストリートスナップ・洗練された有名人やインフルエンサー・最近のラン ウェイから',
    '"今まさに動いている方向" を読み取り、洗練された形で反映すること。',
    '',
    '目指すべき仕上がり:',
    '- 洗練(refined)・上品(elegant)・大人っぽい(sophisticated)',
    '- 雑誌のエディトリアル / 高感度ブランドのキャンペーンビジュアル相当',
    '- 「これ素敵」「真似したい」と一目で感じる完成度',
    '- 質感・素材・色味の組み合わせの妙が感じられる',
    '',
    '禁止事項:',
    '- 既に大衆化・量産化されたトレンドの単純再演',
    '- カタログ的・お手本コーデ・店員サンプル的な無難な組み合わせ',
    '- アート作品・コスチューム・前衛パフォーマンスのような着づらい提案',
    '- 奇抜さや実験性を優先して "おしゃれ" を犠牲にすること',
    '',
    '推奨アプローチ:',
    '- 既存のトレンドや古典を引用する場合は、現代的な素材・配色・シルエットで再構築',
    '- 派手な主張より、選び抜かれた素材・色・シルエットの組み合わせで魅せる',
    '- 攻める時は1案だけ、それ以外3案は誰が見ても "おしゃれ" な王道〜ハイセンス',
    '',
    '════════════════════════════════════════',
    '【14部位の定義(振り分け先を厳守)】',
    '════════════════════════════════════════',
    partDef,
    '',
    '════════════════════════════════════════',
    '【4案の分散ルール(被り防止の具体軸)】',
    '════════════════════════════════════════',
    '色味・彩度・明度・シルエット・主役 すべて事前カテゴリではなく自由発想。',
    'ただし以下の軸でそれぞれ "4案がバラけている" ことを確認してから出力する:',
    '',
    '◆ 色味 (Hue): 4案のメインカラーは互いに完全に異なる色相を選ぶ',
    '   "黒・ベージュ・ブラウン・グレー" のような無彩色/温色4連打は禁止',
    '◆ 彩度 (Saturation): ビビッド/ミュート/パステル/モノトーンの最低2種類以上を跨ぐ',
    '   4案全部ミュート、4案全部ビビッドに収束するのは禁止',
    '◆ 明度 (Brightness): ダーク/ミディアム/ライトの最低2段階以上を跨ぐ',
    '   4案全部暗い・4案全部明るいは禁止',
    '◆ シルエット骨格: 4案で骨格を完全にバラけさせる',
    '   "4案ともロングコート" "4案ともジャケット+スリムパンツ" は厳禁',
    '   ファッション史/サブカル/世界各地の文化から自由に発想',
    '◆ ヒーローピース(記憶に残る主役): 4案で主役を完全にバラけさせる',
    '   アウター/トップス/ボトムス/シューズ/小物/素材/ディテール/シルエット要素/色そのもの 等から',
    '   2案以上で同じ種類の主役を立てるのは禁止',
    '◆ テイスト/ムード: 完全オープン・毎回ゼロベース思考',
    '   既存のカテゴリ名(モード/ストリート/ロマンティック/クラシック/ミニマル/アヴァン/ヴィンテージ等)で',
    '   "○○系" と丸めず、各案独自の固有の言語でムードを描写する。',
    '   発想源は世界の洗練されたストリートスナップ・有名スタイリストの仕事・ハイファッション誌のエディトリアル等から自由に拾う。',
    '   例: "クリーンなオフデューティ" / "穏やかなパリジャン" / "上質なテックミニマル" / "凛としたモダンクラシック" など',
    '   各案のテイストは "実際にお洒落な人が着てる" と感じるレベルの洗練度を保つこと。',
    '   4案のテイストは互いに完全に異なる方向性を持たせる。',
    '',
    '════════════════════════════════════════',
    '【配色の構造化】',
    '════════════════════════════════════════',
    '各案で以下4つの役割を設計してから組み立てる:',
    '- メインカラー(1色): 主役。コーデ全体の印象を決める',
    '- アクセントカラー(1色): 差し色。メインと対比or補色',
    '- ベースカラー(2色): 支える役割。ニュートラルOKだが、メイン+アクセントはニュートラルに逃げない',
    '',
    '════════════════════════════════════════',
    '【鉄則】',
    '════════════════════════════════════════',
    '- 1コーデのアイテム合計を10点以下に収める',
    '- 色・素材・シルエットを具体的に記述',
    '- 各アイテムには「特徴的な見え方」を括弧書きで添える:',
    '  例: アイボリーのサテンフレアスカート(裾が大きく外に広がるAライン、光沢面)',
    '  例: バーガンディのチャンキーヒールショートブーツ(太めヒール、つや消し本革)',
    '- 降水時は撥水素材・サイドゴアブーツ・レインコート等を必須で組み込む',
    '- 各部位は1アイテムのみ記述。不要な部位は空文字でよい',
    '- 各アイテムは必ず定義された部位に振り分ける',
    '',
    '════════════════════════════════════════',
    '【画像安全フィルタ回避(絶対遵守)】',
    '════════════════════════════════════════',
    '画像生成AIのセーフティフィルタを発動させないため、以下を使わない:',
    '- 「シアー素材」「透ける」「セミトランスペアレント」等の透過表現',
    '- 「キャミソール単体」「スリップドレス」「ビスチェ単体」など下着的に見えうる表現',
    '- 「肌見せ」「素肌が透ける」「あらわになる」等の露出を示唆する表現',
    'シアーや薄手は必ず不透明インナーの上に重ねる前提で書く。',
    'キャミソール系は必ずシャツやニットを羽織って "インナーとして見える" 状態で書く。',
    '',
    '════════════════════════════════════════',
    '【品質チェック(出力前の最終自問)】',
    '════════════════════════════════════════',
    '各案が以下をすべて満たすことを確認してから出力する:',
    '- Instagram で他人に「保存」されるレベルの完成度か?',
    '- 「真似したい」と思わせる決め手の1点が入っているか?',
    '- 5年後に見返しても古臭く感じない構成か?',
    '- ECカタログ・お手本コーデ・無難大人スタイルに収束していないか?',
    '',
    '════════════════════════════════════════',
    '🚨 最終確認: ペアワイズ・サムネイル並列テストを必ずパスしたか? 🚨',
    '════════════════════════════════════════',
    '全6ペアが「明らかに異なる」になっていない案は絶対に出力しないこと。',
    '迷ったら必ず再設計する。',
    '',
    '【出力フォーマット】',
    '14部位 + color_descriptor + mood_descriptor を JSONで4案返す。',
    '時間帯1→outfits[0], 時間帯2→outfits[1], 時間帯3→outfits[2], 時間帯4→outfits[3]。'
  ].join('\n');

  // リトライ時: 前回の批評内容を末尾に付加
  if (prevCritique) {
    var critiqueBlock = [
      '',
      '【重要: 前回提案は不合格でした。以下の指摘を必ず反映してください】',
      '違反箇所:',
      (prevCritique.violations || []).map(function(v){ return '- ' + v; }).join('\n'),
      '',
      '改善方針:',
      prevCritique.directive || '(指示なし)',
      '',
      '今回はこれらをすべて修正した上で、上記すべてのルールを満たす4案を再提案してください。'
    ].join('\n');
    promptText += '\n' + critiqueBlock;
  }

  var stringProp = { type: "STRING" };
  var schema = {
    type: "OBJECT",
    properties: {
      outfits: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            color_descriptor: stringProp,
            mood_descriptor:  stringProp,
            "頭":       stringProp,
            "顔":       stringProp,
            "耳":       stringProp,
            "首":       stringProp,
            "インナー": stringProp,
            "アウター": stringProp,
            "手首":     stringProp,
            "手指":     stringProp,
            "腰":       stringProp,
            "脚":       stringProp,
            "脚～足首": stringProp,
            "足":       stringProp,
            "手":       stringProp,
            "小物":     stringProp
          },
          required: ["color_descriptor","mood_descriptor","頭","顔","耳","首","インナー","アウター","手首","手指","腰","脚","脚～足首","足","手","小物"]
        }
      }
    },
    required: ["outfits"]
  };

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY;
  var payload = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 1.2
    }
  };
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  logDebug('Outfit API Call', 'gemini-2.5-flash, ' + slots.length + ' slots');
  var resp = UrlFetchApp.fetch(url, options);
  var code = resp.getResponseCode();
  var text = resp.getContentText();
  logDebug('Outfit API Response', 'Code: ' + code);

  if (code !== 200) {
    throw new Error("Gemini API error " + code + ": " + text.substring(0, 500));
  }

  var json;
  try { json = JSON.parse(text); }
  catch(e) { throw new Error("Outer JSON parse failed: " + text.substring(0, 300)); }

  var jsonText = json.candidates && json.candidates[0] && json.candidates[0].content
                 && json.candidates[0].content.parts && json.candidates[0].content.parts[0]
                 && json.candidates[0].content.parts[0].text;
  if (!jsonText) throw new Error("Empty Gemini response: " + JSON.stringify(json).substring(0, 300));

  var parsed;
  try { parsed = JSON.parse(jsonText); }
  catch(e) { throw new Error("Inner JSON parse failed: " + jsonText.substring(0, 300)); }

  return parsed.outfits || [];
}

/**
 * 4スロットそれぞれにロケーションとポーズをGeminiで一括生成
 * @return {Array<{location, pose}>}
 */
function generateScenesForOutfits(outfits, slots, profile) {
  var API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  if (!API_KEY) throw new Error("GOOGLE_API_KEY not set");

  var slotsText = slots.map(function(s, i) {
    var o = outfits[i] || {};
    var keyItems = ['アウター','インナー','脚','足','頭','顔','手']
      .map(function(k){ return o[k] ? (k + ':' + o[k]) : null; })
      .filter(function(x){return x;}).slice(0, 5).join(' / ');
    return (i+1) + '. ' + s.time + ' / 体感' + s.temp + '℃ / ' + (s.weather||'') + ' / Lv' + s.lv + ' / コーデ抜粋: ' + keyItems;
  }).join('\n');

  var promptText = [
    'あなたはエディトリアル・スタイリスト兼アートディレクター。',
    '以下4つの時間帯・天気・コーデに対して、最も映える"シーン演出"(ロケーション+ポーズ)を提案してください。',
    'この画像はアプリの「今日」ページのメインカード(ヒーローカード)として使用されます。',
    '',
    '【ユーザー】性別:' + (profile.gender||'不明') + ' / 年代:' + (profile.age||'不明'),
    '',
    '【4スロット情報】',
    slotsText,
    '',
    '【ロケーション選定ルール(完全ランダム・世界中)】',
    '- 世界中の都市から完全ランダムに選ぶ',
    '  候補例(これに限らない): パリ/ニューヨーク/東京/ロンドン/ミラノ/コペンハーゲン/ロサンゼルス/京都/ソウル/バンコク/イスタンブール/メキシコシティ/リスボン/上海/バルセロナ/ストックホルム/シドニー',
    '- 4スロットで都市/シーンを必ず全て異なるものにする',
    '- コーデのテイスト(モード/ストリート/ロマンティック/アヴァン/ヴィンテージ等)とシーンの雰囲気を完全に連動させる',
    '  例: モード→東京銀座のガラス建築の前、ベルリンの工業的ギャラリー',
    '  例: ストリート→ニューヨーク・ブルックリンのグラフィティ路地',
    '  例: ロマンティック→パリ・モンマルトルの花屋の前、京都の桜並木',
    '  例: アヴァンギャルド→コペンハーゲンの未来的美術館、ロサンゼルスのコンクリート建築',
    '- 時間帯(現在/+3h/+6h/+12h)の実時刻と天気を加味した光環境を具体的に描写する',
    '- 1〜2文で具体的に記述(例: "夕暮れのパリ・サンジェルマン界隈の石畳通り。オレンジ色のマジックアワー光、街灯が灯り始める")',
    '',
    '【ポーズ選定ルール(完全オープン・毎回ゼロベース思考)】',
    '事前カテゴリは廃止。4案それぞれ毎回ゼロから新鮮にポーズを発想する。',
    '"立ち姿+顔の向き+片手のしぐさ" のような定型化は厳禁。',
    '',
    '考え得る発想軸(これに限らず自由に拾う):',
    '  視線(カメラ目線/横顔/俯き/見上げる/振り返る/伏し目)',
    '  全身動作(歩く/止まる/座る/しゃがむ/もたれる/手を伸ばす/振り向く/階段を上る/横切る)',
    '  手の使い方(ポケットに入れる/小物を持つ/髪を触る/サングラスをかける/物を指差す/カップを持つ)',
    '  上半身の傾き(直立/傾く/前のめり/後ろ反り/横向き/斜め)',
    '  脚の使い方(両足揃え/片足前/脚を組む/片膝立て/歩行中)',
    '  カメラアングル(正面/斜め/真横/俯瞰/煽り/ローアングル)',
    '  距離感(全身/3/4ショット/ウエストアップ/ローアングル全身)',
    '  対象とのインタラクション(壁/階段/手すり/ベンチ/扉/窓/カート/自転車等)',
    '',
    '4スロットで以下を全て必ずバラけさせる:',
    '  - 全身動作(立ち止まる/動いてる/座ってる等)が同じであってはならない',
    '  - 視線・顔の向きが同じであってはならない',
    '  - カメラアングルが似た構図にならないようにする',
    '  - 手や小物の使い方が4案で異なる',
    '',
    'ロケーションと完全に整合させる(カフェなら座る・通りなら歩く・市場なら何かを選ぶ等)。',
    'ただし「全部正面立ち」のような無難な選択は厳禁。',
    '各案のポーズが、その場所でその時間に "そこにいる人物のリアルなワンシーン" として記憶に残るレベルを目指す。',
    '1〜2文で具体的に記述(例: "石畳を歩きながら振り向く、左手にトートを持ち右手はポケット")。',
    '',
    '【出力】',
    '各スロットに location(string) と pose(string) を持つ4要素の配列を返す。'
  ].join('\n');

  var schema = {
    type: "OBJECT",
    properties: {
      scenes: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            location: { type: "STRING" },
            pose: { type: "STRING" }
          },
          required: ["location", "pose"]
        }
      }
    },
    required: ["scenes"]
  };

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY;
  var payload = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 1.3
    }
  };
  var resp = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  var text = resp.getContentText();
  if (code !== 200) throw new Error('Scene API ' + code + ': ' + text.substring(0, 300));

  var json = JSON.parse(text);
  var inner = json.candidates && json.candidates[0] && json.candidates[0].content
              && json.candidates[0].content.parts && json.candidates[0].content.parts[0].text;
  if (!inner) throw new Error('Scene: empty response');
  var parsed = JSON.parse(inner);
  return parsed.scenes || [];
}

/**
 * 着替え済みアバターをロケーション+ポーズに配置したシーン画像を生成
 */
function generateSceneImage(srcBlob, scene, profile, slot, userId, slotIndex) {
  // APIキーチェックは ImageProvider_generate 内で実施
  var promptText = [
    'High-fashion editorial hero card composition for a daily lookbook app "Today" page.',
    'The output will be the main visual card, so make it visually striking and saveable.',
    '',
    'IDENTITY PRESERVATION (critical):',
    '- Preserve the exact face, body type, hairstyle, hair color, skin tone, age, AND all clothing/accessories from the reference image.',
    '- The person and the outfit must remain completely identical to the reference.',
    '- Only the background and the pose are changing.',
    '',
    'NEW BACKGROUND:',
    scene.location || 'a stylish urban location',
    '',
    '⚠️ NEW POSE — MUST FULLY REPLACE THE REFERENCE POSE ⚠️',
    'The reference image shows the subject standing front-facing in a studio. ',
    'You MUST completely abandon that pose and adopt the following pose instead.',
    'Do NOT default to "standing facing forward". Do NOT just rotate the head or shift the gaze.',
    'The body position, weight distribution, limb arrangement, and camera angle must all change to match:',
    '',
    'POSE INSTRUCTION:',
    scene.pose || 'natural confident stance',
    '',
    'POSE EXECUTION RULES:',
    '- If the pose involves sitting → render the subject actually seated, with bent legs and lowered torso',
    '- If the pose involves walking → render motion blur on legs/hem, mid-stride with weight on one foot',
    '- If the pose involves leaning → render the subject actually leaning against the surface, body off vertical',
    '- If the pose involves looking back → render the body turned away with head rotated toward camera',
    '- If the pose involves interacting with an object → render the actual interaction (hand on cup, phone, door, etc.)',
    '- The camera angle should match the pose intention (low angle, side, 3/4, etc.) not always front-facing',
    'Default standing front-facing pose is FORBIDDEN unless the pose instruction explicitly says so.',
    '',
    'LIGHTING & MOOD:',
    '- Match the time of day "' + (slot.time || '') + '" and weather "' + (slot.weather || '') + '"',
    '- Render natural ambient light consistent with both (e.g. golden hour for sunset, soft daylight for clear day, moody street light for night)',
    '- Cinematic, atmospheric, fashion editorial quality',
    '',
    'COMPOSITION:',
    '- Portrait orientation (taller than wide), suitable as a magazine cover or app hero card',
    '- Frame must support the pose: full body for walking/standing, 3/4 for sitting/leaning, closer for object interaction',
    '- Strong sense of place: viewer should immediately recognize the city/scene type',
    '- Photorealistic, 8K, sharp focus on subject, slight bokeh on background',
    '',
    'STRICT CONSTRAINTS:',
    '- NO text, NO numbers, NO labels, NO captions, NO watermarks anywhere',
    '- Do NOT change the outfit colors or items in any way',
    '- ' + (profile.gender === '女性' ? 'Feminine silhouette and proportions' : 'Masculine silhouette and proportions')
  ].join('\n');

  // 画像APIアダプタ層経由（フェーズ1で抽象化）
  var result = ImageProvider_generate({
    prompt: promptText,
    referenceBlob: srcBlob,
    outputName: 'scene_' + userId + '_' + new Date().getTime() + '_' + slotIndex + '.png',
    outputFolder: 'WoW_Avatars'
  });
  return result.url;
}

/**
 * Gemini に4案のコーデJSONを批評させる
 * @return {{pass:boolean, violations:string[], directive:string}}
 */
function critiqueOutfits(outfits, slots, profile) {
  var API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  if (!API_KEY) throw new Error("GOOGLE_API_KEY not set");

  var compact = (outfits || []).map(function(o, i) {
    var s = slots[i] || {};
    var items = Object.keys(o).map(function(k){
      return o[k] ? (k + ':' + o[k]) : null;
    }).filter(function(x){ return x; }).join(' / ');
    return '案' + (i+1) + ' [Lv' + s.lv + ' ' + (s.weather||'') + ' ' + (s.time||'') + ']: ' + items;
  }).join('\n');

  var promptText = [
    'あなたはファッション業界のクリティックエディター。以下4案のコーデを厳しく審査してください。',
    '',
    '【ユーザー】性別:' + (profile.gender||'不明') + ' / 年代:' + (profile.age||'不明'),
    '',
    '【4案】',
    compact,
    '',
    '【評価基準(すべて満たして初めて合格)】',
    '1) 配色構造: 各案にメイン1色/アクセント1色/ベース2色の役割設計が成立しているか',
    '2) サムネイル並列テスト(最重要): 4案を縦に並んだサムネイル一覧として0.5秒で見渡した時、4案が完全に異なる印象として記憶されるか',
    '   全6ペア(1-2, 1-3, 1-4, 2-3, 2-4, 3-4)を比較し、色味・明度・彩度・シルエット・主役・ムードのいずれかで似ているペアが1つでもあれば不合格',
    '3) ニュートラル偏重防止: ベージュ系/グレー系/ブラウン系/ブラック系の中で3案以上が同系統に寄っていたら不合格',
    '3a) 明度分散: 4案がダーク/ミディアム/ライトの2段階以上に跨っているか(全部暗い・全部明るいは違反)',
    '3b) 彩度分散: 4案でビビッド/ミュート/パステル/モノトーンの最低2種類以上を使い分けているか(全部ミュートに収束は違反)',
    '3c) シルエット骨格分散: 4案の主要シルエットが視覚的に明確に異なるか(4案ともロングコート/4案ともジャケット+スリム等は違反)。事前カテゴリではなく毎回ゼロ発想すべき',
    '3d) ヒーローピース分散: 各案の「記憶に残る主役」が4案でカテゴリも種類も重複していないか。固定カテゴリではなく案ごとに何が主役かを個別判定する',
    '3e) 時間帯と色味の連動禁止: 4案の色味・明度・彩度・テイストが時間帯(朝/昼/夕/夜)に連動していないか(連動していたら違反)',
    '3f) 自己ラベル整合性: 各案の color_descriptor / mood_descriptor を見て、意味的に近接するラベルが2案以上あれば不合格',
    '4) テイスト振り幅: 4案がモード/ストリート/クラシック/ロマンティック/ミニマル/アヴァンギャルド/ヴィンテージ等で明確に異なるか',
    '5) 攻めの一手: 少なくとも1案に "保存したい" と思わせるキーピース(冒険的色/独特シルエット/個性的素材)があるか',
    '6) 量産型回避: ECカタログ・無難大人スタイル・GU/UNIQLO的見た目に収束していないか',
    '7) 安全フィルタ回避: シアー素材+下着的キャミ等、画像AIのセーフティを誘発する組み合わせが無いか',
    '8) 部位振り分け: 帽子は頭、サングラスは顔、靴下は脚〜足首 etc. が守られているか',
    '',
    '【判定方法】',
    '- 上記8項目すべてYESなら pass=true',
    '- 1つでもNOなら pass=false。violations配列に「案Nの〇〇が基準Mに違反: 具体的理由」形式で列挙',
    '- directiveに「次回どう直すべきか」を具体的に1段落で記述',
    '',
    '辛口で判定してください。妥協はしない。'
  ].join('\n');

  var schema = {
    type: "OBJECT",
    properties: {
      pass: { type: "BOOLEAN" },
      violations: { type: "ARRAY", items: { type: "STRING" } },
      directive: { type: "STRING" }
    },
    required: ["pass", "violations", "directive"]
  };

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY;
  var payload = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.3
    }
  };
  var resp = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = resp.getResponseCode();
  var text = resp.getContentText();
  if (code !== 200) throw new Error('Critique API ' + code + ': ' + text.substring(0, 300));

  var json = JSON.parse(text);
  var inner = json.candidates && json.candidates[0] && json.candidates[0].content
              && json.candidates[0].content.parts && json.candidates[0].content.parts[0].text;
  if (!inner) throw new Error('Critique: empty response');

  return JSON.parse(inner);
}

/**
 * Drive共有URLから画像Blobを取得
 * 例: https://drive.google.com/file/d/<ID>/view?usp=sharing
 */
function fetchDriveImageAsBlob(url) {
  var m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) {
    // Driveから直接取得（権限内なら確実）
    try {
      return DriveApp.getFileById(m[1]).getBlob();
    } catch (e) {
      // フォールバック: 共有URLを fetch
    }
  }
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Base image fetch failed: ' + resp.getResponseCode());
  }
  return resp.getBlob();
}

/**
 * Nano Banana (gemini-2.5-flash-image) で B5 のアバターを着替えさせた画像を生成
 * @param {Blob} baseBlob 元アバターのBlob
 * @param {Object} outfit 14部位のオブジェクト
 * @param {Object} profile プロフィール
 * @param {string} userId シート名（ファイル名用）
 * @param {number} slotIndex 1-4
 * @return {string} 生成画像のDrive共有URL
 */
function generateOutfitImage(baseBlob, outfit, profile, userId, slotIndex) {
  // APIキーチェックは ImageProvider_generate 内で実施
  // ※ この関数はフェーズ2でU列廃止と共に削除予定
  var partOrder = ['頭','顔','耳','首','インナー','アウター','手首','手指','腰','脚','脚～足首','足','手','小物'];
  var outfitLines = partOrder
    .map(function(k) { return outfit[k] ? '- ' + k + ': ' + outfit[k] : null; })
    .filter(function(x) { return x; })
    .join('\n');

  var promptText = [
    'High-fashion editorial photograph in the style of Vogue 2026.',
    'Preserve the exact identity from the reference image: face, body type, hairstyle, hair color, skin tone, and apparent age must remain perfectly consistent.',
    'The output must depict the same person — only the clothing is changed.',
    '',
    'Replace the outfit completely with the following styling. Render every item with its exact color, material, texture, and silhouette as specified:',
    outfitLines,
    '',
    'Photography & rendering instructions:',
    '- Full-body shot, front-facing, neutral confident pose',
    '- Pure white minimalist studio background, soft directional natural light',
    '- Photorealistic, 8K, sharp focus on garment materials and stitching',
    '- Faithful reproduction of fabric weight, drape, and tailoring as described',
    '- ' + (profile.gender === '女性' ? 'Feminine silhouette and proportions' : 'Masculine silhouette and proportions'),
    '',
    'CRITICAL — Color accuracy:',
    '- Every specified color MUST be visually unmistakable at a glance. A "wine red bag" must clearly read as wine red, NOT muted brown or black.',
    '- A "sax blue shirt" must clearly read as sax blue, NOT grey. A "camel coat" must be a warm tan camel, NOT beige.',
    '- Avoid the tendency to desaturate, mute, or neutralize specified colors. Render them at full saturation.',
    '',
    'CRITICAL — Silhouette fidelity (render distinctly, do NOT average to generic shapes):',
    '- Vests / gilets: must be clearly visible as a separate outer layer over the inner top, with visible armholes and edges. NEVER blend into a single garment with the inner.',
    '- Flared / A-line / pleated skirts: must show visible outward volume at the hem (the fabric clearly swings away from the body). NEVER render as a straight column.',
    '- Oversized items: must show actual oversized volume (drape, fall, slouch). NOT a regular-fit version of the item.',
    '- Tailored / structured items: must show clear lapels, defined shoulder lines, crisp seams.',
    '- Wide / cocoon / balloon / mermaid / pencil silhouettes: each must show its distinctive shape, NOT defaulted to straight.',
    '- Layering: when multiple tops are specified (inner + outer + over-layer), all must be visibly distinguishable and rendered as separate garments.',
    '',
    'CRITICAL — Material fidelity (render visible surface properties):',
    '- Satin / silk: clear specular highlights and light reflection across folds and curves.',
    '- Leather (smooth / nappa): visible slight gloss and grain on surface.',
    '- Suede: matte velvety texture, no shine.',
    '- Cashmere / wool / knit: soft matte surface with visible fiber density and stitch texture for knits.',
    '- Linen: subtle natural creasing and slightly rough weave texture.',
    '- Denim: visible twill weave and indigo wash variation.',
    '- Metallic (gold / silver / chrome): actual reflective metallic sheen, NOT flat color.',
    '- Sheer (organza / tulle / mesh): visible transparency.',
    '- Each material must look distinct from the others in the same outfit.',
    '',
    'Accessories (sunglasses, bags, jewelry, scarves, belts) must be clearly visible and prominent, not blurred or de-emphasized.',
    '',
    'Strict constraints:',
    '- The image must contain NO text, NO numbers, NO labels, NO captions, NO measurement annotations, NO watermarks anywhere',
    '- Do NOT render any body measurements, height, weight, or size values visually',
    '- No catalog-style basic styling — aim for a contemporary, fashion-forward editorial look'
  ].join('\n');

  // 画像APIアダプタ層経由（フェーズ1で抽象化）
  var result = ImageProvider_generate({
    prompt: promptText,
    referenceBlob: baseBlob,
    outputName: 'outfit_' + userId + '_' + new Date().getTime() + '_' + slotIndex + '.png',
    outputFolder: 'WoW_Avatars'
  });
  return result.url;
}
