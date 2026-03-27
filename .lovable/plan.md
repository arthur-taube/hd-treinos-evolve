

## Plano: Upload de imagem para Títulos via Supabase Storage

### 1. Migration: criar bucket `titulo-images`

```sql
insert into storage.buckets (id, name, public) values ('titulo-images', 'titulo-images', true);

-- Qualquer um pode ver (bucket público)
create policy "Acesso público de leitura" on storage.objects
  for select using (bucket_id = 'titulo-images');

-- Apenas dev/admin pode fazer upload
create policy "Dev pode fazer upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'titulo-images' AND (
      auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid
      OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
    )
  );

-- Apenas dev/admin pode deletar
create policy "Dev pode deletar imagens" on storage.objects
  for delete to authenticated using (
    bucket_id = 'titulo-images' AND (
      auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid
      OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
    )
  );
```

### 2. Alteração no dialog "Criar Novo Título" (`ProgramStructureForm.tsx`)

Substituir o campo "URL da Imagem" (input text, linha 424-425) por um campo de upload:

- `<input type="file" accept="image/*">` com botão estilizado
- Ao selecionar arquivo, mostrar preview local (via `URL.createObjectURL`)
- Ao clicar "Criar":
  1. Upload do arquivo para `titulo-images/{uuid}.{ext}` via `supabase.storage.from('titulo-images').upload(...)`
  2. Obter URL pública via `getPublicUrl()`
  3. Gravar `image_url` na tabela `titulos_programa`
- Loading state no botão durante upload
- Estado: trocar `newTituloImageUrl` (string) por `newTituloImageFile` (File | null) + `imagePreview` (string | null)

### Arquivos

| Arquivo | Tipo |
|---|---|
| Migration (bucket + policies) | Novo |
| `src/components/programs/ProgramEditor/ProgramStructureForm.tsx` | Alterado (file upload no dialog) |

