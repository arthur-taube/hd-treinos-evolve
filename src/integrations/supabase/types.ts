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
      [_ in never]: never
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
