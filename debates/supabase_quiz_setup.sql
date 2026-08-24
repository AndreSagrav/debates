-- ========================================================
-- SCRIPT DE SUPABASE PARA EL MODO QUIZ LIVE (KAHOOT)
-- Pega y ejecuta esto en el SQL Editor de tu Dashboard de Supabase
-- ========================================================

-- 1. Tabla de Sesiones de Quiz
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pin TEXT NOT NULL,
  status TEXT DEFAULT 'lobby',
  current_question INT DEFAULT 0,
  questions JSONB DEFAULT '[]'::jsonb,
  players JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Respuestas de Estudiantes
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  question_index INT NOT NULL,
  answer_index INT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar Seguridad RLS y Políticas de Acceso Público
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all quiz_sessions" ON public.quiz_sessions;
CREATE POLICY "Allow public all quiz_sessions" ON public.quiz_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all quiz_responses" ON public.quiz_responses;
CREATE POLICY "Allow public all quiz_responses" ON public.quiz_responses FOR ALL USING (true) WITH CHECK (true);

-- 4. Habilitar Publicación en Tiempo Real para Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_responses;
