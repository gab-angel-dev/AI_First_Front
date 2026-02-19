# Aba: Custos — Especificação Técnica
## Frontend + API Admin

---

## 1. Visão Geral

Painel financeiro-operacional focado no consumo de tokens e custo estimado da IA. Base para futura evolução em modelo SaaS multi-tenant com cobrança por clínica.

**Tabela utilizada:**
- `token_usage` — registro de tokens por interação

---

## 2. Estrutura da Tabela `token_usage`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID | PK |
| `phone_number` | TEXT | Número do usuário que gerou o consumo |
| `message_id` | TEXT | ID da mensagem do LLM |
| `input_tokens` | INTEGER | Tokens de entrada |
| `output_tokens` | INTEGER | Tokens de saída |
| `total_tokens` | INTEGER | Total da interação |
| `model_name` | TEXT | Modelo usado — ex: `llama-3.3-70b` |
| `provider` | TEXT | Provedor — ex: `cerebras`, `openai` |
| `created_at` | TIMESTAMPTZ | Timestamp da interação |

---

## 3. Filtro de Período

Mesmo padrão da aba Métricas, presente no topo e aplicado a tudo:
- `7 dias`
- `30 dias`
- `90 dias`
- `Personalizado` — date range picker

> Padrão ao carregar: **30 dias**.

---

## 4. Painel Superior — Cards

| Card | Descrição |
|---|---|
| **Total de Tokens** | Soma de `total_tokens` no período |
| **Tokens de Entrada** | Soma de `input_tokens` no período |
| **Tokens de Saída** | Soma de `output_tokens` no período |
| **Custo Estimado (USD)** | Calculado com base no modelo e preço por token |
| **Custo Estimado (BRL)** | Conversão pelo câmbio do dia via API pública |

---

## 5. Cálculo de Custo

O custo é calculado server-side com base nos preços por modelo:

```python
PRECOS = {
    "llama-3.3-70b": {"input": 0.85, "output": 1.20},   # por 1M tokens
    "gpt-4.1":        {"input": 2.00, "output": 8.00},
    "whisper-1":      {"input": 0.006, "output": 0.0},   # por minuto, tratar separado
}

def calcular_custo(input_tokens, output_tokens, model_name):
    preco = PRECOS.get(model_name, {"input": 0, "output": 0})
    custo = (input_tokens * preco["input"] + output_tokens * preco["output"]) / 1_000_000
    return round(custo, 6)
```

> Os preços devem ser configuráveis via variável de ambiente ou tabela no BD — modelos mudam de preço com frequência.

---

## 6. Gráficos

### 6.1 Tokens por Dia — Gráfico de Barras Empilhadas

- Eixo X: dia
- Eixo Y: quantidade de tokens
- Duas barras empilhadas por dia: `input_tokens` (azul) e `output_tokens` (cinza)
- Período: segue filtro global

**Query:**
```sql
SELECT DATE(created_at) AS dia,
       SUM(input_tokens) AS entrada,
       SUM(output_tokens) AS saida
FROM token_usage
WHERE created_at >= %s AND created_at <= %s
GROUP BY dia
ORDER BY dia ASC
```

---

### 6.2 Custo por Dia — Gráfico de Linha

- Eixo X: dia
- Eixo Y: custo em USD
- Calculado server-side por dia
- Permite visualizar picos de custo

---

### 6.3 Distribuição por Modelo — Gráfico de Pizza

- Cada fatia = um modelo (`model_name`)
- Valor = total de tokens consumidos por modelo no período
- Útil para identificar qual modelo domina o custo

**Query:**
```sql
SELECT model_name, SUM(total_tokens) AS total
FROM token_usage
WHERE created_at >= %s AND created_at <= %s
GROUP BY model_name
ORDER BY total DESC
```

---

## 7. Detalhamento por Usuário (tabela)

Seção no final da aba com ranking dos usuários que mais consumiram tokens no período.

Colunas:
- Número / Nome do paciente
- Total de tokens
- Custo estimado (USD)
- Número de interações

**Query:**
```sql
SELECT phone_number,
       COUNT(*) AS interacoes,
       SUM(input_tokens) AS entrada,
       SUM(output_tokens) AS saida,
       SUM(total_tokens) AS total
FROM token_usage
WHERE created_at >= %s AND created_at <= %s
GROUP BY phone_number
ORDER BY total DESC
LIMIT 20
```

> Join com `users.complete_name` para exibir o nome ao lado do número.

---

## 8. Endpoints — API Admin

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/admin/costs/summary` | Cards do painel superior |
| `GET` | `/admin/costs/tokens-by-day` | Dados para gráfico de tokens por dia |
| `GET` | `/admin/costs/cost-by-day` | Dados para gráfico de custo por dia |
| `GET` | `/admin/costs/by-model` | Distribuição por modelo |
| `GET` | `/admin/costs/by-user` | Ranking de consumo por usuário |

**Parâmetros comuns:**
```
?start=2026-01-01&end=2026-01-31
```

---

### 8.1 GET /admin/costs/summary

```json
{
  "total_tokens": 4820300,
  "input_tokens": 3100200,
  "output_tokens": 1720100,
  "estimated_cost_usd": 6.42,
  "estimated_cost_brl": 38.52,
  "exchange_rate": 6.00,
  "period": {"start": "2026-01-01", "end": "2026-01-31"}
}
```

---

## 9. Observações

- **Câmbio em tempo real:** usar API pública como `https://open.er-api.com/v6/latest/USD` para conversão USD → BRL. Cachear por 1 hora no Redis para não sobrecarregar
- **Preços por modelo:** externalizar em `.env` ou tabela de configuração — não hardcodar no código
- **Whisper (áudio):** cobrado por minuto, não por token. A tabela `token_usage` atual não suporta isso bem — considerar campo `audio_seconds` futuramente
- **Evolução SaaS:** esta aba é a base para cobrança por clínica. Quando multi-tenant, adicionar `clinic_id` na `token_usage` e filtrar por clínica
