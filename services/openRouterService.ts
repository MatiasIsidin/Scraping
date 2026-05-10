// ============================================================
// OPENROUTER SERVICE — Reusable LLM Client
// Sprint 3 — Starter Story LATAM Engine
//
// Responsibilities:
//   - Single gateway for ALL LLM calls in the system
//   - OpenRouter primary → OpenAI fallback (per constitution)
//   - Retry with exponential backoff
//   - Rate limiting via inter-request delay
//   - Token & cost tracking per call
//   - Structured JSON enforcement + repair
// ============================================================

// ── Configuration ───────────────────────────────────────────

const OPENROUTER_API_KEY = () => process.env.OPENROUTER_API_KEY || '';
const OPENAI_API_KEY = () => process.env.OPENAI_API_KEY || '';
const DEFAULT_MODEL = () => process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const INTER_REQUEST_DELAY_MS = 600; // Rate limit guard between sequential calls

// ── Types ───────────────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequestOptions {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** Override: skip fallback even if OpenAI key is present */
  skipFallback?: boolean;
  /** Tag for logging (e.g. 'pain_point_extraction', 'latam_enrichment') */
  pipelineTag?: string;
}

export interface LLMResponse {
  success: boolean;
  content: string;
  parsed: any;
  model_used: string;
  provider: 'openrouter' | 'openai' | 'none';
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  estimated_cost_usd: number;
  latency_ms: number;
  retries_used: number;
  error?: string;
}

// ── Cost Estimation ─────────────────────────────────────────

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'google/gemma-3-27b-it:free': { input: 0, output: 0 },
  'google/gemma-3-12b-it:free': { input: 0, output: 0 },
  'meta-llama/llama-4-scout:free': { input: 0, output: 0 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
};

function estimateCostUSD(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
  const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  return Math.round(cost * 100000) / 100000; // 5 decimal precision
}

// ── JSON Repair (lightweight) ───────────────────────────────

