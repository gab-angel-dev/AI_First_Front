# Aba: Arquivos — Especificação Técnica
## Frontend + API Admin

---

## 1. Visão Geral

Painel de gerenciamento dos arquivos que o agente pode enviar ao paciente via WhatsApp. Os arquivos são armazenados fisicamente na VPS e servidos via Nginx como URL pública. O banco armazena apenas os metadados.

**Tabela utilizada:** `files`

**Princípio:** arquivos não ficam no BD — ficam na máquina. O BD guarda apenas `category`, `fileName`, `mediaType` e `path` (URL pública).

---

## 2. Referência da Tabela `files`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL | PK autoincremento |
| `category` | VARCHAR(100) | Categoria do arquivo — ex: `cardapio` |
| `fileName` | VARCHAR(255) | Nome do arquivo — ex: `cardapio.pdf` |
| `mediaType` | VARCHAR(20) | Tipo do arquivo — ex: `document`, `image`, `video`, `audio` |
| `path` | VARCHAR | URL pública acessível — ex: `https://dominio.com/files/cardapio/cardapio.pdf` |
| `created_at` | TIMESTAMPTZ | Data de inserção |

---

## 3. Infraestrutura — VPS + Nginx

### 3.1 Estrutura de Diretórios na VPS

```
/var/www/files/
    cardapio/
    localizacao/
    convenios/
    exames/
    {categoria}/      ← criado dinamicamente ao fazer upload
```

### 3.2 Configuração Nginx

```nginx
location /files/ {
    alias /var/www/files/;
    autoindex off;
}
```

A URL pública resultante:
```
https://seudominio.com/files/{categoria}/{fileName}
```

Esse valor é o que vai no campo `path` da tabela `files` — é o que a Evolution API usa para enviar o arquivo ao paciente.

---

## 4. Tipos de Arquivo Suportados

| Extensão | `mediaType` salvo no BD | Observação |
|---|---|---|
| `.pdf`, `.docx` | `document` | |
| `.jpg`, `.jpeg`, `.png` | `image` | |
| `.mp4` | `video` | Atenção ao tamanho — WhatsApp tem limite de ~16MB |
| `.mp3` | `audio` | |

---

## 5. Funcionalidades da Aba

### 5.1 Listagem de Arquivos

Exibe todos os arquivos cadastrados com:
- Nome do arquivo
- Categoria (badge)
- Tipo (ícone por mediaType)
- Link para visualização/download
- Data de inserção
- Botão deletar

Filtro por categoria (dropdown com categorias existentes).

---

### 5.2 Upload de Arquivo

Campos do formulário:

| Campo | Input | Obrigatório | Observação |
|---|---|---|---|
| `categoria` | Text input | Sim | Lowercase, sem espaços — ex: `cardapio` |
| `arquivo` | File picker | Sim | Tipos aceitos: pdf, docx, jpg, jpeg, png, mp4, mp3 |

**Fluxo ao clicar em Enviar:**
1. Frontend envia `multipart/form-data` para `POST /admin/files`
2. API verifica se já existe arquivo com mesmo `fileName` e `category` → se sim, bloqueia e retorna erro
3. API detecta o `mediaType` pela extensão
4. API salva o arquivo em `/var/www/files/{categoria}/{fileName}`
5. Cria o diretório se não existir
6. Monta a URL pública: `https://dominio.com/files/{categoria}/{fileName}`
7. Insere metadados na tabela `files`
8. Retorna confirmação

---

### 5.3 Deleção de Arquivo

Ao deletar:
1. API remove o registro da tabela `files`
2. API deleta o arquivo físico da VPS (`/var/www/files/{categoria}/{fileName}`)
3. Se o diretório da categoria ficar vazio, pode ser removido também

> Deleção é irreversível — exibir modal de confirmação antes de executar.

---

## 6. Lógica Server-side — API Admin

### 6.1 Detecção de `mediaType`

```python
MEDIA_TYPE_MAP = {
    ".pdf":  "document",
    ".docx": "document",
    ".jpg":  "image",
    ".jpeg": "image",
    ".png":  "image",
    ".mp4":  "video",
    ".mp3":  "audio",
}

def get_media_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return MEDIA_TYPE_MAP.get(ext, "document")
```

### 6.2 Upload e Persistência

```python
import os
from pathlib import Path

FILES_BASE_DIR = "/var/www/files"
FILES_BASE_URL = os.getenv("FILES_BASE_URL")  # ex: https://dominio.com/files

def salvar_arquivo(file_bytes: bytes, categoria: str, filename: str) -> str:
    dir_path = Path(FILES_BASE_DIR) / categoria
    dir_path.mkdir(parents=True, exist_ok=True)

    file_path = dir_path / filename

    if file_path.exists():
        raise FileExistsError(f"Arquivo '{filename}' já existe na categoria '{categoria}'.")

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    return f"{FILES_BASE_URL}/{categoria}/{filename}"
```

### 6.3 Deleção

```python
def deletar_arquivo(categoria: str, filename: str):
    file_path = Path(FILES_BASE_DIR) / categoria / filename

    if file_path.exists():
        file_path.unlink()

    # Remove diretório se vazio
    dir_path = Path(FILES_BASE_DIR) / categoria
    if dir_path.exists() and not any(dir_path.iterdir()):
        dir_path.rmdir()
```

---

## 7. Endpoints — API Admin

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/admin/files` | Lista todos os arquivos com filtro opcional por categoria |
| `GET` | `/admin/files/categories` | Lista categorias únicas existentes |
| `POST` | `/admin/files` | Upload de arquivo + inserção no BD |
| `DELETE` | `/admin/files/{id}` | Deleta registro do BD + arquivo físico da VPS |

---

### 7.1 POST /admin/files

`multipart/form-data`:
- `file`: arquivo binário
- `categoria`: string (ex: `cardapio`)

**Resposta (sucesso):**
```json
{
  "id": 4,
  "category": "cardapio",
  "fileName": "cardapio.pdf",
  "mediaType": "document",
  "path": "https://dominio.com/files/cardapio/cardapio.pdf"
}
```

**Resposta (arquivo já existe):**
```json
{
  "detail": "Arquivo 'cardapio.pdf' já existe na categoria 'cardapio'. Delete o existente antes de substituir."
}
```
HTTP 409 Conflict.

---

### 7.2 GET /admin/files

**Query params:**
```
?categoria=cardapio
```

**Resposta:**
```json
[
  {
    "id": 4,
    "category": "cardapio",
    "fileName": "cardapio.pdf",
    "mediaType": "document",
    "path": "https://dominio.com/files/cardapio/cardapio.pdf",
    "created_at": "2026-02-01T10:00:00"
  }
]
```

---

## 8. Variável de Ambiente Necessária

```env
FILES_BASE_URL=https://seudominio.com/files
```

Adicionar tanto no `repo-agentes` quanto no `repo-clinica-web`.

---

## 9. Observações

- **`path` = URL pública** — nunca salvar o caminho local (`/var/www/files/...`) no BD. A Evolution API precisa de URL acessível externamente
- **Permissões na VPS:** garantir que o processo da API tenha permissão de escrita em `/var/www/files/` — `chown -R www-data:www-data /var/www/files`
- **Limite de tamanho:** WhatsApp tem limite de ~16MB por arquivo. Validar no upload e retornar erro amigável se exceder
- **`categoria` em lowercase sem espaços** — é usada como nome de diretório na VPS e como valor de busca no BD (`get_file` usa `ILIKE`)
- **Backup:** arquivos em `/var/www/files/` não estão no BD — incluir esse diretório no backup da VPS
