/**
 * Test helper using node:http and fetch (no supertest).
 */
import http from "node:http";
import type { RequestListener } from "node:http";

export function createTestClient(app: RequestListener) {
  const server = http.createServer(app);
  server.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://localhost:${port}`;

  async function request(
    method: string,
    path: string,
    options?: { body?: string | object; headers?: Record<string, string> }
  ) {
    const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
    const body = options?.body;
    const headers: Record<string, string> = { ...options?.headers };
    if (body !== undefined && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await res.text();
    let resBody: unknown;
    try {
      resBody = text ? JSON.parse(text) : {};
    } catch {
      resBody = {};
    }
    return { status: res.status, body: resBody };
  }

  return {
    baseUrl,
    close: () => server.close(),
    get: (path: string) => request("GET", path),
    post: (path: string, body?: string | object, headers?: Record<string, string>) =>
      request("POST", path, { body, headers }),
  };
}
