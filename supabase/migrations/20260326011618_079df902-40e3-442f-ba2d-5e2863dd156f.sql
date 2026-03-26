
create table public.titulos_programa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.titulos_programa enable row level security;

create policy "Autenticados podem ver títulos"
  on public.titulos_programa for select to authenticated using (true);

create policy "Dev pode gerenciar títulos"
  on public.titulos_programa for all to authenticated
  using (auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid 
         OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com')
  with check (auth.uid() = 'a2eba955-7a98-42a6-ba49-1cf31dfad15d'::uuid 
              OR (auth.jwt()->>'email') = 'arthurtaube.com.br@gmail.com');

alter table public.programas add column titulo_id uuid references public.titulos_programa(id);
