# Aba: Embeddings — Especificação Técnica
## Frontend + API Admin

---

## 1. Visão Geral

Painel de gerenciamento da base de conhecimento da IA (RAG). Permite inserir, visualizar e deletar os textos que os agentes consultam ao responder dúvidas dos pacientes.

**Tabela utilizada:** `rag_embeddings`

**Sub-abas:**
1. **Inserir** — adicionar novos embeddings via texto ou PDF
2. **Visualizar** — listar embeddings existentes
3. **Gerenciar** — deletar embeddings

---

## 2. Referência da Tabela `rag_embeddings`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID | PK gerado automaticamente |
| `content` | TEXT | Texto do chunk |
| `category` | VARCHAR(100) | Categoria para filtro de busca |
| `embedding` | VECTOR(1536) | Vetor gerado pelo modelo de embedding |
| `created_at` | TIMESTAMPTZ | Data de inserção |

---

## 3. Sub-aba: Inserir

### 3.1 Campos Comuns

| Campo | Input | Obrigatório | Observação |
|---|---|---|---|
| `categoria` | Text input | Sim | Ex: `sobre`, `servicos`, `regulamento` — salvar em lowercase |
| `metodo` | Radio/Toggle | Sim | `Upload de PDF` ou `Texto Manual` |
| `tamanho_bloco` | Slider | Sim | 400–1500 caracteres, padrão 800 |

> A categoria deve bater com os valores que o agente RAG usa no parâmetro `categoria` da tool `buscar_rag`. Categorias existentes: `sobre`, `servicos`.

---

### 3.2 Método: Upload de PDF

Fluxo:
1. Usuário faz upload do arquivo PDF
2. Frontend exibe nome do arquivo + número de páginas
3. Usuário define categoria e tamanho do bloco
4. Clica em **Processar**
5. API extrai o texto, divide em chunks, gera embeddings e insere no BD

**Extração e chunking (server-side):**
```python
import pdfplumber

def extrair_texto_pdf(file_bytes: bytes) -> str:
    with pdfplumber.open(file_bytes) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)

def dividir_em_blocos(texto: str, tamanho: int = 800) -> list[str]:
    palavras = texto.split()
    blocos, atual = [], []
    for palavra in palavras:
        atual.append(palavra)
        if len(" ".join(atual)) >= tamanho:
            blocos.append(" ".join(atual))
            atual = []
    if atual:
        blocos.append(" ".join(atual))
    return [b for b in blocos if b.strip()]
```

**Feedback ao usuário:**
- Total de caracteres extraídos
- Total de blocos gerados
- Progresso de inserção (ex: `Inserindo bloco 3 de 12...`)
- Sucesso ou erro por bloco

---

### 3.3 Método: Texto Manual

Fluxo:
1. Usuário cola ou digita o texto em textarea
2. Define categoria e tamanho do bloco
3. Clica em **Gerar Embeddings**
4. Mesmo pipeline de chunking e inserção do PDF

---

### 3.4 Pipeline de Inserção (server-side)

Para cada chunk:
1. Chamar OpenAI Embeddings API (`text-embedding-3-small`)
2. Receber vetor de 1536 dimensões
3. Inserir na tabela `rag_embeddings`

```python
def inserir_embedding(content: str, categoria: str):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=content
    )
    embedding = response.data[0].embedding

    conn = get_vector_conn()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO rag_embeddings (content, category, embedding)
        VALUES (%s, %s, %s::vector)
        """,
        (content, categoria.lower(), embedding)
    )
    conn.commit()
```

---

## 4. Sub-aba: Visualizar

Lista todos os embeddings inseridos com:
- Categoria (badge colorido)
- Preview do conteúdo (primeiros 200 caracteres)
- Data de inserção
- Botão para expandir o texto completo

**Filtros disponíveis:**
- Por categoria (dropdown com categorias existentes)
- Por data de inserção

**Paginação:** 20 itens por página.

---

## 5. Sub-aba: Gerenciar

Lista igual à visualização, porém com:
- Checkbox de seleção por item
- Botão **Deletar Selecionados**
- Botão **Deletar todos da categoria** (com confirmação)

> Deleção é irreversível — exibir modal de confirmação antes de executar.

---

## 6. Endpoints — API Admin

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/admin/embeddings/text` | Insere embedding a partir de texto |
| `POST` | `/admin/embeddings/pdf` | Recebe PDF, processa e insere |
| `GET` | `/admin/embeddings` | Lista embeddings com filtros e paginação |
| `GET` | `/admin/embeddings/categories` | Lista categorias únicas existentes |
| `DELETE` | `/admin/embeddings/{id}` | Deleta um embedding por ID |
| `DELETE` | `/admin/embeddings/category/{categoria}` | Deleta todos de uma categoria |
| `DELETE` | `/admin/embeddings/bulk` | Deleta lista de IDs |

---

### 6.1 POST /admin/embeddings/text — Payload

```json
{
  "texto": "A clínica funciona de segunda a sexta das 8h às 18h...",
  "categoria": "sobre",
  "tamanho_bloco": 800
}
```

**Resposta:**
```json
{
  "blocos_gerados": 3,
  "inseridos": 3,
  "erros": 0
}
```

---

### 6.2 POST /admin/embeddings/pdf

- `multipart/form-data` com campos:
  - `file`: arquivo PDF
  - `categoria`: string
  - `tamanho_bloco`: integer

**Resposta:** mesmo formato do endpoint de texto.

---

### 6.3 GET /admin/embeddings

**Query params:**
```
?categoria=sobre&page=1&limit=20
```

**Resposta:**
```json
{
  "total": 47,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": "uuid-...",
      "content": "A clínica foi fundada em 2010...",
      "category": "sobre",
      "created_at": "2026-02-01T10:30:00"
    }
  ]
}
```

---

### 6.4 DELETE /admin/embeddings/bulk — Payload

```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

---

## 7. Observações

- **`category` em lowercase** — agentes filtram com `WHERE categoria = %s`, busca exata
- **Modelo de embedding fixo:** `text-embedding-3-small` (1536 dimensões) — não trocar sem recriar todos os embeddings existentes, pois os vetores seriam incompatíveis
- **Tamanho do chunk impacta qualidade do RAG:** chunks muito grandes perdem precisão, muito pequenos perdem contexto. Padrão 800 caracteres é um bom equilíbrio para textos de clínica
- **Custo de inserção:** cada chunk consome tokens da OpenAI Embeddings API — barato (~$0.02 por 1M tokens), mas registrar se quiser rastrear custo total
- **PDF sem texto (escaneado):** `pdfplumber` não funciona para PDFs de imagem — considerar avisar o usuário caso o texto extraído seja vazio
