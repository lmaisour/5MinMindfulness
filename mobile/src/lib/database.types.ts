export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MeditationStatus =
  | 'pending'
  | 'generating_script'
  | 'generating_audio'
  | 'processing_audio'
  | 'ready'
  | 'failed';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_checkins: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          moods: string[];
          energy_level: number;
          focus: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          moods: string[];
          energy_level: number;
          focus: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string | null;
          moods?: string[];
          energy_level?: number;
          focus?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      meditations: {
        Row: {
          id: string;
          user_id: string;
          checkin_id: string;
          title: string | null;
          script_json: Json | null;
          audio_storage_path: string | null;
          target_duration_seconds: number;
          actual_duration_seconds: number | null;
          status: MeditationStatus;
          error_code: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          checkin_id: string;
          title?: string | null;
          script_json?: Json | null;
          audio_storage_path?: string | null;
          target_duration_seconds?: number;
          actual_duration_seconds?: number | null;
          status?: MeditationStatus;
          error_code?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          checkin_id?: string;
          title?: string | null;
          script_json?: Json | null;
          audio_storage_path?: string | null;
          target_duration_seconds?: number;
          actual_duration_seconds?: number | null;
          status?: MeditationStatus;
          error_code?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      listening_history: {
        Row: {
          id: string;
          user_id: string;
          meditation_id: string;
          started_at: string;
          completed_at: string | null;
          listened_seconds: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          meditation_id: string;
          started_at?: string;
          completed_at?: string | null;
          listened_seconds?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          meditation_id?: string;
          started_at?: string;
          completed_at?: string | null;
          listened_seconds?: number;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          preferred_voice: string | null;
          personalization_enabled: boolean;
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferred_voice?: string | null;
          personalization_enabled?: boolean;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferred_voice?: string | null;
          personalization_enabled?: boolean;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
