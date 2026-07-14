import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const serverDir = path.join(distDir, 'server');
const distOpenAiDir = path.join(distDir, '.openai');

await mkdir(serverDir, { recursive: true });
await mkdir(distOpenAiDir, { recursive: true });
await copyFile(
  path.join(rootDir, '.openai', 'hosting.json'),
  path.join(distOpenAiDir, 'hosting.json')
);

const serverSource = await readFile(path.join(rootDir, 'server.ts'), 'utf8');
const systemInstructionMatch = serverSource.match(
  /const SYSTEM_INSTRUCTION = `([\s\S]*?)`;/m
);

if (!systemInstructionMatch) {
  throw new Error('Unable to find SYSTEM_INSTRUCTION in server.ts');
}

const contentTypes = {
  '.css': 'text/css; charset=UTF-8',
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8'
};

async function collectAssets(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const assets = {};

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(distDir, fullPath).split(path.sep).join('/');

    if (
      relativePath.startsWith('server/') ||
      relativePath.startsWith('.openai/') ||
      relativePath === 'server.cjs' ||
      relativePath === 'server.cjs.map'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      Object.assign(assets, await collectAssets(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    assets[`/${relativePath}`] = {
      body: await readFile(fullPath, 'utf8'),
      contentType: contentTypes[path.extname(entry.name)] || 'application/octet-stream'
    };
  }

  return assets;
}

const assets = await collectAssets(distDir);

if (assets['/index.html']) {
  assets['/index.html'].body = assets['/index.html'].body
    .replace(
      /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
      (_match, src) => assets[src] ? `<script type="module">\n${assets[src].body}\n</script>` : ''
    )
    .replace(
      /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
      (_match, href) => assets[href] ? `<style>\n${assets[href].body}\n</style>` : ''
    );

  for (const assetPath of Object.keys(assets)) {
    if (assetPath !== '/index.html') {
      delete assets[assetPath];
    }
  }
}

const generatedServer = `const assets = ${JSON.stringify(assets)};
const SYSTEM_INSTRUCTION = ${JSON.stringify(systemInstructionMatch[1])};
const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8' }
  });
}

function extractText(payload) {
  return payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();
}

function isRetryable(status, message) {
  const text = String(message || '').toLowerCase();
  return status === 429 ||
    status === 503 ||
    text.includes('429') ||
    text.includes('503') ||
    text.includes('unavailable') ||
    text.includes('high demand') ||
    text.includes('busy') ||
    text.includes('limit') ||
    text.includes('spike');
}

async function callGemini(env, contents, systemInstruction, temperature = 0.7) {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error('Gemini API Client is not initialized. Please ensure GEMINI_API_KEY is configured in Secrets.');
    error.status = 503;
    throw error;
  }

  let lastError;

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(
          \`https://generativelanguage.googleapis.com/v1beta/models/\${model}:generateContent?key=\${encodeURIComponent(apiKey)}\`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemInstruction }] },
              generationConfig: { temperature }
            })
          }
        );

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message = payload?.error?.message || \`Gemini API request failed with status \${response.status}\`;
          const error = new Error(message);
          error.status = response.status;
          throw error;
        }

        const text = extractText(payload);

        if (text) {
          return text;
        }

        throw new Error('No response text returned from the model.');
      } catch (error) {
        lastError = error;
        const status = error.status || 500;

        if (!isRetryable(status, error.message)) {
          break;
        }

        if (model === MODELS[0]) {
          break;
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, (2 ** attempt) * 1000));
        }
      }
    }
  }

  throw lastError || new Error('Failed to generate content after retries and fallback.');
}

async function handleChat(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const { message, history, context } = await request.json();
  let contextStr = '';

  if (context) {
    contextStr = '\\n\\n[ live state context ณ ปัจจุบันของโครงการบ้านสวน ]\\n' +
      '- จำนวนบ้านทั้งหมด: 10 หลัง\\n' +
      \`- บ้านที่มีผู้เช่าอยู่จริง: \${context.occupiedCount} หลัง (ว่าง \${10 - context.occupiedCount} หลัง)\\n\` +
      \`- ยอดค้างชำระค่าเช่า/ค่าน้ำไฟเดือนนี้: \${context.pendingBillsCount} บิล\\n\` +
      \`- รายการบ้านและผู้เช่า ณ ตอนนี้: \\n\${JSON.stringify(context.housesSummary, null, 2)}\`;
  }

  const contents = [];

  if (Array.isArray(history)) {
    for (const msg of history) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    const text = await callGemini(env, contents, SYSTEM_INSTRUCTION + contextStr, 0.7);
    return jsonResponse({ text });
  } catch (error) {
    return jsonResponse(
      { error: error.message || 'An error occurred while talking to the assistant.' },
      error.status || 500
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === '/api/chat') {
      return handleChat(request, env);
    }

    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    let asset = assets[pathname];

    if (!asset && request.method === 'GET' && !pathname.includes('.')) {
      asset = assets['/index.html'];
    }

    if (!asset) {
      return new Response('Not found', { status: 404 });
    }

    return new Response(request.method === 'HEAD' ? null : asset.body, {
      headers: {
        'content-type': asset.contentType,
        'cache-control': pathname === '/index.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
      }
    });
  }
};
`;

await writeFile(path.join(serverDir, 'index.js'), generatedServer);
