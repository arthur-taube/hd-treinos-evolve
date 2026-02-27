CREATE OR REPLACE FUNCTION public.propagate_increment_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
    IF (TG_OP = 'UPDATE' AND (
        OLD.incremento_minimo IS DISTINCT FROM NEW.incremento_minimo OR
        OLD.configuracao_inicial IS DISTINCT FROM NEW.configuracao_inicial
    )) OR (TG_OP = 'INSERT' AND (NEW.configuracao_inicial = TRUE OR NEW.incremento_minimo IS NOT NULL)) THEN
        
        IF NEW.incremento_minimo IS NOT NULL AND (NEW.configuracao_inicial IS NULL OR NEW.configuracao_inicial = FALSE) THEN
            NEW.configuracao_inicial = TRUE;
        END IF;
        
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
        AND (
            (NEW.exercicio_original_id IS NOT NULL AND etu.exercicio_original_id = NEW.exercicio_original_id)
            OR
            (NEW.exercicio_original_id IS NULL AND NEW.substituto_custom_id IS NOT NULL AND etu.substituto_custom_id = NEW.substituto_custom_id)
        )
        AND etu.concluido = FALSE
        AND etu.id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$;