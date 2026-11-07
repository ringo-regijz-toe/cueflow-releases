// 実行: node --test tests/release.test.mjs （Node.js 22.7以上）
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectRelease, RELEASES_PAGE } from "../docs/release.js";

const BASE = "https://github.com/ringo-regijz-toe/cueflow-releases/releases";

function asset(tag, name, extra = {}) {
  return {
    name,
    state: "uploaded",
    size: 1234567,
    browser_download_url: `${BASE}/download/${tag}/${name}`,
    digest: "sha256:" + "a".repeat(64),
    ...extra,
  };
}

function release(version, { assets, ...extra } = {}) {
  const tag = `v${version}`;
  return {
    tag_name: tag,
    draft: false,
    prerelease: false,
    html_url: `${BASE}/tag/${tag}`,
    published_at: "2026-11-06T17:46:01Z",
    assets: assets ?? [
      asset(tag, `Cueflow_${version}_windows-x64.zip`),
      asset(tag, `Cueflow_${version}_windows-x64.zip.sig`),
      asset(tag, `Cueflow_${version}_x64-setup.exe`),
      asset(tag, `Cueflow_${version}_x64-setup.exe.sig`),
      asset(tag, "latest.json"),
      asset(tag, "manifest.json"),
      asset(tag, "release-notes.md"),
      asset(tag, "SHA256SUMS.txt"),
    ],
    ...extra,
  };
}

test("v0.1.0 の正しいインストーラーとPortableを選ぶ", () => {
  const r = selectRelease(release("0.1.0"));
  assert.equal(r.ok, true);
  assert.equal(r.version, "0.1.0");
  assert.equal(r.installer.url, `${BASE}/download/v0.1.0/Cueflow_0.1.0_x64-setup.exe`);
  assert.equal(r.portable.url, `${BASE}/download/v0.1.0/Cueflow_0.1.0_windows-x64.zip`);
  assert.equal(r.notesUrl, `${BASE}/tag/v0.1.0`);
  assert.equal(r.installer.sha256, "a".repeat(64));
});

for (const v of ["0.1.1", "0.1.2", "0.2.0", "1.0.0", "1.10.23"]) {
  test(`版が変わっても追従する: ${v}`, () => {
    const r = selectRelease(release(v));
    assert.equal(r.ok, true);
    assert.equal(r.version, v);
    assert.ok(r.installer.url.endsWith(`/v${v}/Cueflow_${v}_x64-setup.exe`));
    assert.ok(r.portable.url.endsWith(`/v${v}/Cueflow_${v}_windows-x64.zip`));
  });
}

test("インストーラーが欠けていればフォールバック", () => {
  const tag = "v0.1.1";
  const r = selectRelease(release("0.1.1", { assets: [asset(tag, "Cueflow_0.1.1_windows-x64.zip")] }));
  assert.deepEqual(r, { ok: false, reason: "missing-assets" });
});

test("Portableが欠けていればフォールバック", () => {
  const tag = "v0.1.1";
  const r = selectRelease(release("0.1.1", { assets: [asset(tag, "Cueflow_0.1.1_x64-setup.exe")] }));
  assert.equal(r.ok, false);
});

test("前の版のファイルを新しい版として案内しない", () => {
  // v0.1.1 のReleaseに 0.1.0 のファイルしかない
  const tag = "v0.1.1";
  const r = selectRelease(
    release("0.1.1", {
      assets: [asset(tag, "Cueflow_0.1.0_x64-setup.exe"), asset(tag, "Cueflow_0.1.0_windows-x64.zip")],
    }),
  );
  assert.equal(r.ok, false);
});

test(".sig など似た名前のファイルは選ばない", () => {
  const tag = "v0.1.1";
  const r = selectRelease(
    release("0.1.1", {
      assets: [
        asset(tag, "Cueflow_0.1.1_x64-setup.exe.sig"),
        asset(tag, "Cueflow_0.1.1_windows-x64.zip.sig"),
        asset(tag, "cueflow_0.1.1_x64-setup.exe"),
      ],
    }),
  );
  assert.equal(r.ok, false);
});

test("プレリリース・下書き・接尾辞付きタグは扱わない", () => {
  assert.equal(selectRelease(release("0.2.0", { prerelease: true })).ok, false);
  assert.equal(selectRelease(release("0.2.0", { draft: true })).ok, false);
  assert.equal(selectRelease({ ...release("0.2.0"), tag_name: "v0.2.0-beta.1" }).ok, false);
  assert.equal(selectRelease({ ...release("0.2.0"), tag_name: "0.2.0" }).ok, false);
});

test("想定外のURLを指すassetは使わない", () => {
  const tag = "v0.1.1";
  const r = selectRelease(
    release("0.1.1", {
      assets: [
        asset(tag, "Cueflow_0.1.1_x64-setup.exe", { browser_download_url: "https://example.com/Cueflow_0.1.1_x64-setup.exe" }),
        asset(tag, "Cueflow_0.1.1_windows-x64.zip"),
      ],
    }),
  );
  assert.equal(r.ok, false);
});

test("アップロード未完了・サイズ0・同名重複は使わない", () => {
  const tag = "v0.1.1";
  const zip = asset(tag, "Cueflow_0.1.1_windows-x64.zip");
  const exe = "Cueflow_0.1.1_x64-setup.exe";
  assert.equal(selectRelease(release("0.1.1", { assets: [asset(tag, exe, { state: "starter" }), zip] })).ok, false);
  assert.equal(selectRelease(release("0.1.1", { assets: [asset(tag, exe, { size: 0 }), zip] })).ok, false);
  assert.equal(selectRelease(release("0.1.1", { assets: [asset(tag, exe), asset(tag, exe), zip] })).ok, false);
});

test("不正な応答はフォールバック", () => {
  for (const bad of [null, undefined, "x", 1, [], {}, { message: "Not Found" }, { ...release("0.1.0"), assets: null }]) {
    assert.equal(selectRelease(bad).ok, false);
  }
});

test("html_url が想定外ならReleases一覧へ、digestがなければハッシュなし", () => {
  const tag = "v0.1.1";
  const r = selectRelease(
    release("0.1.1", {
      html_url: "https://evil.example/",
      assets: [
        asset(tag, "Cueflow_0.1.1_x64-setup.exe", { digest: undefined }),
        asset(tag, "Cueflow_0.1.1_windows-x64.zip", { digest: "md5:xyz" }),
      ],
    }),
  );
  assert.equal(r.ok, true);
  assert.equal(r.notesUrl, RELEASES_PAGE);
  assert.equal(r.installer.sha256, null);
  assert.equal(r.portable.sha256, null);
});
