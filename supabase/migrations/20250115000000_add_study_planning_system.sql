-- Migração para Sistema de Planejamento de Estudos com IA

-- Tipos customizados
CREATE TYPE plan_status AS ENUM ('active', 'paused', 'completed', 'cancelled');
CREATE TYPE goal_type AS ENUM ('daily', 'weekly', 'monthly', 'exam_date');
CREATE TYPE session_type AS ENUM ('study', 'review', 'practice', 'break');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Tabela de planos de estudo
CREATE TABLE IF NOT EXISTS study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  exam_name text,
  exam_date date,
  total_study_hours integer DEFAULT 0,
  daily_study_hours integer DEFAULT 2,
  status plan_status DEFAULT 'active',
  ai_generated boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de matérias do plano
CREATE TABLE IF NOT EXISTS plan_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE NOT NULL,
  subject_name text NOT NULL,
  weight_percentage integer DEFAULT 10,
  estimated_hours integer DEFAULT 0,
  completed_hours integer DEFAULT 0,
  difficulty difficulty_level DEFAULT 'medium',
  priority integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de cronograma de estudos
CREATE TABLE IF NOT EXISTS study_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES plan_subjects(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  start_time time,
  end_time time,
  duration_minutes integer NOT NULL,
  session_type session_type DEFAULT 'study',
  topic text,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de metas de estudo
CREATE TABLE IF NOT EXISTS study_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  goal_type goal_type NOT NULL,
  target_value integer NOT NULL,
  current_value integer DEFAULT 0,
  target_date date,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de sessões de estudo
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES plan_subjects(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer,
  session_type session_type DEFAULT 'study',
  notes text,
  productivity_rating integer CHECK (productivity_rating >= 1 AND productivity_rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de revisões programadas
CREATE TABLE IF NOT EXISTS scheduled_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES plan_subjects(id) ON DELETE CASCADE,
  review_date date NOT NULL,
  review_number integer DEFAULT 1,
  completed boolean DEFAULT false,
  difficulty_rating integer CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  next_review_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reviews ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para study_plans
CREATE POLICY "Users can manage own study plans" ON study_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para plan_subjects
CREATE POLICY "Users can manage own plan subjects" ON plan_subjects
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM study_plans WHERE id = plan_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM study_plans WHERE id = plan_id AND user_id = auth.uid())
  );

-- Políticas RLS para study_schedule
CREATE POLICY "Users can manage own study schedule" ON study_schedule
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM study_plans WHERE id = plan_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM study_plans WHERE id = plan_id AND user_id = auth.uid())
  );

-- Políticas RLS para study_goals
CREATE POLICY "Users can manage own study goals" ON study_goals
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para study_sessions
CREATE POLICY "Users can manage own study sessions" ON study_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para scheduled_reviews
CREATE POLICY "Users can manage own scheduled reviews" ON scheduled_reviews
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX study_plans_user_id_idx ON study_plans(user_id);
CREATE INDEX plan_subjects_plan_id_idx ON plan_subjects(plan_id);
CREATE INDEX study_schedule_plan_id_date_idx ON study_schedule(plan_id, scheduled_date);
CREATE INDEX study_goals_user_id_idx ON study_goals(user_id);
CREATE INDEX study_sessions_user_id_idx ON study_sessions(user_id);
CREATE INDEX scheduled_reviews_user_id_date_idx ON scheduled_reviews(user_id, review_date);

-- Triggers para updated_at
CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON study_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_subjects_updated_at
  BEFORE UPDATE ON plan_subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_schedule_updated_at
  BEFORE UPDATE ON study_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_goals_updated_at
  BEFORE UPDATE ON study_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at
  BEFORE UPDATE ON study_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reviews_updated_at
  BEFORE UPDATE ON scheduled_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();