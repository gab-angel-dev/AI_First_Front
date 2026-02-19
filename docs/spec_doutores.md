# Aba: Doutores — Especificação Técnica
## Frontend + API Admin

---

## 1. Visão Geral

Painel de configuração dos médicos/dentistas da clínica. Cada doutor cadastrado aqui é reconhecido pelos agentes de IA para agendamento, listagem de procedimentos e verificação de disponibilidade.

**Funcionalidades:**
- Listar todos os doutores cadastrados
- Adicionar novo doutor via formulário (`+`)
- Editar doutor existente
- Ativar / desativar doutor

> Doutores com `active = false` são ignorados pelos agentes. Nunca deletar — preserva histórico de agendamentos.

---

## 2. Listagem de Doutores

Cada doutor exibido como card com:
- Nome completo
- Lista de procedimentos que atende
- Dias da semana disponíveis (ex: Seg, Ter, Qua, Qui, Sex)
- Status: **Ativo** / **Inativo** (badge colorido)
- Botões de ação: `Editar` | `Ativar/Desativar`

Doutores inativos aparecem com visual esmaecido.

---

## 3. Formulário de Cadastro / Edição

Ao clicar em `+` ou `Editar`, exibe modal com os campos abaixo.

---

### 3.1 Campos Simples

| Campo | Input | Obrigatório | Observação |
|---|---|---|---|
| `name` | Text | Sim | Nome completo — ex: `Dra. Maria Silva` |
| `doctor_number` | Text | Não | WhatsApp para notificações — ex: `5585999990000` |
| `calendar_id` | Text | Sim | ID do Google Calendar — ex: `medico@gmail.com` |
| `active` | Toggle | Sim | Se está disponível para a IA agendar |

---

### 3.2 Campo: `procedures` (JSONB — array de objetos)

Interface: lista dinâmica onde cada item é um procedimento com seus próprios campos.

Botão `+ Adicionar procedimento` expande um formulário com:

| Campo | Input | Obrigatório | Observação |
|---|---|---|---|
| `nome` | Text | Sim | Ex: `Limpeza` — salvar com capitalização normal |
| `duracao_minutos` | Number | Sim | Mínimo 15 — ex: `30` |
| `preco` | Number ou Select | Sim | Valor numérico ou `"definir_com_doutor"` |
| `descricao` | Textarea | Não | Texto explicativo do procedimento |
| `triagem` | Textarea | Não | Instrução em linguagem natural para a IA executar antes de agendar. `null` = sem triagem |

**Estrutura salva no BD:**
```json
[
  {
    "nome": "Limpeza",
    "duracao_minutos": 30,
    "preco": 0,
    "descricao": "Remoção de placa bacteriana e polimento dos dentes.",
    "triagem": "Pergunte se faz mais de 6 meses da última limpeza pelo plano. Se não, bloqueie o agendamento e informe que o intervalo mínimo é de 6 meses."
  },
  {
    "nome": "Canal",
    "duracao_minutos": 90,
    "preco": "definir_com_doutor",
    "descricao": "Tratamento endodôntico.",
    "triagem": null
  }
]
```

> **Crítico:** a busca dos agentes usa `lower(p->>'nome') = lower(%s)`. O nome não precisa ser lowercase no cadastro, mas deve ser consistente.

---

### 3.3 Campo: `available_weekdays` (JSONB — lista de inteiros)

Interface: checkboxes ou botões de seleção dos dias da semana.

| Valor | Dia |
|---|---|
| `0` | Domingo |
| `1` | Segunda-feira |
| `2` | Terça-feira |
| `3` | Quarta-feira |
| `4` | Quinta-feira |
| `5` | Sexta-feira |
| `6` | Sábado |

**Estrutura salva no BD (ex: seg a sex):**
```json
[1, 2, 3, 4, 5]
```

---

### 3.4 Campo: `working_hours` (JSONB — objeto manhã/tarde)

Interface: dois grupos de time pickers.

| Campo | Input | Obrigatório |
|---|---|---|
| `manha.inicio` | Time picker | Sim |
| `manha.fim` | Time picker | Sim |
| `tarde.inicio` | Time picker | Não |
| `tarde.fim` | Time picker | Não |

**Estrutura salva no BD:**
```json
{
  "manha": {"inicio": "08:00", "fim": "12:00"},
  "tarde": {"inicio": "14:00", "fim": "18:00"}
}
```

