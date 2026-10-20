-- Minimal private consultation inbox for the public implementation offer.
-- Contains only voluntarily supplied contact and business workflow data.
CREATE TABLE IF NOT EXISTS sales_inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT NOT NULL,
  workflow_summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','closed'))
);
CREATE INDEX IF NOT EXISTS idx_sales_inquiries_created ON sales_inquiries(created_at DESC);
CREATE TABLE IF NOT EXISTS sales_inquiry_limits (
  bucket TEXT NOT NULL,
  identity TEXT NOT NULL,
  used INTEGER NOT NULL CHECK (used >= 0),
  PRIMARY KEY(bucket, identity)
);
