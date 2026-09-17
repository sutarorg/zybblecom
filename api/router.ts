import { handleApplication } from "./_lib/application.ts";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

// Vercel Serverless Function entry point.
// Supports both modern Web Fetch API (Request/Response) and Node.js (req, res).

type NodeIncomingMessage = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator]?: () => AsyncIterableIterator<unknown>;
};

type NodeServerResponse = {
  writeHead?: (statusCode: number, headers?: Record<string, string | string[]>) => void;
  end?: (chunk?: Buffer | string) => void;
};

async function nodeHandler(
  req: Request | NodeIncomingMessage,
  res?: NodeServerResponse
): Promise<Response | void> {
  // If req is already a Web standard Request:
  if (typeof (req as Request).text === "function" && typeof (req as Request).headers?.get === "function") {
    return handleApplication(req as Request);
  }

  // Otherwise, handle Node http.IncomingMessage / http.ServerResponse
  const nodeReq = req as NodeIncomingMessage;
  const host = (nodeReq.headers?.["host"] as string) || "localhost";
  const proto = (nodeReq.headers?.["x-forwarded-proto"] as string) || "https";
  const fullUrl = new URL(nodeReq.url || "/", `${proto}://${host}`);

  let bodyBuffer: Buffer | undefined;
  if (nodeReq.method !== "GET" && nodeReq.method !== "HEAD" && typeof (nodeReq as any)[Symbol.asyncIterator] === "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of nodeReq as AsyncIterable<Buffer | string>) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as Buffer));
    }
    if (chunks.length > 0) bodyBuffer = Buffer.concat(chunks);
  }

  const headers = new Headers();
  if (nodeReq.headers) {
    for (const [k, v] of Object.entries(nodeReq.headers)) {
      if (v !== undefined) {
        if (Array.isArray(v)) {
          for (const item of v) headers.append(k, item);
        } else {
          headers.set(k, String(v));
        }
      }
    }
  }

  const webReq = new Request(fullUrl.href, {
    method: nodeReq.method || "GET",
    headers,
    body: bodyBuffer && bodyBuffer.length > 0 ? (new Uint8Array(bodyBuffer) as unknown as BodyInit) : undefined,
    // @ts-ignore
    duplex: "half",
  });

  const webRes = await handleApplication(webReq);

  if (res && typeof res.writeHead === "function" && typeof res.end === "function") {
    const outHeaders: Record<string, string | string[]> = {};
    webRes.headers.forEach((v, k) => {
      outHeaders[k] = v;
    });
    res.writeHead(webRes.status, outHeaders);
    const arrayBuffer = await webRes.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
    return;
  }

  return webRes;
}

// Function with .fetch property attached for Vercel Web fetch handler
const handler = Object.assign(nodeHandler, {
  fetch: (req: Request) => handleApplication(req),
});

export default handler;

export async function fetch(req: Request): Promise<Response> {
  return handleApplication(req);
}

export async function GET(req: Request): Promise<Response> {
  return handleApplication(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleApplication(req);
}

export async function PUT(req: Request): Promise<Response> {
  return handleApplication(req);
}

export async function PATCH(req: Request): Promise<Response> {
  return handleApplication(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return handleApplication(req);
}

export async function OPTIONS(req: Request): Promise<Response> {
  return handleApplication(req);
}
