const RAW_BACKEND = process.env.BACKEND_API_URL || 'https://trading-risk-simulator.onrender.com';
const BACKEND_BASE_URL = RAW_BACKEND.trim().replace(/\/+$/, '');

async function proxyRequest(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const cleanSubPath = (path || []).join('/').replace(/^\/+/, '');
    const targetUrl = new URL(`${BACKEND_BASE_URL}/${cleanSubPath}`);
    const requestUrl = new URL(request.url);
    targetUrl.search = requestUrl.search;

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('content-length');

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (!['GET', 'HEAD'].includes(request.method)) {
      init.body = await request.text();
    }

    const response = await fetch(targetUrl, init);
    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy request failed';
    return Response.json(
      {
        error: 'Backend proxy unavailable',
        detail: message,
      },
      { status: 502 }
    );
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}