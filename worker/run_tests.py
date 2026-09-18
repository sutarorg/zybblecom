#!/usr/bin/env python3
"""Run the scraper worker's offline test suite.

    python worker/run_tests.py            # from the repository root
    python run_tests.py                   # from inside worker/

The suite runs the real worker end to end — coverage planning, the
`gosom/google-maps-scraper` engine adapter (subprocess, JSONL streaming,
deadline and failure handling), dedupe, filters, email discovery and the full
job pipeline — against the offline CLI simulator in worker/tests/fake_gms.py.
It needs no browser, no engine binary, no network and no credentials:

    python run_tests.py                     # everything
    python -m unittest tests.test_engine    # one module

To exercise the *real* engine binary instead of the simulator, run the smoke
test: `python smoke_test.py --simulate "gym" "Delhi" 5` (offline) or without
`--simulate` once `google-maps-scraper` is installed.
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
