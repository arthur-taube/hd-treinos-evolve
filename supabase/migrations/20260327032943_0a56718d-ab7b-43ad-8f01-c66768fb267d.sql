insert into storage.buckets (id, name, public) values ('titulo-images', 'titulo-images', true);

create policy "Acesso público de leitura" on storage.objects
  for select using (bucket_id = 'titulo-images');

create policy "Dev pode fazer upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'titulo-images' AND (
      auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid
      OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
    )
  );

create policy "Dev pode deletar imagens" on storage.objects
  for delete to authenticated using (
    bucket_id = 'titulo-images' AND (
      auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid
      OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com'
    )
  );