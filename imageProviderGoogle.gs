// ============================================================
// 画像生成プロバイダ: Google (Imagen 4 + Nano Banana)
// ============================================================
//
// 内部振り分け:
//   - referenceBlob なし → Imagen 4 (imagen-4.0-generate-001:predict)
//                           ※ text-to-image。高品質な人物・体型再現
//   - referenceBlob あり → Nano Banana (gemini-2.5-flash-image:generateContent)
//                           ※ image-to-image。参照画像を保ちつつ編集
//
// 将来 Nano Banana Pro に統一する場合は ImageProviderGoogle_generate_ を変更。
// ============================================================

/**
 * Google プロバイダのエントリ
 * @param {Object} opts ImageProvider_generate と同じ
 * @return {{url: string, fileId: string}}
 */
function ImageProviderGoogle_generate(opts) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set in Script Properties');
  }

  if (opts.referenceBlob) {
    return ImageProviderGoogle_nanoBanana_(opts, apiKey);
  }
  return ImageProviderGoogle_imagen4_(opts, apiKey);
}

/**
 * text-to-image: Imagen 4
 */
function ImageProviderGoogle_imagen4_(opts, apiKey) {
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=' + apiKey;
  var payload = {
    instances: [{ prompt: opts.prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: opts.aspectRatio || '1:1',
      outputMimeType: 'image/png'
    }
  };

  logDebug('ImageProvider:imagen4 start', 'aspect=' + (opts.aspectRatio || '1:1'));
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  var text = resp.getContentText();
  logDebug('ImageProvider:imagen4 resp', 'code=' + code);

  if (code !== 200) {
    throw new Error('Imagen 4 ' + code + ': ' + text.substring(0, 300));
  }

  var json;
  try { json = JSON.parse(text); } catch (e) { throw new Error('Imagen 4: invalid JSON'); }

  if (!json.predictions || !json.predictions.length) {
    throw new Error('Imagen 4: ' + (json.error ? json.error.message : 'no predictions'));
  }

  var base64 = json.predictions[0].bytesBase64Encoded;
  var name = opts.outputName || ('avatar_' + new Date().getTime() + '.png');
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), 'image/png', name);
  return ImageProvider_saveToDrive_(blob, opts.outputFolder);
}

/**
 * image-to-image: Nano Banana (gemini-2.5-flash-image)
 */
function ImageProviderGoogle_nanoBanana_(opts, apiKey) {
  var base64 = Utilities.base64Encode(opts.referenceBlob.getBytes());
  var mime = opts.referenceBlob.getContentType() || 'image/png';

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' + apiKey;
  var payload = {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: opts.prompt }
      ]
    }],
    generationConfig: {
      responseModalities: ['IMAGE']
    }
  };

  logDebug('ImageProvider:nanoBanana start', 'refMime=' + mime);
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  var text = resp.getContentText();
  logDebug('ImageProvider:nanoBanana resp', 'code=' + code);

  if (code !== 200) {
    throw new Error('Nano Banana ' + code + ': ' + text.substring(0, 300));
  }

  var json = JSON.parse(text);
  var parts = json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts;
  if (!parts) throw new Error('Nano Banana: no content');

  var imgPart = null;
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].inlineData && parts[i].inlineData.data) { imgPart = parts[i]; break; }
  }
  if (!imgPart) {
    var fr = json.candidates && json.candidates[0] && json.candidates[0].finishReason;
    if (fr === 'IMAGE_SAFETY' || fr === 'SAFETY') {
      throw new Error('SAFETY: 画像生成セーフティでブロック');
    }
    throw new Error('Nano Banana: no image in response');
  }

  var name = opts.outputName || ('img_' + new Date().getTime() + '.png');
  var outBlob = Utilities.newBlob(
    Utilities.base64Decode(imgPart.inlineData.data),
    imgPart.inlineData.mimeType || 'image/png',
    name
  );
  return ImageProvider_saveToDrive_(outBlob, opts.outputFolder);
}
