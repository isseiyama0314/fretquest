# FRET QUEST push server

「まだ練習していない日だけ」通知するための Cloudflare Worker です。無料枠で動きます。

## 仕組み

- アプリは、練習した日付と連続日数が変わったときだけ `/sync` に送ります。練習内容そのものは送りません。
- Cron が15分ごとに動き、利用者のタイムゾーンでの現在時刻を確認します。
  - **設定時刻〜2時間以内**で、今日まだ練習していなければ通知します（1日1回）。
  - 連続記録が今夜で途切れる日は、**22:00** にもう一度通知します。設定時刻が21:00より後の場合は送りません。
- 購読データは KV に保存します。上限は20件です（個人利用向け）。期限切れの購読（404/410）は自動で削除します。
- iPhone で受け取れるのは、iOS 16.4 以降でホーム画面に追加したアプリからだけです。

## デプロイ手順（初回のみ、約30分）

1. Cloudflare の無料アカウントを作ります。
2. このフォルダでログインします。
   ```sh
   cd push-server
   npx wrangler login
   ```
3. KV を作り、表示された `id` を `wrangler.toml` の `REPLACE_WITH_KV_NAMESPACE_ID` に貼ります。
   ```sh
   npx wrangler kv namespace create SUBS
   ```
4. VAPID 鍵を作って登録します。秘密鍵はリポジトリにコミットしないでください。
   ```sh
   node gen-vapid.mjs
   npx wrangler secret put VAPID_PUBLIC_KEY   # 表示された公開鍵を貼る
   npx wrangler secret put VAPID_PRIVATE_KEY  # 表示された秘密鍵を貼る
   ```
5. デプロイします。表示された `https://fretquest-push.<名前>.workers.dev` を控えます。
   ```sh
   npx wrangler deploy
   ```
6. リポジトリ直下の `push.js` の先頭2行を埋めて、サイトを公開し直します。
   ```js
   const PUSH_SERVER='https://fretquest-push.<名前>.workers.dev';
   const VAPID_PUBLIC_KEY='<手順4の公開鍵>';
   ```
   Service Worker がファイルをキャッシュしているので、同時に `index.html` と `sw.js` の `?v=...` と `sw.js` の `VERSION` を新しい値に変えてください。変えないと、古い（空の設定の）`push.js` が表示され続けます。
7. ホーム画面のアプリで「毎日リマインダー」→「プッシュ通知をオンにする」を押します。

公開サイトのドメインが `https://isseiyama0314.github.io` 以外になったら、`wrangler.toml` の `ALLOWED_ORIGIN` を変えてください。

## テスト

```sh
cd push-server && npm test
```

通知を出すかどうかの判定、API の入力チェック、RFC 8291 の暗号化（node:crypto による別実装で復号して確認）、VAPID 署名を検証します。実際の Apple/Google のプッシュサービスへの送信は、デプロイ後に実機で確認してください。
