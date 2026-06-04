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
    // バックアップシート（migrateSheetsToV2 が作成）は走査対象外
    if (name.indexOf('_backup_') !== -1) return;
    // B5: アバター本体
    var avId = extractIdFromCell_(sheet.getRange(5, 2));
    if (avId) inUse[avId] = true;
    // C14:C17: シーン画像（U列のコーデ画像はフェーズ2で廃止）
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
 * フェーズ2: シートをv2構造へマイグレーション
 *
 * 変更内容:
 *   - 行8 ヘッダーを日本語→英語に置換
 *     旧: 体感気温/服装Lv/個人感度/補正後Lv/天気 + 14部位(日本語) + コーデ画像
 *     新: feels_temp/lv_raw/sensitivity/lv_adj/weather + 14部位(英語) + outfit_name + one_point
 *   - U列の旧コーデ画像をアーカイブフォルダへ退避
 *   - U列をoutfit_nameに転用、V列にone_pointを新設
 *   - 部位コーデのデータ(G9:T12)は破壊しない（次回再生成で英語に置き換わる）
 *   - 行13 ヘッダーを location/pose/scene_image に置換
 *
 * 安全策:
 *   - 実行前に各ユーザーシートを Duplicate（"<userId>_backup_YYYYMMDD"）
 *   - 既に英語化済み（A8="time"系）のシートはスキップ（冪等性）
 *   - 既にバックアップが存在する場合は新規バックアップを作らない（二重防止）
 *
 * 実行方法: GASエディタから本関数を選択して実行
 */
