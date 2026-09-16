export const WORKBLAD_PHOTO_OPTIMIZER_SCRIPT = String.raw`<script id="talera-workblad-photo-optimizer">
(() => {
  if (window.__taleraOptimizePhoto) return;

  const MAX_LONG_EDGE = 3840;
  const KEEP_ORIGINAL_BYTES = 3 * 1024 * 1024;
  const TARGET_BYTES = 3.2 * 1024 * 1024;
  const IOS_SAFE_PASS_THROUGH_BYTES = 25 * 1024 * 1024;
  const JPEG_QUALITIES = [0.86, 0.82, 0.78, 0.74];

  function isAppleTouchDevice() {
    const ua = String(navigator.userAgent || '');
    return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints || 0) > 1);
  }

  function browserSafeType(file) {
    return /^image\/(jpe?g|png|webp)$/i.test(String(file?.type || ''));
  }

  function outputName(file) {
    const source = String(file?.name || 'herinnering').replace(/\.[^.]+$/, '');
    return source + '-talera.jpg';
  }

  function canvasBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Foto kon niet worden verkleind.')), 'image/jpeg', quality);
    });
  }

  async function decodePhoto(file) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(file, { imageOrientation:'from-image' }); }
      catch { try { return await createImageBitmap(file); } catch {} }
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const node = new Image();
        node.onload = () => resolve(node);
        node.onerror = () => reject(new Error('Dit fotoformaat kan op dit toestel niet worden voorbereid.'));
        node.src = url;
      });
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function optimizePhoto(file) {
    if (!(file instanceof Blob) || !file.size || !String(file.type || '').startsWith('image/')) return file;

    // iOS/WebKit kan bij het volledig decoderen van een moderne iPhone-foto honderden
    // MB's werkgeheugen gebruiken. De native picker vraagt al om JPEG/PNG/WebP. Laat
    // zulke bestanden daarom op Apple-touchtoestellen direct door zolang ze binnen de
    // serverlimiet vallen; server-side opslag blijft byte/hash-gecontroleerd.
    if (isAppleTouchDevice() && browserSafeType(file) && file.size <= IOS_SAFE_PASS_THROUGH_BYTES) {
      return file;
    }

    // Kleine JPEGs hoeven niet eerst volledig gedecodeerd te worden om alleen vast te
    // stellen dat ze al efficiënt genoeg zijn.
    if (/image\/jpe?g/i.test(String(file.type || '')) && file.size <= KEEP_ORIGINAL_BYTES) {
      return file;
    }

    let decoded;
    try {
      decoded = await decodePhoto(file);
      const sourceWidth = Number(decoded.width || decoded.naturalWidth || 0);
      const sourceHeight = Number(decoded.height || decoded.naturalHeight || 0);
      if (!sourceWidth || !sourceHeight) throw new Error('Afmetingen van de foto ontbreken.');
      const longEdge = Math.max(sourceWidth, sourceHeight);
      const isJpeg = /image\/jpe?g/i.test(file.type || '');
      const alreadyPrepared = isJpeg && /-talera\.jpe?g$/i.test(String(file.name || '')) && longEdge <= MAX_LONG_EDGE && file.size <= TARGET_BYTES;
      if (alreadyPrepared) return file;

      const scale = Math.min(1, MAX_LONG_EDGE / longEdge);
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha:false });
      if (!context) throw new Error('Fotovoorbereiding wordt op dit toestel niet ondersteund.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded, 0, 0, width, height);

      let result = null;
      for (const quality of JPEG_QUALITIES) {
        result = await canvasBlob(canvas, quality);
        if (result.size <= TARGET_BYTES) break;
      }
      canvas.width = 1;
      canvas.height = 1;
      if (!result?.size) throw new Error('De voorbereide foto is leeg.');
      try {
        return new File([result], outputName(file), { type:'image/jpeg', lastModified:Number(file.lastModified) || Date.now() });
      } catch {
        result.name = outputName(file);
        return result;
      }
    } finally {
      try { if (decoded && typeof decoded.close === 'function') decoded.close(); } catch {}
    }
  }

  window.__taleraOptimizePhoto = optimizePhoto;
  window.__taleraPhotoPolicy = Object.freeze({
    revision:'photo-master-4k-jpeg-v3-ios-safe-pass-through',
    maxLongEdge:MAX_LONG_EDGE,
    targetBytes:TARGET_BYTES,
    outputType:'image/jpeg',
    iosSafePassThroughBytes:IOS_SAFE_PASS_THROUGH_BYTES
  });
})();
</script>`;
