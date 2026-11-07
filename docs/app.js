import { API_LATEST, RELEASES_PAGE, selectRelease, formatSize } from "./release.js";

const TIMEOUT_MS = 10000;

// スクリプトが動いたら「確認中」表示へ（読み込めなければ nojs のままReleases案内を出す）
document.body.dataset.state = "loading";

const $ = (id) => document.getElementById(id);

async function fetchLatest() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_LATEST, {
      headers: { Accept: "application/vnd.github+json" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    return selectRelease(await res.json());
  } catch {
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}

function setLink(el, href) {
  el.setAttribute("href", href);
}

function showRelease(r) {
  setLink($("dl-installer"), r.installer.url);
  setLink($("dl-portable"), r.portable.url);
  setLink($("notes-link"), r.notesUrl);

  $("installer-meta").textContent = `インストーラー（.exe） · ${formatSize(r.installer.size)}`;
  $("portable-meta").textContent = `ZIP · ${formatSize(r.portable.size)}`;

  $("version").textContent = `v${r.version}`;
  if (r.publishedAt) {
    const d = r.publishedAt;
    $("released").textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日公開`;
    $("released").setAttribute("datetime", d.toISOString());
  }

  // ファイル確認用のSHA-256（APIが返した場合のみ）
  const rows = [r.installer, r.portable].filter((a) => a.sha256);
  if (rows.length) {
    const list = $("hash-list");
    list.replaceChildren();
    for (const a of rows) {
      const dt = document.createElement("dt");
      dt.textContent = a.name;
      const dd = document.createElement("dd");
      const code = document.createElement("code");
      code.textContent = a.sha256;
      dd.append(code);
      list.append(dt, dd);
    }
    $("hashes").hidden = false;
  }

  $("status").textContent = `最新版 v${r.version} を表示しています。`;
  document.body.dataset.state = "ready";
}

function showFallback() {
  // 確認できなかった版のファイルを指すリンクを残さない
  setLink($("dl-installer"), RELEASES_PAGE);
  setLink($("dl-portable"), RELEASES_PAGE);
  setLink($("notes-link"), RELEASES_PAGE);
  $("hashes").hidden = true;
  $("version").textContent = "最新版";
  $("released").textContent = "";
  $("released").removeAttribute("datetime");
  $("status").textContent =
    "最新版の情報を確認できませんでした。GitHubのReleasesページから入手してください。";
  document.body.dataset.state = "error";
}

const result = await fetchLatest();
if (result.ok) {
  showRelease(result);
} else {
  showFallback();
}
