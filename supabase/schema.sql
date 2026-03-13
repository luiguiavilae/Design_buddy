CREATE TABLE evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id text NOT NULL,
  file_name text NOT NULL,
  user_name text NOT NULL,
  timestamp timestamptz NOT NULL,
  overall_score numeric(5,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon can insert" ON evaluations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon can select" ON evaluations FOR SELECT TO anon USING (true);
