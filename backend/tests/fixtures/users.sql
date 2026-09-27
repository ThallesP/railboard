INSERT INTO users (username, total_deploys, name, website, created_at) VALUES
    ('alice', 120, 'Alice', 'https://alice.dev', now() - interval '40 days'),
    ('bob', 50, NULL, NULL, now() - interval '20 days'),
    ('carol', 50, NULL, NULL, now() - interval '1 day');

-- alice: 20 deploys in the last 7 days, 5 in the 7 days before.
INSERT INTO deployment_snapshots (user_id, total_deploys, created_at)
SELECT id, total, now() - age
FROM users, (VALUES
    (95, interval '40 days'),
    (100, interval '13 days'),
    (110, interval '3 days'),
    (120, interval '1 hour')
) AS history (total, age)
WHERE username = 'alice';

-- bob: no deploys this week, 10 last week.
INSERT INTO deployment_snapshots (user_id, total_deploys, created_at)
SELECT id, total, now() - age
FROM users, (VALUES
    (40, interval '20 days'),
    (50, interval '10 days')
) AS history (total, age)
WHERE username = 'bob';

-- carol has no snapshots yet.
