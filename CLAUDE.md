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
   `performance_start_trace` に引数で持たせる案を求められた）。
   2026-11-10 に確かめた時点でも upstream（main・1.13.0 のリリース PR #3349 まで）に同等のもの（ファイルを入力に取る
   ツール・引数・CLI のフラグ）は無い。`performance_*_trace` の `filePath` は**保存先**で、読み込みではない。
   **この fork の存在理由はこのツールだけ**。upstream に入ったら fork をやめて upstream ＋脆弱性対応だけに戻す
2. パッケージ名を `ideamans-chrome-devtools-mcp` に変更（`package.json` / `package-lock.json`）。
   bin は upstream の `chrome-devtools-mcp` / `chrome-devtools` に加え、パッケージと同名の `ideamans-chrome-devtools-mcp` を足してある
   （無いと `npx ideamans-chrome-devtools-mcp@latest` が「could not determine executable to run」で起動しない。1.12.0 がそうだった）。
   `repository` も ideamans を指す（後述）。版は `<upstream の版>-i.<n>`（下の「版」）
3. `package.json` の `overrides` の `minimatch@^10.0.0`（脆弱性対策・開発用の依存だけ）。下の「脆弱性」を参照
4. 更新の確認（`src/bin/check-latest-version.ts` ほか）は upstream の `chrome-devtools-mcp` ではなく
   `ideamans-chrome-devtools-mcp` の latest と比べる。キャッシュも `~/.cache/ideamans-chrome-devtools-mcp/` に分けてある。
   upstream のままだと `1.12.0-i.1 < 1.12.0` なので、起動のたびに「upstream の chrome-devtools-mcp を入れろ」と出る
5. README の冒頭の fork の注記、`scripts/ideamans-*.mjs`、`.github/workflows/ideamans-publish.yml`

## 版（2026-11-10〜）

**`<upstream の版>-i.<n>`**（例 `1.12.0-i.1`）。upstream の版は `.release-please-manifest.json` から取る
（fork では編集しないので、載せ直した upstream のリリースの版を指す。リリース後の main の変更も含むことはある）。
`n` は同じ upstream の版の上での自社の改版で、1 から数える。upstream の版が変わったら 1 に戻る。

```bash
node scripts/ideamans-version.mjs bump    # 次の版へ（package.json・package-lock.json・src/version.ts を揃えて書く）
node scripts/ideamans-version.mjs check   # 揃っているか・upstream の版に基づくか（公開のワークフローも走らせる）
```

`src/version.ts` の `VERSION` は `--version` と MCP の serverInfo に出る。upstream では release-please が上げるが fork では
動かないので、上のスクリプトで package.json と一緒に書く（1.12.1 は 1.12.0 と名乗っていた）。

npm の上での注意（**エージェントが間違えやすい**）:

- `-i.N` は semver の prerelease なので、`^1.12.0` のような範囲指定には**一致しない**。利用者は `@latest` か版の完全指定で使う
- npm は prerelease を `--tag` 無しでは公開しない。ワークフローは `npm publish --tag latest` で出す（明示すれば、
  semver でより大きい版が既にあっても latest になる）
- `1.12.0-i.1 < 1.12.0 < 1.12.1`。この方式の前に出した `1.12.0`（bin が無く npx で起動しない）と `1.12.1` は
  deprecate してある。upstream が 1.13.0 を出せば `1.13.0-i.1` は両方より大きくなるので、並びの問題はそこで消える

## 利用者

pagespeed-quest / pagespeed-rehearsal のテンプレートの `.mcp.json` が `npx ideamans-chrome-devtools-mcp@latest` で呼ぶ。
**公開した版はすぐ利用者に届く**。

1.12 から、ファイルを読み書きするツール（`performance_analyze_file` を含む）は MCP の roots の中だけに限られる。
Claude Code は roots にプロジェクトのフォルダを渡すので、`inventory/artifacts/lighthouse-0.trace.json` はそのまま読める
（2026-11-10 に確認）。roots を渡さないクライアントでは OS の一時フォルダしか読めないので、`--workspace=<フォルダ>` を足す
（`--allow-unrestricted-paths` は非推奨）。

## 脆弱性

公開する tarball には依存が無い（`dependencies` が空で、必要なものは `npm run bundle` で同梱する）。
Dependabot のアラートはすべて開発・ビルド用の依存のもので、利用者には届かない。

- `.npmrc` の `min-release-age=7`（upstream の方針）で、公開から7日未満の版は入らない。`npm audit fix` が直さないときはまずこれを疑う
- `minimatch@^10.0.0` → `^11.0.4`: GHSA-g3hv-75wg-m249。eslint 10 と typescript-eslint 8 が `^10` を固定しているため override。
  upstream がそれぞれ minimatch 11 へ上げたら外す
