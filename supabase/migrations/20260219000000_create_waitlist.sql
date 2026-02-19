CREATE TABLE waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Public can request access"
  ON waitlist FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read/delete
CREATE POLICY "Authenticated users can read waitlist"
  ON waitlist FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete waitlist"
  ON waitlist FOR DELETE
  TO authenticated
  USING (true);
