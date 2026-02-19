# Aba: Agenda — Especificação Técnica
## Frontend + API Admin

---

## 1. Visão Geral

Painel de visualização e gerenciamento completo da agenda da clínica. Reflete os agendamentos da tabela `calendar_events` e sincroniza com o Google Calendar para criação e cancelamento. O admin tem as mesmas capacidades que a IA — tudo que o agente faz automaticamente pode ser feito manualmente pelo painel.

**Tabelas utilizadas:**
- `calendar_events` — fonte de verdade dos agendamentos
- `doctor_rules` — dados dos doutores para filtros e criação
- `users` — dados do paciente exibidos no detalhe do evento

**Decisão arquitetural:** frontend lê `calendar_events` do BD (não consulta Google Calendar diretamente). Criação e cancelamento passam pela API Admin, que sincroniza com o Google Calendar server-side.

---

## 2. Referência da Tabela `calendar_events`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL | PK |
| `user_number` | VARCHAR(20) | Número do paciente |
| `event_id` | VARCHAR(255) | ID do evento no Google Calendar |
| `summary` | VARCHAR(500) | Título do evento |
| `dr_responsible` | VARCHAR(100) | Nome do doutor |
| `procedure` | VARCHAR(100) | Procedimento agendado |
| `description` | VARCHAR(100) | Observações do agendamento |
| `status` | VARCHAR(20) | `pending`, `confirmed`, `canceled` |
| `start_time` | TIMESTAMPTZ | Início da consulta |
| `end_time` | TIMESTAMPTZ | Fim da consulta |
| `created_at` | TIMESTAMPTZ | Data de criação do registro |

---

## 3. Layout da Agenda

### 3.1 Barra Superior

- Toggle de visualização: **Mensal** | **Semanal**
- Navegação: botões `<` anterior e `>` próximo + botão `Hoje`
- Filtro por doutor: dropdown com todos os doutores ativos
- Botão `+ Novo Agendamento`

---

### 3.2 Visualização Mensal

- Grade de calendário com dias do mês
- Cada evento exibido como bloco colorido com:
  - Horário de início
  - Nome do paciente (ou número se não cadastrado)
  - Procedimento
- Cor por doutor (cada doutor tem uma cor fixa)
- Ao clicar no evento → abre modal de detalhes

---

### 3.3 Visualização Semanal

- Grade de 7 colunas (dias) × timeline de horários
- Eventos como blocos proporcionais à duração
- Mesma lógica de cores por doutor
- Ao clicar no evento → abre modal de detalhes

---

## 4. Modal de Detalhes do Evento

Ao clicar em qualquer evento, exibe:

**Dados do agendamento:**
- Procedimento
- Doutor responsável
- Data e horário (início e fim)
- Status (`pending` / `confirmed` / `canceled`)
- Observações

**Dados do paciente** (join com `users`):
- Nome completo
- Número de WhatsApp (clicável)
- Convênio (`metadata.convenio_tipo`)

**Ações disponíveis:**
- `Cancelar Agendamento` — abre confirmação antes de executar
- `Ir para o chat` — atalho para a aba Usuários filtrada pelo paciente

---

## 5. Criação de Agendamento pelo Painel

Ao clicar em `+ Novo Agendamento`, abre modal com o mesmo fluxo que a IA executa:

**Passo 1 — Dados básicos:**
| Campo | Input | Obrigatório |
|---|---|---|
| Paciente | Busca por nome ou número (autocomplete em `users`) | Sim |
| Doutor | Dropdown com doutores ativos | Sim |
| Procedimento | Dropdown com `procedures` do doutor selecionado | Sim |

**Passo 2 — Data e horário:**
- Date picker + time picker para horário de início
- Horário de fim calculado automaticamente com base em `duracao_minutos` do procedimento
- API verifica disponibilidade no Google Calendar antes de confirmar

**Passo 3 — Observações:**
- Campo livre de texto (equivale ao `description`)

