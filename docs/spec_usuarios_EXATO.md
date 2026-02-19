AI FIRST CLINIC

Especificacao Tecnica — Frontend + API Admin

Aba: Usuarios





1. Visao Geral da Arquitetura

O projeto e dividido em dois repositorios completamente independentes, conectados apenas pelo banco de dados PostgreSQL:

Coluna
Tipo
Uso

repo-agentes
Backend IA
Logica dos agentes, LangGraph, tools, integracao WhatsApp

repo-clinica-web
Frontend + API Admin
Interface web da clinica, endpoints de gerenciamento

PostgreSQL
Banco compartilhado
Fonte de verdade unica entre os dois sistemas

A separacao por repositorios garante que a logica mutavel (prompts, fluxos, agentes) seja alterada de forma isolada, sem impacto no frontend. Para onboarding de nova clinica: troca apenas o repo-agentes e os prompts.



2. Fluxo de Dados

[WhatsApp] → [Backend Agentes] → [PostgreSQL] ← [API Admin] ← [Frontend]

Backend Agentes escreve: historico de chat, dados de usuario, agendamentos, tokens

API Admin escreve: respostas do admin no chat, toggle require_human, cadastro de doutores, embeddings

Frontend apenas le e escreve via API Admin — nunca acessa o BD diretamente



3. Aba — Usuarios

Esta aba e o painel central de atendimento humano. Exibe todos os usuarios cadastrados pela IA e permite ao admin monitorar, intervir e responder pacientes diretamente.



3.1 Lista de Usuarios

Cada usuario e exibido como um card clicavel contendo:

Nome completo (ou numero caso nao cadastrado)

Numero de telefone

Status de atendimento: IA Ativa ou Atendimento Humano

Preview da ultima mensagem

Timestamp da ultima interacao



Badge de alerta:

Contador visivel na aba mostrando quantos usuarios estao em modo Atendimento Humano (require_human = true)

Card destacado visualmente quando requer atencao humana



3.2 Toggle de Status — Logica

O toggle controla o campo require_human na tabela users:

Coluna
Tipo
Uso

require_human = false
IA Ativa
Admin nao pode enviar mensagem. IA esta respondendo o paciente.

require_human = true
Atendimento Humano
Admin pode enviar mensagem. IA esta bloqueada para este usuario.

IMPORTANTE: O nome exibido no toggle deve ser 'Atendimento Humano' (ligado = humano assumiu), nao 'IA Ativa/Inativa'. Isso evita confusao para o operador da clinica.

Ao ativar Atendimento Humano:

Frontend chama PUT /admin/users/{number}/toggle

API atualiza require_human = true no BD

Campo de resposta do chat e desbloqueado

Ao desativar Atendimento Humano:

Frontend chama PUT /admin/users/{number}/toggle

API atualiza require_human = false no BD

Campo de resposta do chat e bloqueado

IA retoma o fluxo normalmente na proxima mensagem do paciente



3.3 Chat por Usuario

Ao clicar em um usuario, abre a visualizacao de chat com:

Historico completo de mensagens (tabela chat, session_id = number)

Mensagens do paciente alinhadas a esquerda

Mensagens da IA alinhadas a direita, com indicador do agente (recepcionista, rag, agendamento)

Timestamps de cada mensagem



Campo de resposta do admin:

Visivel sempre, mas bloqueado quando require_human = false

Quando bloqueado: tooltip 'IA esta no controle. Ative Atendimento Humano para responder.'

Quando desbloqueado: admin digita e envia



Ao admin enviar mensagem:

Frontend chama POST /admin/users/{number}/reply

API envia via Evolution API para o WhatsApp do paciente

API salva no BD (tabela chat, sender='human') para manter contexto coerente



Atualizacao do chat (opcoes):

Polling simples: frontend consulta GET /admin/users/{number}/chat a cada 5 segundos

WebSocket (evolucao futura): backend notifica em tempo real



4. Tabelas Utilizadas



users

Coluna
Tipo
Uso

phone_number
VARCHAR(20)
Identificador principal do usuario

complete_name
VARCHAR(100)
Nome completo (pode ser null se nao cadastrado)

require_human
BOOLEAN
false = IA ativa | true = humano no controle

complete_register
BOOLEAN
Se o cadastro pelo agente recepcionista foi concluido

origin_contact
TEXT
Canal de origem (whatsapp)

metadata
JSONB
Dados extras: convenio, documento, etc.

created_at
TIMESTAMPTZ
Data de criacao



chat

Coluna
Tipo
Uso

id
SERIAL
PK autoincremento

session_id
VARCHAR(20)
Numero do usuario (FK implicita para users)

sender
VARCHAR(20)
human | ai | user

agent_name
VARCHAR(50)
Nome do agente que respondeu (recepcionista, rag, agendamento)

message
JSONB
Conteudo: {type, content} ou tool_calls

created_at
TIMESTAMPTZ
Timestamp da mensagem



5. Endpoints — API Admin

Todos os endpoints pertencem ao repo-clinica-web, servidos pelo FastAPI da interface.

Metodo
Endpoint
Descricao

GET
/admin/users
Lista todos os usuarios com status e preview da ultima mensagem

GET
/admin/users/{number}/chat
Retorna historico completo de chat de um usuario

POST
/admin/users/{number}/reply
Admin envia mensagem: salva no BD + envia via Evolution API

PUT
/admin/users/{number}/toggle
Alterna require_human (true/false)



5.1 GET /admin/users

Resposta esperada (JSON):

[ { "phone_number": "5585999...", "complete_name": "Maria Silva", "require_human": false, "last_message": "Quero agendar...", "last_activity": "2026-02-17T14:32:00" }, ... ]



5.2 POST /admin/users/{number}/reply

Payload:

{ "message": "Ola, ja verificamos seu agendamento!" }



Acoes executadas pela API:

1. Envia mensagem via Evolution API (evo.sender_text)

2. Salva no BD: INSERT INTO chat (session_id, sender, message) VALUES (number, 'human', {type: 'ai', content: message})

3. Retorna confirmacao

Salvar como sender='human' para identificação visual que quem respondeu aquilo foi um humano e em messages o type=’ai’ pois garante que quando a IA retomar o atendimento, o historico esteja coerente e ela saiba o que o humano respondeu.



5.3 PUT /admin/users/{number}/toggle

Sem payload. A API inverte o valor atual de require_human:

UPDATE users SET require_human = NOT require_human WHERE phone_number = %s

Retorna o novo estado:

{ "phone_number": "5585999...", "require_human": true }



6. Observacoes e Decisoes de Design

Polling vs WebSocket: comecar com polling (5s) e evoluir para WebSocket conforme necessidade de escala

Autenticacao: os endpoints /admin/* precisam de autenticacao (JWT ou API Key). Definir antes do desenvolvimento.

Paginacao: GET /admin/users deve suportar paginacao para clinicas com muitos pacientes

Filtros: filtrar por require_human=true para exibir apenas os que precisam de atencao

Ordenacao: ordenar por last_activity DESC por padrao

Logs de admin: considerar salvar qual admin enviou a mensagem (campo extra em chat ou tabela separada)



AI First Clinic — Documento de Especificacao Tecnica
