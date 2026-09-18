"""The `gosom/google-maps-scraper` adapter: invocation, streaming, failure modes.

These tests run the **real** ``gmaps_engine.GosomEngine`` — real subprocess, real
JSONL results file, real process-group teardown — against the CLI double from
``tests/fake_gms.py``, which speaks upstream's flag and output contract. Nothing
about the transport is mocked, so a change to the flags Zybble sends, to the
entry fields Zybble reads, or to the way results are streamed fails here first.
"""

from __future__ import annotations

import json
import os
import stat
import tempfile
import time
import unittest
from unittest import mock

from gmaps_engine import (
    EngineRun,
    EngineTarget,
    EngineUnavailable,
    GosomEngine,
    detect_challenge,
    find_binary,
    upstream_pin,
)
from tests.fake_gms import FakeEngine, build_world

TARGETS = [
    EngineTarget(id="t0", url="https://www.google.com/maps/search/gym+in+Delhi/@28.6139,77.2090,12.14z", label="gym in Delhi · area 1/4"),
    EngineTarget(id="t1", url="https://www.google.com/maps/search/gym+near+Delhi/@28.5300,77.2900,12.14z", label="gym near Delhi · area 2/4"),
]


def deadline_in(seconds: float) -> float:
    return time.monotonic() + seconds


class PinTest(unittest.TestCase):
    def test_the_upstream_pin_is_recorded(self):
        pin = upstream_pin()
        self.assertEqual(pin.get("upstream"), "https://github.com/gosom/google-maps-scraper")
        self.assertTrue(str(pin.get("version", "")).startswith("v"), "the engine must be pinned to a tag")
        self.assertEqual(len(str(pin.get("commit", ""))), 40, "the engine must be pinned to a commit")
        self.assertEqual(pin.get("license"), "MIT")
        self.assertEqual(pin.get("binary"), "google-maps-scraper")

    def test_the_upstream_licence_ships_with_the_worker(self):
        here = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(here, "..", "vendor", "LICENSE-google-maps-scraper.txt")
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
        self.assertIn("MIT License", text)
        self.assertIn("Georgios Komninos", text)


class BinaryDiscoveryTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="zybble-engine-test-")
        self.fake = FakeEngine(build_world(6, seed=1), tmpdir=self.tmp)

    def tearDown(self):
        self.fake.cleanup()

    def test_explicit_binary_wins(self):
        self.assertEqual(find_binary(self.fake.binary), self.fake.binary)

    def test_environment_variable_is_honoured(self):
        with mock.patch.dict(os.environ, {"GOOGLE_MAPS_SCRAPER_BIN": self.fake.binary}, clear=False):
            self.assertEqual(find_binary(), self.fake.binary)

    def test_a_missing_binary_is_reported_not_guessed(self):
        missing = os.path.join(self.tmp, "definitely-not-here")
        empty_path = os.path.join(self.tmp, "empty-bin")
        os.makedirs(empty_path, exist_ok=True)
        with mock.patch.dict(os.environ, {"PATH": empty_path, "GOOGLE_MAPS_SCRAPER_BIN": missing}, clear=False):
            self.assertIsNone(find_binary())
            with self.assertRaises(EngineUnavailable) as caught:
                GosomEngine(binary=missing).resolve_binary()
        message = str(caught.exception)
        self.assertIn("GOOGLE_MAPS_SCRAPER_BIN", message, "the error must say how to fix it")
        self.assertIn("worker/Dockerfile", message)

    def test_a_non_executable_file_is_not_used(self):
        path = os.path.join(self.tmp, "not-executable")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write("#!/bin/sh\n")
        os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)
        with mock.patch.dict(os.environ, {"GOOGLE_MAPS_SCRAPER_BIN": path}, clear=False):
            self.assertIsNone(find_binary(explicit=path))

    def test_the_worker_image_installs_the_binary_where_the_adapter_looks(self):
        """The Dockerfile's install path must be one of the searched locations."""
        from gmaps_engine import BINARY_DIRS

        pin = upstream_pin()
        self.assertIn(os.path.dirname(pin["install_path"]), BINARY_DIRS)


