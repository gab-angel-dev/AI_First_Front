# AI First – Decisões de UI/UX (Aprovadas)

## 1. Melhorias Visuais e de UI/UX

### 1.1 Nome do App
- O nome do app não deve ser fixo no código
- Deve ser definido por variável de ambiente

APP_NAME=

### 1.2 Sidebar
- A barra lateral (menu) precisa ser retrátil


## 2. Paleta de Cores (Aprovada)

### Conceito
- Estilo enterprise
- Foco em gestão clínica e IA séria
- Visual sóbrio, profissional e não chamativo

### Cores Base
- Background: #F5F7FA
- Surface (cards, tabelas): #FFFFFF
- Borders: #E4E7EC

### Cor Primária
- Azul Petróleo: #0F2A44

Uso:
- Sidebar ativa
- Ícones principais
- Títulos importantes
- Destaques sutis

### Cor Secundária
- Azul Petróleo Suave: #1F3A5F

Uso:
- Hover
- Estados ativos
- Gráficos

### Tipografia
- Texto principal: #101828
- Texto secundário: #475467
- Texto desabilitado: #98A2B3

### Destaques (uso controlado)
- Highlight numérico (ex: custo): #0B5ED7
- Sucesso / OK: #027A48
- Erro / Alerta: #B42318

### Regras
- Sem gradientes
- Sem fundos coloridos em cards
- Azul petróleo não é background geral
- Cor serve o dado, não o contrário

## 3. UX de Navegação entre Abas (Aprovado)

### Diagnóstico
- O problema principal é percepção de lentidão
- Falta de feedback visual imediato gera sensação de travamento
- Cliques repetidos ocorrem por ausência de resposta clara da UI

### Objetivo
- A troca de abas deve parecer imediata para o usuário
- O usuário deve entender que entrou na aba, mesmo com dados carregando

### Padrões de UX adotados
- **A — Feedback imediato no clique**
  - A aba muda de estado visual instantaneamente ao clique

- **B — Estrutura da tela visível com conteúdo em loading**
  - A tela da aba aparece imediatamente
  - Conteúdo interno entra em estado de carregamento (skeleton)

- **C — Bloqueio de múltiplos cliques**
  - Enquanto a aba está carregando, novos cliques são desabilitados
  - O estado de carregamento deve ser visível ao usuário

### Padrões explicitamente não adotados
- Spinner central bloqueando a tela
- Tela vazia
- Mensagem genérica “Carregando...”
- Travamento global da interface