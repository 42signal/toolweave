export function encodeBase64(input: string): string {
  encodeURIComponent(input);
  return btoa(
    Array.from(new TextEncoder().encode(input), (byte) =>
      String.fromCharCode(byte),
    ).join(""),
  );
}
