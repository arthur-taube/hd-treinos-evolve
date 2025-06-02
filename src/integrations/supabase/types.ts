export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          series: number
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
          series: number
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
          series?: number
          treino_usuario_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
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
          dia_semana: string
          id: string
          mesociclo_id: string
          nome: string
          ordem_semana: number
          programa_id: string
        }
        Insert: {
          created_at?: string
          dia_semana: string
          id?: string
          mesociclo_id: string
          nome: string
          ordem_semana: number
          programa_id: string
        }
        Update: {
          created_at?: string
          dia_semana?: string
          id?: string
          mesociclo_id?: string
          nome?: string
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
      ensure_series_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
          numero_serie: number
          peso: number
          repeticoes: number
          updated_at: string | null
          user_id: string | null
        }[]
      }
      save_series: {
        Args: {
          p_exercicio_id: string
          p_numero_serie: number
          p_peso: number
          p_repeticoes: number
          p_concluida: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
