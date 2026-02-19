# Aba: Métricas — Especificação Técnica
## Frontend + API Admin

---

## 1. Visão Geral

Painel central de inteligência operacional da clínica. Consolida dados de agendamentos, mensagens, usuários e doutores em um único lugar, com suporte a filtros de período e exportação em PDF.

**Tabelas utilizadas:**
- `calendar_events` — agendamentos
- `users` — contagem de pacientes
- `chat` — volume de mensagens
- `doctor_rules` — dados dos doutores

---

## 2. Filtro de Período

Presente no topo da aba, aplica-se a **todos** os cards e gráficos simultaneamente.

Opções:
- `7 dias`
- `30 dias`
- `90 dias`
- `Personalizado` — date range picker (data início + data fim)

> Padrão ao carregar a aba: **30 dias**.

---

## 3. Painel Superior — Cards de Métricas

Quatro cards principais exibidos em linha:

| Card | Fonte | Query base |
|---|---|---|
| **Total de Mensagens** | `chat` | `COUNT(*) WHERE created_at >= periodo` |
| **Total de Usuários** | `users` | `COUNT(*) WHERE created_at >= periodo` |
| **Agendamentos** | `calendar_events` | `COUNT(*) WHERE created_at >= periodo` |
| **Média Msg/Conversa** | `chat` + `users` | `COUNT(chat) / COUNT(DISTINCT session_id)` |

---

## 4. Gráficos

### 4.1 Agendamentos por Mês — Gráfico de Barras

- Eixo X: mês/ano
- Eixo Y: quantidade de agendamentos
- Período: sempre exibe os últimos 6 meses independente do filtro global
- Fonte: `calendar_events.start_time`

**Query:**
```sql
SELECT DATE_TRUNC('month', start_time) AS mes, COUNT(*) AS total
FROM calendar_events
GROUP BY mes
ORDER BY mes DESC
LIMIT 6
```

---

### 4.2 Mensagens por Dia — Gráfico de Linha

- Eixo X: dia
- Eixo Y: quantidade de mensagens
- Período: segue o filtro global
- Separado por `sender`: linha azul (usuário) e linha cinza (IA)
- Fonte: `chat.created_at`, `chat.sender`

**Query:**
```sql
SELECT DATE(created_at) AS dia, sender, COUNT(*) AS total
FROM chat
WHERE created_at >= %s AND created_at <= %s
GROUP BY dia, sender
ORDER BY dia ASC
```

---

### 4.3 Distribuição de Procedimentos — Gráfico de Pizza

- Cada fatia = um tipo de procedimento
- Exibe os top 6 procedimentos + "Outros"
- Período: segue o filtro global
- Fonte: `calendar_events.procedure`

**Query:**
```sql
SELECT procedure, COUNT(*) AS total
FROM calendar_events
WHERE created_at >= %s AND created_at <= %s
GROUP BY procedure
ORDER BY total DESC
LIMIT 6
```

---

## 5. Painel de Doutores

Seção abaixo dos gráficos com ranking de doutores por agendamentos.

Cada item exibe:
- Nome do doutor
- Total de agendamentos no período
- Barra de progresso proporcional ao maior valor
- Status: Ativo / Inativo

**Query:**
```sql
SELECT dr.name, COUNT(ce.id) AS total_agendamentos
FROM doctor_rules dr
LEFT JOIN calendar_events ce
  ON ce.dr_responsible = dr.name
  AND ce.created_at >= %s AND ce.created_at <= %s
WHERE dr.active = true
GROUP BY dr.name
ORDER BY total_agendamentos DESC
```

---

## 6. Relatório PDF

Botão `Gerar Relatório` no topo da aba. Ao clicar, chama o endpoint que gera e retorna o PDF com base no período selecionado.

**Conteúdo do PDF:**
1. Cabeçalho com nome da clínica e período do relatório
2. Cards de métricas (total mensagens, usuários, agendamentos, média msg/conversa)
3. Gráfico de agendamentos por mês
4. Gráfico de mensagens por dia
5. Gráfico de distribuição de procedimentos
6. Ranking de doutores por agendamentos
7. Lista de agendamentos do período (data, hora, paciente, procedimento, doutor)

---

## 7. Endpoints — API Admin

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/admin/metrics/summary` | Cards do painel superior |
| `GET` | `/admin/metrics/appointments-by-month` | Dados para gráfico de agendamentos |
| `GET` | `/admin/metrics/messages-by-day` | Dados para gráfico de mensagens |
| `GET` | `/admin/metrics/procedures-distribution` | Dados para gráfico de pizza |
| `GET` | `/admin/metrics/doctors-ranking` | Painel de doutores |
| `GET` | `/admin/metrics/report/pdf` | Gera e retorna o PDF |

**Parâmetros comuns (query string):**
```
?start=2026-01-01&end=2026-01-31
```

---

### 7.1 GET /admin/metrics/summary

```json
{
  "total_messages": 1240,
  "total_users": 87,
  "total_appointments": 43,
  "avg_messages_per_conversation": 14.2,
  "period": {"start": "2026-01-01", "end": "2026-01-31"}
}
```

---

### 7.2 GET /admin/metrics/report/pdf

- Retorna o arquivo PDF como `application/pdf`
- Frontend dispara download automático no browser
- Gerado server-side com `reportlab` ou `weasyprint`

---

## 8. Observações

- Todos os endpoints recebem `start` e `end` como query params obrigatórios
- O filtro de período do frontend deve enviar as datas em formato `YYYY-MM-DD`
- `dr_responsible` em `calendar_events` é o nome do doutor — join feito por nome, não por UUID. Considerar adicionar `doctor_id` futuramente para joins mais robustos
- Gráficos podem ser renderizados com `Chart.js` ou `Recharts` no frontend
- PDF gerado server-side garante consistência visual independente do browser do usuário
