--liquibase formatted sql

--changeset howfar:003-creating-user-id
--comment Link saved routes to Supabase Auth user, display name, and private visibility.
-- On Supabase you may add a foreign key in the SQL editor:
--   ALTER TABLE routes ADD CONSTRAINT routes_creating_user_id_fkey
--     FOREIGN KEY (creating_user_id) REFERENCES auth.users (id) ON DELETE SET NULL;
-- (Skip the FK on local Postgres if the auth schema is not present.)

ALTER TABLE routes ADD COLUMN creating_user_id UUID;

CREATE INDEX idx_routes_creating_user_id ON routes (creating_user_id) WHERE creating_user_id IS NOT NULL;

COMMENT ON COLUMN routes.creating_user_id IS 'Supabase Auth user id (auth.users.id) when the route was saved by a logged-in user; NULL for legacy or non-owner rows.';

ALTER TABLE routes ADD COLUMN name TEXT NOT NULL DEFAULT '';

ALTER TABLE routes ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN routes.name IS 'Display name when the route was saved by a user.';
COMMENT ON COLUMN routes.is_private IS 'If true, only the creating user may load this route by share UUID.';

--rollback ALTER TABLE routes DROP COLUMN IF EXISTS is_private;
--rollback ALTER TABLE routes DROP COLUMN IF EXISTS name;
--rollback DROP INDEX IF EXISTS idx_routes_creating_user_id;
--rollback ALTER TABLE routes DROP COLUMN IF EXISTS creating_user_id;
