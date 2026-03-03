
-- Add birth_date column to profiles
ALTER TABLE public.profiles ADD COLUMN birth_date date NULL;

-- Update the trigger function to also save birth_date from auth metadata
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, birth_date)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'birth_date')::date
  );
  RETURN NEW;
END;
$function$;

-- Backfill existing profiles with birth_date from auth.users metadata
UPDATE public.profiles p
SET birth_date = (u.raw_user_meta_data->>'birth_date')::date
FROM auth.users u
WHERE p.id = u.id
  AND p.birth_date IS NULL
  AND u.raw_user_meta_data->>'birth_date' IS NOT NULL;