**Ao confirmar:**
1. API cria evento no Google Calendar
2. API insere em `calendar_events`
3. API notifica o doutor via Evolution API (mesmo fluxo da IA)
4. API cria lembrete no scheduler
5. Agenda atualiza em tempo real

---

## 6. Cancelamento pelo Painel

Ao clicar em `Cancelar Agendamento` no modal:
1. Modal de confirmação: `"Tem certeza que deseja cancelar a consulta de {paciente} em {data}?"`
2. API deleta evento do Google Calendar
3. API deleta registro de `calendar_events`
4. API cancela lembrete no scheduler
5. Agenda atualiza removendo o evento

> Mesma lógica da tool `cancelar_consulta` do agente.

---

## 7. Endpoints — API Admin

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/admin/agenda` | Lista eventos por período e filtro de doutor |
| `POST` | `/admin/agenda` | Cria novo agendamento (Calendar + BD + notificações) |
| `DELETE` | `/admin/agenda/{event_id}` | Cancela agendamento (Calendar + BD + scheduler) |
| `GET` | `/admin/agenda/availability` | Verifica disponibilidade de horário |

---

### 7.1 GET /admin/agenda

**Query params:**
```
?start=2026-02-01&end=2026-02-28&doctor=Dra. Maria Silva
```

**Resposta:**
```json
[
  {
    "event_id": "abc123",
    "user_number": "5585999990000",
    "patient_name": "João Silva",
    "dr_responsible": "Dra. Maria Silva",
    "procedure": "Limpeza",
    "description": "Paciente com sensibilidade",
    "status": "pending",
    "start_time": "2026-02-10T09:00:00-03:00",
    "end_time": "2026-02-10T09:30:00-03:00"
  }
]
```

---

### 7.2 POST /admin/agenda — Payload

```json
{
  "user_number": "5585999990000",
  "doctor_id": "uuid-do-doutor",
  "procedure": "Limpeza",
  "start_time": "2026-02-10T09:00:00-03:00",
  "description": "Agendado pelo painel admin"
}
```

A API calcula `end_time` com base em `duracao_minutos` do procedimento.

**Resposta:**
```json
{
  "event_id": "abc123",
  "start_time": "2026-02-10T09:00:00-03:00",
  "end_time": "2026-02-10T09:30:00-03:00",
  "status": "pending"
}
```

---

### 7.3 GET /admin/agenda/availability

**Query params:**
```
?calendar_id=medico@gmail.com&start=2026-02-10T09:00:00-03:00&end=2026-02-10T09:30:00-03:00
```

**Resposta:**
```json
{ "available": true }
```
ou
```json
{
  "available": false,
  "conflict": {
    "summary": "Consulta com 5585999991111",
    "start": "2026-02-10T09:00:00-03:00",
    "end": "2026-02-10T09:30:00-03:00"
  }
}
```

---

### 7.4 DELETE /admin/agenda/{event_id}

Sem payload. Executa em sequência:
1. `calendar_client.deletar(event_id, calendar_id)`
2. `PostgreSQL.delete_calendar_event(user_number, event_id)`
3. `delete_scheduler_message(event_id)`

**Resposta:**
```json
{ "status": "cancelado", "event_id": "abc123" }
```

---

## 8. Observações

- **Cores por doutor:** gerar uma cor fixa por `dr_responsible` via hash do nome — garante consistência entre sessões sem configuração manual
- **Atualização da agenda:** reload após criação ou cancelamento. WebSocket é evolução futura
- **`status` dos eventos:** atualmente a IA sempre cria como `pending`. O painel pode evoluir para permitir marcar como `confirmed` manualmente
- **Join com `users`:** feito no endpoint `GET /admin/agenda` — retornar `patient_name` já resolvido para o frontend não precisar fazer chamadas extras
- **Fuso horário:** todos os horários armazenados em UTC no BD, converter para `America/Sao_Paulo` na exibição
- **Atalho para o chat:** o botão "Ir para o chat" no modal passa o `user_number` como parâmetro de rota para a aba Usuários — ex: `/admin/users?number=5585999990000`
