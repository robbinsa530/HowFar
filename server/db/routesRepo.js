const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidRouteUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Same merge as GeoController (first LineString in full, later segments skip the duplicate first vertex).
 * Matches client geojsonToPointsForGpx point order for a FeatureCollection of LineStrings.
 * @param {object} geojson - GeoJSON FeatureCollection
 * @returns {number[][]} [lng, lat][] or empty
 */
export function featureCollectionToLngLatPoints(geojson) {
  const merged = [];
  (geojson?.features ?? []).forEach((feature, i) => {
    const coords = feature?.geometry?.coordinates ?? [];
    if (i === 0) {
      merged.push(...coords);
    } else {
      merged.push(...coords.slice(1));
    }
  });
  return merged;
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} shareUuid - routes.share_uuid (from URL /api/routes/:uuid)
 * @param {string | null} viewerUserId - Supabase auth user id, or null if unauthenticated
 * @returns {Promise<{ routeGeom: object, pins: Array<{ lngLat: number[], name: string, color: string }>, name: string, isPrivate: boolean } | null>}
 */
export async function getRouteByUuid(pool, shareUuid, viewerUserId = null) {
  const routeResult = await pool.query(
    `SELECT ST_AsGeoJSON(route_geom)::json AS "routeGeom",
            is_private,
            creating_user_id::text AS "creatingUserId",
            name
     FROM routes
     WHERE share_uuid = $1::uuid`,
    [shareUuid]
  );
  const routeRow = routeResult.rows[0];
  if (!routeRow) return null;

  if (routeRow.is_private) {
    const ownerId = routeRow.creatingUserId;
    if (!ownerId || ownerId !== viewerUserId) {
      return null;
    }
  }

  const pinsResult = await pool.query(
    `SELECT ST_X(p.pin_geom) AS longitude, ST_Y(p.pin_geom) AS latitude, p.name, p.color
     FROM pins p
     INNER JOIN routes r ON r.id = p.route_id
     WHERE r.share_uuid = $1::uuid
     ORDER BY p.created_at ASC, p.id ASC`,
    [shareUuid]
  );

  const pins = pinsResult.rows.map((row) => ({
    lngLat: [row.longitude, row.latitude],
    name: row.name,
    color: row.color,
  }));

  return {
    routeGeom: routeRow.routeGeom,
    pins,
    name: routeRow.name ?? '',
    isPrivate: Boolean(routeRow.is_private),
  };
}

/**
 * @param {import('pg').Pool} pool
 * @param {object} params
 * @param {string} params.lineStringGeoJson - JSON string of a GeoJSON LineString geometry
 * @param {Array<{ lngLat: number[], name?: string, color?: string }>} params.pins
 * @param {string} params.creatingUserId - auth.users id
 * @param {string} params.name
 * @param {boolean} params.isPrivate
 * @returns {Promise<{ shareUuid: string }>}
 */
export async function createRouteWithPins(pool, {
  lineStringGeoJson,
  pins,
  creatingUserId,
  name,
  isPrivate,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const routeInsert = await client.query(
      `INSERT INTO routes (route_geom, creating_user_id, name, is_private)
       VALUES (ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), $2::uuid, $3, $4)
       RETURNING id, share_uuid`,
      [lineStringGeoJson, creatingUserId, name, isPrivate]
    );
    const { id: routeId, share_uuid: shareUuid } = routeInsert.rows[0];

    for (const pin of pins) {
      const lngLat = pin.lngLat;
      if (!Array.isArray(lngLat) || lngLat.length < 2) continue;
      const lng = Number(lngLat[0]);
      const lat = Number(lngLat[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      await client.query(
        `INSERT INTO pins (route_id, pin_geom, name, color)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5)`,
        [routeId, lng, lat, pin.name ?? '', pin.color ?? 'red']
      );
    }

    await client.query('COMMIT');
    return { shareUuid: String(shareUuid) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
