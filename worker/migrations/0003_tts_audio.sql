-- Pronunciation audio for /api/tts: one MP3 per normalised text, from the dictionary or Workers AI.
CREATE TABLE tts_audio (
  text TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  audio BLOB NOT NULL,
  created_at INTEGER NOT NULL
);
