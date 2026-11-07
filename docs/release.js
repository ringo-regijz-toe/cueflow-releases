// GitHub Releases API の応答から、案内してよい最新Stable版の情報だけを取り出す。
// 条件を1つでも満たさない場合は ok: false を返し、呼び出し側はReleasesページへ誘導する。

export const REPO = "ringo-regijz-toe/cueflow-releases";
export const RELEASES_PAGE = `https://github.com/${REPO}/releases`;
export const API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;

// Stable版のタグだけを受け付ける（v1.2.3 形式。-beta などの接尾辞は不可）
const TAG_RE = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;
const DIGEST_RE = /^sha256:([0-9a-f]{64})$/;

export function installerName(version) {
  return `Cueflow_${version}_x64-setup.exe`;
}

export function portableName(version) {
  return `Cueflow_${version}_windows-x64.zip`;
}

function fail(reason) {
  return { ok: false, reason };
}

function pickAsset(assets, tag, name) {
  const matches = assets.filter((a) => a && a.name === name);
  if (matches.length !== 1) return null;
  const a = matches[0];
  if (a.state !== "uploaded") return null;
  if (!Number.isSafeInteger(a.size) || a.size <= 0) return null;

  // GitHubが返したURLを使う。ただし想定どおりのリポジトリ・タグ・ファイル名を指す場合に限る
  const expected = `https://github.com/${REPO}/releases/download/${tag}/${name}`;
  if (a.browser_download_url !== expected) return null;

  const digest = typeof a.digest === "string" ? DIGEST_RE.exec(a.digest) : null;
  return {
    name,
    url: a.browser_download_url,
    size: a.size,
    sha256: digest ? digest[1] : null,
  };
}

export function selectRelease(data) {
  if (!data || typeof data !== "object") return fail("invalid-response");
  if (data.draft !== false || data.prerelease !== false) return fail("not-stable");

  const m = typeof data.tag_name === "string" ? TAG_RE.exec(data.tag_name) : null;
  if (!m) return fail("unexpected-tag");
  const tag = data.tag_name;
  const version = m[1];

  if (!Array.isArray(data.assets)) return fail("no-assets");
  const installer = pickAsset(data.assets, tag, installerName(version));
  const portable = pickAsset(data.assets, tag, portableName(version));
  if (!installer || !portable) return fail("missing-assets");

  const expectedPage = `https://github.com/${REPO}/releases/tag/${tag}`;
  const notesUrl = data.html_url === expectedPage ? expectedPage : RELEASES_PAGE;

  const published = typeof data.published_at === "string" ? new Date(data.published_at) : null;

  return {
    ok: true,
    tag,
    version,
    notesUrl,
    publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
    installer,
    portable,
  };
}

export function formatSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