- 直していないもの（2026-11-10）: deepmerge（GHSA-gcqx-w48m-w2h4、修正版が無い。rollup のプラグイン経由のビルド時だけ）、
  glob 13（GHSA-3g3m-2fjr-6pw4、lighthouse → @sentry/node → @sentry/bundler-plugins。@sentry/node 11.11.0 で直るが
  公開から7日経っていない。2026-11-12 以降に `npm update @sentry/node` で消える）

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
node scripts/ideamans-version.mjs bump  # upstream の版が変わっていれば <新しい版>-i.1 になる
git merge -s ours origin/ideamans-fork  # ideamans-fork へ早送りでマージできるようにする（中身は変えない）
```

upstream のリリースのコミットは `package.json` / `package-lock.json` / `src/version.ts` の版を書き換えるので、
自社の版のコミットと衝突する。upstream 側を取ってから `bump` で書き直せばよい。
`.release-please-manifest.json` は upstream のまま触らない（版の基準なので）。
upstream の版が変わったのに `bump` を忘れると、PR の ideamans publish が `check` で落ちる。

PR は `ideamans-fork` 宛てに作る（fork なので `gh pr create --repo ideamans/chrome-devtools-mcp --base ideamans-fork`）。
CI が通ったら、GitHub のマージボタンではなく**早送りで push する**（`git push origin <ブランチ>:ideamans-fork`。PR は merged になる）。
こうすると `--first-parent` で辿ったときに自社のコミットだけが upstream の上に並び、次の追従で上の `rev-list` がそのまま使える。

upstream のワークフローのうち `release-please.yml` / `publish-to-npm-on-tag.yml` / `publish-to-mcp-registry-on-tag.yml` /
`pre-release.yml` は fork では使わない（main や upstream のタグで動き、upstream の名前で出そうとして失敗する）。

## npm への公開

`v<版>` のタグ（`v*-i.*` に一致するもの。例 `v1.12.0-i.1`）を push すると `.github/workflows/ideamans-publish.yml` が動き、
**そのまま公開する**（承認待ちにしない）。版は先に PR で上げておく（`node scripts/ideamans-version.mjs bump`）。

```bash
git checkout ideamans-fork && git pull
node scripts/ideamans-version.mjs check        # 揃っていること
node -p "require('./package.json').version"    # これが npm に無い版であること
git tag v1.12.0-i.1 && git push origin v1.12.0-i.1
npm view ideamans-chrome-devtools-mcp dist-tags   # 数分後、latest がこの版になっていること
```

1. タグと package.json の version が違えば落ちる。name が `ideamans-chrome-devtools-mcp` でなくても落ちる（upstream の版を出さない）。
   `ideamans-version.mjs check` が通らなければ落ちる
2. npm に同じ版があれば何もしない
3. `npm run bundle` → `npm run verify-npm-package` → tarball を空のプロジェクトに入れて MCP を起動し、
   `--version` と serverInfo が package.json の版か、`tools/list` に `performance_analyze_file` があるか確かめる
   （`scripts/ideamans-smoke.mjs`）
4. `npm publish --tag latest`（Trusted Publishing・OIDC。provenance は自動）

古い版を deprecate するのは手元から（2FA が要るので人が打つ）。版は範囲ではなく1つずつ完全に書く
（`npm deprecate` は prerelease も含めて照合するので、範囲だと `-i.N` まで巻き込むことがある）。

upstream のタグは `chrome-devtools-mcp-vX.Y.Z` の形なので `v*-i.*` とはぶつからない。
タグを打ち直さずに出し直すときは Actions から workflow_dispatch で `ideamans-fork` を選んで起動する。
PR でこのワークフロー・`package.json`・`src/version.ts`・`.release-please-manifest.json`・`scripts/ideamans-*.mjs` を
変えたときは、公開せずに tarball の確認までが走る（upstream の追従の PR もこれに当たる）。

package.json の `repository` は `ideamans/chrome-devtools-mcp` に替えてある（upstream は ChromeDevTools を指す）。provenance の検証で
このリポジトリと照合され、違うと公開が `E422` で落ちる。upstream を取り込むときに戻さないこと（ワークフローが検査する）。

**`npm run build` の出力を公開しない。** 依存を同梱しないので起動しない（0.21.0 がそうで、`ERR_MODULE_NOT_FOUND` で落ちる）。
手元から出すことはしない（トークンは置かない。Trusted Publishing のみ）。

前提: npmjs.com の ideamans-chrome-devtools-mcp の設定で、Trusted Publisher に GitHub Actions・`ideamans/chrome-devtools-mcp`・
ワークフロー `ideamans-publish.yml`・権限 **publish** を登録してあること（stage publish の権限だけだと `npm publish` は
`E403 OIDC permission denied` になる）。
