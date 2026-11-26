# エリア判定API (PHP / MySQL)

GPS座標を受け取り、MySQLに登録したポリゴンの中に現在地があるかを判定します。地図APIを呼び出すのは管理者が境界を用意するときで、判定API自体は保存済み境界で照合するため、リクエストのたびに地図APIを呼ぶ必要はありません。

## セットアップ

1. phpMyAdminで利用するMySQLサーバーにログインします。
2. 左側に表示される、自分のユーザーに割り当てられたデータベースを選びます。データベース自体を作成できない環境では、`CREATE DATABASE` は実行しません。
3. 新規に構築する場合は、選択したデータベースの「インポート」から `backend/database/schema.sql` を選択して実行します。すでに湘南テストエリアを入れている場合は、代わりに `backend/database/update-osaka-kobe.sql` をインポートして、エリアと駅データを大阪〜神戸の設定に置き換えます。
4. `backend/.env.example` を `backend/.env` にコピーして、`DB_USER` と `DB_PASSWORD` をローカルMySQLのログイン情報に書き換えます。ローカルphpMyAdminで選択したDB名は `kyamagata` なので、別のDBを使う場合だけ `DB_NAME` を変更します。

```sh
cp backend/.env.example backend/.env
```

`backend/.env` はGit管理対象外で、公開フォルダ `backend/public` の外に置かれます。パスワードをGitHubへコミットしないでください。

5. Homebrew Apacheは `backend/public` を `http://localhost:8080/` として配信します。phpMyAdminは `http://localhost:8080/phpMyAdmin/` から開けます。

phpMyAdminはDBを操作する画面です。PHP APIは `backend/.env` の設定でMySQLへ直接接続します。

## 判定リクエスト

```sh
curl -X POST http://localhost:8080/api/areas/check.php \
  -H 'Content-Type: application/json' \
  -d '{"latitude":35.301,"longitude":139.481}'
```

判定成功時は `status: "matched"`、分類結果を `message` と `musicContext` に返します。範囲外は `status: "out_of_area"` と `message: "登録エリア外"` を返します。

## エリア境界の登録

`areas.boundary` は `[経度, 緯度]` の頂点を並べたJSON配列です。3点以上で閉じたポリゴンとして登録してください。境界上の点は範囲内として扱います。重なったエリアは `priority` の高い順に評価します。

## 大阪〜神戸の判定ルール

- 登録した駅の中心から400m以内なら「駅近」。
- 駅周辺でなく、舞洲から大阪湾沿岸〜神戸の概略ポリゴン内なら「海沿い」。
- 上記以外でも大阪・神戸の市街地ポリゴン内なら「市街地」。範囲外は「登録エリア外」。
- 優先順は「駅近」→「海沿い」→「市街地」です。梅田駅の近くは「駅近」、駅から離れた梅田の街中は「市街地」になります。

境界と駅座標は試作用の概算値です。実際の海岸線や駅からの距離に厳密に合わせる場合は、地図データで範囲・座標を調整してください。駅を追加する場合は `stations` テーブルに緯度・経度と判定半径（メートル）を登録します。
