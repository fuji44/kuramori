import { parseArgs } from 'jsr:@std/cli@^1.0.9/parse-args';

async function main() {
  const args = parseArgs(Deno.args, {
    string: ['url', 'model', 'auth-token'],
    boolean: ['help'],
    alias: {
      u: 'url',
      m: 'model',
      h: 'help',
    },
    default: {
      url: 'http://localhost:4000',
      model: 'ornith-1.5:9b',
    },
  });

  if (args.help) {
    console.log(`
Usage: deno run -A packages/runner/scripts/verify-local-llm.ts [options]

Options:
  -u, --url <url>          Endpoint URL (default: http://localhost:4000 for LiteLLM, or http://localhost:11434 for Ollama)
  -m, --model <name>       Target model name (default: ornith-1.5:9b)
      --auth-token <token> Optional Bearer token
  -h, --help               Show this help message
`);
    Deno.exit(0);
  }

  const baseUrl = args.url.replace(/\/$/, '');
  const model = args.model;
  const authToken = args['auth-token'] ?? 'dummy-key';

  console.log(`=== Local LLM Inference Endpoint Verification ===`);
  console.log(`Target URL:   ${baseUrl}`);
  console.log(`Target Model: ${model}\n`);

  // 1. ヘルスチェック
  console.log(`[1/3] Checking server connectivity...`);
  try {
    const healthRes = await fetch(`${baseUrl}/health`).catch(() => fetch(`${baseUrl}/`));
    console.log(`  -> Server responded with status: ${healthRes.status} ${healthRes.statusText}`);
  } catch (err) {
    console.error(`  [FAIL] Could not connect to ${baseUrl}: ${err}`);
    console.error(`  Hint: Ensure your LiteLLM proxy or Ollama server is running.`);
    Deno.exit(1);
  }

  // 2. モデル一覧の取得・確認
  console.log(`\n[2/3] Checking available models...`);
  let foundModel = false;
  try {
    // OpenAI互換 /v1/models を試す
    const modelsRes = await fetch(`${baseUrl}/v1/models`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (modelsRes.ok) {
      const data = await modelsRes.json();
      const modelIds: string[] = (data.data || []).map((m: { id?: string }) => m.id ?? '');
      console.log(`  Available models in endpoint: ${modelIds.join(', ') || '(none reported)'}`);
      foundModel = modelIds.some((id) => id.includes(model) || model.includes(id));
    } else {
      // Ollama /api/tags を試す
      const ollamaRes = await fetch(`${baseUrl}/api/tags`);
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        const modelNames: string[] = (data.models || []).map((m: { name?: string }) => m.name ?? '');
        console.log(`  Available Ollama models: ${modelNames.join(', ') || '(none reported)'}`);
        foundModel = modelNames.some((n) => n.includes(model) || model.includes(n));
      }
    }
  } catch (err) {
    console.warn(`  [WARN] Could not retrieve model list: ${err}`);
  }

  if (foundModel) {
    console.log(`  -> Model "${model}" was found in endpoint model list!`);
  } else {
    console.warn(`  [INFO] Target model "${model}" not explicitly listed, but proceeding with test generation...`);
  }

  // 3. テスト推論 (Chat Completion)
  console.log(`\n[3/3] Testing inference response with sample prompt...`);
  try {
    const startTime = Date.now();
    const chatRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: 'Reply with ONLY the word "OK" in JSON format: {"status": "OK"}' },
        ],
        temperature: 0.1,
      }),
    });

    if (!chatRes.ok) {
      const errorBody = await chatRes.text();
      console.error(`  [FAIL] Inference failed with status ${chatRes.status}: ${errorBody}`);
      Deno.exit(1);
    }

    const chatJson = await chatRes.json();
    const elapsedMs = Date.now() - startTime;
    const responseText = chatJson.choices?.[0]?.message?.content ?? '(no content)';

    console.log(`  -> Response received in ${elapsedMs}ms:`);
    console.log(`     ${responseText.trim()}`);
    console.log(`\n[SUCCESS] Local LLM endpoint is healthy and ready for review-runner!`);
    console.log(`\nTo run a review with this local setup:`);
    console.log(`  deno task runner --repo owner/repo --pr 123 --engine claude-code --model ${model} --api-base-url ${baseUrl}`);
  } catch (err) {
    console.error(`  [FAIL] Failed to execute chat completion test: ${err}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
