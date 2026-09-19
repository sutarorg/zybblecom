"""Zybble ↔ `gosom/google-maps-scraper` adapter.

Upstream engine
---------------
Repository : https://github.com/gosom/google-maps-scraper  (MIT, Georgios Komninos)
Pin        : ``worker/vendor/engine.json`` (tag + commit the image is built from)
Binary     : ``google-maps-scraper`` — built from source in ``worker/Dockerfile``

The engine drives a real Chromium browser (Playwright) through the public
Google Maps UI and writes one JSON object per line (JSONL) when invoked with
``-json``. It needs **no Google Maps API key** — exactly like the engine it
replaces.

What this module owns
--------------------
Everything below the lead-domain boundary:

* locating the pinned engine binary (:func:`find_binary`);
* building the exact CLI invocation Zybble relies on (:meth:`GosomEngine.build_argv`);
* running one bounded scrape as a child process, in its own process group so a
  timeout can never leave an orphaned browser behind (:meth:`GosomEngine.scrape`);
* **streaming** the JSONL results file while the engine still runs, so leads are
  stored (and progress is reported) as they are discovered instead of at the end;
* classifying what went wrong — bot challenge, crash, time budget — into the
  small error taxonomy ``worker.py`` turns into resume/retry decisions.

What it deliberately does *not* own
-----------------------------------
Coverage planning (``coverage.py``), deduplication, filters and the
``Place``/``ScrapeState`` records (``scraper.py``), email verification
(``engine_contacts.py``) and the Zybble control plane (``worker.py``). The engine
is a subprocess that turns search targets into raw Google Maps entries; every
product decision stays in Zybble's own code.

Invocation contract (gosom/google-maps-scraper v1.18.x)
------------------------------------------------------
::

    google-maps-scraper \
        -input  <queries.txt>     # one Google Maps search URL per line,
                                  # "<url>#!#<target-id>" attaches our own id
        -results <results.jsonl>  # JSONL when -json is set
        -json
        -c <concurrency> -depth <scrolls> -lang <hl>
        -browser-pool-size <n> -pages-per-browser <n>
        -exit-on-inactivity <duration>
        [-email] [-proxies-file <path>]

Each emitted entry carries ``input_id`` — the target id we supplied — which is
how one business is attributed to the viewport that found it.
"""

from __future__ import annotations

import json
import os
import shutil
import signal
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, Sequence

UPSTREAM_REPO = "https://github.com/gosom/google-maps-scraper"
BINARY_NAMES = ("google-maps-scraper", "google_maps_scraper")
BINARY_DIRS = (
    "/usr/local/bin",
    "/usr/bin",
    "/worker/bin",
    "/opt/google-maps-scraper/bin",
)
VENDOR_PIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor", "engine.json")

# Markers that mean "Google served a bot challenge / rate limit" rather than
# "this viewport has no businesses". Matched case-insensitively against the
# engine's stderr log.
CHALLENGE_MARKERS = (
    "unusual traffic",
    "not a robot",
    "captcha",
    "recaptcha",
    "sorry, we can",
    "429 too many requests",
    "rate limit",
    "blocked by google",
    "consent.google.com",
    "enablejs",
)

# A torn/partial write or a log line that reached the results file must never
# abort a sweep — it is counted and the stream continues.
MAX_STDERR_TAIL = 16_384
DEFAULT_POLL_INTERVAL = 0.25
DEFAULT_STOP_GRACE = 15.0


class EngineError(RuntimeError):
    """Base class for every engine-level failure."""

    #: whether ``worker.py`` should hand the job back to the queue
    retryable = True


class EngineUnavailable(EngineError):
    """The pinned engine binary is missing — a deployment problem, not a job problem."""

    retryable = False


class EngineFailure(EngineError):
    """The engine died without producing results (browser crash, upstream bug)."""

    retryable = True


@dataclass(frozen=True)
class EngineTarget:
    """One Google Maps search the engine should run."""

    id: str
    url: str
    label: str = ""

    @classmethod
    def from_search_target(cls, target: Any, target_id: str) -> "EngineTarget":
        """Adapt :class:`coverage.SearchTarget` (or anything with url/label)."""
        return cls(
            id=target_id,
            url=str(getattr(target, "url", "") or ""),
            label=str(getattr(target, "label", "") or getattr(target, "url", "") or ""),
        )


