export function encodeBase64(input: string): string {
  encodeURIComponent(input);
  return btoa(
    Array.from(new TextEncoder().encode(input), (byte) =>
      String.fromCharCode(byte),
    ).join(""),
  );
}

export function decodeBase64(input: string): string {
  const bytes = decodeBase64Bytes(input);
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
    bytes,
  );
}

function decodeBase64Bytes(input: string): Uint8Array {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      input,
    )
  )
    throw new TypeError("Invalid standard Base64");
  const binary = atob(input);
  if (btoa(binary) !== input) throw new TypeError("Non-canonical Base64");
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
