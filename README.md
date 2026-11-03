# Cueflow Releases

Cueflow（Windows x64）の配布用リポジトリです。ここには配布物と更新情報だけを置きます。ソースコードは含みません。

## ダウンロード

[Releases](https://github.com/ringo-regijz-toe/cueflow-releases/releases/latest) の最新版から、どちらかを選んでください。

| ファイル | 内容 |
| --- | --- |
| `Cueflow_<版>_x64-setup.exe` | インストーラー版（ユーザー単位でインストール。管理者権限は不要） |
| `Cueflow_<版>_windows-x64.zip` | Portable版（展開したフォルダで使う。Projectは `Data\Projects\` に保存） |

各Releaseには次のファイルもあります。

- `*.sig`: アプリ内アップデートが確かめる署名
- `latest.json`: アプリ内アップデートが読む更新情報
- `manifest.json`: 版・ビルド元のcommit・各ファイルのサイズとSHA-256
- `SHA256SUMS.txt`: Releaseの全ファイルのSHA-256
- `release-notes.md`: リリースノート

## アプリ内アップデート

Cueflowは起動時に新しい版を確認し、内容を表示します。「今すぐ更新」を選ぶまでインストールしません。更新ファイルはアプリに組み込まれた公開鍵で署名を確認してから使います。Project・音源・設定は更新で変わりません。

## 注意

配布物はコード署名（Authenticode）されていないため、SmartScreenの警告やSmart App Controlによる実行拒否が起きる場合があります。Windowsの保護機能を無効にしないでください。