@dataclass
class EngineRun:
    """Everything one engine invocation did, for counters, logs and tests."""

    targets: list[EngineTarget] = field(default_factory=list)
    argv: list[str] = field(default_factory=list)
    exit_code: Optional[int] = None
    emitted: int = 0
    malformed: int = 0
    skipped: int = 0
    duration: float = 0.0
    timed_out: bool = False
    stopped_early: bool = False
    interrupted: bool = False
    challenge: bool = False
    stderr_tail: str = ""
    workdir: str = ""
    notes: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.exit_code == 0 and not self.timed_out

    @property
    def deliberate_stop(self) -> bool:
        """True when *we* ended the run: enough leads, deadline, or shutdown."""
        return self.stopped_early or self.timed_out or self.interrupted

    @property
    def failed(self) -> bool:
        """A non-zero exit that was not caused by our own stop request."""
        if self.deliberate_stop:
            return False
        return self.exit_code not in (0, None)

    def as_log(self) -> dict:
        return {
            "targets": len(self.targets),
            "exit_code": self.exit_code,
            "emitted": self.emitted,
            "malformed": self.malformed,
            "skipped": self.skipped,
            "duration": round(self.duration, 2),
            "timed_out": self.timed_out,
            "stopped_early": self.stopped_early,
            "interrupted": self.interrupted,
            "challenge": self.challenge,
        }


