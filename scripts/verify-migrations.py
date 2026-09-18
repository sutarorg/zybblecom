#!/usr/bin/env python3
"""Parse-check every Supabase migration.

Syntax errors in a migration are only discovered at run time otherwise — in the
Supabase SQL editor, halfway through a release. This parses each file with
libpg_query (via `pglast`, `pip install pglast`). If `pglast` is not installed
the check is skipped rather than failing an unrelated environment.

Run: python3 scripts/verify-migrations.py
"""

from __future__ import annotations

import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIGRATIONS = sorted(glob.glob(os.path.join(ROOT, "supabase", "migrations", "*.sql")))


def main() -> int:
    try:
        from pglast import parse_sql
    except ImportError:
        print("verify-migrations: SKIPPED — install pglast to enable SQL parse checks.")
        return 0

    if not MIGRATIONS:
        print("verify-migrations: FAIL — no migrations found.")
        return 1

    failures = []
    for path in MIGRATIONS:
        try:
            parse_sql(open(path, encoding="utf-8").read())
        except Exception as err:  # noqa: BLE001 - report every parse error
            failures.append((os.path.basename(path), str(err).splitlines()[0][:200]))

    if failures:
        print("verify-migrations: FAIL")
        for name, message in failures:
            print(f"  {name}: {message}")
        return 1

    print(f"verify-migrations: OK — {len(MIGRATIONS)} migrations parse cleanly.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
