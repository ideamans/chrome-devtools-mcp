# CLAUDE.md（ideamans fork）

このリポジトリは [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) の fork。
開発の規約・コマンドは upstream の `AGENTS.md` に従う（GN + Ninja のビルド、`npm run gen` での生成物の更新など）。
ここには fork 固有のことだけを書く。

## ブランチ

| ブランチ        | 中身                                                                       |
| --------------- | -------------------------------------------------------------------------- |
| `main`          | upstream と同じ（自社の変更を載せない。Dependabot のアラートはここに出る） |
| `ideamans-fork` | upstream の最新 ＋ 自社の変更。**npm へはこのブランチから公開する**        |

## 自社の変更（upstream との差分）

1. `performance_analyze_file` ツール（`src/tools/performance.ts`）。手元のトレースファイル（`trace.json` / `trace.json.gz`、
   Lighthouse の `*.trace.json` など）を読み、`performance_stop_trace` と同じ要約を返す。
   読んだトレースは記録されるので、続けて `performance_analyze_insight` が使える。
   upstream へは提案したが採用されていない（ChromeDevTools/chrome-devtools-mcp#639、2026-02 に stale で close。
   `performance_start_trace` に引数で持たせる案を求められた）
2. パッケージ名を `ideamans-chrome-devtools-mcp` に変更（`package.json` / `package-lock.json`）。
   コマンド名（bin）は upstream と同じ `chrome-devtools-mcp`。版も upstream に合わせる

## 利用者

pagespeed-quest / pagespeed-rehearsal のテンプレートの `.mcp.json` が `npx ideamans-chrome-devtools-mcp@latest` で呼ぶ。
**公開した版はすぐ利用者に届く**。

## upstream への追従

upstream の最新に自社のコミットを載せ直す（rebase）。衝突したら、生成物（`docs/tool-reference.md`、
`src/config/cli-options.ts`、`src/telemetry/*.json`）は upstream 側を取ってから `npm run gen` で作り直す。

```bash
git fetch upstream
git checkout -b sync/<日付> upstream/main
git cherry-pick $(git rev-list --reverse --first-parent --no-merges upstream/main..origin/ideamans-fork)
npm ci && npm run gclient-sync && npm run bundle
npm run test                           # performance_analyze_file のテストは tests/tools/performance.test.ts
npm run gen && npm run check-format
git merge -s ours origin/ideamans-fork  # ideamans-fork へ早送りでマージできるようにする（中身は変えない）
```

PR は `ideamans-fork` 宛てに作る（fork なので `gh pr create --repo ideamans/chrome-devtools-mcp --base ideamans-fork`）。
CI が通ったら、GitHub のマージボタンではなく**早送りで push する**（`git push origin <ブランチ>:ideamans-fork`。PR は merged になる）。
こうすると `--first-parent` で辿ったときに自社のコミットだけが upstream の上に並び、次の追従で上の `rev-list` がそのまま使える。

upstream のワークフローのうち `release-please.yml` / `publish-to-npm-on-tag.yml` / `publish-to-mcp-registry-on-tag.yml` /
`pre-release.yml` は fork では使わない（main や upstream のタグで動き、upstream の名前で出そうとして失敗する）。

## npm への公開

`v*` のタグを push すると `.github/workflows/ideamans-publish.yml` が動き、**そのまま公開する**（承認待ちにしない）。

```bash
git checkout ideamans-fork && git pull
node -p "require('./package.json').version"   # 版は upstream に合わせる。これが npm に無い版であること
git tag v1.12.0 && git push origin v1.12.0
```

1. タグと package.json の version が違えば落ちる。name が `ideamans-chrome-devtools-mcp` でなくても落ちる（upstream の版を出さない）
2. npm に同じ版があれば何もしない
3. `npm run bundle` → `npm run verify-npm-package` → tarball を空のプロジェクトに入れて MCP を起動し、
   `tools/list` に `performance_analyze_file` があるか確かめる（`scripts/ideamans-smoke.mjs`）
4. `npm publish`（Trusted Publishing・OIDC。provenance は自動）

upstream のタグは `chrome-devtools-mcp-vX.Y.Z` の形なので `v*` とはぶつからない。
タグを打ち直さずに出し直すときは Actions から workflow_dispatch で `ideamans-fork` を選んで起動する。
PR でこのワークフローを変えたときは、公開せずに tarball の確認までが走る。

package.json の `repository` は `ideamans/chrome-devtools-mcp` に替えてある（upstream は ChromeDevTools を指す）。provenance の検証で
このリポジトリと照合され、違うと公開が `E422` で落ちる。upstream を取り込むときに戻さないこと（ワークフローが検査する）。

**`npm run build` の出力を公開しない。** 依存を同梱しないので起動しない（0.21.0 がそうで、`ERR_MODULE_NOT_FOUND` で落ちる）。
手元から出すことはしない（トークンは置かない。Trusted Publishing のみ）。

前提: npmjs.com の ideamans-chrome-devtools-mcp の設定で、Trusted Publisher に GitHub Actions・`ideamans/chrome-devtools-mcp`・
ワークフロー `ideamans-publish.yml`・権限 **publish** を登録してあること（stage publish の権限だけだと `npm publish` は
`E403 OIDC permission denied` になる）。