> Se o doutor não tiver período da tarde, omitir a chave `tarde` do objeto.

---

### 3.5 Campo: `insurances` (JSONB — lista de strings, opcional)

Interface: campo de tags com adição dinâmica (digita e pressiona Enter).

**Estrutura salva no BD:**
```json
["unimed", "bradesco", "particular"]
```

> **Crítico:** salvar em **lowercase**. Os agentes fazem busca exata com `@>` no JSONB.

---

### 3.6 Campo: `restrictions` (JSONB — opcional)

Interface: textarea livre ou campos chave/valor dinâmicos.

**Exemplo:**
```json
{
  "observacao": "Não atende crianças menores de 5 anos",
  "ferias": "2026-07-01/2026-07-15"
}
```

---

## 4. Validações do Formulário

- `name`: obrigatório, mínimo 3 caracteres
- `calendar_id`: obrigatório
- `procedures`: obrigatório, mínimo 1 procedimento
- `procedures[].nome`: obrigatório
- `procedures[].duracao_minutos`: obrigatório, inteiro >= 15
- `procedures[].preco`: obrigatório — número >= 0 ou `"definir_com_doutor"`
- `available_weekdays`: obrigatório, mínimo 1 dia
- `working_hours.manha`: obrigatório — `inicio` < `fim`
- `working_hours.tarde`: se preenchido — `inicio` < `fim`
- `doctor_number`: obrigatório, apenas números, 10–13 dígitos
- `insurances`: converter para lowercase antes de salvar

---

## 5. Endpoints — API Admin

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/admin/doctors` | Lista todos os doutores (ativos e inativos) |
| `GET` | `/admin/doctors/{id}` | Retorna dados completos de um doutor |
| `POST` | `/admin/doctors` | Cadastra novo doutor |
| `PUT` | `/admin/doctors/{id}` | Atualiza dados do doutor |
| `PATCH` | `/admin/doctors/{id}/toggle` | Alterna `active` (true/false) |

---

### 5.1 POST /admin/doctors — Payload

```json
{
  "name": "Dra. Maria Silva",
  "doctor_number": "5585999990000",
  "calendar_id": "maria@gmail.com",
  "active": true,
  "procedures": [
    {
      "nome": "Limpeza",
      "duracao_minutos": 30,
      "preco": 0,
      "descricao": "Remoção de placa bacteriana.",
      "triagem": "Pergunte se faz mais de 6 meses da última limpeza pelo plano."
    }
  ],
  "available_weekdays": [1, 2, 3, 4, 5],
  "working_hours": {
    "manha": {"inicio": "08:00", "fim": "12:00"},
    "tarde": {"inicio": "14:00", "fim": "18:00"}
  },
  "insurances": ["unimed", "particular"],
  "restrictions": null
}
```

---

### 5.2 PATCH /admin/doctors/{id}/toggle

Sem payload. Inverte o campo `active`:

```sql
UPDATE doctor_rules SET active = NOT active WHERE id = %s
```

Retorna:
```json
{ "id": "uuid-...", "active": false }
```

---

## 6. Referência da Tabela `doctor_rules`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID | PK gerado automaticamente |
| `name` | VARCHAR(150) | Nome do doutor |
| `doctor_number` | VARCHAR(13) | WhatsApp para notificações |
| `calendar_id` | VARCHAR(255) | ID do Google Calendar |
| `active` | BOOLEAN | `true` = disponível para a IA agendar |
| `procedures` | JSONB | Array de objetos — ver seção 3.2 |
| `available_weekdays` | JSONB | Array de inteiros 0–6 |
| `working_hours` | JSONB | `{manha: {inicio, fim}, tarde: {inicio, fim}}` |
| `insurances` | JSONB | Array de strings lowercase |
| `restrictions` | JSONB | Objeto livre para regras específicas |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Atualizado automaticamente por trigger |

---

## 7. Observações

- **Nunca deletar doutores** — usar `active = false` para preservar histórico
- **`calendar_id` é crítico** — sem ele a IA não verifica nem cria eventos no Google Calendar
- **`doctor_number` obrigatório** —  notificação de agendamento para o numero do doutor
- **`insurances` em lowercase** — busca exata com `@>` no JSONB
- **`procedures[].duracao_minutos` sobrescreve `duration`** global do doutor no momento do agendamento
- **Trigger `updated_at`** já existe no BD — atualizado automaticamente