function tryParseJSON(raw: string): { parsed: any; repaired: boolean } {
  // 1. Direct parse
  try {
    return { parsed: JSON.parse(raw), repaired: false };
  } catch { /* continue */ }

  // 2. Strip markdown fences
  const stripped = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  try {
    return { parsed: JSON.parse(stripped), repaired: true };
  } catch { /* continue */ }

  // 3. Find first { ... } or [ ... ] block
  const braceMatch = stripped.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return { parsed: JSON.parse(braceMatch[0]), repaired: true };
    } catch { /* continue */ }
  }
  const bracketMatch = stripped.match(/\[[\s\S]*\]/);
  if (bracketMatch) {
    try {
      return { parsed: JSON.parse(bracketMatch[0]), repaired: true };
    } catch { /* continue */ }
  }

  // 4. Attempt common fixes: trailing commas, unquoted keys
  const fixed = stripped
    .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
    .replace(/(['"])?(\w+)(['"])?\s*:/g, '"$2":') // Quote keys
    .replace(/:\s*'([^']*)'/g, ': "$1"'); // Single → double quotes
  try {
    const m = fixed.match(/\{[\s\S]*\}/);
    if (m) return { parsed: JSON.parse(m[0]), repaired: true };
  } catch { /* give up */ }

  return { parsed: null, repaired: false };
}

// ── Core API Callers ────────────────────────────────────────

async function callOpenRouter(
  messages: LLMMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
  jsonMode: boolean
): Promise<{ content: string; usage: any; model: string }> {
  const apiKey = OPENROUTER_API_KEY();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const body: any = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  // Not all OpenRouter models support response_format
  // Gemma free models may not support it, so we only add it for non-free models
  if (jsonMode && !model.includes(':free')) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://starter-story-latam.vercel.app',
      'X-Title': 'Starter Story LATAM Engine',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => 'unknown');
    throw new Error(`OpenRouter ${response.status}: ${errBody.substring(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    content,
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model: data.model || model,
  };
}

async function callOpenAI(
  messages: LLMMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
  jsonMode: boolean
): Promise<{ content: string; usage: any; model: string }> {
  const apiKey = OPENAI_API_KEY();
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const body: any = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(OPENAI_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => 'unknown');
    throw new Error(`OpenAI ${response.status}: ${errBody.substring(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    content,
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model: data.model || model,
  };
}

// ── Delay Utility ───────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Timestamp of last request — for rate limiting
let lastRequestTime = 0;

// ── Main Entry Point ────────────────────────────────────────

/**
 * callLLM — Unified LLM gateway with retry + fallback.
 *
 * Priority: OpenRouter → OpenAI (per constitution LLM Fallback Chain).
 * Returns parsed JSON if jsonMode is true.
 */
export async function callLLM(options: LLMRequestOptions): Promise<LLMResponse> {
  const {
    messages,
    model,
    temperature = 0.2,
    maxTokens = 4000,
    jsonMode = true,
    skipFallback = false,
    pipelineTag = 'generic',
  } = options;

  const startTime = Date.now();
  const resolvedModel = model || DEFAULT_MODEL();
  let retriesUsed = 0;

  // Rate limit: ensure minimum gap between requests
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < INTER_REQUEST_DELAY_MS) {
    await delay(INTER_REQUEST_DELAY_MS - elapsed);
  }

  // ── Try OpenRouter with retries ───────────────────────────

  const hasOpenRouter = !!OPENROUTER_API_KEY();

  if (hasOpenRouter) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        lastRequestTime = Date.now();
        console.log(`[OPENROUTER] [${pipelineTag}] Attempt ${attempt + 1}/${MAX_RETRIES} | Model: ${resolvedModel}`);

        const result = await callOpenRouter(messages, resolvedModel, temperature, maxTokens, jsonMode);
        const { parsed, repaired } = jsonMode
          ? tryParseJSON(result.content)
          : { parsed: result.content, repaired: false };

        if (jsonMode && parsed === null) {
          // JSON was requested but unparseable — retry
          console.warn(`[OPENROUTER] [${pipelineTag}] JSON parse failed on attempt ${attempt + 1}. Retrying...`);
          retriesUsed++;
          await delay(BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        if (repaired) {
          console.warn(`[OPENROUTER] [${pipelineTag}] JSON was repaired from raw output.`);
        }

        const usage = {
          prompt_tokens: result.usage.prompt_tokens || 0,
          completion_tokens: result.usage.completion_tokens || 0,
          total_tokens: result.usage.total_tokens || (result.usage.prompt_tokens || 0) + (result.usage.completion_tokens || 0),
        };

        return {
          success: true,
          content: result.content,
          parsed,
          model_used: result.model,
          provider: 'openrouter',
          token_usage: usage,
          estimated_cost_usd: estimateCostUSD(resolvedModel, usage.prompt_tokens, usage.completion_tokens),
          latency_ms: Date.now() - startTime,
          retries_used: retriesUsed,
        };
      } catch (err: any) {
        retriesUsed++;
        const isRateLimit = err.message.includes('429');
        console.error(`[OPENROUTER] [${pipelineTag}] Attempt ${attempt + 1} failed: ${err.message}`);

        if (attempt < MAX_RETRIES - 1) {
          // Double backoff if it's a rate limit error
          const multiplier = isRateLimit ? 4 : 2;
          const backoff = BASE_DELAY_MS * Math.pow(multiplier, attempt);
          console.log(`[OPENROUTER] [${pipelineTag}] ${isRateLimit ? 'Rate limit hit. ' : ''}Backoff ${backoff}ms before retry...`);
          await delay(backoff);
        }
      }
    }
  }

  // ── Fallback to OpenAI ────────────────────────────────────

  const hasOpenAI = !!OPENAI_API_KEY();

  if (!skipFallback && hasOpenAI) {
    const fallbackModel = 'gpt-4o-mini';
    console.warn(`[OPENAI-FALLBACK] [${pipelineTag}] Switching to OpenAI (${fallbackModel})...`);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        lastRequestTime = Date.now();
        const result = await callOpenAI(messages, fallbackModel, temperature, maxTokens, jsonMode);
        const { parsed, repaired } = jsonMode
          ? tryParseJSON(result.content)
          : { parsed: result.content, repaired: false };

        if (jsonMode && parsed === null) {
          retriesUsed++;
          await delay(BASE_DELAY_MS);
          continue;
        }

        if (repaired) {
          console.warn(`[OPENAI-FALLBACK] [${pipelineTag}] JSON was repaired.`);
        }

        const usage = {
          prompt_tokens: result.usage.prompt_tokens || 0,
          completion_tokens: result.usage.completion_tokens || 0,
          total_tokens: result.usage.total_tokens || 0,
        };

        return {
          success: true,
          content: result.content,
          parsed,
          model_used: result.model,
          provider: 'openai',
          token_usage: usage,
          estimated_cost_usd: estimateCostUSD(fallbackModel, usage.prompt_tokens, usage.completion_tokens),
          latency_ms: Date.now() - startTime,
          retries_used: retriesUsed,
        };
      } catch (err: any) {
        retriesUsed++;
        console.error(`[OPENAI-FALLBACK] [${pipelineTag}] Attempt ${attempt + 1} failed: ${err.message}`);
      }
    }
  }

  // ── Total failure ─────────────────────────────────────────

  const errorMsg = !hasOpenRouter && !hasOpenAI
    ? 'No LLM API keys configured (OPENROUTER_API_KEY / OPENAI_API_KEY)'
    : `All LLM attempts exhausted (${retriesUsed} retries across providers)`;

  console.error(`[LLM-FATAL] [${pipelineTag}] ${errorMsg}`);

  return {
    success: false,
    content: '',
    parsed: null,
    model_used: 'none',
    provider: 'none',
    token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    estimated_cost_usd: 0,
    latency_ms: Date.now() - startTime,
    retries_used: retriesUsed,
    error: errorMsg,
  };
}

// ── Convenience Exports ─────────────────────────────────────

export { estimateCostUSD, tryParseJSON, MODEL_PRICING };
