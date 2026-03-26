## Plano: Catálogo de Programas em 2 etapas (Títulos → Programas)

### Conceito

Dividir o catálogo em duas fases: primeiro o usuário vê cards de "Títulos" (agrupamentos como HDNI, FULL HD, 4K etc.), depois clica para ver os programas/planos dentro daquele título. Isso requer uma nova tabela, uma nova página e ajustes no editor e no catálogo atual.

### 1. Migration: tabela `titulos_programa`

```sql
create table public.titulos_programa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.titulos_programa enable row level security;

-- Todos autenticados podem ver
create policy "Autenticados podem ver títulos"
  on public.titulos_programa for select to authenticated using (true);

-- Dev pode gerenciar
create policy "Dev pode gerenciar títulos"
  on public.titulos_programa for all to authenticated
  using (auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid 
         OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com')
  with check (auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid 
              OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com');

-- Nova coluna em programas
alter table public.programas add column titulo_id uuid references public.titulos_programa(id);
```

### 2. Etapa 1 — Nova página `ProgramCatalog.tsx` (reescrita)

Exibe cards de títulos.   
  
Título (header) da página: "Escolha um Programa"  
  
Cada card mostra:

- **Topo**: nome do título + badge de nível (agregado dos programas: se mistos, mostra múltiplos badges)
- **Corpo**: imagem à esquerda (se houver) + à direita: objetivos (união dos programas), frequências disponíveis (ex: "3, 4, 5 dias"), descrição (truncada em 2-3 linhas com "ver mais")
- **Rodapé**: botão "Ver Planos de Treino"

Dados calculados dinamicamente: buscar todos os programas, agrupar por `titulo_id`, extrair objetivos únicos, frequências únicas e níveis únicos de cada grupo.

Programas sem `titulo_id` aparecem como cards avulsos (fallback para manter compatibilidade).

### 3. Etapa 2 — Nova página `ProgramCatalogTitle.tsx`

Rota: `/program-catalog/:tituloId`

Mostra os programas daquele título, usando layout semelhante ao catálogo atual (cards individuais com frequência, duração, split, botão "Selecionar Programa", menu dev).

Header mostra o nome do título + botão voltar para `/program-catalog` e a descrição logo abaixo (truncada em 3 linhas com "ver mais").

### 4. Editor de Programas — Seletor de Título

No `ProgramStructureForm.tsx`, adicionar campo "Título" (select) antes do nome do programa:

- Lista títulos existentes da tabela `titulos_programa`
- Opção "Criar novo título" que abre dialog com campos: nome, descrição, imagem (permite upload de imagens)
- Ao salvar o programa, grava `titulo_id` na tabela `programas`

### 5. Rotas no `App.tsx`

Adicionar rota `/program-catalog/:tituloId` para `ProgramCatalogTitle.tsx`.

### Arquivos


| Arquivo                                                          | Tipo                                               |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| Migration `titulos_programa` + coluna em `programas`             | Novo                                               |
| `src/pages/ProgramCatalog.tsx`                                   | Reescrito (cards de títulos)                       |
| `src/pages/ProgramCatalogTitle.tsx`                              | Novo (programas dentro do título)                  |
| `src/components/programs/ProgramEditor/ProgramStructureForm.tsx` | Alterado (seletor de título + dialog criar título) |
| `src/App.tsx`                                                    | Alterado (nova rota)                               |


### Garantias

- Programas sem `titulo_id` continuam aparecendo como cards avulsos no catálogo (sem quebrar nada)
- Toda a lógica de seleção, customização, duplicação e exclusão de programas permanece intacta na Etapa 2
- O menu dev (editar, duplicar, excluir) aparece apenas na Etapa 2 (nos cards de programas individuais)