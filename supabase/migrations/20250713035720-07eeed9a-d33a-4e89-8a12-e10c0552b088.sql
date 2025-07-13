
-- Criar função para propagar configurações de incremento mínimo
CREATE OR REPLACE FUNCTION propagate_increment_config()
RETURNS TRIGGER AS $$
BEGIN
    -- Se incremento_minimo foi alterado ou configuracao_inicial foi definida como TRUE
    IF (TG_OP = 'UPDATE' AND (
        OLD.incremento_minimo IS DISTINCT FROM NEW.incremento_minimo OR
        OLD.configuracao_inicial IS DISTINCT FROM NEW.configuracao_inicial
    )) OR (TG_OP = 'INSERT' AND NEW.configuracao_inicial = TRUE) THEN
        
        -- Propagar para exercícios do mesmo exercicio_original_id no mesmo programa
        -- que ainda não foram concluídos
        UPDATE exercicios_treino_usuario etu
        SET 
            incremento_minimo = COALESCE(NEW.incremento_minimo, etu.incremento_minimo),
            configuracao_inicial = CASE 
                WHEN NEW.configuracao_inicial = TRUE THEN TRUE 
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

-- Criar trigger para propagar configurações automaticamente
DROP TRIGGER IF EXISTS trigger_propagate_increment_config ON exercicios_treino_usuario;
CREATE TRIGGER trigger_propagate_increment_config
    AFTER INSERT OR UPDATE ON exercicios_treino_usuario
    FOR EACH ROW
    EXECUTE FUNCTION propagate_increment_config();
