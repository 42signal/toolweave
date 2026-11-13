import { isRecord } from "./protocol";

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

function decodeBase64URL(input: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(input) || input.length % 4 === 1)
    throw new TypeError("Invalid Base64URL");
  const standard = input.replace(/-/g, "+").replace(/_/g, "/");
  return decodeBase64Bytes(
    standard + "=".repeat((4 - (standard.length % 4)) % 4),
  );
}

export function decodeJWT(input: string): string {
  const parts = input.split(".");
  if (parts.length !== 3) throw new TypeError("Expected compact JWS");
  const [headerPart = "", payloadPart = "", signaturePart = ""] = parts;
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  const header: unknown = JSON.parse(
    decoder.decode(decodeBase64URL(headerPart)),
  );
  const payload: unknown = JSON.parse(
    decoder.decode(decodeBase64URL(payloadPart)),
  );
  decodeBase64URL(signaturePart);
  if (!isRecord(header) || !isRecord(payload))
    throw new TypeError("Expected JSON objects");
  return JSON.stringify({ header, payload }, null, 2);
}
