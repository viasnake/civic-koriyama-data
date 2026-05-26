insert or ignore into rss_feeds (
  id,
  name,
  url,
  enabled,
  created_at,
  updated_at
) values (
  'koriyama_city',
  '郡山市公式ウェブサイト RSS',
  'https://www.city.koriyama.lg.jp/rss/10/list1.xml',
  1,
  strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
);
