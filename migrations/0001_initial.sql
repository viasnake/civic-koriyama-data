create table if not exists datasets (
  id text primary key,
  name text not null,
  category text not null,
  source_name text not null,
  source_page_url text,
  source_file_url text,
  source_file_type text,
  license text,
  attribution text,
  enabled integer not null default 1,
  public_api integer not null default 1,
  normalize_as text,
  fetched_at text,
  source_updated_at text,
  created_at text not null,
  updated_at text not null
);

create table if not exists raw_records (
  id text primary key,
  dataset_id text not null,
  source_record_key text,
  source_row_hash text not null,
  raw_json text not null,
  fetched_at text not null,
  foreign key(dataset_id) references datasets(id)
);

create table if not exists places (
  id text primary key,
  dataset_id text not null,
  name text not null,
  category text not null,
  subcategory text,
  address text,
  lat real,
  lng real,
  phone text,
  fax text,
  email text,
  official_url text,
  source_url text,
  source_record_hash text not null,
  attributes_json text not null,
  first_seen_at text not null,
  last_seen_at text not null,
  deleted_at text,
  foreign key(dataset_id) references datasets(id)
);

create table if not exists record_changes (
  id integer primary key autoincrement,
  dataset_id text not null,
  record_id text not null,
  change_type text not null,
  changed_at text not null,
  before_json text,
  after_json text
);

create table if not exists rss_feeds (
  id text primary key,
  name text not null,
  url text not null,
  enabled integer not null default 1,
  fetched_at text,
  created_at text not null,
  updated_at text not null
);

create table if not exists rss_entries (
  id text primary key,
  feed_id text not null,
  title text not null,
  link text not null,
  published_at text,
  fetched_at text not null,
  category text,
  tags_json text not null default '[]',
  source_hash text not null,
  foreign key(feed_id) references rss_feeds(id)
);

create table if not exists fetch_logs (
  id integer primary key autoincrement,
  source_type text not null,
  source_id text not null,
  status text not null,
  fetched_at text not null,
  records_count integer,
  error_message text
);
