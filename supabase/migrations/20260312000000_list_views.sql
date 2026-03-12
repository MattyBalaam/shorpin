CREATE TABLE list_views (
  list_id   uuid    REFERENCES lists(id) ON DELETE CASCADE,
  user_id   uuid    REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at bigint  NOT NULL,
  PRIMARY KEY (list_id, user_id)
);

ALTER TABLE list_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own list views"
  ON list_views FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