def upstream_pin() -> dict:
    """The pinned upstream version, read from ``worker/vendor/engine.json``."""
    try:
        with open(VENDOR_PIN, encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def find_binary(explicit: Optional[str] = None, env: Optional[dict] = None) -> Optional[str]:
    """Locate the engine binary.

    Order: the explicit path, ``GOOGLE_MAPS_SCRAPER_BIN``, ``PATH``, then the
    locations the Docker image installs it to. Returns ``None`` when it cannot
    be found so callers can report a precise, actionable error.
    """
    env = os.environ if env is None else env
    candidates: list[str] = []
    for value in (explicit, env.get("GOOGLE_MAPS_SCRAPER_BIN"), env.get("SCRAPER_ENGINE_BIN")):
        if value:
            candidates.append(os.path.expanduser(str(value)))
    for name in BINARY_NAMES:
        found = shutil.which(name, path=env.get("PATH"))
        if found:
            candidates.append(found)
    for directory in BINARY_DIRS:
        for name in BINARY_NAMES:
            candidates.append(os.path.join(directory, name))
    for path in candidates:
        if path and os.path.isfile(path) and os.access(path, os.X_OK):
            return os.path.abspath(path)
    return None


def detect_challenge(text: str) -> bool:
    """True when the engine log shows Google challenged or rate-limited us."""
    lowered = (text or "").lower()
    return any(marker in lowered for marker in CHALLENGE_MARKERS)


def _env_int(name: str, default: int, low: int, high: int) -> int:
    try:
        value = int(str(os.environ.get(name, default)).strip())
    except (TypeError, ValueError):
        value = default
    return max(low, min(high, value))


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return str(raw).strip().lower() in ("1", "true", "yes", "on")


def _env_float(name: str, default: float, low: float, high: float) -> float:
    try:
        value = float(str(os.environ.get(name, default)).strip())
    except (TypeError, ValueError):
        value = default
    return max(low, min(high, value))


@dataclass
class GosomEngine:
    """Runs the pinned `google-maps-scraper` binary as a bounded child process.

    Every knob is an environment variable (documented in ``.env.example`` and
    the README) so a Railway service can be retuned without a redeploy of the
    code, and every method is injectable so the offline test suite can run the
    real subprocess path against a fake binary.
    """

    binary: Optional[str] = None
    concurrency: int = 2
    browser_pool_size: int = 1
    pages_per_browser: int = 2
    depth: int = 10
    lang: str = "en"
    exit_on_inactivity: str = "3m"
    #: Emails are only ever sourced from this engine, so ``-email`` is on by
    #: default: it makes the engine read the addresses each business publishes
    #: on its own website and emit them as ``entry["emails"]``.
    extract_email: bool = True
    disable_page_reuse: bool = False
    proxies_file: Optional[str] = None
    extra_args: tuple[str, ...] = ()
    env: dict[str, str] = field(default_factory=dict)
    workdir_root: Optional[str] = None
    poll_interval: float = DEFAULT_POLL_INTERVAL
    stop_grace: float = DEFAULT_STOP_GRACE
    keep_workdir: bool = False
    sleep: Callable[[float], None] = time.sleep
    time_source: Callable[[], float] = time.monotonic

    # ——— construction ———

    @classmethod
    def from_env(cls, sleep: Callable[[float], None] = time.sleep) -> "GosomEngine":
        extra = os.environ.get("SCRAPER_ENGINE_EXTRA_ARGS", "").strip()
        return cls(
            binary=os.environ.get("GOOGLE_MAPS_SCRAPER_BIN") or None,
            concurrency=_env_int("SCRAPER_ENGINE_CONCURRENCY", 2, 1, 16),
            browser_pool_size=_env_int("SCRAPER_ENGINE_BROWSER_POOL", 1, 0, 8),
            pages_per_browser=_env_int("SCRAPER_ENGINE_PAGES_PER_BROWSER", 2, 1, 8),
            depth=_env_int("SCRAPER_ENGINE_DEPTH", 10, 1, 40),
            lang=(os.environ.get("SCRAPER_ENGINE_LANG") or "en").strip()[:8] or "en",
            exit_on_inactivity=(os.environ.get("SCRAPER_ENGINE_INACTIVITY") or "3m").strip() or "3m",
            extract_email=_env_bool("SCRAPER_ENGINE_EXTRACT_EMAIL", True),
            disable_page_reuse=_env_bool("SCRAPER_ENGINE_DISABLE_PAGE_REUSE", False),
            proxies_file=(os.environ.get("SCRAPER_ENGINE_PROXIES_FILE") or None),
            extra_args=tuple(part for part in extra.split() if part) if extra else (),
            poll_interval=_env_float("SCRAPER_ENGINE_POLL_INTERVAL", DEFAULT_POLL_INTERVAL, 0.01, 5.0),
            stop_grace=_env_float("SCRAPER_ENGINE_STOP_GRACE", DEFAULT_STOP_GRACE, 1.0, 120.0),
            keep_workdir=_env_bool("SCRAPER_ENGINE_KEEP_WORKDIR", False),
            workdir_root=os.environ.get("SCRAPER_ENGINE_WORKDIR") or None,
            sleep=sleep,
        )

    # ——— binary ———

    def resolve_binary(self) -> str:
        path = find_binary(self.binary)
        if not path:
            pin = upstream_pin()
            raise EngineUnavailable(
                "The google-maps-scraper engine binary was not found. "
                f"Expected it on PATH or at one of {', '.join(BINARY_DIRS)} "
                "(set GOOGLE_MAPS_SCRAPER_BIN to override). "
                f"It is built from {UPSTREAM_REPO} {pin.get('version', '')} by worker/Dockerfile."
            )
        return path

    def version(self, timeout: float = 20.0) -> str:
        """Best-effort ``-version`` output, used by the smoke test and logs."""
        try:
            binary = self.resolve_binary()
        except EngineUnavailable:
            return "unavailable"
        try:
            completed = subprocess.run(
                [binary, "-version"],
                capture_output=True,
                text=True,
                timeout=timeout,
                env={**os.environ, **self.env, "DISABLE_TELEMETRY": "1"},
            )
        except (OSError, subprocess.SubprocessError):
            return "unknown"
        out = (completed.stdout or completed.stderr or "").strip().splitlines()
        return out[0][:120] if out else "unknown"

    # ——— invocation ———

    def build_argv(self, input_path: str, results_path: str, depth: Optional[int] = None) -> list[str]:
        """The exact command line Zybble runs. Booleans are bare Go flags."""
        binary = self.resolve_binary()
        argv = [
            binary,
            "-input", input_path,
            "-results", results_path,
            "-json",
            "-c", str(max(1, int(self.concurrency))),
            "-depth", str(max(1, int(depth if depth is not None else self.depth))),
            "-lang", self.lang or "en",
            "-exit-on-inactivity", self.exit_on_inactivity or "3m",
        ]
        if self.browser_pool_size and self.browser_pool_size > 0:
            argv += ["-browser-pool-size", str(int(self.browser_pool_size))]
        if self.pages_per_browser and self.pages_per_browser > 1:
            argv += ["-pages-per-browser", str(int(self.pages_per_browser))]
        if self.extract_email:
            argv.append("-email")
        if self.disable_page_reuse:
            argv.append("-disable-page-reuse")
        if self.proxies_file:
            argv += ["-proxies-file", str(self.proxies_file)]
        argv += [str(arg) for arg in self.extra_args]
        return argv

    def env_for_child(self) -> dict[str, str]:
        """Environment for the child: upstream telemetry is always off."""
        return {**os.environ, "DISABLE_TELEMETRY": "1", **self.env}

    # ——— one bounded scrape ———

    def scrape(
        self,
        targets: Sequence[Any],
        *,
        deadline: float,
        on_entry: Optional[Callable[[dict, str], Any]] = None,
        on_note: Optional[Callable[[str], None]] = None,
        should_stop: Optional[Callable[[], bool]] = None,
        depth: Optional[int] = None,
    ) -> EngineRun:
        """Scrape ``targets`` and stream every entry to ``on_entry`` as it lands.

        ``on_entry(entry, target_label)`` may return ``False`` to ask for an
        early, graceful stop (used when the requested quantity is reached) —
        whatever was already streamed stays collected.

        Never raises for an individual business. Raises only
        :class:`EngineUnavailable` (no binary) so the caller can distinguish a
        broken deployment from a broken search.
        """
        engine_targets = [
            target if isinstance(target, EngineTarget) else EngineTarget.from_search_target(target, f"t{index}")
            for index, target in enumerate(targets)
        ]
        engine_targets = [target for target in engine_targets if target.url]
        run = EngineRun(targets=engine_targets)
        if not engine_targets:
            run.notes.append("No search targets to run.")
            return run

        binary = self.resolve_binary()
        labels = {target.id: target.label for target in engine_targets}

        workdir = tempfile.mkdtemp(prefix="zybble-gms-", dir=self.workdir_root)
        run.workdir = workdir
        input_path = os.path.join(workdir, "queries.txt")
        results_path = os.path.join(workdir, "results.jsonl")
        log_path = os.path.join(workdir, "engine.log")
        out_path = os.path.join(workdir, "engine.out")

        # "<url>#!#<id>" is upstream's custom-input-id syntax; the id comes back
        # on every entry as `input_id`, which is how a business is attributed to
        # the viewport that found it.
        with open(input_path, "w", encoding="utf-8") as handle:
            for target in engine_targets:
                handle.write(f"{target.url}#!#{target.id}\n")
        open(results_path, "w", encoding="utf-8").close()

        run.argv = self.build_argv(input_path, results_path, depth=depth)
        started = self.time_source()
        proc: Optional[subprocess.Popen] = None
        try:
            with open(log_path, "wb") as errlog, open(out_path, "wb") as outlog:
                proc = subprocess.Popen(  # noqa: S603 - fixed argv, no shell
                    run.argv,
                    cwd=workdir,
                    stdin=subprocess.DEVNULL,
                    stdout=outlog,
                    stderr=errlog,
                    env=self.env_for_child(),
                    start_new_session=True,
                )
                self._stream(
                    proc,
                    results_path,
                    labels,
                    deadline=deadline,
                    on_entry=on_entry,
                    on_note=on_note,
                    should_stop=should_stop,
                    run=run,
                )
            run.exit_code = proc.wait(timeout=self.stop_grace)
        except OSError as err:  # binary present but not executable, fork failure…
            raise EngineUnavailable(f"Could not start the scraping engine: {err}") from err
        except subprocess.TimeoutExpired:
            _terminate(proc, self.stop_grace, self.sleep)
            run.exit_code = proc.poll() if proc else None
            run.notes.append("Engine did not exit after the stop grace period; it was killed.")
        finally:
            if proc is not None and proc.poll() is None:
                _terminate(proc, self.stop_grace, self.sleep)
            run.duration = self.time_source() - started
            run.stderr_tail = _tail_file(log_path, MAX_STDERR_TAIL)
            run.challenge = detect_challenge(run.stderr_tail)
            if not self.keep_workdir:
                shutil.rmtree(workdir, ignore_errors=True)
            else:
                run.notes.append(f"Engine workdir kept for inspection: {workdir}")

        if run.challenge and on_note:
            on_note("The scraping engine reported a Google traffic challenge.")
        return run

    # ——— streaming reader ———

    def _stream(
        self,
        proc: subprocess.Popen,
        results_path: str,
        labels: dict[str, str],
        *,
        deadline: float,
        on_entry: Optional[Callable[[dict, str], Any]],
        on_note: Optional[Callable[[str], None]],
        should_stop: Optional[Callable[[], bool]],
        run: EngineRun,
    ) -> None:
        """Tail the JSONL results file until the engine exits, is stopped, or the deadline passes."""
        offset = 0
        pending = b""
        stop_requested = False

        def consume(chunk: bytes, final: bool) -> None:
            nonlocal pending, stop_requested
            pending += chunk
            while True:
                if b"\n" in pending:
                    line, pending = pending.split(b"\n", 1)
                elif final and pending:
                    line, pending = pending, b""
                else:
                    break
                if not stop_requested:
                    stop_requested = _handle_line(line, labels, on_entry, on_note, run) is False

        while True:
            try:
                with open(results_path, "rb") as handle:
                    handle.seek(offset)
                    chunk = handle.read()
            except OSError:
                chunk = b""
            if chunk:
                offset += len(chunk)
                consume(chunk, final=False)

            if stop_requested:
                run.stopped_early = True
                _terminate(proc, self.stop_grace, self.sleep)
                break

            if should_stop is not None and should_stop():
                run.interrupted = True
                _terminate(proc, self.stop_grace, self.sleep)
                break

            if self.time_source() >= deadline:
                run.timed_out = True
                _terminate(proc, self.stop_grace, self.sleep)
                break

            if proc.poll() is not None:
                break

            self.sleep(self.poll_interval)

        # Drain whatever the engine wrote before it stopped.
        try:
            with open(results_path, "rb") as handle:
                handle.seek(offset)
                remainder = handle.read()
        except OSError:
            remainder = b""
        if remainder:
            consume(remainder, final=True)
        elif pending:
            consume(b"", final=True)


def _handle_line(
    line: bytes,
    labels: dict[str, str],
    on_entry: Optional[Callable[[dict, str], Any]],
    on_note: Optional[Callable[[str], None]],
    run: EngineRun,
) -> Any:
    """Parse one JSONL line; count and skip anything unusable."""
    text = line.decode("utf-8", errors="replace").strip()
    if not text:
        return None
    try:
        entry = json.loads(text)
    except ValueError:
        run.malformed += 1
        if on_note and run.malformed == 1:
            on_note("The engine emitted a result line that was not valid JSON; it was skipped.")
        return None
    if not isinstance(entry, dict):
        run.malformed += 1
        return None
    if not str(entry.get("title") or "").strip():
        run.skipped += 1
        return None
    run.emitted += 1
    if on_entry is None:
        return None
    label = labels.get(str(entry.get("input_id") or ""), "")
    return on_entry(entry, label)


def _terminate(proc: Optional[subprocess.Popen], grace: float, sleep: Callable[[float], None]) -> None:
    """Stop the engine and its whole process group (Playwright spawns children)."""
    if proc is None or proc.poll() is not None:
        return
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except (OSError, ProcessLookupError):
        try:
            proc.terminate()
        except (OSError, ProcessLookupError):
            return
    waited = 0.0
    step = min(0.5, max(0.05, grace / 20))
    while waited < grace and proc.poll() is None:
        sleep(step)
        waited += step
    if proc.poll() is None:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except (OSError, ProcessLookupError):
            try:
                proc.kill()
            except (OSError, ProcessLookupError):
                return
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass


def _tail_file(path: str, maximum: int) -> str:
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as handle:
            if size > maximum:
                handle.seek(size - maximum)
            return handle.read().decode("utf-8", errors="replace")
    except OSError:
        return ""


__all__ = [
    "BINARY_DIRS",
    "BINARY_NAMES",
    "CHALLENGE_MARKERS",
    "UPSTREAM_REPO",
    "EngineError",
    "EngineFailure",
    "EngineRun",
    "EngineTarget",
    "EngineUnavailable",
    "GosomEngine",
    "detect_challenge",
    "find_binary",
    "upstream_pin",
]
