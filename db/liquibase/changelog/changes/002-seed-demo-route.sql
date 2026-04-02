--liquibase formatted sql

--changeset howfar:002-seed-demo-route

INSERT INTO routes (share_uuid, route_geom) VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  ST_SetSRID(
    ST_GeomFromText(
      'MULTILINESTRING ((-104.96 39.76, -104.94 39.77), (-104.94 39.77, -104.92 39.765))'
    ),
    4326
  )
);

INSERT INTO pins (route_id, pin_geom, name, color)
SELECT
  r.id,
  ST_SetSRID(ST_MakePoint(-104.95, 39.762), 4326),
  'Water stop',
  'red'
FROM routes r
WHERE r.share_uuid = '00000000-0000-4000-8000-000000000001'::uuid;

--rollback DELETE FROM routes WHERE share_uuid = '00000000-0000-4000-8000-000000000001'::uuid;
