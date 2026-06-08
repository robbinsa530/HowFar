--liquibase formatted sql

--changeset howfar:004-deleted-routes
--comment Tombstone table for hard-deleted routes so share links can return a clear "deleted" response.

CREATE TABLE deleted_routes (
  share_uuid UUID PRIMARY KEY,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE deleted_routes IS 'Share UUIDs of routes that were permanently deleted; used to distinguish deleted links from never-existing ones.';
COMMENT ON COLUMN deleted_routes.share_uuid IS 'Public route identifier (routes.share_uuid at time of deletion).';
COMMENT ON COLUMN deleted_routes.deleted_at IS 'When the route was deleted.';

--rollback DROP TABLE IF EXISTS deleted_routes;
