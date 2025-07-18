
-- First, update existing records where incremento_minimo is set but configuracao_inicial is false
UPDATE exercicios_treino_usuario 
SET configuracao_inicial = true 
WHERE incremento_minimo IS NOT NULL 
AND (configuracao_inicial IS NULL OR configuracao_inicial = false);

-- Update the trigger to ensure configuracao_inicial is always set to true when incremento_minimo is provided
CREATE OR REPLACE FUNCTION propagate_increment_config()
RETURNS TRIGGER AS $$
BEGIN
    -- Se incremento_minimo foi alterado ou configuracao_inicial foi definida como TRUE
    IF (TG_OP = 'UPDATE' AND (
        OLD.incremento_minimo IS DISTINCT FROM NEW.incremento_minimo OR
        OLD.configuracao_inicial IS DISTINCT FROM NEW.configuracao_inicial
    )) OR (TG_OP = 'INSERT' AND (NEW.configuracao_inicial = TRUE OR NEW.incremento_minimo IS NOT NULL)) THEN
        
        -- Se incremento_minimo foi definido, marcar configuracao_inicial como true
        IF NEW.incremento_minimo IS NOT NULL AND (NEW.configuracao_inicial IS NULL OR NEW.configuracao_inicial = FALSE) THEN
            NEW.configuracao_inicial = TRUE;
        END IF;
        
        -- Propagar para exercícios do mesmo exercicio_original_id no mesmo programa
        -- que ainda não foram concluídos
        UPDATE exercicios_treino_usuario etu
        SET 
            incremento_minimo = COALESCE(NEW.incremento_minimo, etu.incremento_minimo),
            configuracao_inicial = CASE 
                WHEN NEW.incremento_minimo IS NOT NULL OR NEW.configuracao_inicial = TRUE THEN TRUE 
                ELSE etu.configuracao_inicial 
            END
        FROM treinos_usuario tu, treinos_usuario tu_source
        WHERE etu.treino_usuario_id = tu.id
        AND NEW.treino_usuario_id = tu_source.id
        AND tu.programa_usuario_id = tu_source.programa_usuario_id
        AND etu.exercicio_original_id = NEW.exercicio_original_id
        AND etu.concluido = FALSE
        AND etu.id != NEW.id; -- Não atualizar o próprio registro
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
