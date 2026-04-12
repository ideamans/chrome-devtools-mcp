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
git cherry-pick <自社のコミット>        # git log upstream/main..origin/ideamans-fork で確かめる
npm ci && npm run gclient-sync && npm run bundle
npm run test                           # performance_analyze_file のテストは tests/tools/performance.test.ts
npm run gen && npm run check-format
git merge -s ours origin/ideamans-fork  # ideamans-fork へ早送りでマージできるようにする（中身は変えない）
```

PR は `ideamans-fork` 宛てに作る（fork なので `gh pr create --repo ideamans/chrome-devtools-mcp --base ideamans-fork`）。
