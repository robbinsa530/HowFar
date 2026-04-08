#!/usr/bin/env bash
# Run Liquibase against production (e.g. Supabase). See scripts/db-migrate-prod.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/scripts/liquibase-prod.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

CMD="${1:-update}"

: "${HOWFAR_PROD_LIQUIBASE_JDBC_URL:?Missing HOWFAR_PROD_LIQUIBASE_JDBC_URL (set in scripts/liquibase-prod.env — copy from liquibase-prod.env.example)}"
: "${HOWFAR_PROD_LIQUIBASE_USER:?Missing HOWFAR_PROD_LIQUIBASE_USER}"
: "${HOWFAR_PROD_LIQUIBASE_PASSWORD:?Missing HOWFAR_PROD_LIQUIBASE_PASSWORD}"

cd "$ROOT/db/liquibase"

case "$CMD" in
  update)
    liquibase update \
      --changelog-file=changelog/db.changelog-master.yaml \
      --url="$HOWFAR_PROD_LIQUIBASE_JDBC_URL" \
      --username="$HOWFAR_PROD_LIQUIBASE_USER" \
      --password="$HOWFAR_PROD_LIQUIBASE_PASSWORD"
    ;;
  status)
    liquibase status \
      --changelog-file=changelog/db.changelog-master.yaml \
      --url="$HOWFAR_PROD_LIQUIBASE_JDBC_URL" \
      --username="$HOWFAR_PROD_LIQUIBASE_USER" \
      --password="$HOWFAR_PROD_LIQUIBASE_PASSWORD"
    ;;
  history)
    liquibase history \
      --changelog-file=changelog/db.changelog-master.yaml \
      --url="$HOWFAR_PROD_LIQUIBASE_JDBC_URL" \
      --username="$HOWFAR_PROD_LIQUIBASE_USER" \
      --password="$HOWFAR_PROD_LIQUIBASE_PASSWORD"
    ;;
  *)
    echo "Usage: $0 [update|status|history]" >&2
    echo "  update  — apply pending changes (default)" >&2
    echo "  status  — show pending vs applied" >&2
    echo "  history — deployment history" >&2
    exit 1
    ;;
esac
