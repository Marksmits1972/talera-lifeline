import assert from "node:assert/strict";
import { shareExperienceScript } from "../src/share-experience.js";

assert.match(shareExperienceScript, /async function prepareShare\(\)/);
assert.match(shareExperienceScript, /function shareViaWhatsApp\(\)/);
const directHandoff = shareExperienceScript.match(/function shareViaWhatsApp\(\)\{([\s\S]*?)\n  \}/)?.[1] || "";
assert.doesNotMatch(directHandoff, /await|fetch\(/);
assert.match(directHandoff, /location\.href=state\.preparedWhatsAppUrl/);
assert.match(shareExperienceScript, /isAppleMobile\?'whatsapp:\/\/send\?text=':'https:\/\/wa\.me\/\?text='/);
assert.doesNotMatch(shareExperienceScript, /https:\/\/api\.whatsapp\.com/);
assert.match(shareExperienceScript, /function activateRecipientPresentation\(\)/);
assert.match(shareExperienceScript, /runtime\.restrictToMemory\(shared\)/);
assert.match(shareExperienceScript, /form\.append\('storyId'/);
assert.match(shareExperienceScript, /async function exactRecipientMemory\(\)/);
assert.match(shareExperienceScript, /if\(demoView==='recipient-story'\)loadInvitePreview\(\)\.finally\(\(\)=>setTimeout\(activateRecipientPresentation,280\)\)/);
assert.doesNotMatch(shareExperienceScript, /open\('recipient-story'\)/);

const entries = new Map();
const bucket = {
  async put(key, value, options = {}) {
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
    entries.set(key, { bytes, options, etag: `etag-${key}` });
  },
  async head(key) {
    const entry = entries.get(key);
    if (!entry) return null;
    return { etag: entry.etag, httpEtag: entry.etag, writeHttpMetadata(headers) { if (entry.options.httpMetadata?.contentType) headers.set("content-type", entry.options.httpMetadata.contentType); } };
  },
  async get(key) {
    const entry = entries.get(key);
    if (!entry) return null;
    const blob = new Blob([entry.bytes], { type: entry.options.httpMetadata?.contentType || "application/octet-stream" });
    return { body: blob.stream(), etag: entry.etag, httpEtag: entry.etag, text: () => blob.text(), writeHttpMetadata(headers) { if (entry.options.httpMetadata?.contentType) headers.set("content-type", entry.options.httpMetadata.contentType); } };
  },
  async delete(key) { entries.delete(key); },
};
const { handleSharePreviewStorage } = await import("../xxory-test/src/share-preview-storage.js");
const storageEnv = { MEDIA: bucket };

const { default: worker } = await import("../src/index.js");
const plainPage = await worker.fetch(new Request("https://talera.example/"), { SHARE_PREVIEWS: bucket });
assert.doesNotMatch(await plainPage.text(), /<html lang="nl" class="talera-invite-page talera-invite-boot">/);
const form = new FormData();
form.append("image", new Blob([new Uint8Array([255, 216, 255, 217])], { type: "image/jpeg" }), "preview.jpg");
form.append("title", "Terugkijken op al die losse momenten");
form.append("kind", "story");
form.append("duration", "7 dagen");
form.append("hasPhoto", "1");
form.append("memoryId", "live:story-123");
form.append("storyId", "story-123");
form.append("story", "Terugkijken op al die losse momenten");
form.append("fullStory", "Terugkijken op al die losse momenten. Het volledige verhaal.");
form.append("eventAt", "2026-09-06T09:15:00.000Z");

const created = await worker.fetch(new Request("https://talera.example/api/share-preview", { method: "POST", body: form }), { SHARE_PREVIEWS: bucket });
assert.equal(created.status, 200);
const { shareUrl } = await created.json();
const invite = new URL(shareUrl);
assert.equal(invite.searchParams.get("talera_demo"), "recipient-story");
assert.match(invite.searchParams.get("talera_invite"), /^[a-f0-9]{32}$/);

const page = await worker.fetch(new Request(shareUrl), { SHARE_PREVIEWS: bucket });
const html = await page.text();
assert.match(html, /property="og:site_name" content="TALERA"/);
assert.match(html, /property="og:image" content="https:\/\/talera\.example\/api\/share-preview\/image\/[a-f0-9]{32}"/);
assert.match(html, /Mark deelt een herinnering: Terugkijken op al die losse momenten/);
assert.match(html, /class="talera-invite-page talera-invite-boot"/);
assert.match(html, /talera-invite-first-frame/);
assert.match(shareExperienceScript, /waitForRecipientFirstFrame/);
assert.match(shareExperienceScript, /classList\.remove\('talera-invite-boot'\)/);

const token = invite.searchParams.get("talera_invite");
const meta = await worker.fetch(new Request(`https://talera.example/api/share-preview/meta/${token}`), { SHARE_PREVIEWS: bucket });
assert.equal(meta.status, 200);
const metaPayload = await meta.json();
assert.equal(metaPayload.hasPhoto, true);
assert.equal(metaPayload.storyId, "story-123");
assert.equal(metaPayload.memoryId, "live:story-123");
assert.match(metaPayload.fullStory, /volledige verhaal/);

const image = await worker.fetch(new Request(`https://talera.example/api/share-preview/image/${token}`), { SHARE_PREVIEWS: bucket });
assert.equal(image.status, 200);
assert.equal(image.headers.get("content-type"), "image/jpeg");

const secondForm = new FormData();
secondForm.append("image", new Blob([new Uint8Array([255, 216, 255, 217])], { type: "image/jpeg" }), "preview.jpg");
secondForm.append("title", "Dezelfde foto, nieuwe uitnodiging");
const second = await worker.fetch(new Request("https://talera.example/api/share-preview", { method: "POST", body: secondForm }), { SHARE_PREVIEWS: bucket });
assert.equal(second.status, 200);
assert.equal([...entries.keys()].filter((key) => key.startsWith("share-previews/images/")).length, 1);

const unavailableForm = new FormData();
unavailableForm.append("image", new Blob([new Uint8Array([255, 216, 255, 217])], { type: "image/jpeg" }), "preview.jpg");
const unavailable = await handleSharePreviewStorage(new Request("https://xxory.example/api/integration/share-preview", { method: "POST", body: unavailableForm }), {});
assert.equal(unavailable.status, 503);

console.log("share preview flow: ok");
