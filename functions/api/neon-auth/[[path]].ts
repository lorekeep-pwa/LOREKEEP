interface Env {
  VITE_NEON_AUTH_URL?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const proxyPrefix = '/api/neon-auth';

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  const configuredAuthUrl = env.VITE_NEON_AUTH_URL?.trim();
  if (!configuredAuthUrl) return new Response('Neon Auth is not configured.', { status: 503 });

  let authUrl: URL;
  try {
    authUrl = new URL(configuredAuthUrl);
  } catch {
    return new Response('Neon Auth URL is invalid.', { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  if (!incomingUrl.pathname.startsWith(`${proxyPrefix}/`)) {
    return new Response('Not found.', { status: 404 });
  }

  authUrl.pathname = `${authUrl.pathname.replace(/\/$/u, '')}${incomingUrl.pathname.slice(proxyPrefix.length)}`;
  authUrl.search = incomingUrl.search;

  try {
    const upstreamResponse = await fetch(new Request(authUrl, request));
    const headers = new Headers(upstreamResponse.headers);

    // The browser sees this response as first-party. Remove any upstream cookie
    // domain attribute so the persistent session belongs to the app origin.
    const upstreamHeaders = upstreamResponse.headers as Headers & { getSetCookie?: () => string[] };
    const cookies = upstreamHeaders.getSetCookie?.();
    if (cookies?.length) {
      headers.delete('set-cookie');
      for (const cookie of cookies) {
        headers.append('set-cookie', cookie.replace(/;\s*domain=[^;]+/iu, ''));
      }
    }

    headers.delete('access-control-allow-origin');
    headers.delete('access-control-allow-credentials');
    headers.delete('access-control-allow-methods');
    headers.delete('access-control-allow-headers');
    headers.set('cache-control', 'no-store');
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch {
    return new Response('Neon Auth is temporarily unavailable.', { status: 502 });
  }
}
