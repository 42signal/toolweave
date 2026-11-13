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
