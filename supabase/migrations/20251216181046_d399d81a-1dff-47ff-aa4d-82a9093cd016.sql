-- Add columns for explicit program finalization tracking
ALTER TABLE programas_usuario 
ADD COLUMN finalizado boolean NOT NULL DEFAULT false;

ALTER TABLE programas_usuario 
ADD COLUMN data_finalizado timestamp with time zone;