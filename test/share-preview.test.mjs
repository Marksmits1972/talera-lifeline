import assert from "node:assert/strict";

const entries = new Map();
globalThis.caches = {
  default: {
    async put(request, response) {
      entries.set(new URL(request.url).toString(), response.clone());
    },
    async match(request) {
      const response = entries.get(new URL(request.url).toString());
      return response ? response.clone() : undefined;
    },
  },
};

const { default: worker } = await import("../src/index.js");
const form = new FormData();
form.append("image", new Blob([new Uint8Array([255, 216, 255, 217])], { type: "image/jpeg" }), "preview.jpg");
form.append("title", "Terugkijken op al die losse momenten");
form.append("kind", "story");
form.append("duration", "7 dagen");
form.append("hasPhoto", "1");

const created = await worker.fetch(new Request("https://talera.example/api/share-preview", { method: "POST", body: form }));
assert.equal(created.status, 200);
const { shareUrl } = await created.json();
const invite = new URL(shareUrl);
assert.equal(invite.searchParams.get("talera_demo"), "recipient-story");
assert.match(invite.searchParams.get("talera_invite"), /^[a-f0-9]{32}$/);

const page = await worker.fetch(new Request(shareUrl));
const html = await page.text();
assert.match(html, /property="og:site_name" content="TALERA"/);
assert.match(html, /property="og:image" content="https:\/\/talera\.example\/api\/share-preview\/image\/[a-f0-9]{32}"/);
assert.match(html, /Mark deelt een herinnering: Terugkijken op al die losse momenten/);

const token = invite.searchParams.get("talera_invite");
const meta = await worker.fetch(new Request(`https://talera.example/api/share-preview/meta/${token}`));
assert.equal(meta.status, 200);
assert.equal((await meta.json()).hasPhoto, true);

const image = await worker.fetch(new Request(`https://talera.example/api/share-preview/image/${token}`));
assert.equal(image.status, 200);
assert.equal(image.headers.get("content-type"), "image/jpeg");

console.log("share preview flow: ok");
