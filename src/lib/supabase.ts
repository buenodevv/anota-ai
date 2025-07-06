import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          original_filename: string;
          file_type: string;
          file_size: number;
          file_url: string;
          content: string;
          summary_short: string | null;
          summary_medium: string | null;
          summary_detailed: string | null;
          category: string | null;
          tags: string[] | null;
          is_favorite: boolean;
          processing_status: 'pending' | 'processing' | 'completed' | 'error';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          original_filename: string;
          file_type: string;
          file_size: number;
          file_url: string;
          content: string;
          summary_short?: string | null;
          summary_medium?: string | null;
          summary_detailed?: string | null;
          category?: string | null;
          tags?: string[] | null;
          is_favorite?: boolean;
          processing_status?: 'pending' | 'processing' | 'completed' | 'error';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          original_filename?: string;
          file_type?: string;
          file_size?: number;
          file_url?: string;
          content?: string;
          summary_short?: string | null;
          summary_medium?: string | null;
          summary_detailed?: string | null;
          category?: string | null;
          tags?: string[] | null;
          is_favorite?: boolean;
          processing_status?: 'pending' | 'processing' | 'completed' | 'error';
          created_at?: string;
          updated_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          default_summary_type: 'short' | 'medium' | 'detailed';
          auto_categorize: boolean;
          preferred_tone: 'formal' | 'casual' | 'simple';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          default_summary_type?: 'short' | 'medium' | 'detailed';
          auto_categorize?: boolean;
          preferred_tone?: 'formal' | 'casual' | 'simple';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          default_summary_type?: 'short' | 'medium' | 'detailed';
          auto_categorize?: boolean;
          preferred_tone?: 'formal' | 'casual' | 'simple';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};