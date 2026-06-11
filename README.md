# LOGS

Vue 3 + Viteで実装している体重ログアプリです。

## Web/PWA 開発

```bash
npm install
npm run dev
```

## Web/PWA ビルド

```bash
npm run build
```

`dist/` がViteのビルド出力です。

## iOS / Capacitor

このリポジトリ内でCapacitorを使ってiOSアプリ化します。

前提:

- Xcode
- CocoaPods
- Node.js 20系ではCapacitor 7系を使用

現在の仮設定:

- appName: `LOGS`
- appId: `com.kosazayousuke.logs`
- webDir: `dist`

`appId` はApp Store提出前に、Apple Developer / App Store Connectで使うBundle IDに合わせて変更してください。

初回セットアップ:

```bash
npm install
npm run build
npx cap add ios
npx cap sync ios
```

`xcode-select` がCommand Line Toolsを指している場合、`npx cap sync ios` が失敗します。
Xcodeをインストールした後、必要に応じて次を実行してください。

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

通常の同期:

```bash
npm run cap:sync:ios
```

Xcodeで開く:

```bash
npm run cap:open:ios
```

iOSアイコン / スプラッシュ生成:

```bash
npm run cap:assets:ios
```

元画像:

- `resources/icon.png`: 1024 x 1024px
- `resources/splash.png`: 2732 x 2732px

画像を差し替えた場合は `npm run cap:assets:ios` を実行し、Xcodeで再ビルドしてください。

Git管理方針:

- `ios/` はGit管理対象です。
- `node_modules/`, `dist/`, `Pods/`, `DerivedData/`, `xcuserdata/` はGit管理しません。
