const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidRouteUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} shareUuid - routes.share_uuid (from URL /api/routes/:uuid)
 * @returns {Promise<{ routeGeom: object, pins: Array<{ lngLat: number[], name: string, color: string }> } | null>}
 */
export async function getRouteByUuid(pool, shareUuid) {
  const routeResult = await pool.query(
    `SELECT ST_AsGeoJSON(route_geom)::json AS "routeGeom"
     FROM routes
     WHERE share_uuid = $1::uuid`,
    [shareUuid]
  );
  const routeRow = routeResult.rows[0];
  if (!routeRow) return null;

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
  };
}
