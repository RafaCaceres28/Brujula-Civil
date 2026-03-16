export function sanitizeNext(next: string | null | undefined, fallback: string): string {
  if (!next) {
    return fallback;
  }

  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }

  if (/[\u0000-\u001f\u007f]/.test(next)) {
    return fallback;
  }

  if (hasInvalidPercentEncoding(next)) {
    return fallback;
  }

  try {
    const normalized = new URL(next, 'http://localhost');

    if (normalized.origin !== 'http://localhost') {
      return fallback;
    }

    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  } catch {
    return fallback;
  }
}

function hasInvalidPercentEncoding(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '%') {
      continue;
    }

    const first = value[index + 1];
    const second = value[index + 2];

    if (!isHexChar(first) || !isHexChar(second)) {
      return true;
    }

    index += 2;
  }

  return false;
}

function isHexChar(char: string | undefined): boolean {
  if (!char) {
    return false;
  }

  return /[0-9a-fA-F]/.test(char);
}

export function resolveSafeOrigin(request: Request): string {
  const requestUrl = new URL(request.url);

  if (process.env.NODE_ENV !== 'production') {
    return requestUrl.origin;
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  if (!forwardedHost) {
    return requestUrl.origin;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  return `${forwardedProto}://${forwardedHost}`;
}
