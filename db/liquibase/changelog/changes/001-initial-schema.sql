--liquibase formatted sql

--changeset howfar:001-postgis-and-routes
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE routes (
  id BIGSERIAL PRIMARY KEY,
  share_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  route_geom geometry(Geometry, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT routes_route_geom_line_type CHECK (
    ST_Dimension(route_geom) = 1
    AND ST_GeometryType(route_geom) IN ('ST_LineString', 'ST_MultiLineString')
  ),
  route_geog geography GENERATED ALWAYS AS (route_geom::geography) STORED,
  route_length_m double precision GENERATED ALWAYS AS (ST_Length(route_geom::geography)) STORED,
  route_bbox geometry GENERATED ALWAYS AS (ST_Envelope(route_geom)) STORED
);

CREATE INDEX idx_routes_route_geom ON routes USING gist (route_geom);
CREATE INDEX idx_routes_route_geog ON routes USING gist (route_geog);
CREATE INDEX idx_routes_route_bbox ON routes USING gist (route_bbox);

COMMENT ON TABLE routes IS 'Shared routes: line geometry only; segment distances and waypoints are derived on load.';
COMMENT ON COLUMN routes.id IS 'Internal surrogate key; pins reference this (8 bytes vs 16 for UUID).';
COMMENT ON COLUMN routes.share_uuid IS 'Public id for URLs and API (/route/:share_uuid); stable and unguessable.';
COMMENT ON COLUMN routes.route_geom IS 'LineString or MultiLineString (WGS84), full path as drawn.';
COMMENT ON COLUMN routes.route_geog IS 'Geography mirror for ST_DWithin / length in meters.';
COMMENT ON COLUMN routes.route_length_m IS 'Total geodesic length in meters (generated).';
COMMENT ON COLUMN routes.route_bbox IS '2D envelope for viewport / bbox search (generated).';

CREATE TABLE pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  pin_geom geometry(Point, 4326) NOT NULL,
  name text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'red',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pins_point_wgs84 CHECK (
    ST_SRID(pin_geom) = 4326
    AND ST_GeometryType(pin_geom) = 'ST_Point'
    AND ST_X(pin_geom) BETWEEN -180 AND 180
    AND ST_Y(pin_geom) BETWEEN -90 AND 90
  )
);

CREATE INDEX idx_pins_route_id ON pins (route_id);
CREATE INDEX idx_pins_pin_geom ON pins USING gist (pin_geom);

COMMENT ON TABLE pins IS 'Waypoints for a shared route; location is WGS84 (SRID 4326).';
COMMENT ON COLUMN pins.pin_geom IS 'Point geometry; use ST_X/ST_Y for lon/lat in degrees.';

--rollback DROP TABLE IF EXISTS pins;
--rollback DROP TABLE IF EXISTS routes;
--rollback DROP EXTENSION IF EXISTS postgis;
