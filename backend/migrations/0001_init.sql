CREATE TABLE users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username text NOT NULL UNIQUE,
    total_deploys bigint NOT NULL,
    avatar text,
    name text,
    website text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per observed change of a user's cumulative deploy count.
CREATE TABLE deployment_snapshots (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    total_deploys bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX deployment_snapshots_user_created_at_idx
    ON deployment_snapshots (user_id, created_at);