function migrateSheetsToV2() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var stamp = Utilities.formatDate(new Date(), 'GMT+9', 'yyyyMMdd');
  var report = { migrated: [], skipped: [], backedUp: [] };

  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    if (name === 'DebugLog') return;
    if (name.indexOf('_backup_') !== -1) return;

    // 冪等性チェック: 既に英語化済みなら何もしない
    var a8 = sheet.getRange(8, 1).getValue();
    var b8 = sheet.getRange(8, 2).getValue();
    if (b8 === 'feels_temp') {
      report.skipped.push(name + '(already v2)');
      return;
    }

    // バックアップ作成（重複防止）
    var backupName = name + '_backup_' + stamp;
    if (!ss.getSheetByName(backupName)) {
      sheet.copyTo(ss).setName(backupName);
      report.backedUp.push(backupName);
    }

    // ヘッダー書き換え（行8）
    var bHeader = ['feels_temp', 'lv_raw', 'sensitivity', 'lv_adj', 'weather'];
    var bodyHeader = ['head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory'];
    sheet.getRange(8, 2, 1, bHeader.length).setValues([bHeader]);
    sheet.getRange(8, 7, 1, bodyHeader.length).setValues([bodyHeader]);

    // U列の旧コーデ画像を退避してから outfit_name ヘッダーへ
    for (var r = 9; r <= 12; r++) {
      var oldImgId = extractIdFromCell_(sheet.getRange(r, 21));
      if (oldImgId) archiveImageById_(oldImgId);
      sheet.getRange(r, 21).clearContent();  // U9:U12 を空に
    }
    sheet.getRange(8, 21).setValue('outfit_name');
    sheet.getRange(8, 22).setValue('one_point');
    sheet.getRange(8, 1, 1, 22)
         .setFontWeight('bold')
         .setBackground('#f3f3f3')
         .setHorizontalAlignment('center');

    // 行13 ヘッダー
    sheet.getRange(13, 1).setValue('location');
    sheet.getRange(13, 2).setValue('pose');
    sheet.getRange(13, 3).setValue('scene_image');
    sheet.getRange(13, 1, 1, 3)
         .setFontWeight('bold')
         .setBackground('#f3f3f3')
         .setHorizontalAlignment('center');

    // 部位コーデ(G9:T12)は次回再生成で英語に上書きされるためそのまま残す
    // 既存の日本語データは見た目が混在するが、次回再生成で解消

    report.migrated.push(name);
    logDebug('Migrated to v2', name);
  });

  logDebug('migrateSheetsToV2 done', JSON.stringify(report));
  return report;
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

    if (params.action === 'migrate_v2') {
      var migResult = migrateSheetsToV2();
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: migResult }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === 'weekly_scenes') {
      var wsUserId = params.user_id;
      if (!wsUserId) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'user_id required' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var wsResult = getWeeklyScenes(wsUserId);
      return ContentService.createTextOutput(JSON.stringify(wsResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Weekly テスト用: 単日のみ (day_index 指定)
    if (params.action === 'test_weekly_day') {
      var twdUserId = params.user_id || 'alessandro_riva';
      var twdIdx = (params.day_index || 0) | 0;
      var twdLabels = ['月','火','水','木','金','土'];
      var twdDay = {
        day_label: twdLabels[twdIdx % twdLabels.length],
        date: '2026-05-' + (25 + twdIdx),
        slots: [
          { slot_label:'朝', time:'07:00', temp: 14 + twdIdx, lv: 5, weather:'晴れ' },
          { slot_label:'昼', time:'13:00', temp: 22 + twdIdx, lv: 6, weather:'晴れ' },
          { slot_label:'夜', time:'21:00', temp: 16 + twdIdx, lv: 5, weather:'晴れ' }
        ]
      };
      var twdResult = syncWeeklyDay({ user_id: twdUserId, day_index: twdIdx, day: twdDay });
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: twdResult }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Weekly テスト用: ダミー予報で全パイプライン実行
    if (params.action === 'test_weekly') {
      var twUserId = params.user_id || 'alessandro_riva';
      // 6日分のダミー予報 (朝7/昼13/夜21)
      var dayLabels = ['月','火','水','木','金','土'];
      var dummyDays = [];
      for (var dd = 0; dd < 6; dd++) {
        dummyDays.push({
          day_label: dayLabels[dd],
          date: '2026-05-' + (25 + dd),
          slots: [
            { slot_label:'朝', time:'07:00', temp: 14 + dd, lv: 5, weather:'晴れ' },
            { slot_label:'昼', time:'13:00', temp: 22 + dd, lv: 6, weather:'晴れ' },
            { slot_label:'夜', time:'21:00', temp: 16 + dd, lv: 5, weather:'晴れ' }
          ]
        });
      }
      var twResult = syncWeeklyData({ user_id: twUserId, days: dummyDays });
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: twResult }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // フェーズ5 品質評価用: プロフィール上書き＋カスタム予報で全パイプライン実行
    // 用途: alessandro_riva をテストアカウントとして使い、様々な属性・条件を試す
    if (params.action === 'test_pipeline') {
      var userId = params.user_id || 'alessandro_riva';
      var ss3 = SpreadsheetApp.getActiveSpreadsheet();
      var sh3 = ss3.getSheetByName(userId);
      if (!sh3) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'sheet not found: ' + userId }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      try {
        // 1) 行1ヘッダーを最新形(25列)に拡張（既に v2 なら上書きしない値も多いが冪等で安全）
        var fullHeader = ['同期日時','性別','年代','身長','体重','体格','骨格','肩幅','胸囲','首回り','裄丈','腹囲','ウエスト','ヒップ','股下','太もも','靴','手首','肌の色','顔の形','髪型','髪色','眼鏡','ひげ','化粧','髪型詳細'];
        sh3.getRange(1, 1, 1, fullHeader.length).setValues([fullHeader]);

        // 2) プロフィール行2を上書き
        //    パラメータ: gender, age, height, weight, body_type, skeletal_type, face_shape, hair_style, hair_color, skin_color, glasses, beard, makeup
        var headerRow = sh3.getRange(1, 1, 1, 26).getValues()[0];
        var existing  = sh3.getRange(2, 1, 1, 26).getValues()[0];
        var keyMap = {
          gender: '性別', age: '年代', height: '身長', weight: '体重',
          body_type: '体格', skeletal_type: '骨格',
          face_shape: '顔の形', hair_style: '髪型', hair_color: '髪色',
          skin_color: '肌の色',
          glasses: '眼鏡', beard: 'ひげ', makeup: '化粧',
          hair_detail: '髪型詳細'
        };
        for (var k in keyMap) {
          if (params[k]) {
            var colIdx = headerRow.indexOf(keyMap[k]);
            if (colIdx >= 0) existing[colIdx] = params[k];
          }
        }
        existing[0] = new Date().toISOString();  // 同期日時
        sh3.getRange(2, 1, 1, 26).setValues([existing]);

        // 2) アバター再生成
        var pd = {};
        for (var hh = 0; hh < headerRow.length; hh++) pd[headerRow[hh]] = existing[hh];
        var avData = {
          gender: pd['性別'], age: pd['年代'], height: pd['身長'], weight: pd['体重'],
          body_type: pd['体格'], skeletal_type: pd['骨格'], skin_color: pd['肌の色'],
          face_shape: pd['顔の形'], hair_style: pd['髪型'], hair_color: pd['髪色'],
          glasses: pd['眼鏡'], beard: pd['ひげ'], makeup: pd['化粧'],
          hair_detail: pd['髪型詳細']
        };
        var prompt = generateAvatarPrompt(avData);
        sh3.getRange(4, 1).setValue(Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss"));
        sh3.getRange(4, 2).setValue(prompt);
        var prevAvId = extractIdFromCell_(sh3.getRange(5, 2));
        if (prevAvId) archiveImageById_(prevAvId);
        sh3.getRange(5, 1).setValue('画像生成中...');
        SpreadsheetApp.flush();
        var avUrl = generateAvatarImage(prompt);
        sh3.getRange(5, 1).setValue(Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss"));
        var idM = avUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || avUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        var dispUrl = idM ? ('https://drive.google.com/thumbnail?id=' + idM[1] + '&sz=w1000') : avUrl;
        sh3.getRange(5, 2).setFormula('=IMAGE("' + dispUrl + '")');
        sh3.setRowHeight(5, 280);

        // 3) カスタム予報でパイプライン実行
        //    パラメータ: temp1..temp4, lv1..lv4, weather1..weather4 (個別指定)、なければデフォルト
        // デフォルトは昼14時起点で +3h=17時, +6h=20時, +12h=2時(深夜)
        // フロントの getWeatherForecastSummary と同じ形式 "現在 (HH:00)" にする
        var defaultForecast = [
          ['現在 (14:00)', 16, 5, '快晴'],
          ['+3h (17:00)',  15, 5, '快晴'],
          ['+6h (20:00)',  14, 5, '快晴'],
          ['+12h (2:00)',  18, 4, '晴れ']
        ];
        var forecast = [];
        for (var fi = 0; fi < 4; fi++) {
          var slot = defaultForecast[fi].slice();
          if (params['temp' + (fi+1)])    slot[1] = Number(params['temp' + (fi+1)]);
          if (params['lv' + (fi+1)])      slot[2] = Number(params['lv' + (fi+1)]);
          if (params['weather' + (fi+1)]) slot[3] = params['weather' + (fi+1)];
          forecast.push(slot);
        }
        var pipeResult = syncWeatherData({
          user_id: userId,
          forecast_data: forecast,
          regenerate_outfits: true
        });

        // 4) 結果URLを集めて返す
        var sceneFormulas = [];
        for (var sr = 14; sr <= 17; sr++) {
          var sf = sh3.getRange(sr, 3).getFormula();
          var mm = sf.match(/=IMAGE\("([^"]+)"\)/);
          sceneFormulas.push(mm ? mm[1] : String(sh3.getRange(sr, 3).getValue()));
        }
        var outfitNames = sh3.getRange(9, 21, 4, 1).getValues().map(function(r){return r[0];});
        var onePoints   = sh3.getRange(9, 22, 4, 1).getValues().map(function(r){return r[0];});

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          avatarUrl: avUrl,
          avatarDisplay: dispUrl,
          profile: avData,
          forecast: forecast,
          pipeResult: pipeResult,
          scenes: sceneFormulas,
          outfit_names: outfitNames,
          one_points: onePoints
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (te) {
        // 失敗時: A5の「画像生成中...」を残さない
        try {
          var stuckVal2 = String(sh3.getRange(5, 1).getValue());
          if (stuckVal2 === '画像生成中...') {
            sh3.getRange(5, 1).setValue('画像生成失敗: ' + Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm"));
          }
        } catch (_) {}
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: te.toString(), stack: te.stack }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // フェーズ5 動作確認用: 既存プロフィール(行2)からアバターのみ再生成
    if (params.action === 'regenerate_avatar') {
      var userId = params.user_id;
      if (!userId) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'user_id required' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var ss2 = SpreadsheetApp.getActiveSpreadsheet();
      var sh2 = ss2.getSheetByName(userId);
      if (!sh2) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'sheet not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      // 失敗時にA5が「画像生成中...」のまま残らないよう finally でクリーンアップ
      try {
        // 行1ヘッダー → 行2データを取得して連想配列化
        var headerRow = sh2.getRange(1, 1, 1, 26).getValues()[0];
        var dataRow = sh2.getRange(2, 1, 1, 26).getValues()[0];
        var profileData = {};
        for (var hi = 0; hi < headerRow.length; hi++) {
          profileData[headerRow[hi]] = dataRow[hi];
        }
        // generateAvatarPrompt が期待するキー名にマップ
        var data = {
          gender: profileData['性別'],
          age: profileData['年代'],
          height: profileData['身長'],
          weight: profileData['体重'],
          body_type: profileData['体格'],
          skeletal_type: profileData['骨格'],
          skin_color: profileData['肌の色'],
          face_shape: profileData['顔の形'],
          hair_style: profileData['髪型'],
          hair_color: profileData['髪色'],
          glasses: profileData['眼鏡'],
          beard: profileData['ひげ'],
          makeup: profileData['化粧'],
          hair_detail: profileData['髪型詳細']
        };
        var prompt = generateAvatarPrompt(data);
        sh2.getRange(4, 1).setValue(Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss"));
        sh2.getRange(4, 2).setValue(prompt);
        // 旧アバターをアーカイブ
        var prevId = extractIdFromCell_(sh2.getRange(5, 2));
        if (prevId) archiveImageById_(prevId);
        sh2.getRange(5, 1).setValue('画像生成中...');
        SpreadsheetApp.flush();
        var imageUrl = generateAvatarImage(prompt);
        sh2.getRange(5, 1).setValue(Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm:ss"));
        var idMatch = imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        var displayUrl = idMatch
          ? 'https://drive.google.com/thumbnail?id=' + idMatch[1] + '&sz=w1000'
          : imageUrl;
        sh2.getRange(5, 2).setFormula('=IMAGE("' + displayUrl + '")');
        sh2.setRowHeight(5, 280);
        if (sh2.getColumnWidth(2) < 250) sh2.setColumnWidth(2, 280);
        return ContentService.createTextOutput(JSON.stringify({ success: true, imageUrl: imageUrl }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (re) {
        // 失敗時: A5の「画像生成中...」を残さない
        try {
          var stuckVal = String(sh2.getRange(5, 1).getValue());
          if (stuckVal === '画像生成中...') {
            sh2.getRange(5, 1).setValue('画像生成失敗: ' + Utilities.formatDate(new Date(), "GMT+9", "yyyy/MM/dd HH:mm"));
          }
        } catch (_) {}
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: re.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // フェーズ6 検証用: DebugLog から最近のFAILED系を抽出
    if (params.action === 'recent_failures') {
      var ssX = SpreadsheetApp.getActiveSpreadsheet();
      var dbg = ssX.getSheetByName('DebugLog');
      if (!dbg) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'DebugLog not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var lastRow = dbg.getLastRow();
      var startRow = Math.max(2, lastRow - 200);
      var rows = dbg.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
      var failures = [];
      rows.forEach(function(r) {
        var label = String(r[1] || '');
        if (label.indexOf('FAILED') !== -1 || label.indexOf('SAFETY') !== -1 || label.indexOf('failed') !== -1) {
          failures.push({ ts: String(r[0]), label: label, detail: String(r[2] || '').substring(0, 200) });
        }
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, total: failures.length, failures: failures.slice(-30) }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // デバッグ用: CostLog 集計（モデル別 ok/fail 件数 + 直近明細）
    if (params.action === 'cost_summary') {
      var ssC = SpreadsheetApp.getActiveSpreadsheet();
      var cl = ssC.getSheetByName('CostLog');
      if (!cl || cl.getLastRow() < 2) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, total: 0, byModel: {}, recent: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var rowsC = cl.getRange(2, 1, cl.getLastRow() - 1, 4).getValues();
      var byModel = {};
      rowsC.forEach(function(r){
        var m = String(r[1] || ''), st = String(r[3] || '');
        if (!byModel[m]) byModel[m] = { ok: 0, fail: 0 };
        if (st === 'ok') byModel[m].ok++; else byModel[m].fail++;
      });
      var recent = rowsC.slice(0, 12).map(function(r){
        return { ts: String(r[0]), model: String(r[1]), action: String(r[2]), status: String(r[3]) };
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, total: rowsC.length, byModel: byModel, recent: recent }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 計測: 北極星指標(NSM)＋生成ファネル集計
    if (params.action === 'nsm_stats') {
      var ssN = SpreadsheetApp.getActiveSpreadsheet();
      var el = ssN.getSheetByName('EventLog');
      if (!el || el.getLastRow() < 2) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, total: 0 }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var rowsN = el.getRange(2, 1, el.getLastRow() - 1, 5).getValues();
      var funnel = {};                 // event -> 件数
      var userDays = {};               // "user|date" -> true（完走したユニークuser-day=NSM素）
      var dayActive = {};              // date -> {user:true}（日次アクティブ）
      rowsN.forEach(function(r){
        var date = String(r[1]), ev = String(r[2]), uid = String(r[3]);
        funnel[ev] = (funnel[ev] || 0) + 1;
        if (ev === 'generate_complete') {
          userDays[uid + '|' + date] = true;
          if (!dayActive[date]) dayActive[date] = {};
          dayActive[date][uid] = true;
        }
      });
      var dau = {};
      Object.keys(dayActive).forEach(function(d){ dau[d] = Object.keys(dayActive[d]).length; });
      // ファネル転換率（start→complete）
      var starts = funnel['generate_start'] || 0;
      var completes = funnel['generate_complete'] || 0;
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        total: rowsN.length,
        nsm_unique_user_days: Object.keys(userDays).length,   // 北極星の素データ
        funnel: funnel,
        start_to_complete_rate: starts ? Math.round(completes / starts * 100) / 100 : 0,
        dau_by_date: dau
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // デバッグ用: キャッシュ余地集計（同一 user+signature の重複＝キャッシュで削れた回数）
    if (params.action === 'regen_stats') {
      var ssR = SpreadsheetApp.getActiveSpreadsheet();
      var rl = ssR.getSheetByName('RegenLog');
      if (!rl || rl.getLastRow() < 2) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, total: 0, unique: 0, cacheableRate: 0 }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var rowsR = rl.getRange(2, 1, rl.getLastRow() - 1, 3).getValues();
      var seen = {};
      var total = rowsR.length, dup = 0;
      rowsR.forEach(function(r){
        var key = String(r[1]) + '##' + String(r[2]);
        if (seen[key]) dup++; else seen[key] = true;
      });
      var unique = total - dup;
      // dup = 既出条件の再生成 = キャッシュがあれば省けた生成。シーン画像は1生成=4呼び出し。
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        total: total,
        unique: unique,
        cacheable_regens: dup,
        cacheable_rate: total ? Math.round(dup / total * 100) / 100 : 0,
        saved_scene_calls_if_cached: dup * 4
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // デバッグ用: ユーザーシート名一覧（システムシート除外）
    if (params.action === 'list_users') {
      var ssU = SpreadsheetApp.getActiveSpreadsheet();
      var users = ssU.getSheets().map(function(s){ return s.getName(); }).filter(function(n){
        return n !== 'DebugLog' && n !== 'CostLog' && n !== 'RegenLog' && n !== 'EventLog' && n.indexOf('_backup_') === -1;
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, users: users }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // デバッグ用: 指定ユーザーシートの主要セルをダンプ
    if (params.action === 'debug_dump') {
      var userId = params.user_id;
      if (!userId) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'user_id required' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(userId);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'sheet not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var dump = {
        a5_timestamp: String(sheet.getRange(5, 1).getValue()),
        b5_value: String(sheet.getRange(5, 2).getValue()).substring(0, 300),
        b5_formula: sheet.getRange(5, 2).getFormula().substring(0, 300),
        b4_prompt: String(sheet.getRange(4, 2).getValue()).substring(0, 1000),
        profile_row1: sheet.getRange(1, 1, 1, 26).getValues()[0],
        profile_row2: sheet.getRange(2, 1, 1, 26).getValues()[0],
        c14_value: String(sheet.getRange(14, 3).getValue()),
        c14_formula: sheet.getRange(14, 3).getFormula(),
        c15_value: String(sheet.getRange(15, 3).getValue()),
        c16_value: String(sheet.getRange(16, 3).getValue()),
        c17_value: String(sheet.getRange(17, 3).getValue())
      };
      return ContentService.createTextOutput(JSON.stringify({ success: true, dump: dump }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // フェーズ2 動作確認用: 指定ユーザーのコーデ＋シーン画像をテスト再生成
    // 既存B5を流用、ダミー予報データで全パイプラインを通す
    if (params.action === 'test_regenerate') {
      var userId = params.user_id;
      if (!userId) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'user_id required' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var dummyForecast = [
        ['NOW',  16, 5, '快晴'],
        ['+3h',  15, 5, '快晴'],
        ['+6h',  14, 5, '快晴'],
        ['+12h', 18, 4, '晴れ']
      ];
      var testResult = syncWeatherData({
        user_id: userId,
        forecast_data: dummyForecast,
        regenerate_outfits: true
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: testResult }))
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

      // フェーズ2追加: U9:U12 = outfit_name (英), V9:V12 = one_point (日)
      // フェーズ4でルックバナーに流す
      var outfitNames = [];
      var onePoints = [];
      var feelsTemps = [];  // B9:B12 体感気温 (バナー表示用)
      for (var rr = 9; rr <= 12; rr++) {
        outfitNames.push(sheet.getRange(rr, 21).getValue() || '');
        onePoints.push(sheet.getRange(rr, 22).getValue() || '');
        feelsTemps.push(sheet.getRange(rr, 2).getValue());
      }

      // 詳細ビュー用: G9:T12 (14部位) を構造化して返す
      var partKeys = ['head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory'];
      var partsAll = sheet.getRange(9, 7, 4, 14).getValues();  // 4行 × 14列
      var parts = partsAll.map(function(row) {
        var o = {};
        for (var pi = 0; pi < partKeys.length; pi++) {
          var v = row[pi];
          if (v != null && String(v).trim() !== '' && v !== '-') o[partKeys[pi]] = v;
        }
        return o;
      });

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
          poses: poses,
          outfit_names: outfitNames,
          one_points: onePoints,
          feels_temps: feelsTemps,
          parts: parts
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
    // analyze_face は画像base64が巨大かつPIIなので、本体はログに残さない
    var params = JSON.parse(contents);
    if (params.type === 'analyze_face') {
      logDebug('doPost called', 'type=analyze_face (image body redacted)');
    } else {
      logDebug('doPost called', contents);
    }

    // APIキーの簡易認証
    var API_KEY = PropertiesService.getScriptProperties().getProperty('SYNC_API_KEY') || "kion_sync_99";
    if (params.apiKey !== API_KEY) {
      logDebug('Auth Failed', { received: params.apiKey, expected: API_KEY });
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var result;
    if (params.type === 'analyze_face') {
      result = analyzeFacePhoto(params.data);
    } else if (params.type === 'weather' || params.type === 'weather_v2') {
      result = syncWeatherData(params.data);
    } else if (params.type === 'weekly') {
      result = syncWeeklyData(params.data);
    } else if (params.type === 'weekly_day') {
      result = syncWeeklyDay(params.data);
    } else {
      result = syncProfileData(params.data);
    }
    // analyze_face の結果も画像base64は含まれないがログ短縮
    logDebug('Sync result (' + (params.type || 'profile') + ')', params.type === 'analyze_face' ? { success: result.success } : result);

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    logDebug('Error in doPost', err.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 顔写真→特徴抽出（写真は保存しない・破棄する）
 *
 * 規約・法的配慮:
 *   - 写真はDriveに保存せず、Gemini Vision応答後に変数破棄のみで終わる
 *   - DebugLogにbase64は出さない
 *   - 抽象度を上げて「本人と判別できない」レベルに留める
 *   - 出力はプロフィール画面のドロップダウン選択肢と互換のenum値のみ
 *
 * @param {Object} data
 * @param {string} data.image_base64  画像のbase64(プレフィックスなし)
 * @param {string} [data.mime_type]   "image/jpeg" 等。省略時 image/jpeg
 * @return {{success:boolean, features?:Object, error?:string}}
 */
function analyzeFacePhoto(data) {
  if (!data || !data.image_base64) {
    return { success: false, error: 'image_base64 required' };
  }
  var apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  if (!apiKey) return { success: false, error: 'GOOGLE_API_KEY not set' };

  var mime = data.mime_type || 'image/jpeg';

  // プロンプト: 抽象度の高いenum値のみを返させる
  // 個人識別に繋がる「ほくろ位置」「目の間隔」等の詳細は出さない
  // 性別・年代は手動入力させるので抽出しない
  var promptText = [
    'Analyze this photo and extract abstract avatar features ONLY.',
    'DO NOT describe the person\'s identity, name, or any identifying marks (moles, scars, tattoos).',
    'DO NOT attempt to recognize who this person is.',
    'DO NOT infer gender or age — the user enters those manually.',
    'Choose the closest value from each enum below. Return JSON.',
    '',
    'face_shape: "卵型" | "丸顔" | "面長" | "逆三角形"',
    'hair_style: "ベリーショート" | "ショート" | "ミディアム" | "ロング" | "ボブ"',
    'hair_detail: free-text English description of the hair shape, MAX 80 chars.',
    '  Include: parting (center/side/none), bangs (yes/no/style), layering, wave/curl/straight, volume, edge style (e.g. undercut/asymmetric).',
    '  Example: "side-parted with side-swept bangs, slight wave on top, tapered sides"',
    '  Example: "center-parted long straight hair past shoulders, no bangs"',
    '  DO NOT include identifying details (specific salon names, named cuts of specific people).',
    'hair_color: "ブラック" | "ダークブラウン" | "ライトブラウン" | "ブロンド" | "グレー/白"',
    'skin_color: "色白" | "普通" | "小麦色" | "褐色"',
    'glasses: "なし" | "度付き" | "サングラス"',
    'beard: "なし" | "薄い無精ひげ" | "しっかり生やしている" | "整えたデザインひげ"   ※女性等で該当しない場合は "なし"',
    'makeup: "ノーメイク" | "ナチュラル" | "しっかり" | "モード/個性的"',
    '',
    'If the image does not contain a clear single human face, return {"success":false,"error":"no_face"}.'
  ].join('\n');

  var schema = {
    type: "OBJECT",
    properties: {
      face_shape:  { type: "STRING" },
      hair_style:  { type: "STRING" },
      hair_detail: { type: "STRING" },
      hair_color:  { type: "STRING" },
      skin_color:  { type: "STRING" },
      glasses:     { type: "STRING" },
      beard:       { type: "STRING" },
      makeup:      { type: "STRING" }
    },
    required: ["face_shape","hair_style","hair_detail","hair_color","skin_color","glasses","beard","makeup"]
  };

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  var payload = {
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: mime, data: data.image_base64 } },
        { text: promptText }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.2
    }
  };

  logDebug('analyze_face start', 'mime=' + mime);
  try {
    var resp = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var text = resp.getContentText();
    // 重要: 入力画像のbase64は変数からも明示的に外す（GAS GCで回収される）
    payload = null;
    logCost('gemini-2.5-flash', code === 200 ? 'ok' : 'fail', 'analyze_face');
    if (code !== 200) {
      logDebug('analyze_face failed', 'code=' + code + ' ' + text.substring(0, 200));
      return { success: false, error: 'Vision API ' + code };
    }
    var json = JSON.parse(text);
    var inner = json.candidates && json.candidates[0] && json.candidates[0].content
                && json.candidates[0].content.parts && json.candidates[0].content.parts[0].text;
    if (!inner) {
      var fr = json.candidates && json.candidates[0] && json.candidates[0].finishReason;
      if (fr === 'SAFETY' || fr === 'IMAGE_SAFETY') {
        return { success: false, error: 'safety_blocked' };
      }
      return { success: false, error: 'empty_response' };
    }
    var features = JSON.parse(inner);
    logDebug('analyze_face done', features);  // 抽象enum値のみ。個人識別情報なし
    return { success: true, features: features };
  } catch (e) {
    logDebug('analyze_face error', e.toString());
    return { success: false, error: e.toString() };
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
 * API呼び出しのコスト計測メータ。
 * strategy.md「価格より原価実測が先決」の足場。
 * モデル別の呼び出し回数・成否を CostLog シートへ構造化記録する。
 * 後でモデル単価を掛ければ 1生成あたり実原価が算出できる。
 *
 * ログ失敗は本処理を止めない（try/catchで握りつぶす）。
 *
 * @param {string} model   例: 'gemini-2.5-flash', 'imagen-4.0', 'nano-banana'
 * @param {string} status  'ok' | 'fail'
 * @param {string} [action] 例: 'outfit_json', 'scene_image', 'avatar', 'analyze_face'
 */
function logCost(model, status, action) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName('CostLog');
    if (!sheet) {
      sheet = ss.insertSheet('CostLog');
      sheet.appendRow(['日時', 'model', 'action', 'status']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, 4).setValues([[new Date(), model, action || '', status]]);
  } catch (e) {
    console.error('logCost failed', e.toString());
  }
}

/**
 * キャッシュ余地の計測メータ（strategy.md「キャッシュは粗利の主レバー」検証用）。
 * 生成のたび「ユーザー＋気温帯(3°C刻み)＋天気」の条件シグネチャを RegenLog へ記録。
 * 後で同一シグネチャの重複を数えれば「同条件の再生成回数＝キャッシュで削れた呼び出し」が分かる。
 * キャッシュ本体はまだ作らない（新鮮さとのトレードオフが設計判断のため）。
 *
 * @param {string} userId
 * @param {Array} slots  [{temp, weather}, ...]（4スロット）
 */
function logRegen(userId, slots) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName('RegenLog');
    if (!sheet) {
      sheet = ss.insertSheet('RegenLog');
      sheet.appendRow(['日時', 'user_id', 'signature']);
      sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }
    // シグネチャ: 各スロットを「気温帯_天気」にし連結。気温帯=floor(temp/3)*3
    var sig = (slots || []).map(function(s){
      var t = Number(s.temp);
      var band = isNaN(t) ? '?' : (Math.floor(t / 3) * 3);
      return band + '_' + (s.weather || '?');
    }).join('|');
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, 3).setValues([[new Date(), userId || '', sig]]);
  } catch (e) {
    console.error('logRegen failed', e.toString());
  }
}

/**
 * 統一イベントメータ（strategy.md 原則8「計測は基礎工事」の実装）。
 * 北極星指標（週内アクティブ日数＝朝の生成完走）＋ファネル＋サーバー側記録を1本化。
 * クライアント改ざん不可なサーバー側に記録する。
 *
 * 想定 eventType:
 *   generate_start / generate_complete / generate_fail   … 生成ファネルの核（NSM土台）
 *   scene_fail                                           … 失敗チケット返金の根拠（第2-5）
 *   tryon / share / invite_qualified / convert           … 将来のフロント実装時に配線
 *
 * @param {string} eventType
 * @param {string} userId
 * @param {(string|Object)} [detail]
 */
function logEvent(eventType, userId, detail) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName('EventLog');
    if (!sheet) {
      sheet = ss.insertSheet('EventLog');
      sheet.appendRow(['日時', 'date', 'event', 'user_id', 'detail']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }
    var now = new Date();
    var dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');
    var d = (typeof detail === 'object' && detail !== null) ? JSON.stringify(detail) : (detail || '');
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, 5).setValues([[now, dateStr, eventType || '', userId || '', d]]);
  } catch (e) {
    console.error('logEvent failed', e.toString());
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
    var header = ['同期日時', '性別', '年代', '身長', '体重', '体格', '骨格', '肩幅', '胸囲', '首回り', '裄丈', '腹囲', 'ウエスト', 'ヒップ', '股下', '太もも', '靴', '手首', '肌の色', '顔の形', '髪型', '髪色', '眼鏡', 'ひげ', '化粧', '髪型詳細'];
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
      data.hair_color || '',
      data.glasses || '',
      data.beard || '',
      data.makeup || '',
      data.hair_detail || ''
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
      hair_color:    sheetRow[21],
      glasses:       sheetRow[22],
      beard:         sheetRow[23],
      makeup:        sheetRow[24],
      hair_detail:   sheetRow[25]
    };

    // プロンプトに使う全フィールドが埋まっているかチェック（1つでも空なら生成しない）
    // 眼鏡/ひげ/化粧は未入力でも生成する（必須ではなく装飾）
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

    // 8行目: 列見出し（英語、A: 生成開始タイムスタンプ、B〜F: 予報、G〜T: 部位別、U: コーデ名、V: ワンポイント）
    // ※ フェーズ2でU列「コーデ画像」を廃止 → outfit_name に転用、V列に one_point を追加
    var bHeader = ['feels_temp', 'lv_raw', 'sensitivity', 'lv_adj', 'weather'];
    var bodyHeader = ['head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory'];
    sheet.getRange(8, 1).setValue(timestamp); // 生成開始タイムスタンプ
    sheet.getRange(8, 2, 1, bHeader.length).setValues([bHeader]);
    sheet.getRange(8, 7, 1, bodyHeader.length).setValues([bodyHeader]);
    sheet.getRange(8, 21).setValue('outfit_name');
    sheet.getRange(8, 22).setValue('one_point');
    sheet.getRange(8, 1, 1, 22)
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
        var profileRow = sheet.getRange(2, 1, 1, 26).getValues()[0];
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

        // キャッシュ余地計測: 条件シグネチャを記録（本体生成は従来通り）
        logRegen(sheetName, slots);
        // ファネル: 生成開始（NSM＝朝の生成完走の分母）
        logEvent('generate_start', sheetName);
        var sceneOk = 0, sceneFail = 0;

        // ① コーデJSON一括生成（4スロット分・部位+名前+ワンポイント）
        var outfits = generateOutfitsForForecast(slots, profile);

        // G9:T12 に部位コーデ書き込み（英語キー）
        var partKeys = ['head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory'];
        var grid = [];
        var nameCol = [];   // U列: outfit_name
        var pointCol = [];  // V列: one_point
        for (var i = 0; i < 4; i++) {
          var o = outfits[i] || {};
          grid.push(partKeys.map(function(k) { return o[k] || ''; }));
          nameCol.push([o.outfit_name || '']);
          pointCol.push([o.one_point || '']);
        }
        sheet.getRange(9, 7, 4, partKeys.length).setValues(grid);
        sheet.getRange(9, 7, 4, partKeys.length).setVerticalAlignment('top').setWrap(true);
        sheet.getRange(9, 21, 4, 1).setValues(nameCol);   // U9:U12 outfit_name
        sheet.getRange(9, 22, 4, 1).setValues(pointCol);  // V9:V12 one_point
        sheet.getRange(9, 21, 4, 2).setVerticalAlignment('top').setWrap(true);
        logDebug('Outfits written', 'rows 9-12, cols G-T + U(name) + V(one_point)');

        // ベースアバター画像(B5)を取得（シーン画像生成の入力に使う）
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
        var baseBlob = null;
        if (baseUrl && baseUrl.indexOf('http') === 0) {
          try { baseBlob = fetchDriveImageAsBlob(baseUrl); }
          catch (be) { logDebug('Base avatar fetch FAILED', be.toString()); }
        }

        // 13行目: シーン演出の列見出し（英語）
        sheet.getRange(13, 1).setValue('location');
        sheet.getRange(13, 2).setValue('pose');
        sheet.getRange(13, 3).setValue('scene_image');
        sheet.getRange(13, 1, 1, 3)
             .setFontWeight('bold')
             .setBackground('#f3f3f3')
             .setHorizontalAlignment('center');

        // ②-⑤ シーン演出生成＋画像生成（4スロット分）
        try {
          // ロケーション+ポーズを一括生成
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

          // C14:C17 にシーン画像を生成（ベースアバター+コーデtext+シーンを1ステップ統合）
          if (!baseBlob) {
            for (var nb = 0; nb < 4; nb++) {
              sheet.getRange(14 + nb, 3).setValue('ベースアバターなし');
            }
            logDebug('Scene image skipped', 'baseBlob unavailable');
          } else {
            for (var sk = 0; sk < 4; sk++) {
              // C案: 失敗時に前回画像を残置するため、事前にFormulaを記憶
              var prevSceneCell = sheet.getRange(14 + sk, 3);
              var prevSceneFormula = prevSceneCell.getFormula();
              var prevSceneId = extractIdFromCell_(prevSceneCell);

              prevSceneCell.setValue('シーン画像生成中...');
              SpreadsheetApp.flush();
              try {
                var sceneUrl = generateSceneImage(baseBlob, scenes[sk] || {}, profile, slots[sk], sheetName, sk + 1, outfits[sk] || {});
                prevSceneCell.setFormula('=IMAGE("' + sceneUrl + '")');
                // 成功時のみ旧画像をアーカイブ
                if (prevSceneId) archiveImageById_(prevSceneId);
                logDebug('Scene image generated', 'slot ' + (sk+1) + ': ' + sceneUrl);
                sceneOk++;
              } catch (se) {
                var smsg = se.toString();
                sceneFail++;
                // 失敗チケット返金の根拠を記録（第2-5）。実際の返金はチケット台帳実装後。
                logEvent('scene_fail', sheetName, { slot: sk + 1, reason: smsg.substring(0, 80) });
                // 失敗時は前回画像を復元（C案）。前回画像が無ければエラー文言を残す
                if (prevSceneFormula && prevSceneFormula.indexOf('=IMAGE(') === 0) {
                  prevSceneCell.setFormula(prevSceneFormula);
                  logDebug('Scene image FAILED (kept previous)', 'slot ' + (sk+1) + ': ' + smsg);
                } else {
                  var sCellText = (smsg.indexOf('SAFETY') !== -1) ? 'セーフティでブロック' : 'シーン画像失敗';
                  prevSceneCell.setValue(sCellText);
                  logDebug('Scene image FAILED (no previous)', 'slot ' + (sk+1) + ': ' + smsg);
                }
              }
            }
          }
        } catch (serr) {
          logDebug('Scene stage FAILED', serr.toString());
        }
        // ファネル: 生成完走（NSM＝週内アクティブ日数の分子）。シーンの成否内訳も記録。
        logEvent('generate_complete', sheetName, { scenes_ok: sceneOk, scenes_fail: sceneFail });
      } catch (oerr) {
        logDebug('Outfit generation FAILED', oerr.toString());
        logEvent('generate_fail', sheetName, ('outfit: ' + oerr.toString()).substring(0, 80));
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

// ============================================================
// Weekly Plan: 明日から6日 × 3時間帯(朝7/昼13/夜21) のコーデ生成
// シート行19-37 に格納 (Today=行8-17 とは分離)
// ============================================================
var WEEKLY_HEADER_ROW = 19;
var WEEKLY_DATA_START_ROW = 20;
var WEEKLY_DAY_COUNT = 6;
var WEEKLY_SLOTS_PER_DAY = 3;

/**
 * Weekly 1日分のみ更新 (6分タイムアウト対策のため日単位に分割)
 * @param {Object} data
 *   data.user_id
 *   data.day_index: 0〜5 (どの日か)
 *   data.day: { day_label, date, slots: [...3] }
 */
function syncWeeklyDay(data) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return { success: false, error: 'Another weekly sync in progress' };
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.user_id || 'UnknownUser';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, error: 'sheet not found' };
    var dayIdx = data.day_index | 0;
    var day = data.day;
    if (!day || !day.slots || day.slots.length < WEEKLY_SLOTS_PER_DAY) {
      return { success: false, error: 'invalid day data' };
    }

    // 行19ヘッダーは初回のみ書き込み（既に正しい値なら冪等）
    var a19 = sheet.getRange(WEEKLY_HEADER_ROW, 1).getValue();
    if (a19 !== 'day_label') {
      var header = [
        'day_label','slot_label','time','feels_temp','lv','weather',
        'head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory',
        'outfit_name','one_point','location','pose','scene_image'
      ];
      sheet.getRange(WEEKLY_HEADER_ROW, 1, 1, header.length).setValues([header]);
      sheet.getRange(WEEKLY_HEADER_ROW, 1, 1, header.length)
           .setFontWeight('bold').setBackground('#e6f0ff').setHorizontalAlignment('center');
    }

    // プロフィール + ベースアバター取得
    var profileRow = sheet.getRange(2, 1, 1, 26).getValues()[0];
    var profile = {
      gender: profileRow[1], age: profileRow[2],
      body_type: profileRow[5], skeletal_type: profileRow[6]
    };
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
    var baseBlob = null;
    if (baseUrl && baseUrl.indexOf('http') === 0) {
      try { baseBlob = fetchDriveImageAsBlob(baseUrl); } catch (_) {}
    }

    var partKeys = ['head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory'];
    var apiSlots = day.slots.map(function(s){
      return { time:s.time, temp:s.temp, weather:s.weather, lv:s.lv };
    });

    var outfits = generateOutfitsForForecast(apiSlots, profile);
    var scenes;
    try { scenes = generateScenesForOutfits(outfits, apiSlots, profile); }
    catch (_) { scenes = apiSlots.map(function(){ return {location:'', pose:''}; }); }

    var startRow = WEEKLY_DATA_START_ROW + dayIdx * WEEKLY_SLOTS_PER_DAY;
    for (var s = 0; s < WEEKLY_SLOTS_PER_DAY; s++) {
      var row = startRow + s;
      var slot = day.slots[s];
      var outfit = outfits[s] || {};
      var scene = scenes[s] || { location:'', pose:'' };
      sheet.getRange(row, 1, 1, 6).setValues([[
        day.day_label || '', slot.slot_label || '', slot.time || '',
        slot.temp != null ? slot.temp : '',
        slot.lv != null ? slot.lv : '',
        slot.weather || ''
      ]]);
      sheet.getRange(row, 7, 1, 14).setValues([partKeys.map(function(k){ return outfit[k] || ''; })]);
      sheet.getRange(row, 21).setValue(outfit.outfit_name || '');
      sheet.getRange(row, 22).setValue(outfit.one_point || '');
      sheet.getRange(row, 23).setValue(scene.location || '');
      sheet.getRange(row, 24).setValue(scene.pose || '');

      var prevSceneCell = sheet.getRange(row, 25);
      var prevSceneFormula = prevSceneCell.getFormula();
      var prevSceneId = extractIdFromCell_(prevSceneCell);
      if (!baseBlob) { prevSceneCell.setValue('ベースアバターなし'); continue; }
      prevSceneCell.setValue('生成中...');
      SpreadsheetApp.flush();
      try {
        var sceneUrl = generateSceneImage(baseBlob, scene, profile, slot, sheetName, dayIdx * WEEKLY_SLOTS_PER_DAY + s + 100, outfit);
        prevSceneCell.setFormula('=IMAGE("' + sceneUrl + '")');
        if (prevSceneId) archiveImageById_(prevSceneId);
      } catch (ie) {
        if (prevSceneFormula && prevSceneFormula.indexOf('=IMAGE(') === 0) {
          prevSceneCell.setFormula(prevSceneFormula);
        } else {
          prevSceneCell.setValue((ie.toString().indexOf('SAFETY') !== -1) ? 'セーフティ' : '画像失敗');
        }
        logDebug('Weekly day scene FAILED', day.day_label + ' slot' + s + ': ' + ie.toString());
      }
    }

    sheet.setColumnWidth(25, 200);
    for (var rh = startRow; rh < startRow + WEEKLY_SLOTS_PER_DAY; rh++) sheet.setRowHeight(rh, 200);

    return { success: true, day_index: dayIdx, day_label: day.day_label };
  } catch (e) {
    logDebug('syncWeeklyDay ERROR', e.toString());
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Weekly 全更新（内部実装: syncWeeklyDay を6回呼ぶ）
 * ※ Apps Script の6分タイムアウトを超えるため、本番はフロントから syncWeeklyDay を6回個別呼出推奨
 */
function syncWeeklyData(data) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return { success: false, error: 'Another weekly sync in progress' };
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.user_id || 'UnknownUser';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, error: 'sheet not found' };

    // 行19: ヘッダー書き込み
    var header = [
      'day_label','slot_label','time','feels_temp','lv','weather',
      'head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory',
      'outfit_name','one_point','location','pose','scene_image'
    ];
    sheet.getRange(WEEKLY_HEADER_ROW, 1, 1, header.length).setValues([header]);
    sheet.getRange(WEEKLY_HEADER_ROW, 1, 1, header.length)
         .setFontWeight('bold').setBackground('#e6f0ff').setHorizontalAlignment('center');

    // プロフィール読み込み
    var profileRow = sheet.getRange(2, 1, 1, 26).getValues()[0];
    var profile = {
      gender: profileRow[1], age: profileRow[2],
      body_type: profileRow[5], skeletal_type: profileRow[6]
    };

    // ベースアバター取得
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
    var baseBlob = null;
    if (baseUrl && baseUrl.indexOf('http') === 0) {
      try { baseBlob = fetchDriveImageAsBlob(baseUrl); }
      catch (be) { logDebug('Weekly: base avatar fetch FAILED', be.toString()); }
    }

    var partKeys = ['head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory'];

    var days = data.days || [];
    for (var d = 0; d < Math.min(days.length, WEEKLY_DAY_COUNT); d++) {
      var day = days[d];
      var slots = day.slots || [];
      if (slots.length < WEEKLY_SLOTS_PER_DAY) {
        logDebug('Weekly: day skipped (insufficient slots)', day.day_label);
        continue;
      }
      // generateOutfitsForForecast 用のスロット形式に整形
      var apiSlots = slots.map(function(s) {
        return { time: s.time, temp: s.temp, weather: s.weather, lv: s.lv };
      });

      // 1) コーデJSON一括生成 (3案)
      var outfits;
      try {
        outfits = generateOutfitsForForecast(apiSlots, profile);
        logDebug('Weekly outfits ok', day.day_label + ' - ' + (outfits[0] && outfits[0].outfit_name));
      } catch (oe) {
        logDebug('Weekly outfit gen FAILED', day.day_label + ': ' + oe.toString());
        continue;
      }

      // 2) ロケ・ポーズ一括生成 (3案)
      var scenes;
      try {
        scenes = generateScenesForOutfits(outfits, apiSlots, profile);
      } catch (se) {
        logDebug('Weekly scenes gen FAILED', day.day_label + ': ' + se.toString());
        scenes = apiSlots.map(function(){ return {location:'', pose:''}; });
      }

      // 3) 行ごとに書き込み + シーン画像生成
      var startRow = WEEKLY_DATA_START_ROW + d * WEEKLY_SLOTS_PER_DAY;
      for (var s = 0; s < WEEKLY_SLOTS_PER_DAY; s++) {
        var row = startRow + s;
        var slot = slots[s];
        var outfit = outfits[s] || {};
        var scene = scenes[s] || { location:'', pose:'' };

        // A-F: メタ
        sheet.getRange(row, 1, 1, 6).setValues([[
          day.day_label || '', slot.slot_label || '', slot.time || '',
          slot.temp != null ? slot.temp : '',
          slot.lv != null ? slot.lv : '',
          slot.weather || ''
        ]]);
        // G-T: 14部位
        var partsRow = partKeys.map(function(k){ return outfit[k] || ''; });
        sheet.getRange(row, 7, 1, 14).setValues([partsRow]);
        // U-V: 名前+ワンポイント
        sheet.getRange(row, 21).setValue(outfit.outfit_name || '');
        sheet.getRange(row, 22).setValue(outfit.one_point || '');
        // W-X: location/pose
        sheet.getRange(row, 23).setValue(scene.location || '');
        sheet.getRange(row, 24).setValue(scene.pose || '');

        // Y: シーン画像 (失敗時は前画像残置・C案)
        var prevSceneCell = sheet.getRange(row, 25);
        var prevSceneFormula = prevSceneCell.getFormula();
        var prevSceneId = extractIdFromCell_(prevSceneCell);
        if (!baseBlob) {
          prevSceneCell.setValue('ベースアバターなし');
          continue;
        }
        prevSceneCell.setValue('シーン画像生成中...');
        SpreadsheetApp.flush();
        try {
          var sceneUrl = generateSceneImage(baseBlob, scene, profile, slot, sheetName, d * WEEKLY_SLOTS_PER_DAY + s + 100, outfit);
          prevSceneCell.setFormula('=IMAGE("' + sceneUrl + '")');
          if (prevSceneId) archiveImageById_(prevSceneId);
        } catch (ie) {
          if (prevSceneFormula && prevSceneFormula.indexOf('=IMAGE(') === 0) {
            prevSceneCell.setFormula(prevSceneFormula);
          } else {
            prevSceneCell.setValue((ie.toString().indexOf('SAFETY') !== -1) ? 'セーフティでブロック' : 'シーン画像失敗');
          }
          logDebug('Weekly scene image FAILED', day.day_label + ' ' + slot.slot_label + ': ' + ie.toString());
        }
      }
    }

    // 行高・列幅の調整
    sheet.setColumnWidth(25, 200);
    for (var rh = WEEKLY_DATA_START_ROW; rh < WEEKLY_DATA_START_ROW + WEEKLY_DAY_COUNT * WEEKLY_SLOTS_PER_DAY; rh++) {
      sheet.setRowHeight(rh, 200);
    }

    return { success: true };
  } catch (e) {
    logDebug('syncWeeklyData ERROR', e.toString());
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Weekly データ取得 (フロント表示用)
 * 行20-37 から day_label/slot_label/scene_image_url 等を返す
 */
function getWeeklyScenes(userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(userId);
  if (!sheet) return { success: false, error: 'sheet not found' };
  var rows = sheet.getRange(WEEKLY_DATA_START_ROW, 1, WEEKLY_DAY_COUNT * WEEKLY_SLOTS_PER_DAY, 25).getValues();
  var partKeys = ['head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory'];
  // Y列のフォーミュラから URL を抽出
  var days = [];
  for (var d = 0; d < WEEKLY_DAY_COUNT; d++) {
    var slots = [];
    for (var s = 0; s < WEEKLY_SLOTS_PER_DAY; s++) {
      var rowIdx = d * WEEKLY_SLOTS_PER_DAY + s;
      var r = rows[rowIdx];
      // Y列のformula
      var formulaCell = sheet.getRange(WEEKLY_DATA_START_ROW + rowIdx, 25);
      var formula = formulaCell.getFormula();
      var m = formula.match(/=IMAGE\("([^"]+)"\)/);
      var imgUrl = null;
      if (m) {
        var idM = m[1].match(/[?&]id=([a-zA-Z0-9_-]+)/) || m[1].match(/\/d\/([a-zA-Z0-9_-]+)/);
        imgUrl = idM ? ('https://drive.google.com/thumbnail?id=' + idM[1] + '&sz=w2000') : m[1];
      }
      var parts = {};
      for (var pi = 0; pi < partKeys.length; pi++) {
        var v = r[6 + pi];
        if (v != null && String(v).trim() !== '' && v !== '-') parts[partKeys[pi]] = v;
      }
      slots.push({
        day_label: r[0], slot_label: r[1], time: r[2],
        feels_temp: r[3], lv: r[4], weather: r[5],
        parts: parts,
        outfit_name: r[20], one_point: r[21],
        location: r[22], pose: r[23],
        scene_image: imgUrl
      });
    }
    days.push({
      day_label: slots[0] ? slots[0].day_label : '',
      slots: slots
    });
  }
  return { success: true, days: days };
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
  // 「なし」は空文字にして parts.filter で除外する
  var glassesMap = {
    "なし":"", "度付き":"wearing prescription eyeglasses", "サングラス":"wearing sunglasses",
    "none":"", "prescription":"wearing prescription eyeglasses", "sunglasses":"wearing sunglasses"
  };
  var beardMap = {
    "なし":"", "薄い無精ひげ":"with light stubble", "しっかり生やしている":"with a full beard", "整えたデザインひげ":"with a well-groomed designer beard",
    "none":"", "light-stubble":"with light stubble", "full":"with a full beard", "designed":"with a well-groomed designer beard"
  };
  var makeupMap = {
    "ノーメイク":"", "ナチュラル":"with natural light makeup", "しっかり":"with defined makeup (visible eye makeup and lip color)", "モード/個性的":"with bold avant-garde makeup",
    "none":"", "natural":"with natural light makeup", "strong":"with defined makeup (visible eye makeup and lip color)", "mode":"with bold avant-garde makeup"
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
  // 眼鏡/ひげ/化粧（マップに無い値はそのまま、空/「なし」相当は空文字に）
  var glasses  = (data.glasses in glassesMap) ? glassesMap[data.glasses] : (data.glasses || '');
  var beard    = (data.beard   in beardMap)   ? beardMap[data.beard]     : (data.beard   || '');
  var makeup   = (data.makeup  in makeupMap)  ? makeupMap[data.makeup]   : (data.makeup  || '');

  // 安全フィルタ回避: topless/briefs は高齢者や特定組合せでImagenが弾くため、
  // 軽量で身体ラインが分かる無地下着系の表現に統一
  var clothing = (data.gender === "女性")
    ? "wearing a plain neutral fitted tank top and matching leggings"
    : "wearing a plain neutral fitted tank top and matching shorts";

  // 髪型: hair_detail (自由記述) があれば優先、無ければ enum ベース
  var hairDetail = (data.hair_detail || '').toString().trim();
  var hairText;
  if (hairDetail) {
    hairText = hairCol ? (hairCol + ' hair: ' + hairDetail) : ('hair: ' + hairDetail);
  } else if (hairSt) {
    hairText = hairSt + ' ' + hairCol + ' hair';
  } else {
    hairText = '';
  }

  var parts = [
    "A full-body photorealistic image of a " + gender,
    age ? "in their " + age : '',
    height,
    weight,
    body ? body + " body type" : '',
    skeletal ? skeletal + " bone structure" : '',
    skin,
    face ? face + " face shape" : '',
    hairText,
    glasses,
    beard,
    makeup
  ].filter(function(x){ return x; });

  var prompt = parts.join(", ") + ". ";
  prompt += clothing + ". Standing pose, facing camera, plain white studio background, 8K photorealistic. ";
  prompt += "The image must contain no text, no numbers, no labels of any kind. ";
  // 50代以上の年齢忠実性: 既知の傾向としてAIが若く描きがちなため明示
  if (age === '50s' || age === '60s or older') {
    prompt += "IMPORTANT: render the age realistically — show natural signs of maturity appropriate for the stated age (skin texture, hairline, facial structure consistent with " + age + "). Do NOT depict the person as significantly younger than stated. ";
  }

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
    '- head: 帽子全般(キャップ/ニット帽/ハット/ベレー帽/サンバイザー)、ヘアバンド、ヘアアクセ。※サングラスはfaceへ',
    '- face: サングラス、メガネ、マスク、フェイスシールド。※ピアスはearへ',
    '- ear: イヤリング、ピアス、イヤーカフ、イヤーマフ、ヘッドホン',
    '- neck: マフラー、ストール、スカーフ、ネックレス、チョーカー、ネックウォーマー、ネクタイ',
    '- inner: Tシャツ、長袖カットソー、シャツ、ブラウス、ヒートテック、タンクトップ、1枚着のニット/セーター',
    '- outer: コート、ジャケット、ブルゾン、カーディガン、羽織りパーカー、ベスト、レインコート',
    '- wrist: 腕時計、ブレスレット、バングル',
    '- finger: 手袋、ミトン、リング',
    '- waist: ベルト、ウエストバッグ、ウエストポーチ、サスペンダー',
    '- leg: メインのボトムス1点(パンツ/スカート/ショートパンツ/単体着用レギンス)',
    '- ankle: 靴下、タイツ、ストッキング、レッグウォーマー(脚に重ねるもの)',
    '- foot: スニーカー、ブーツ、ローファー、パンプス、サンダル、レインブーツ',
    '- hand: 持ち運ぶもの(ハンドバッグ/トート/クラッチ/傘/リュック)',
    '- accessory: 香水、ハンカチ、メガネチェーン、キーケース、ブローチ、他に分類できないアイテム'
  ].join('\n');

  // lv_adj × 部位数ルール: 体感レベルに応じた使用部位数の目安と必須部位
  var partCountRules = [
    '════════════════════════════════════════',
    '【部位数ルール (lv_adj厳守・実用性のために絶対遵守)】',
    '════════════════════════════════════════',
    '14部位はすべて使える可能性のあるスタイリング位置。',
    'コーデの完成度を上げる結果として空く部位があるのはOK。',
    'ただし以下を厳守:',
    '',
    '◆ 絶対上限: 1コーデで使う部位は最大10個まで(残りは必ず空文字 "")',
    '',
    '◆ 体感レベル(Lv)別の目標部位数と必須部位:',
    '  Lv 1-2 (極寒): 9-10部位 / 必須: outer + leg + foot + (head または neck で防寒)',
    '  Lv 3-4 (寒い): 7-9部位 / 必須: outer + leg + foot',
    '  Lv 5-6 (心地よい): 5-7部位 / 必須: leg + foot (inner または outer の少なくとも1つ)',
    '  Lv 7-8 (暖かい): 4-6部位 / 必須: 軽量inner + leg + foot',
    '  Lv 9-10 (暑い): 3-5部位 / 必須: 軽量inner + leg + foot',
    '',
    '◆ 理由: 寒いのに薄着・暑いのに重ね着は実用性として絶対NG。',
    '◆ 「使わない部位」は必ず空文字 "" で出力。null/省略は不可。'
  ].join('\n');

  // outfit_name (英語短縮ネーム) と one_point (日本語実用アドバイス) のルール
  var outputMetaRules = [
    '════════════════════════════════════════',
    '【outfit_name と one_point】',
    '════════════════════════════════════════',
    '◆ outfit_name: 英語の短い洗練されたコーデ名 (2-3単語)',
    '  例: "Spring Trench" / "Tokyo Minimalist" / "Velvet Hour" / "Soft Power"',
    '  各案のmood_descriptorと整合する名前。4案で重複しないこと。',
    '',
    '◆ one_point: 日本語の実用的な着こなしアドバイス (40-60字)',
    '  天気・気温・シーンに即した具体的な行動指針を1-2文で記述。',
    '  例: "肌寒い朝はインナーを重ね、日中は脱ぎ着で温度調節を。"',
    '  例: "風が強いので首元を覆うストールを忘れずに。"',
    '  例: "雨上がりは撥水素材のシューズで足元の濡れを防いで。"',
    '  抽象的・詩的表現は避け、必ず実用Tipsを含める。'
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
    '【14部位の定義(振り分け先を厳守・キーは英語)】',
    '════════════════════════════════════════',
    partDef,
    '',
    partCountRules,
    '',
    outputMetaRules,
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
    '- 1コーデのアイテム合計を10点以下に収める(部位数ルール参照)',
    '- 色・素材・シルエットを具体的に記述',
    '- 各アイテムには「特徴的な見え方」を括弧書きで添える:',
    '  例: アイボリーのサテンフレアスカート(裾が大きく外に広がるAライン、光沢面)',
    '  例: バーガンディのチャンキーヒールショートブーツ(太めヒール、つや消し本革)',
    '- 降水時は撥水素材・サイドゴアブーツ・レインコート等を必須で組み込む',
    '- 各部位は1アイテムのみ記述。使わない部位は必ず空文字 "" を出力',
    '- 各アイテムは必ず定義された部位(英語キー)に振り分ける',
    '- アイテムの値は英語で記述(例: "beige trench coat", "navy chino pants")',
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
    'outfit_name(英) + one_point(日) + color_descriptor + mood_descriptor + 14部位(英キー・値も英) を JSONで4案返す。',
    '時間帯1→outfits[0], 時間帯2→outfits[1], 時間帯3→outfits[2], 時間帯4→outfits[3]。'
  ].join('\n');

  // ★ 可変スロット対応: プロンプト内の固定数値 (4案/全6ペア等) を slots.length に合わせて置換
  //   Today=4スロット時はそのまま、Weekly=3スロット時は3案/全3ペアに自動変換
  (function rewriteSlotNumbers() {
    var N = slots.length;
    if (N === 4) return;  // デフォルトのままで OK
    var pairCount = N * (N - 1) / 2;
    // ペア列挙文字列を生成 (例 N=3: "ペア(1,2) ペア(1,3) ペア(2,3)")
    var pairListSp = [], pairListDash = [];
    for (var a = 1; a <= N; a++) {
      for (var b = a + 1; b <= N; b++) {
        pairListSp.push('ペア(' + a + ',' + b + ')');
        pairListDash.push(a + '-' + b);
      }
    }
    var outfitsRefs = [];
    for (var i = 0; i < N; i++) outfitsRefs.push('時間帯' + (i+1) + '→outfits[' + i + ']');
    promptText = promptText
      .replace(/4案/g,   N + '案')
      .replace(/4スロット/g, N + 'スロット')
      // 具体パターン (長い方) を先に置換。先に汎用 /全6ペア/ を潰すと、
      // 後段の "全6ペア(1-2, …)" がマッチせず古い表記が残るため順序が重要。
      .replace(/全6ペア\(1-2, 1-3, 1-4, 2-3, 2-4, 3-4\)/g, '全' + pairCount + 'ペア(' + pairListDash.join(', ') + ')')
      .replace(/ペア\(1,2\) ペア\(1,3\) ペア\(1,4\) ペア\(2,3\) ペア\(2,4\) ペア\(3,4\)/g, pairListSp.join(' '))
      .replace(/全6ペア/g, '全' + pairCount + 'ペア')
      .replace(/時間帯1→outfits\[0\], 時間帯2→outfits\[1\], 時間帯3→outfits\[2\], 時間帯4→outfits\[3\]/g, outfitsRefs.join(', '));
  })();

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
      '今回はこれらをすべて修正した上で、上記すべてのルールを満たす' + slots.length + '案を再提案してください。'
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
            outfit_name:      stringProp,
            one_point:        stringProp,
            color_descriptor: stringProp,
            mood_descriptor:  stringProp,
            head:       stringProp,
            face:       stringProp,
            ear:        stringProp,
            neck:       stringProp,
            inner:      stringProp,
            outer:      stringProp,
            wrist:      stringProp,
            finger:     stringProp,
            waist:      stringProp,
            leg:        stringProp,
            ankle:      stringProp,
            foot:       stringProp,
            hand:       stringProp,
            accessory:  stringProp
          },
          required: [
            "outfit_name","one_point","color_descriptor","mood_descriptor",
            "head","face","ear","neck","inner","outer","wrist","finger",
            "waist","leg","ankle","foot","hand","accessory"
          ]
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
  logCost('gemini-2.5-flash', code === 200 ? 'ok' : 'fail', 'outfit_json');

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
/**
 * 時刻文字列("現在 (19:00)" や "+12h (2:00)") から hour を抽出し、
 * AIが理解しやすい時間帯ラベル(英語)を返す。
 * 02:00 を「2 AM」と曖昧に渡すと昼間に描かれる事故が起きるので明示する。
 */
function describeTimeOfDay_(timeStr) {
  if (!timeStr) return 'unknown time of day';
  var m = String(timeStr).match(/(\d{1,2}):\d{2}/);
  if (!m) return String(timeStr);
  var h = parseInt(m[1], 10);
  if (h >= 5  && h < 8)  return h + ':00 — early morning, soft dawn light, sky brightening, low warm sun';
  if (h >= 8  && h < 11) return h + ':00 — mid morning, bright clear daylight';
  if (h >= 11 && h < 14) return h + ':00 — midday, high overhead sun, brightest hours of the day';
  if (h >= 14 && h < 17) return h + ':00 — afternoon, warm slanted light';
  if (h >= 17 && h < 19) return h + ':00 — golden hour / sunset, low warm sun, long shadows, orange-pink sky';
  if (h >= 19 && h < 21) return h + ':00 — early evening / blue hour, dim twilight, street lights starting to glow';
  if (h >= 21 || h < 5)  return h + ':00 — DEEP NIGHT, fully dark sky, scene illuminated ONLY by street lights, neon signs, shop windows, or moonlight. NO daylight, NO sun, NO bright sky.';
  return h + ':00';
}

function generateScenesForOutfits(outfits, slots, profile) {
  var API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  if (!API_KEY) throw new Error("GOOGLE_API_KEY not set");

  var slotsText = slots.map(function(s, i) {
    var o = outfits[i] || {};
    var keyItems = ['outer','inner','leg','foot','head','face','hand']
      .map(function(k){ return o[k] ? (k + ':' + o[k]) : null; })
      .filter(function(x){return x;}).slice(0, 5).join(' / ');
    var nameTag = o.outfit_name ? ' [' + o.outfit_name + ']' : '';
    var timeLabel = describeTimeOfDay_(s.time);
    return (i+1) + '. ' + s.time + ' [' + timeLabel + '] / 体感' + s.temp + '℃ / ' + (s.weather||'') + ' / Lv' + s.lv + nameTag + ' / コーデ抜粋: ' + keyItems;
  }).join('\n');

  var promptText = [
    'You are an editorial stylist and art director.',
    'For the following 4 time slots / weather / outfits, propose the most striking "scene direction" (location + pose).',
    'These images will be used as hero cards on the app\'s "Today" page.',
    '',
    'USER: gender=' + (profile.gender||'unknown') + ' / age=' + (profile.age||'unknown'),
    '',
    '4 SLOTS:',
    slotsText,
    '',
    'LOCATION RULES (random worldwide):',
    '- Pick locations randomly from anywhere in the world.',
    '  Examples (not limited): Paris / New York / Tokyo / London / Milan / Copenhagen / Los Angeles / Kyoto / Seoul / Bangkok / Istanbul / Mexico City / Lisbon / Shanghai / Barcelona / Stockholm / Sydney',
    '- All 4 slots must use completely different cities/scenes',
    '- Match the location atmosphere to the outfit taste (mode / street / romantic / avant-garde / vintage etc.)',
    '  Mode → Tokyo Ginza glass architecture, Berlin industrial gallery',
    '  Street → NYC Brooklyn graffiti alley',
    '  Romantic → Paris Montmartre flower shop, Kyoto cherry blossoms',
    '  Avant-garde → Copenhagen futuristic museum, LA concrete architecture',
    '- Reflect time-of-day and weather in the light environment',
    '- 1-2 sentences, concrete (e.g. "Cobblestone street in Paris Saint-Germain at sunset. Orange magic-hour light, street lamps beginning to glow")',
    '',
    'POSE RULES (fully open, zero-based each time):',
    'No preset categories. Invent each pose fresh for each of the 4 slots.',
    'Forbid the default "standing + face turn + one hand gesture" template.',
    '',
    'Possible axes to draw from (not limited):',
    '  Gaze (to camera / profile / downcast / looking up / glancing back / closed eyes)',
    '  Full-body action (walking / stopped / sitting / squatting / leaning / reaching / turning / climbing stairs / crossing)',
    '  Hand use (in pocket / holding object / touching hair / wearing sunglasses / pointing / holding cup)',
    '  Upper body tilt (upright / tilted / leaning forward / leaning back / sideways / diagonal)',
    '  Leg use (feet together / one foot forward / legs crossed / one knee up / mid-stride)',
    '  Camera angle (front / 3/4 / side / overhead / low angle)',
    '  Distance (full body / 3/4 shot / waist up / low full body)',
    '  Interaction with objects (wall / stairs / railing / bench / door / window / bicycle etc.)',
    '',
    'Across the 4 slots, all of these must be varied:',
    '  - Full-body action must NOT repeat (stopped / moving / sitting etc.)',
    '  - Gaze and face direction must NOT repeat',
    '  - Camera angle compositions must NOT look similar',
    '  - Hand / object use must differ across the 4',
    '',
    'Pose must fit the location (cafe → seated, street → walking, market → picking something etc.).',
    'But the bland "all front-facing standing" choice is forbidden.',
    'Each pose should be a memorable "real moment of a person being there at that time".',
    '1-2 sentences, concrete (e.g. "Walking on cobblestones while glancing back, left hand holding a tote, right hand in pocket")',
    '',
    'OUTPUT (English):',
    'Return a 4-element array, each with location(string) and pose(string).',
    'Both fields MUST be written in English.'
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
 * ベースアバター(B5)に、コーデ・ロケーション・ポーズを1ステップ合成してシーン画像を生成
 * フェーズ2でU列(中間コーデ画像)を廃止したため、この関数がコーデ着替え＋シーン演出を一括で行う
 *
 * @param {Blob} baseBlob 素のアバター画像(B5)
 * @param {Object} scene  {location, pose}
 * @param {Object} profile プロフィール
 * @param {Object} slot   {time, temp, weather, lv}
 * @param {string} userId シート名(ファイル名用)
 * @param {number} slotIndex 1-4
 * @param {Object} outfit 部位コーデ {head, face, ear, ..., accessory}
 */
function generateSceneImage(baseBlob, scene, profile, slot, userId, slotIndex, outfit) {
  outfit = outfit || {};

  // 部位コーデを OUTFIT セクションのテキストに整形（空の部位は省略）
  var partOrder = ['head','face','ear','neck','inner','outer','wrist','finger','waist','leg','ankle','foot','hand','accessory'];
  var outfitLines = partOrder
    .map(function(k) { return outfit[k] ? '- ' + k + ': ' + outfit[k] : null; })
    .filter(function(x) { return x; })
    .join('\n');

  var promptText = [
    'High-fashion editorial hero card composition for a daily lookbook app "Today" page.',
    'The output will be the main visual card, so make it visually striking and saveable.',
    '',
    'IDENTITY PRESERVATION (critical):',
    '- Preserve the exact face, body type, hairstyle, hair color, skin tone, and age from the reference image.',
    '- The reference image shows the subject in plain studio clothing — you must COMPLETELY REPLACE that clothing with the OUTFIT specified below.',
    '- Only the person\'s identity (face/body/hair/skin) carries over. Clothing, background, and pose ALL change.',
    '',
    'OUTFIT (apply these clothing items exactly — colors, materials, silhouettes as specified):',
    outfitLines || '(no outfit items specified)',
    '',
    'OUTFIT EXECUTION RULES:',
    '- Render every specified item with its exact color, material, texture, and silhouette',
    '- Items NOT specified above must NOT appear (do not invent extras)',
    '- Layering: when multiple tops are specified (inner + outer), all must be visibly distinguishable',
    '- Vests/gilets must be clearly visible as a separate outer layer with visible armholes',
    '- Wide/flared/A-line/oversized items must show their distinctive volume, NOT averaged to straight',
    '- Material fidelity: satin/silk = specular highlights; leather = slight gloss + grain; suede = matte velvety; knit = soft matte with stitch texture; linen = subtle creasing; denim = visible twill weave; metallic = actual reflective sheen',
    '- Color accuracy: every specified color must be unmistakable at a glance (a "wine red bag" reads as wine red, NOT muted brown)',
    '- Accessories (sunglasses, bags, jewelry, scarves, belts) must be clearly visible and prominent',
    '',
    'NEW BACKGROUND:',
    scene.location || 'a stylish urban location',
    '',
    '⚠️ NEW POSE — MUST FULLY REPLACE THE REFERENCE POSE ⚠️',
    'The reference image shows the subject standing front-facing in a studio.',
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
    '- Time of day: ' + describeTimeOfDay_(slot.time),
    '- Weather: ' + (slot.weather || ''),
    '- The lighting MUST match the time-of-day description above. Pay especially strict attention to night hours — if it says DEEP NIGHT, the sky is fully dark and the scene must be lit ONLY by artificial lights (street lamps, neon, shop windows) or moonlight. Daylight in a night scene is a CRITICAL ERROR.',
    '- Weather effects must also be visible (rain = wet surfaces + droplets; snow = accumulated snow + flakes; cloudy = diffused soft light; clear = sharp shadows)',
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
    '- ' + (profile.gender === '女性' ? 'Feminine silhouette and proportions' : 'Masculine silhouette and proportions'),
    '- Avoid safety-blocking content: no sheer/see-through fabric without opaque underlayer, no underwear-like exposure'
  ].join('\n');

  // 画像APIアダプタ層経由（フェーズ1で抽象化）
  var result = ImageProvider_generate({
    prompt: promptText,
    referenceBlob: baseBlob,
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

// generateOutfitImage はフェーズ2で削除（U列廃止・シーン画像生成に統合）。
// 旧: ベースアバター → 着替え画像(U列) → シーン画像(C列) の2段階画像生成
// 新: ベースアバター + コーデtext → シーン画像(C列) の1段階統合
// 結果: 画像生成回数を 4回(U列分) 削減 → 1再生成あたり 10回 → 5回 に