class InvocationContractTest(unittest.TestCase):
    """The exact command line Zybble relies on — upstream flags must not drift."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="zybble-engine-test-")
        self.fake = FakeEngine(build_world(12, seed=2), tmpdir=self.tmp)

    def tearDown(self):
        self.fake.cleanup()

    def test_argv_uses_the_documented_flags(self):
        engine = GosomEngine(binary=self.fake.binary, concurrency=3, depth=7, lang="de",
                             exit_on_inactivity="90s", browser_pool_size=2, pages_per_browser=4)
        argv = engine.build_argv("/tmp/in.txt", "/tmp/out.jsonl")
        self.assertEqual(argv[0], self.fake.binary)
        self.assertEqual(argv[argv.index("-input") + 1], "/tmp/in.txt")
        self.assertEqual(argv[argv.index("-results") + 1], "/tmp/out.jsonl")
        self.assertEqual(argv[argv.index("-c") + 1], "3")
        self.assertEqual(argv[argv.index("-depth") + 1], "7")
        self.assertEqual(argv[argv.index("-lang") + 1], "de")
        self.assertEqual(argv[argv.index("-exit-on-inactivity") + 1], "90s")
        self.assertEqual(argv[argv.index("-browser-pool-size") + 1], "2")
        self.assertEqual(argv[argv.index("-pages-per-browser") + 1], "4")
        self.assertIn("-json", argv, "JSONL output is what the adapter parses")
        self.assertNotIn("-email", argv, "email extraction is opt-in")
        self.assertNotIn("-fast-mode", argv)
        self.assertNotIn("-resume", argv, "Zybble owns resumability")
        self.assertNotIn("-dsn", argv, "Zybble never gives the engine a database")

    def test_boolean_flags_are_bare_go_flags(self):
        """Go's flag package rejects `-json true`; booleans must have no value."""
        engine = GosomEngine(binary=self.fake.binary, extract_email=True, disable_page_reuse=True)
        argv = engine.build_argv("in", "out")
        for flag in ("-json", "-email", "-disable-page-reuse"):
            index = argv.index(flag)
            self.assertTrue(index + 1 == len(argv) or argv[index + 1].startswith("-"),
                            f"{flag} must not be followed by a value")

    def test_optional_flags_are_only_sent_when_configured(self):
        engine = GosomEngine(binary=self.fake.binary, proxies_file="/run/proxies.txt",
                             extra_args=("-zoom", "16"))
        argv = engine.build_argv("in", "out")
        self.assertEqual(argv[argv.index("-proxies-file") + 1], "/run/proxies.txt")
        self.assertEqual(argv[-2:], ["-zoom", "16"])

        plain = GosomEngine(binary=self.fake.binary, browser_pool_size=0, pages_per_browser=1)
        argv = plain.build_argv("in", "out")
        self.assertNotIn("-browser-pool-size", argv)
        self.assertNotIn("-pages-per-browser", argv)

    def test_per_run_depth_override_is_applied(self):
        engine = GosomEngine(binary=self.fake.binary, depth=10)
        argv = engine.build_argv("in", "out", depth=2)
        self.assertEqual(argv[argv.index("-depth") + 1], "2")
        self.assertEqual(engine.build_argv("in", "out")[engine.build_argv("in", "out").index("-depth") + 1], "10")

    def test_telemetry_is_always_disabled(self):
        engine = GosomEngine(binary=self.fake.binary, env={"SOMETHING": "else"})
        child_env = engine.env_for_child()
        self.assertEqual(child_env["DISABLE_TELEMETRY"], "1")
        self.assertEqual(child_env["SOMETHING"], "else")

    def test_the_child_receives_exactly_that_invocation(self):
        """Assert against what the process really got, not what we intended."""
        run = self.fake.engine.scrape(TARGETS, deadline=deadline_in(30))
        self.assertEqual(run.exit_code, 0)
        invocations = self.fake.invocations()
        self.assertEqual(len(invocations), 1)
        argv = invocations[0]["argv"]
        for flag in ("-input", "-results", "-json", "-c", "-depth", "-lang", "-exit-on-inactivity"):
            self.assertIn(flag, argv)
        self.assertEqual(argv[argv.index("-json")], "-json")

    def test_the_input_file_uses_upstreams_custom_id_syntax(self):
        engine = GosomEngine(binary=self.fake.binary, keep_workdir=True, poll_interval=0.01,
                             env=self.fake.engine.env, sleep=lambda _s: None)
        run = engine.scrape(TARGETS, deadline=deadline_in(30))
        try:
            input_path = run.argv[run.argv.index("-input") + 1]
            with open(input_path, encoding="utf-8") as handle:
                lines = [line.rstrip("\n") for line in handle if line.strip()]
            self.assertEqual(len(lines), 2)
            self.assertEqual(lines[0], f"{TARGETS[0].url}#!#t0")
            self.assertEqual(lines[1], f"{TARGETS[1].url}#!#t1")
        finally:
            import shutil

            shutil.rmtree(run.workdir, ignore_errors=True)

    def test_from_env_reads_and_clamps_every_knob(self):
        env = {
            "GOOGLE_MAPS_SCRAPER_BIN": self.fake.binary,
            "SCRAPER_ENGINE_CONCURRENCY": "99",
            "SCRAPER_ENGINE_BROWSER_POOL": "0",
            "SCRAPER_ENGINE_PAGES_PER_BROWSER": "4",
            "SCRAPER_ENGINE_DEPTH": "5",
            "SCRAPER_ENGINE_LANG": "fr",
            "SCRAPER_ENGINE_INACTIVITY": "45s",
            "SCRAPER_ENGINE_EXTRACT_EMAIL": "true",
            "SCRAPER_ENGINE_PROXIES_FILE": "/tmp/proxies.txt",
            "SCRAPER_ENGINE_EXTRA_ARGS": "-zoom 15",
        }
        with mock.patch.dict(os.environ, env, clear=False):
            engine = GosomEngine.from_env()
        self.assertEqual(engine.binary, self.fake.binary)
        self.assertEqual(engine.concurrency, 16, "concurrency is clamped to a safe maximum")
        self.assertEqual(engine.browser_pool_size, 0)
        self.assertEqual(engine.pages_per_browser, 4)
        self.assertEqual(engine.depth, 5)
        self.assertEqual(engine.lang, "fr")
        self.assertEqual(engine.exit_on_inactivity, "45s")
        self.assertTrue(engine.extract_email)
        self.assertEqual(engine.proxies_file, "/tmp/proxies.txt")
        self.assertEqual(engine.extra_args, ("-zoom", "15"))

    def test_from_env_survives_garbage_values(self):
        env = {"SCRAPER_ENGINE_CONCURRENCY": "many", "SCRAPER_ENGINE_DEPTH": "", "SCRAPER_ENGINE_LANG": "  "}
        with mock.patch.dict(os.environ, env, clear=False):
            engine = GosomEngine.from_env()
        self.assertGreaterEqual(engine.concurrency, 1)
        self.assertGreaterEqual(engine.depth, 1)
        self.assertEqual(engine.lang, "en")

    def test_version_is_reported_for_logs(self):
        self.assertIn("fakeengine", self.fake.engine.version())
        self.assertEqual(GosomEngine(binary="/nope/not-here").version(), "unavailable")


class StreamingTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="zybble-engine-test-")
        self.world = build_world(60, seed=5)
        self.fake = FakeEngine(self.world, tmpdir=self.tmp, delay=0.02)

    def tearDown(self):
        self.fake.cleanup()

    def test_results_are_streamed_while_the_engine_still_runs(self):
        stamps: list[float] = []
        entries: list[dict] = []

        def on_entry(entry, label):
            stamps.append(time.monotonic())
            entries.append(entry)
            return True

        run = self.fake.engine.scrape(TARGETS[:1], deadline=deadline_in(60), on_entry=on_entry)
        self.assertGreater(len(entries), 5)
        spread = stamps[-1] - stamps[0]
        self.assertGreater(spread, 0.05, "entries must arrive incrementally, not in one final read")
        self.assertEqual(run.emitted, len(entries))

    def test_entries_are_attributed_to_the_target_that_found_them(self):
        seen: list[tuple[str, str]] = []
        run = self.fake.engine.scrape(
            TARGETS, deadline=deadline_in(60),
            on_entry=lambda entry, label: seen.append((str(entry.get("input_id")), label)) or True,
        )
        self.assertEqual(run.exit_code, 0)
        ids = {input_id for input_id, _ in seen}
        self.assertTrue(ids & {"t0", "t1"}, f"entries must carry our input ids, got {ids}")
        for input_id, label in seen:
            expected = next(target.label for target in TARGETS if target.id == input_id)
            self.assertEqual(label, expected)

    def test_every_entry_is_a_real_upstream_entry(self):
        entries: list[dict] = []
        self.fake.engine.scrape(TARGETS[:1], deadline=deadline_in(60), on_entry=lambda e, _l: entries.append(e) or True)
        required = {"title", "link", "category", "address", "complete_address", "web_site", "phone",
                    "review_rating", "review_count", "latitude", "place_id", "status", "open_hours"}
        for entry in entries:
            self.assertTrue(required.issubset(entry.keys()), f"missing {required - entry.keys()}")

    def test_an_early_stop_ends_the_run_and_keeps_what_arrived(self):
        entries: list[dict] = []

        def on_entry(entry, _label):
            entries.append(entry)
            return len(entries) < 3  # stop after three businesses

        run = self.fake.engine.scrape(TARGETS, deadline=deadline_in(60), on_entry=on_entry)
        self.assertTrue(run.stopped_early)
        self.assertFalse(run.failed, "a stop we asked for is not an engine failure")
        self.assertEqual(len(entries), 3)
        self.assertLess(run.duration, 30)

    def test_malformed_and_nameless_results_are_counted_not_fatal(self):
        fake = FakeEngine(self.world, tmpdir=self.tmp, mode="ok", FAKE_GMS_MALFORMED=2, FAKE_GMS_EMPTY_TITLE=1)
        entries: list[dict] = []
        run = fake.engine.scrape(TARGETS[:1], deadline=deadline_in(60), on_entry=lambda e, _l: entries.append(e) or True)
        self.assertEqual(run.malformed, 2, "a torn JSONL write is counted")
        self.assertEqual(run.skipped, 1, "a result without a business name is counted")
        self.assertEqual(run.exit_code, 0)
        self.assertTrue(entries, "usable results still arrive")
        for entry in entries:
            self.assertTrue(str(entry.get("title") or "").strip())

    def test_an_empty_search_is_not_an_error(self):
        fake = FakeEngine([], tmpdir=self.tmp)
        run = fake.engine.scrape(TARGETS[:1], deadline=deadline_in(30))
        self.assertEqual(run.exit_code, 0)
        self.assertEqual(run.emitted, 0)
        self.assertFalse(run.failed)
        self.assertFalse(run.challenge)

    def test_no_targets_is_a_no_op(self):
        run = self.fake.engine.scrape([], deadline=deadline_in(5))
        self.assertIsInstance(run, EngineRun)
        self.assertEqual(run.emitted, 0)
        self.assertEqual(run.argv, [], "no process is started for an empty batch")

    def test_targets_without_a_url_are_dropped(self):
        run = self.fake.engine.scrape(
            [EngineTarget(id="t0", url="", label="empty"), TARGETS[0]], deadline=deadline_in(30),
        )
        self.assertEqual(len(run.targets), 1)


class FailureModeTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="zybble-engine-test-")
        self.world = build_world(30, seed=11)

    def test_a_google_challenge_is_detected(self):
        fake = FakeEngine(self.world, tmpdir=self.tmp, mode="challenge")
        run = fake.engine.scrape(TARGETS, deadline=deadline_in(30))
        self.assertTrue(run.challenge)
        self.assertEqual(run.emitted, 0)
        self.assertTrue(run.failed)
        self.assertIn("unusual traffic", run.stderr_tail.lower())
        fake.cleanup()

    def test_challenge_detection_is_marker_based(self):
        self.assertTrue(detect_challenge("Our systems have detected unusual traffic from your computer network."))
        self.assertTrue(detect_challenge("ERROR: 429 Too Many Requests"))
        self.assertFalse(detect_challenge("level=INFO msg=\"done\" results=17"))
        self.assertFalse(detect_challenge(""))

    def test_a_crash_is_reported_with_its_exit_code(self):
        fake = FakeEngine(self.world, tmpdir=self.tmp, mode="crash")
        run = fake.engine.scrape(TARGETS, deadline=deadline_in(30))
        self.assertEqual(run.exit_code, 2)
        self.assertTrue(run.failed)
        self.assertIn("panic", run.stderr_tail)
        fake.cleanup()

    def test_a_partial_run_keeps_the_results_it_already_streamed(self):
        fake = FakeEngine(self.world, tmpdir=self.tmp, mode="partial")
        entries: list[dict] = []
        run = fake.engine.scrape(TARGETS[:1], deadline=deadline_in(30), on_entry=lambda e, _l: entries.append(e) or True)
        self.assertTrue(run.emitted > 0, "results written before the crash are kept")
        self.assertEqual(len(entries), run.emitted)
        self.assertTrue(run.failed)
        fake.cleanup()

    def test_the_time_budget_kills_the_engine_and_its_browsers(self):
        fake = FakeEngine(self.world, tmpdir=self.tmp, mode="hang", FAKE_GMS_HANG_SECONDS="300")
        started = time.monotonic()
        run = fake.engine.scrape(TARGETS, deadline=deadline_in(0.5))
        elapsed = time.monotonic() - started
        self.assertTrue(run.timed_out)
        self.assertFalse(run.failed, "hitting our own deadline is not an engine failure")
        self.assertLess(elapsed, 20, "the engine and its process group must be killed, not waited out")
        self.assertEqual(run.emitted, 0)
        fake.cleanup()

    def test_a_shutdown_signal_stops_the_engine_cleanly(self):
        fake = FakeEngine(self.world, tmpdir=self.tmp, delay=0.05)
        calls = {"n": 0}

        def should_stop() -> bool:
            return calls["n"] >= 1

        def on_entry(_entry, _label):
            calls["n"] += 1
            return True

        run = fake.engine.scrape(TARGETS, deadline=deadline_in(60), on_entry=on_entry, should_stop=should_stop)
        self.assertTrue(run.interrupted)
        self.assertFalse(run.failed)
        self.assertLessEqual(run.emitted, 3, "the sweep stops at the next safe point")
        self.assertGreaterEqual(run.emitted, 1)
        fake.cleanup()

    def test_a_missing_binary_never_starts_a_scrape(self):
        engine = GosomEngine(binary=os.path.join(self.tmp, "nothing-here"))
        with self.assertRaises(EngineUnavailable):
            engine.scrape(TARGETS, deadline=deadline_in(5))

    def test_notes_are_reported_to_the_caller(self):
        fake = FakeEngine(self.world, tmpdir=self.tmp, mode="ok", FAKE_GMS_MALFORMED=1)
        notes: list[str] = []
        fake.engine.scrape(TARGETS[:1], deadline=deadline_in(30), on_note=notes.append)
        self.assertTrue(any("not valid JSON" in note for note in notes))
        fake.cleanup()


class RunSummaryTest(unittest.TestCase):
    def test_the_run_summary_is_log_safe(self):
        fake = FakeEngine(build_world(10, seed=3))
        run = fake.engine.scrape(TARGETS[:1], deadline=deadline_in(30))
        summary = run.as_log()
        json.dumps(summary)  # must be serialisable for structured logs
        self.assertEqual(summary["targets"], 1)
        self.assertEqual(summary["exit_code"], 0)
        self.assertGreaterEqual(summary["emitted"], 1)
        fake.cleanup()


if __name__ == "__main__":
    unittest.main()
