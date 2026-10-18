export async function readJsonLimited(request, maxBytes) {
  const advertisedLength = request.headers.get("content-length");
  if (/^\d+$/.test(advertisedLength || "") && Number(advertisedLength) > maxBytes) {
    return { ok: false, tooLarge: true };
  }

  if (!request.body) return { ok: false, tooLarge: false };
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, tooLarge: true };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, value: JSON.parse(text) };
  } catch {
    await reader.cancel().catch(() => {});
    return { ok: false, tooLarge: false };
  }
}
