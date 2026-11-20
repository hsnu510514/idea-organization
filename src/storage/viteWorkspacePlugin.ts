import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { AssetRecord, CaseState, CaseSummary } from '../domain/types';
import { formatBoardJson, inferAssetMimeType } from './caseZip';

export function sanitizeSlug(slug: string): string {
  return (
    slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled-case'
  );
}

export function sanitizeFilename(name: string): string {
  const base = path.basename(name.replace(/\\/g, '/'));
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || `asset-${Date.now()}`;
}

export interface NodeDiskWorkspaceService {
  workspaceDir: string;
  listCases(): Promise<CaseSummary[]>;
  loadCase(caseSlug: string): Promise<CaseState | null>;
  saveCase(caseSlug: string, boardData: CaseState): Promise<void>;
  deleteCase(caseSlug: string): Promise<void>;
  saveAssetBytes(
    caseSlug: string,
    filename: string,
    bytes: Uint8Array,
    mimeType?: string
  ): Promise<AssetRecord>;
  loadAssetBytes(
    caseSlug: string,
    filename: string
  ): Promise<{ bytes: Uint8Array; mimeType: AssetRecord['mimeType'] } | null>;
  handleFetchRequest(urlStr: string, init?: RequestInit): Promise<Response>;
}

export function createNodeDiskWorkspaceService(
  workspaceDir: string
): NodeDiskWorkspaceService {
  const ensureCaseDirs = async (caseSlug: string) => {
    const safeSlug = sanitizeSlug(caseSlug);
    const caseDir = path.join(workspaceDir, safeSlug);
    const assetsDir = path.join(caseDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });
    return { safeSlug, caseDir, assetsDir };
  };

  const service: NodeDiskWorkspaceService = {
    workspaceDir,

    async listCases(): Promise<CaseSummary[]> {
      try {
        await fs.mkdir(workspaceDir, { recursive: true });
        const entries = await fs.readdir(workspaceDir, { withFileTypes: true });
        const summaries: CaseSummary[] = [];

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const boardJsonPath = path.join(workspaceDir, entry.name, 'board.json');
          try {
            const raw = await fs.readFile(boardJsonPath, 'utf-8');
            const parsed = JSON.parse(raw) as Partial<CaseState>;
            const stat = await fs.stat(boardJsonPath);
            summaries.push({
              caseSlug: parsed.caseSlug || entry.name,
              caseTitle: parsed.caseTitle || entry.name,
              updatedAt: stat.mtime.toISOString(),
            });
          } catch {
            // Skip folders without a valid board.json
          }
        }
        return summaries;
      } catch {
        return [];
      }
    },

    async loadCase(caseSlug: string): Promise<CaseState | null> {
      const safeSlug = sanitizeSlug(caseSlug);
      const boardJsonPath = path.join(workspaceDir, safeSlug, 'board.json');
      try {
        const raw = await fs.readFile(boardJsonPath, 'utf-8');
        return JSON.parse(raw) as CaseState;
      } catch {
        return null;
      }
    },

    async saveCase(caseSlug: string, boardData: CaseState): Promise<void> {
      const { safeSlug, caseDir } = await ensureCaseDirs(caseSlug);
      const boardJsonPath = path.join(caseDir, 'board.json');
      const normalized: CaseState = {
        ...boardData,
        caseSlug: safeSlug,
      };
      await fs.writeFile(boardJsonPath, formatBoardJson(normalized), 'utf-8');
    },

    async deleteCase(caseSlug: string): Promise<void> {
      const safeSlug = sanitizeSlug(caseSlug);
      const caseDir = path.join(workspaceDir, safeSlug);
      await fs.rm(caseDir, { recursive: true, force: true });
    },

    async saveAssetBytes(
      caseSlug: string,
      filename: string,
      bytes: Uint8Array,
      mimeType?: string
    ): Promise<AssetRecord> {
      const { assetsDir } = await ensureCaseDirs(caseSlug);
      const safeFile = sanitizeFilename(filename);
      const assetFilePath = path.join(assetsDir, safeFile);
      await fs.writeFile(assetFilePath, bytes);
      const resolvedMime = (mimeType ||
        inferAssetMimeType(safeFile)) as AssetRecord['mimeType'];
      const relativePath = `assets/${safeFile}`;
      return {
        id: `asset-${safeFile.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
        filename: safeFile,
        mimeType: resolvedMime,
        relativePath,
      };
    },

    async loadAssetBytes(caseSlug: string, filename: string) {
      const safeSlug = sanitizeSlug(caseSlug);
      const safeFile = sanitizeFilename(filename);
      const assetFilePath = path.join(workspaceDir, safeSlug, 'assets', safeFile);
      try {
        const buf = await fs.readFile(assetFilePath);
        return {
          bytes: new Uint8Array(buf),
          mimeType: inferAssetMimeType(safeFile),
        };
      } catch {
        return null;
      }
    },

    async handleFetchRequest(urlStr: string, init?: RequestInit): Promise<Response> {
      const parsedUrl = new URL(urlStr, 'http://localhost');
      const method = (init?.method || 'GET').toUpperCase();
      const pathname = parsedUrl.pathname;

      const jsonResponse = (data: unknown, status = 200) =>
        new Response(JSON.stringify(data), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });

      if (pathname === '/api/workspace/cases' && method === 'GET') {
        const list = await service.listCases();
        return jsonResponse(list);
      }

      const caseMatch = pathname.match(/^\/api\/workspace\/cases\/([^/]+)$/);
      if (caseMatch) {
        const slug = decodeURIComponent(caseMatch[1]);
        if (method === 'GET') {
          const found = await service.loadCase(slug);
          if (!found) return jsonResponse({ error: 'Not found' }, 404);
          return jsonResponse(found);
        }
        if (method === 'PUT' || method === 'POST') {
          const bodyText =
            typeof init?.body === 'string'
              ? init.body
              : init?.body instanceof Uint8Array
              ? new TextDecoder().decode(init.body)
              : '{}';
          const boardData = JSON.parse(bodyText) as CaseState;
          await service.saveCase(slug, boardData);
          return jsonResponse({ ok: true });
        }
        if (method === 'DELETE') {
          await service.deleteCase(slug);
          return jsonResponse({ ok: true });
        }
      }

      const assetMatch = pathname.match(
        /^\/api\/workspace\/cases\/([^/]+)\/assets\/(.+)$/
      );
      if (assetMatch) {
        const slug = decodeURIComponent(assetMatch[1]);
        const filename = decodeURIComponent(assetMatch[2]);
        if (method === 'GET') {
          const loaded = await service.loadAssetBytes(slug, filename);
          if (!loaded) return jsonResponse({ error: 'Asset not found' }, 404);
          return new Response(loaded.bytes, {
            status: 200,
            headers: { 'Content-Type': loaded.mimeType },
          });
        }
        if (method === 'PUT' || method === 'POST') {
          let bytes = new Uint8Array();
          if (init?.body instanceof Uint8Array) {
            bytes = init.body;
          } else if (init?.body instanceof ArrayBuffer) {
            bytes = new Uint8Array(init.body);
          } else if (typeof Blob !== 'undefined' && init?.body instanceof Blob) {
            bytes = new Uint8Array(await init.body.arrayBuffer());
          } else if (typeof init?.body === 'string') {
            bytes = new TextEncoder().encode(init.body);
          }
          const headers = new Headers(init?.headers);
          const contentType = headers.get('content-type') || undefined;
          const record = await service.saveAssetBytes(
            slug,
            filename,
            bytes,
            contentType
          );
          return jsonResponse(record);
        }
      }

      return jsonResponse({ error: 'Not found' }, 404);
    },
  };

  return service;
}

async function readIncomingBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

/**
 * Vite server middleware plugin exposing `/api/workspace/*` endpoints
 * reading and writing directly to `./workspace/<case-slug>/board.json` and `assets/*`.
 */
export function viteWorkspacePlugin(
  options?: { workspaceDir?: string }
): Plugin {
  const resolvedDir =
    options?.workspaceDir ?? path.resolve(process.cwd(), 'workspace');
  const service = createNodeDiskWorkspaceService(resolvedDir);

  const attachMiddleware = (
    middlewares: {
      use: (
        fn: (
          req: IncomingMessage,
          res: ServerResponse,
          next: () => void
        ) => void
      ) => void;
    }
  ) => {
    middlewares.use(async (req, res, next) => {
      if (!req.url || !req.url.startsWith('/api/workspace')) {
        next();
        return;
      }
      try {
        const method = (req.method || 'GET').toUpperCase();
        const bodyBytes =
          method === 'PUT' || method === 'POST'
            ? await readIncomingBody(req)
            : undefined;
        const response = await service.handleFetchRequest(req.url, {
          method,
          headers: req.headers as Record<string, string>,
          body: bodyBytes,
        });
        res.statusCode = response.status;
        response.headers.forEach((val, key) => {
          res.setHeader(key, val);
        });
        const buf = Buffer.from(await response.arrayBuffer());
        res.end(buf);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: err instanceof Error ? err.message : 'Internal Server Error',
          })
        );
      }
    });
  };

  return {
    name: 'murder-board-local-workspace',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}
