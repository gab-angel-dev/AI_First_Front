// ─── Preços por modelo (por 1M tokens) ───────────────────────────────────────

const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "llama-3.3-70b":   { input: 0.85,  output: 1.20 },
  "gpt-4o":          { input: 2.50,  output: 10.00 },
  "gpt-4o-mini":     { input: 0.15,  output: 0.60 },
  "gpt-4.1":         { input: 2.00,  output: 8.00 },
  "gpt-4.1-mini":    { input: 0.40,  output: 1.60 },
  "llama3.1-8b":     { input: 0.10,  output: 0.10},
};

export function calcularCusto(
  inputTokens: number,  
  outputTokens: number,
  modelName: string
): number {
  const preco = MODEL_PRICES[modelName] ?? { input: 0, output: 0 };
  const custo =
    (inputTokens * preco.input + outputTokens * preco.output) / 1_000_000;
  return Math.round(custo * 1_000_000) / 1_000_000;
}

// ─── Cache de câmbio em memória (TTL 1 hora) ──────────────────────────────────

let cachedRate: number | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const FALLBACK_RATE = 5.0;

export async function getUsdToBrl(): Promise<{ rate: number; cached: boolean }> {
  const now = Date.now();

  if (cachedRate !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return { rate: cachedRate, cached: true };
  }

  try {
    const res = await fetch(
      "https://economia.awesomeapi.com.br/last/USD-BRL",
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json() as { USDBRL: { bid: string } };
    const rate = parseFloat(data.USDBRL.bid);
    if (!isNaN(rate) && rate > 0) {
      cachedRate = rate;
      cacheTimestamp = now;
      return { rate, cached: false };
    }
    throw new Error("Taxa inválida");
  } catch (e) {
    console.warn("Erro ao buscar câmbio USD→BRL, usando fallback:", e);
    return { rate: cachedRate ?? FALLBACK_RATE, cached: true };
  }
}