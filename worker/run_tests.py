#!/usr/bin/env python3
"""Run the scraper worker's offline test suite.

    python worker/run_tests.py            # from the repository root
    python run_tests.py                   # from inside worker/

The suite runs the real engine (coverage planning, the vendored GoogleMapScraper
core, dedupe, filters, email discovery and the full worker pipeline) against the
offline Google Maps simulator in worker/tests/fake_maps.py, so it needs no
browser, no network and no credentials.
"""

from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)


def main() -> int:
    suite = unittest.defaultTestLoader.discover(
        start_dir=os.path.join(HERE, "tests"),
        pattern="test_*.py",
        top_level_dir=HERE,
    )
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
