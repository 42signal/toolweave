import { isRecord } from "./protocol";

export function parseURL(input: string): string {
  const url = validatedURL(input);
  const query = new Map<string, string | string[]>();
  for (const [key, value] of url.searchParams) {
    const existing = query.get(key);
    if (Array.isArray(existing)) existing.push(value);
    else query.set(key, existing === undefined ? value : [existing, value]);
  }
  return JSON.stringify(
    {
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      query: Object.fromEntries(query),
      hash: url.hash,
    },
    null,
    2,
  );
}

function validatedURL(input: string): URL {
  decodeURIComponent(input.replace(/\+/g, " "));
  const url = new URL(input);
  if (
    !/^https?:\/\//i.test(input) ||
    !/^https?:$/.test(url.protocol) ||
    !url.host ||
    !url.href.startsWith(`${url.origin}/`)
  )
    throw new TypeError("Expected HTTP URL without credentials");
  return url;
}

export function buildURL(input: string): string {
  const data: unknown = JSON.parse(input);
  if (
    !isRecord(data) ||
    Object.keys(data).length !== 5 ||
    (data.protocol !== "http:" && data.protocol !== "https:") ||
    typeof data.host !== "string" ||
    !data.host ||
    /[/?#@\\\s]/.test(data.host) ||
    typeof data.pathname !== "string" ||
    !data.pathname.startsWith("/") ||
    /[?#\\]/.test(data.pathname) ||
    typeof data.hash !== "string" ||
    (data.hash !== "" && !data.hash.startsWith("#")) ||
    (!Array.isArray(data.query) && !isRecord(data.query))
  )
    throw new TypeError("Invalid URL JSON");

  const url = validatedURL(`${data.protocol}//${data.host}`);
  const query = new URLSearchParams();
  const pairs: unknown[] = Array.isArray(data.query)
    ? data.query
    : Object.entries(data.query).flatMap(([key, value]) => {
        const values: unknown[] = Array.isArray(value) ? value : [value];
        if (values.length === 0)
          throw new TypeError("Expected nonempty query values");
        return values.map((value) => [key, value]);
      });
  for (const pair of pairs) {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      typeof pair[0] !== "string" ||
      typeof pair[1] !== "string"
    )
      throw new TypeError("Expected query string pairs");
    encodeURIComponent(pair[0]);
    encodeURIComponent(pair[1]);
    query.append(pair[0], pair[1]);
  }
  decodeURIComponent(data.pathname);
  decodeURIComponent(data.hash);
  url.pathname = data.pathname;
  url.search = query.toString();
  url.hash = data.hash;
  return url.href;
}
