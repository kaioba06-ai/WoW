// ============================================================
// 画像生成API 抽象化レイヤー
// ============================================================
//
// 使い方:
//   var result = ImageProvider_generate({
//     prompt: '...',
//     referenceBlob: blob,        // 省略可（image-to-image時に指定）
//     aspectRatio: '1:1',          // 省略可
//     outputName: 'avatar.png',    // 省略可
//     outputFolder: 'WoW_Avatars'  // 省略可
//   });
//   // result = { url: 'https://...', fileId: '...' }
//
// プロバイダ切替:
//   Script Properties の IMAGE_PROVIDER で指定（デフォルト: 'google'）
//   将来 'openai' 等を追加可能
//
// 設計意図:
//   業務ロジック(コード.js)は具体的なAPIを知らない。
//   モデルが移り変わっても、プロバイダ実装を1つ追加するだけで切替できる。
// ============================================================

var IMAGE_PROVIDER_DEFAULT_FOLDER = 'WoW_Avatars';

/**
 * 画像生成の統一エントリポイント
 * @param {Object} opts
 * @param {string} opts.prompt 必須。生成指示テキスト
 * @param {Blob} [opts.referenceBlob] 参照画像。指定するとimage-to-imageモード
 * @param {string} [opts.aspectRatio] '1:1' | '9:16' | '16:9' 等。デフォルト '1:1'
 * @param {string} [opts.outputName] 出力ファイル名。省略時は自動生成
 * @param {string} [opts.outputFolder] Drive 出力先フォルダ名。デフォルト 'WoW_Avatars'
 * @return {{url: string, fileId: string}}
 */
function ImageProvider_generate(opts) {
  if (!opts || !opts.prompt) {
    throw new Error('ImageProvider_generate: prompt is required');
  }
  var name = ImageProvider_currentName_();
  if (name === 'google') {
    return ImageProviderGoogle_generate(opts);
  }
  // 将来追加: openai, flux, etc.
  throw new Error('ImageProvider: unknown provider "' + name + '"');
}

/**
 * 現在使用中のプロバイダ名
 * Script Properties の IMAGE_PROVIDER を参照、未設定なら 'google'
 */
function ImageProvider_currentName_() {
  var p = PropertiesService.getScriptProperties().getProperty('IMAGE_PROVIDER');
  return p || 'google';
}

/**
 * 生成済み画像Blobを Drive に保存し、共有URLを返す共通ヘルパー
 * @param {Blob} blob 画像Blob
 * @param {string} [folderName] 出力先フォルダ名
 * @return {{url: string, fileId: string}}
 */
function ImageProvider_saveToDrive_(blob, folderName) {
  var fn = folderName || IMAGE_PROVIDER_DEFAULT_FOLDER;
  var folders = DriveApp.getFoldersByName(fn);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(fn);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    url: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
    fileId: file.getId()
  };
}
