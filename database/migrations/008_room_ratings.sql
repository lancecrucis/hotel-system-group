CREATE TABLE room_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  reviewer_name varchar(80) NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text varchar(500) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, reviewer_name, review_text)
);

CREATE INDEX room_ratings_room_created_idx ON room_ratings(room_id, created_at DESC);
