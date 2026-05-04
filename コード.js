/**
 * Wear for Weather - Smart Sync API
 */
const MY_SECRET_API_KEY = "kion_sync_99"; 

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.apiKey !== MY_SECRET_API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Unauthorized'})).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('UserLogs');
    
    // UIの表示順に完全一致させた決定版ヘッダー
    const header = [
      '保存日時', '名前', 'ハンドル名', '自己紹介', '誕生日', 
      // --- パーソナライズ (Fashion) ---
      '対象スタイル', '気温感度', '耐熱レベル', '雨感度', 'パーソナルカラー', 
      '好きな色', 'フィット感(上)', 'フィット感(下)', '好みの素材', 'インスピレーション', '予算感', 
      // --- 身体データ (Physical) ---
      '身体性別', '年代', '身長', '体重', '体格', '骨格タイプ', 
      '肌の色', 'ルーツ', '顔型', '髪型', '髪色', '目の色', 
      '肩幅', '胸囲', '首回り', '裄丈', '腹囲', 'ウエスト', 'ヒップ', '股下', '太もも', '靴サイズ', '手首周り', 
      'クローゼット数', '投稿数'
    ];

    if (!sheet) {
      sheet = ss.insertSheet('UserLogs');
    }
    
    // ヘッダーを常に最新の状態に強制同期 (1行目を上書き)
    sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#f3f3f3');

    // データのマッピング (UIのトップダウン順に厳密に準拠)
    const row = [
      data.timestamp || '',
      data.profile.name || '',
      data.profile.handle || '',
      data.profile.bio || '',
      data.profile.birthday || '',
      // Fashion
      data.personalize.gender_style || '',
      data.personalize.sensitivity || '',
      data.personalize.thermalLevel || '',
      data.personalize.rain_sensitivity || '',
      data.personalize.personal_color || '',
      (data.personalize.favorite_colors || []).map(c => c.name).join(', '),
      data.personalize.fit_up || '',
      data.personalize.fit_low || '',
      (data.personalize.materials || []).join(', '),
      (data.personalize.inspirations || []).join(', '),
      data.personalize.budget || '',
      // Physical
      data.body.body_gender || '',
      data.body.age || '',
      data.body.height || '',
      data.body.weight || '',
      data.body.body_type || '',
      data.body.skeletal_type || '',
      data.body.skin_tone || '',
      data.body.lineage || '',
      data.body.face_shape || '',
      data.body.hair_style || '',
      data.body.hair_color || '',
      data.body.eye_color || '',
      data.body.shoulder || '',
      data.body.chest || '',
      data.body.neck || '',
      data.body.sleeve || '',
      data.body.belly || '',
      data.body.waist || '',
      data.body.hip || '',
      data.body.inseam || '',
      data.body.thigh || '',
      data.body.shoes || '',
      data.body.wrist || '',
      data.closet_count || 0,
      data.posts_count || 0
    ];

    const handle = data.profile.handle;
    const lastRow = sheet.getLastRow();
    let targetRow = lastRow + 1;

    // ハンドル名が一致する行を探して更新
    if (lastRow > 1) {
      const handles = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); 
      for (let i = 0; i < handles.length; i++) {
        if (handles[i][0] === handle) {
          targetRow = i + 2;
          break;
        }
      }
    }

    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    return ContentService.createTextOutput(JSON.stringify({status: 'success', mode: targetRow > lastRow ? 'append' : 'update'})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
