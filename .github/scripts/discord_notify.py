#!/usr/bin/env python3
"""PR の動きを Discord のフォーラムチャンネルへ通知する（GitHub Actions 用・標準ライブラリのみ）。

- 1 PR = フォーラムの 1 投稿（スレッド）。スレッド ID は PR に付けるコメント
  （`<!-- discord-thread:ID -->` 入り）に保存し、以降のイベントはそのスレッドへ返信する。
- マージ/クローズは通知を流さず、最初の投稿へのリアクションとタグの付け替えで表す。
- 毎朝のまとめは「毎朝のまとめ」という固定の投稿（ピン留め）に返信する。

ワークフローは .github/workflows/discord-notify.yml。仕様は docs/Discord通知仕様書.md。
DRY_RUN=1 にすると Discord と GitHub への書き込みをせず、送る内容を表示するだけになる。
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

REPO = os.environ.get("GITHUB_REPOSITORY", "aiuhehe/eft-companion")
OWNER = REPO.split("/")[0]
GH_TOKEN = os.environ.get("GITHUB_TOKEN", "")
BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
FORUM_ID = os.environ.get("DISCORD_FORUM_CHANNEL_ID", "").strip()
MENTION_ID = os.environ.get("DISCORD_MENTION_USER_ID", "").strip()
DRY_RUN = os.environ.get("DRY_RUN") == "1"

# ── 設定 ──────────────────────────────────────────
DISCUSS_LABEL = "needs-discussion"  # この GitHub ラベルが付いたらメンション＋Discord タグ「要検討」
SCHEDULE_LABEL = "event"      # スケジュールタスクの PR に付くラベル（ブランチ event/* も同扱い）
STALE_DAYS = 3                # まとめで「放置」と強調する日数（最終更新から）
DIGEST_THREAD_NAME = "毎朝のまとめ"
MARKER = "<!-- discord-thread:"

# フォーラムのタグ名（Discord 側で同名のタグを作っておく。無いタグは無視される）
TAG_SCHEDULE = "スケジュール"
TAG_DISCUSS = "要検討"
TAG_MERGED = "マージ済み"
TAG_CLOSED = "クローズ"

REACTIONS = {"merged": "✅", "closed": "❌"}

# 色は「状態」だけを表す（PR の出どころでは色を変えない）
COLORS = {
    "open": 0x5865F2,     # 青: 進行中
    "discuss": 0xF0883E,  # オレンジ: 相談が必要（needs-discussion）
    "danger": 0xED4245,   # 赤: 問題あり（修正依頼・CI 失敗・放置）
    "ok": 0x57F287,       # 緑: 良い・完了（承認・マージ・公開）
    "neutral": 0x99AAB5,  # 灰: 中立・終了（コメント・クローズ）
}

TAB_FILES = {
    "20-tab-status": "設定", "21-tab-advisor": "トレーダー解放", "22-tab-hideout": "ハイドアウト",
    "23-tab-barter": "欲しいものリスト", "24-tab-tasks": "タスク検索", "25-tab-items": "アイテム一覧",
    "26-tab-ocr": "在庫(OCR)", "27-tab-journal": "日誌", "29-tab-event": "イベント",
    "30-tab-ammo": "弾薬", "31-tab-keys": "鍵一覧", "32-tab-wipeflow": "プラン",
    "33-tab-armor": "アーマープレート", "33-tab-presets": "武器プリセット", "33-tab-raid": "出撃準備",
    "34-tab-maps": "マップ",
}
WEEKDAYS = "月火水木金土日"
JST = timezone(timedelta(hours=9))


def log(*a):
    print(*a, flush=True)


def trim(s, n):
    s = s or ""
    return s if len(s) <= n else s[: n - 1] + "…"


# ── HTTP ──────────────────────────────────────────
def http(method, url, headers, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    for _ in range(5):
        req = urllib.request.Request(url, data=data, method=method, headers=dict(headers))
        if data is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req) as r:
                raw = r.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            text = e.read().decode("utf-8", errors="replace")
            if e.code == 429:
                try:
                    wait = float(json.loads(text).get("retry_after", 1))
                except ValueError:
                    wait = 1.0
                time.sleep(wait + 0.2)
                continue
            raise RuntimeError(f"{method} {url} -> HTTP {e.code}: {text[:500]}") from None
    raise RuntimeError(f"{method} {url} -> rate limited")


def gh(method, path, body=None):
    if DRY_RUN and method != "GET":
        log(f"[dry-run] GitHub {method} {path}\n{json.dumps(body, ensure_ascii=False, indent=2)}")
        return {}
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "eft-companion-discord-notify",
    }
    if GH_TOKEN:
        headers["Authorization"] = f"Bearer {GH_TOKEN}"
    return http(method, "https://api.github.com" + path, headers, body)


def gh_paged(path, limit=500):
    sep = "&" if "?" in path else "?"
    out, page = [], 1
    while len(out) < limit:
        chunk = gh("GET", f"{path}{sep}per_page=100&page={page}") or []
        out.extend(chunk)
        if len(chunk) < 100:
            break
        page += 1
    return out


def dc(method, path, body=None):
    if DRY_RUN:
        log(f"[dry-run] Discord {method} {path}")
        if body is not None:
            log(json.dumps(body, ensure_ascii=False, indent=2))
        if method == "GET" and path == f"/channels/{FORUM_ID}":
            names = [TAG_SCHEDULE, TAG_DISCUSS, TAG_MERGED, TAG_CLOSED]
            return {"guild_id": "GUILD", "available_tags": [{"id": f"tag:{n}", "name": n} for n in names]}
        if method == "POST" and path.endswith("/threads"):
            return {"id": "DRYRUN_THREAD", "guild_id": "GUILD"}
        if method == "GET":
            return {"threads": []}
        return {}
    headers = {
        "Authorization": f"Bot {BOT_TOKEN}",
        "User-Agent": f"DiscordBot (https://github.com/{REPO}, 1.0)",
    }
    return http(method, "https://discord.com/api/v10" + path, headers, body)


# ── Discord ヘルパー ───────────────────────────────
_forum = None


def forum():
    global _forum
    if _forum is None:
        _forum = dc("GET", f"/channels/{FORUM_ID}") or {}
    return _forum


def tag_ids(names):
    tags = {t["name"]: t["id"] for t in forum().get("available_tags", [])}
    missing = [n for n in names if n not in tags]
    if missing:
        log(f"::warning::フォーラムにタグがありません: {', '.join(missing)}")
    return [tags[n] for n in names if n in tags][:5]


def thread_link(tid):
    return f"https://discord.com/channels/{forum().get('guild_id', '@me')}/{tid}"


def mentions(on):
    return {"parse": [], "users": [MENTION_ID] if on and MENTION_ID else []}


def post(tid, content=None, embed=None, mention=False):
    body = {"allowed_mentions": mentions(mention)}
    if mention and MENTION_ID:
        content = f"<@{MENTION_ID}> " + (content or "")
    if content:
        body["content"] = content
    if embed:
        body["embeds"] = [embed]
    dc("POST", f"/channels/{tid}/messages", body)


# ── PR の判定 ─────────────────────────────────────
def labels_of(pr):
    return {l["name"] for l in pr.get("labels", [])}


def is_schedule(pr):
    """スケジュールタスク（毎日のイベント更新チェック）が作った PR か。"""
    return SCHEDULE_LABEL in labels_of(pr) or pr["head"]["ref"].startswith("event/")


def pr_state(pr):
    if pr["state"] != "closed":
        return None
    return "merged" if pr.get("merged_at") else "closed"


def state_color(pr):
    state = pr_state(pr)
    if state == "merged":
        return COLORS["ok"]
    if state == "closed":
        return COLORS["neutral"]
    if DISCUSS_LABEL in labels_of(pr):
        return COLORS["discuss"]
    return COLORS["open"]


def desired_tags(pr):
    names = []
    if is_schedule(pr):
        names.append(TAG_SCHEDULE)
    if DISCUSS_LABEL in labels_of(pr):
        names.append(TAG_DISCUSS)
    state = pr_state(pr)
    if state == "merged":
        names.append(TAG_MERGED)
    elif state == "closed":
        names.append(TAG_CLOSED)
    return tag_ids(names)


def touched_areas(n):
    areas = []
    for f in gh_paged(f"/repos/{REPO}/pulls/{n}/files", limit=300):
        p = f["filename"]
        m = re.match(r"src/js/([^/]+)\.js$", p)
        if m:
            name = TAB_FILES.get(m.group(1), "共通処理")
        elif p == "style.css":
            name = "スタイル"
        elif p.startswith("docs/") or p.endswith(".md"):
            name = "ドキュメント"
        elif p.startswith(".github/"):
            name = "GitHub Actions"
        else:
            name = "その他"
        if name not in areas:
            areas.append(name)
    return areas


def clean_body(text):
    text = re.sub(r"<!--.*?-->", "", text or "", flags=re.S)
    text = re.sub(r"^.*Generated with \[Claude Code\].*$", "", text, flags=re.M)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def starter_message(pr):
    n = pr["number"]
    fields = [
        {"name": "変更", "value": f"+{pr['additions']} / -{pr['deletions']}（{pr['changed_files']} ファイル）", "inline": True},
    ]
    areas = touched_areas(n)
    if areas:
        fields.append({"name": "触った場所", "value": trim("・".join(areas), 1000), "inline": False})
    m = re.match(r"^[^/]+/(\d+)-", pr["head"]["ref"])
    if m:
        num = m.group(1)
        fields.append({"name": "Issue", "value": f"[#{num}](https://github.com/{REPO}/issues/{num})", "inline": True})
    fields.append({"name": "ブランチ", "value": f"`{pr['head']['label']}` → `{pr['base']['ref']}`", "inline": False})
    discuss = DISCUSS_LABEL in labels_of(pr)
    embed = {
        "title": trim(f"#{n} {pr['title']}", 256),
        "url": pr["html_url"],
        "description": trim(clean_body(pr.get("body")), 600),
        "color": state_color(pr),
        "author": {"name": pr["user"]["login"], "url": pr["user"]["html_url"], "icon_url": pr["user"]["avatar_url"]},
        "fields": fields,
        "timestamp": pr["created_at"],
    }
    notes = [x for x in ("スケジュールタスク" if is_schedule(pr) else None,
                         "ドラフト" if pr.get("draft") else None,
                         "要検討" if discuss else None) if x]
    content = "新しい PR" + (f"（{'・'.join(notes)}）" if notes else "")
    if discuss and MENTION_ID:
        content = f"<@{MENTION_ID}> {content}"
    return {"content": content, "embeds": [embed], "allowed_mentions": mentions(discuss)}


# ── スレッドの作成・検索・同期 ─────────────────────
def fetch_pr(n):
    return gh("GET", f"/repos/{REPO}/pulls/{n}")


def find_thread(n):
    for c in gh_paged(f"/repos/{REPO}/issues/{n}/comments"):
        body = c.get("body") or ""
        if MARKER in body and c["user"]["login"] == "github-actions[bot]":
            return body.split(MARKER, 1)[1].split("-->", 1)[0].strip()
    return None


def ensure_thread(pr, create=True):
    """(thread_id, 今回作ったか) を返す。create=False で未作成なら (None, False)。"""
    n = pr["number"]
    tid = find_thread(n)
    if tid or not create:
        return tid, False
    thread = dc("POST", f"/channels/{FORUM_ID}/threads", {
        "name": trim(f"#{n} {pr['title']}", 100),
        "auto_archive_duration": 10080,
        "applied_tags": desired_tags(pr),
        "message": starter_message(pr),
    })
    tid = thread["id"]
    gh("POST", f"/repos/{REPO}/issues/{n}/comments", {
        "body": f"Discord スレッド: {thread_link(tid)}\n\n{MARKER}{tid}-->",
    })
    log(f"スレッドを作成しました: #{n} -> {tid}")
    if pr_state(pr):
        sync_reaction(tid, pr)
    return tid, True


def sync_state(tid, pr):
    """スレッド名・タグ・最初の投稿（色と中身）・リアクションを PR の今の状態に合わせる。
    メッセージの編集とタグの変更では通知は鳴らない。"""
    dc("PATCH", f"/channels/{tid}", {
        "name": trim(f"#{pr['number']} {pr['title']}", 100),
        "applied_tags": desired_tags(pr),
        "archived": False,
    })
    try:
        dc("PATCH", f"/channels/{tid}/messages/{tid}", {
            "embeds": starter_message(pr)["embeds"],
            "allowed_mentions": mentions(False),
        })
    except RuntimeError as err:
        log(f"::warning::最初の投稿の更新に失敗: {err}")
    sync_reaction(tid, pr)


def sync_reaction(tid, pr):
    state = pr_state(pr)
    for key, emoji in REACTIONS.items():
        e = urllib.parse.quote(emoji)
        path = f"/channels/{tid}/messages/{tid}/reactions/{e}/@me"
        try:
            dc("PUT" if key == state else "DELETE", path)
        except RuntimeError as err:
            log(f"::warning::リアクションの更新に失敗: {err}")


def is_bot(user):
    return user.get("type") == "Bot" or user.get("login", "").endswith("[bot]")


# ── イベント処理 ──────────────────────────────────
def on_pull_request(p):
    action = p["action"]
    pr = fetch_pr(p["pull_request"]["number"])
    if action in ("opened", "reopened"):
        tid, created = ensure_thread(pr)
        if not created:
            sync_state(tid, pr)
            if action == "reopened":
                post(tid, embed={"title": "再オープンされました", "url": pr["html_url"], "color": COLORS["open"]})
    elif action == "ready_for_review":
        tid, created = ensure_thread(pr)
        if not created:
            sync_state(tid, pr)
            post(tid, embed={"title": "ドラフトが解除され、レビュー待ちになりました", "url": pr["html_url"], "color": COLORS["open"]})
    elif action == "closed":
        # 通知は流さず、色・タグ・リアクションだけ変える
        tid, _ = ensure_thread(pr, create=False)
        if tid:
            sync_state(tid, pr)
    elif action == "labeled":
        tid, created = ensure_thread(pr, create=pr["state"] == "open")
        if tid and not created:
            sync_state(tid, pr)
            if p["label"]["name"] == DISCUSS_LABEL:
                post(tid, content=f"{DISCUSS_LABEL} ラベルが付きました（要検討）", mention=True,
                     embed={"title": trim(f"#{pr['number']} {pr['title']}", 256), "url": pr["html_url"], "color": COLORS["discuss"]})
    elif action == "unlabeled":
        tid, _ = ensure_thread(pr, create=False)
        if tid:
            sync_state(tid, pr)
    elif action == "edited" and "title" in (p.get("changes") or {}):
        tid, _ = ensure_thread(pr, create=False)
        if tid:
            sync_state(tid, pr)


def on_issue_comment(p):
    c = p["comment"]
    if is_bot(c["user"]) or MARKER in (c.get("body") or ""):
        return
    pr = fetch_pr(p["issue"]["number"])
    tid, _ = ensure_thread(pr, create=pr["state"] == "open")
    if not tid:
        return
    post(tid, embed={
        "author": {"name": c["user"]["login"], "url": c["user"]["html_url"], "icon_url": c["user"]["avatar_url"]},
        "title": "コメント",
        "url": c["html_url"],
        "description": trim(clean_body(c.get("body")), 1500),
        "color": COLORS["neutral"],
    })


REVIEW_TITLES = {
    "approved": ("承認されました", COLORS["ok"]),
    "changes_requested": ("修正を求められました", COLORS["danger"]),
    "commented": ("レビューコメント", COLORS["neutral"]),
}


def on_review(p):
    r = p["review"]
    if is_bot(r["user"]):
        return
    state = (r.get("state") or "").lower()
    title, color = REVIEW_TITLES.get(state, ("レビュー", COLORS["neutral"]))
    pr = fetch_pr(p["pull_request"]["number"])
    body = clean_body(r.get("body"))
    if not body:
        # 行コメントだけのレビュー: 行コメントの中身を並べる
        comments = gh("GET", f"/repos/{REPO}/pulls/{pr['number']}/reviews/{r['id']}/comments") or []
        body = "\n\n".join(f"`{x['path']}`\n{trim(clean_body(x.get('body')), 300)}" for x in comments[:5])
        if len(comments) > 5:
            body += f"\n\n…ほか {len(comments) - 5} 件"
    if not body and state == "commented":
        return
    tid, _ = ensure_thread(pr, create=pr["state"] == "open")
    if not tid:
        return
    post(tid, embed={
        "author": {"name": r["user"]["login"], "url": r["user"]["html_url"], "icon_url": r["user"]["avatar_url"]},
        "title": title,
        "url": r["html_url"],
        "description": trim(body, 1500),
        "color": color,
    })


def prs_in_deploy(run):
    """今回の Pages 公開に含まれる（前回の公開成功以降にマージされた）PR を返す。"""
    head = run["head_sha"]
    runs = gh("GET", f"/repos/{REPO}/actions/workflows/{run['workflow_id']}/runs?status=success&branch=main&per_page=10")
    prev = next((r["head_sha"] for r in (runs or {}).get("workflow_runs", [])
                 if r["id"] != run["id"] and r["created_at"] < run["created_at"]), None)
    shas = [head]
    if prev and prev != head:
        cmp = gh("GET", f"/repos/{REPO}/compare/{prev}...{head}")
        shas = [c["sha"] for c in cmp.get("commits", [])] or [head]
    found = {}
    for sha in shas[-30:]:
        for pr in gh("GET", f"/repos/{REPO}/commits/{sha}/pulls") or []:
            if pr.get("merged_at") and pr["base"]["ref"] == "main":
                found[pr["number"]] = pr
    return [found[k] for k in sorted(found)]


def on_workflow_run(p):
    run = p["workflow_run"]
    name, conclusion = run["name"], run.get("conclusion")
    if name == "Build check" and conclusion == "failure":
        for ref in run.get("pull_requests") or []:
            pr = fetch_pr(ref["number"])
            tid, _ = ensure_thread(pr, create=pr["state"] == "open")
            if tid:
                post(tid, embed={
                    "title": "ビルドチェックが失敗しました",
                    "url": run["html_url"],
                    "description": f"コミット `{run['head_sha'][:7]}`",
                    "color": COLORS["danger"],
                })
    elif name == "Deploy to GitHub Pages" and conclusion == "success":
        prs = prs_in_deploy(run)
        nums = [pr["number"] for pr in prs]
        log(f"今回の公開に含まれる PR: {nums}")
        for pr in prs:
            tid = find_thread(pr["number"])
            if not tid:
                log(f"#{pr['number']} には Discord スレッドが無いので飛ばします")
                continue
            others = [f"#{x}" for x in nums if x != pr["number"]]
            desc = f"[{trim(pr['title'], 80)}]({pr['html_url']}) がサイトに反映されました。"
            if others:
                desc += f"\n同時に公開: {', '.join(others)}"
            post(tid, embed={"title": "サイトに公開されました", "url": "https://aiuhehe.github.io/eft-companion/",
                             "description": desc, "color": COLORS["ok"]})
        if not prs:
            log("今回の公開に含まれる PR は見つかりませんでした")


# ── 毎朝のまとめ ───────────────────────────────────
def digest_thread():
    guild = forum().get("guild_id")
    candidates = []
    if guild:
        candidates += (dc("GET", f"/guilds/{guild}/threads/active") or {}).get("threads", [])
    candidates += (dc("GET", f"/channels/{FORUM_ID}/threads/archived/public?limit=100") or {}).get("threads", [])
    for t in candidates:
        if t.get("parent_id") == FORUM_ID and t.get("name") == DIGEST_THREAD_NAME:
            return t["id"]
    thread = dc("POST", f"/channels/{FORUM_ID}/threads", {
        "name": DIGEST_THREAD_NAME,
        "auto_archive_duration": 10080,
        "message": {"content": "毎朝 8:00 に、未マージの PR と未解決の Issue の一覧をここに投稿します（何もない日は投稿しません）。",
                    "allowed_mentions": mentions(False)},
    })
    try:
        dc("PATCH", f"/channels/{thread['id']}", {"flags": 2})  # ピン留め
    except RuntimeError as err:
        log(f"::warning::まとめ投稿のピン留めに失敗: {err}")
    return thread["id"]


def days_since(iso):
    t = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - t).days


def run_digest():
    prs = gh_paged(f"/repos/{REPO}/pulls?state=open")
    issues = [i for i in gh_paged(f"/repos/{REPO}/issues?state=open") if "pull_request" not in i]
    if not prs and not issues:
        log("未マージの PR も未解決の Issue も無いので、まとめは投稿しません")
        return
    stale_count = 0
    pr_lines = []
    for pr in prs:
        tags = ["スケジュールタスク"] if is_schedule(pr) else []
        if pr.get("draft"):
            tags.append("ドラフト")
        if DISCUSS_LABEL in labels_of(pr):
            tags.append("**要検討**")
        idle = days_since(pr["updated_at"])
        if idle >= STALE_DAYS:
            stale_count += 1
            tags.append(f"**{idle}日動きなし**")
        tid = find_thread(pr["number"])
        thread = f"（[スレッド]({thread_link(tid)})）" if tid else ""
        pr_lines.append(f"- [#{pr['number']} {trim(pr['title'], 70)}]({pr['html_url']}){thread}" + (f" — {' / '.join(tags)}" if tags else ""))
    issue_lines = [f"- [#{i['number']} {trim(i['title'], 70)}]({i['html_url']})"
                   + (f" — {', '.join(l['name'] for l in i['labels'])}" if i.get("labels") else "")
                   for i in issues]
    parts = []
    if pr_lines:
        parts.append(f"**未マージの PR（{len(pr_lines)}件）**\n" + "\n".join(pr_lines))
    if issue_lines:
        parts.append(f"**未解決の Issue（{len(issue_lines)}件）**\n" + "\n".join(issue_lines))
    today = datetime.now(JST)
    embed = {
        "title": f"{today.month}/{today.day}（{WEEKDAYS[today.weekday()]}）のまとめ",
        "url": f"https://github.com/{REPO}/pulls",
        "description": trim("\n\n".join(parts), 4000),
        "color": COLORS["danger"] if stale_count else COLORS["neutral"],
    }
    content = f"{STALE_DAYS}日以上動きのない PR が {stale_count} 件あります" if stale_count else None
    post(digest_thread(), content=content, embed=embed, mention=bool(stale_count))


# ── エントリポイント ───────────────────────────────
def main():
    if not DRY_RUN and (not BOT_TOKEN or not FORUM_ID):
        log("::warning::DISCORD_BOT_TOKEN または DISCORD_FORUM_CHANNEL_ID が未設定のため、通知をスキップしました")
        return
    event = os.environ["GITHUB_EVENT_NAME"]
    with open(os.environ["GITHUB_EVENT_PATH"], encoding="utf-8") as f:
        payload = json.load(f)
    log(f"event={event} action={payload.get('action')}")
    if event == "pull_request_target":
        on_pull_request(payload)
    elif event == "issue_comment":
        if payload["issue"].get("pull_request"):
            on_issue_comment(payload)
    elif event == "pull_request_review":
        on_review(payload)
    elif event == "workflow_run":
        on_workflow_run(payload)
    elif event == "schedule":
        run_digest()
    elif event == "workflow_dispatch":
        n = ((payload.get("inputs") or {}).get("pr") or "").strip()
        if n:
            pr = fetch_pr(int(n))
            tid, created = ensure_thread(pr)
            if not created:
                sync_state(tid, pr)
            log(f"#{n} のスレッド: {thread_link(tid)}")
        else:
            run_digest()
    else:
        log(f"未対応のイベント: {event}")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as err:
        log(f"::error::{err}")
        sys.exit(1)
