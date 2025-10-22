export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      exercicios_avancados: {
        Row: {
          created_at: string
          descricao: string | null
          grupo_muscular: string
          id: string
          image_url: string | null
          nome: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          grupo_muscular: string
          id?: string
          image_url?: string | null
          nome: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          grupo_muscular?: string
          id?: string
          image_url?: string | null
          nome?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      exercicios_custom: {
        Row: {
          created_at: string
          grupo_muscular: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grupo_muscular: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grupo_muscular?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercicios_iniciantes: {
        Row: {
          created_at: string
          grupo_muscular: string[]
          id: string
          nome: string
          primary_muscle: string | null
          quaternary_muscle: string | null
          secondary_muscle: string | null
          tertiary_muscle: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          grupo_muscular: string[]
          id?: string
          nome: string
          primary_muscle?: string | null
          quaternary_muscle?: string | null
          secondary_muscle?: string | null
          tertiary_muscle?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          grupo_muscular?: string[]
          id?: string
          nome?: string
          primary_muscle?: string | null
          quaternary_muscle?: string | null
          secondary_muscle?: string | null
          tertiary_muscle?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      exercicios_iniciantes_2: {
        Row: {
          created_at: string
          grupo_muscular: string
          id: string
          nome: string
          primary_muscle: string | null
          quaternary_muscle: string | null
          secondary_muscle: string | null
          tertiary_muscle: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          grupo_muscular: string
          id?: string
          nome: string
          primary_muscle?: string | null
          quaternary_muscle?: string | null
          secondary_muscle?: string | null
          tertiary_muscle?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          grupo_muscular?: string
          id?: string
          nome?: string
          primary_muscle?: string | null
          quaternary_muscle?: string | null
          secondary_muscle?: string | null
          tertiary_muscle?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      exercicios_treino: {
        Row: {
          allow_multiple_groups: boolean | null
          available_groups: string[] | null
          created_at: string
          exercicio_original_id: string | null
          grupo_muscular: string
          id: string
          nome: string
          oculto: boolean
          ordem: number
          repeticoes: string | null
          series: number
          treino_id: string
        }
        Insert: {
          allow_multiple_groups?: boolean | null
          available_groups?: string[] | null
          created_at?: string
          exercicio_original_id?: string | null
          grupo_muscular: string
          id?: string
          nome: string
          oculto?: boolean
          ordem: number
          repeticoes?: string | null
          series: number
          treino_id: string
        }
        Update: {
          allow_multiple_groups?: boolean | null
          available_groups?: string[] | null
          created_at?: string
          exercicio_original_id?: string | null
          grupo_muscular?: string
          id?: string
          nome?: string
          oculto?: boolean
          ordem?: number
          repeticoes?: string | null
          series?: number
          treino_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_treino_exercicio_original_id_fkey"
            columns: ["exercicio_original_id"]
            isOneToOne: false
            referencedRelation: "exercicios_iniciantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercicios_treino_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
      }
      exercicios_treino_usuario: {
        Row: {
          avaliacao_dificuldade: string | null
          avaliacao_dor: number | null
          avaliacao_fadiga: number | null
          concluido: boolean
          configuracao_inicial: boolean | null
          created_at: string
          data_avaliacao: string | null
          exercicio_original_id: string | null
          grupo_muscular: string
          id: string
          incremento_minimo: number | null
          nome: string
          observacao: string | null
          oculto: boolean
          ordem: number
          peso: number | null
          primary_muscle: string | null
          repeticoes: string | null
          reps_programadas: number | null
          secondary_muscle: string | null
          series: number
          substituicao_neste_treino: boolean
          substituto_custom_id: string | null
          substituto_nome: string | null
          substituto_oficial_id: string | null
          treino_usuario_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          avaliacao_dificuldade?: string | null
          avaliacao_dor?: number | null
          avaliacao_fadiga?: number | null
          concluido?: boolean
          configuracao_inicial?: boolean | null
          created_at?: string
          data_avaliacao?: string | null
          exercicio_original_id?: string | null
          grupo_muscular: string
          id?: string
          incremento_minimo?: number | null
          nome: string
          observacao?: string | null
          oculto?: boolean
          ordem: number
          peso?: number | null
          primary_muscle?: string | null
          repeticoes?: string | null
          reps_programadas?: number | null
          secondary_muscle?: string | null
          series: number
          substituicao_neste_treino?: boolean
          substituto_custom_id?: string | null
          substituto_nome?: string | null
          substituto_oficial_id?: string | null
          treino_usuario_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          avaliacao_dificuldade?: string | null
          avaliacao_dor?: number | null
          avaliacao_fadiga?: number | null
          concluido?: boolean
          configuracao_inicial?: boolean | null
          created_at?: string
          data_avaliacao?: string | null
          exercicio_original_id?: string | null
          grupo_muscular?: string
          id?: string
          incremento_minimo?: number | null
          nome?: string
          observacao?: string | null
          oculto?: boolean
          ordem?: number
          peso?: number | null
          primary_muscle?: string | null
          repeticoes?: string | null
          reps_programadas?: number | null
          secondary_muscle?: string | null
          series?: number
          substituicao_neste_treino?: boolean
          substituto_custom_id?: string | null
          substituto_nome?: string | null
          substituto_oficial_id?: string | null
          treino_usuario_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ex_tu_subst_custom_fk"
            columns: ["substituto_custom_id"]
            isOneToOne: false
            referencedRelation: "exercicios_custom"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ex_tu_subst_oficial_fk"
            columns: ["substituto_oficial_id"]
            isOneToOne: false
            referencedRelation: "exercicios_iniciantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercicios_treino_usuario_exercicio_original_id_fkey"
            columns: ["exercicio_original_id"]
            isOneToOne: false
            referencedRelation: "exercicios_iniciantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercicios_treino_usuario_treino_usuario_id_fkey"
            columns: ["treino_usuario_id"]
            isOneToOne: false
            referencedRelation: "treinos_usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      faixas_repeticoes: {
        Row: {
          created_at: string
          id: string
          max_reps: number
          min_reps: number
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_reps: number
          min_reps: number
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          max_reps?: number
          min_reps?: number
          tipo?: string
        }
        Relationships: []
      }
      itens_treino_avancados: {
        Row: {
          created_at: string
          exercicio_id: string | null
          id: string
          ordem: number
          repeticoes: number
          series: number
          treino_id: string | null
        }
        Insert: {
          created_at?: string
          exercicio_id?: string | null
          id?: string
          ordem: number
          repeticoes: number
          series: number
          treino_id?: string | null
        }
        Update: {
          created_at?: string
          exercicio_id?: string | null
          id?: string
          ordem?: number
          repeticoes?: number
          series?: number
          treino_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_treino_avancados_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios_avancados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_treino_avancados_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos_avancados"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_treino_iniciantes: {
        Row: {
          created_at: string
          exercicio_id: string | null
          id: string
          ordem: number
          repeticoes: number
          series: number
          treino_id: string | null
        }
        Insert: {
          created_at?: string
          exercicio_id?: string | null
          id?: string
          ordem: number
          repeticoes: number
          series: number
          treino_id?: string | null
        }
        Update: {
          created_at?: string
          exercicio_id?: string | null
          id?: string
          ordem?: number
          repeticoes?: number
          series?: number
          treino_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_treino_iniciantes_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos_iniciantes"
            referencedColumns: ["id"]
          },
        ]
      }
      mesociclos: {
        Row: {
          created_at: string
          cronogramas_recomendados: string[] | null
          duracao_semanas: number
          id: string
          numero: number
          programa_id: string
        }
        Insert: {
          created_at?: string
          cronogramas_recomendados?: string[] | null
          duracao_semanas: number
          id?: string
          numero: number
          programa_id: string
        }
        Update: {
          created_at?: string
          cronogramas_recomendados?: string[] | null
          duracao_semanas?: number
          id?: string
          numero?: number
          programa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesociclos_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          training_goal: string | null
          training_level: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone_number?: string | null
          training_goal?: string | null
          training_level?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          training_goal?: string | null
          training_level?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      programas: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          duracao_semanas: number
          frequencia_semanal: number
          id: string
          nivel: string
          nome: string
          objetivo: string[]
          split: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          duracao_semanas: number
          frequencia_semanal: number
          id?: string
          nivel: string
          nome: string
          objetivo: string[]
          split: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          duracao_semanas?: number
          frequencia_semanal?: number
          id?: string
          nivel?: string
          nome?: string
          objetivo?: string[]
          split?: string
          updated_at?: string
        }
        Relationships: []
      }
      programas_usuario: {
        Row: {
          ativo: boolean
          created_at: string
          data_inicio: string
          id: string
          programa_original_id: string
          progresso: number
          updated_at: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_inicio?: string
          id?: string
          programa_original_id: string
          progresso?: number
          updated_at?: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_inicio?: string
          id?: string
          programa_original_id?: string
          progresso?: number
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programas_usuario_programa_original_id_fkey"
            columns: ["programa_original_id"]
            isOneToOne: false
            referencedRelation: "programas"
            referencedColumns: ["id"]
          },
        ]
      }
      series_exercicio_usuario: {
        Row: {
          concluida: boolean
          created_at: string | null
          exercicio_usuario_id: string
          id: string
          nota: string | null
          numero_serie: number
          peso: number
          repeticoes: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          concluida?: boolean
          created_at?: string | null
          exercicio_usuario_id: string
          id?: string
          nota?: string | null
          numero_serie: number
          peso?: number
          repeticoes?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          concluida?: boolean
          created_at?: string | null
          exercicio_usuario_id?: string
          id?: string
          nota?: string | null
          numero_serie?: number
          peso?: number
          repeticoes?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_exercicio_usuario"
            columns: ["exercicio_usuario_id"]
            isOneToOne: false
            referencedRelation: "exercicios_treino_usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      treinos: {
        Row: {
          created_at: string
          dia_semana: string | null
          id: string
          mesociclo_id: string
          nome: string
          nome_personalizado: string | null
          ordem_semana: number
          programa_id: string
        }
        Insert: {
          created_at?: string
          dia_semana?: string | null
          id?: string
          mesociclo_id: string
          nome: string
          nome_personalizado?: string | null
          ordem_semana: number
          programa_id: string
        }
        Update: {
          created_at?: string
          dia_semana?: string | null
          id?: string
          mesociclo_id?: string
          nome?: string
          nome_personalizado?: string | null
          ordem_semana?: number
          programa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinos_mesociclo_id_fkey"
            columns: ["mesociclo_id"]
            isOneToOne: false
            referencedRelation: "mesociclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programas"
            referencedColumns: ["id"]
          },
        ]
      }
      treinos_avancados: {
        Row: {
          created_at: string
          descricao: string | null
          dias_semana: string[]
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          dias_semana: string[]
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          dias_semana?: string[]
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      treinos_iniciantes: {
        Row: {
          created_at: string
          descricao: string | null
          dias_semana: string[]
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          dias_semana: string[]
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          dias_semana?: string[]
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      treinos_usuario: {
        Row: {
          concluido: boolean
          created_at: string
          data_concluido: string | null
          id: string
          nome: string
          ordem_semana: number
          programa_usuario_id: string
          treino_original_id: string
          updated_at: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          data_concluido?: string | null
          id?: string
          nome: string
          ordem_semana: number
          programa_usuario_id: string
          treino_original_id: string
          updated_at?: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          data_concluido?: string | null
          id?: string
          nome?: string
          ordem_semana?: number
          programa_usuario_id?: string
          treino_original_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinos_usuario_programa_usuario_id_fkey"
            columns: ["programa_usuario_id"]
            isOneToOne: false
            referencedRelation: "programas_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_usuario_treino_original_id_fkey"
            columns: ["treino_original_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_treinos: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          nivel: string
          treino_avancado_id: string | null
          treino_iniciante_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nivel: string
          treino_avancado_id?: string | null
          treino_iniciante_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nivel?: string
          treino_avancado_id?: string | null
          treino_iniciante_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_treinos_treino_avancado_id_fkey"
            columns: ["treino_avancado_id"]
            isOneToOne: false
            referencedRelation: "treinos_avancados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_treinos_treino_iniciante_id_fkey"
            columns: ["treino_iniciante_id"]
            isOneToOne: false
            referencedRelation: "treinos_iniciantes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_temporary_substitution: {
        Args: {
          p_exercise_id: string
          p_is_custom_substitute?: boolean
          p_substitute_exercise_id: string
          p_substitute_name: string
        }
        Returns: undefined
      }
      ensure_series_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_available_exercises: {
        Args: { p_muscle_group: string }
        Returns: {
          id: string
          is_custom: boolean
          nome: string
          user_id: string
        }[]
      }
      get_distinct_muscle_groups: {
        Args: Record<PropertyKey, never>
        Returns: {
          grupo_muscular: string
        }[]
      }
      get_series_by_exercise: {
        Args: { exercise_id: string }
        Returns: {
          concluida: boolean
          created_at: string | null
          exercicio_usuario_id: string
          id: string
          nota: string | null
          numero_serie: number
          peso: number
          repeticoes: number
          updated_at: string | null
          user_id: string | null
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      replace_exercise_future_instances: {
        Args: {
          p_current_exercise_id: string
          p_is_custom_exercise?: boolean
          p_new_exercise_id: string
          p_new_exercise_name: string
          p_new_muscle_group: string
          p_new_reps: string
          p_new_series: number
        }
        Returns: undefined
      }
      save_series: {
        Args: {
          p_concluida: boolean
          p_exercicio_id: string
          p_numero_serie: number
          p_peso: number
          p_repeticoes: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "developer" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "developer", "user"],
    },
  },
} as const
