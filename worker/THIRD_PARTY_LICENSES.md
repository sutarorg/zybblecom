# Third-party notice

Zybble's Lead Finder discovers businesses with an open-source Google Maps
scraper. Nothing in this file is a Google product; no Google Maps API, Places
API, Geocoding API or API key is used anywhere in the lead-generation path.

## google-maps-scraper (the discovery engine)

**google-maps-scraper** by Georgios Komninos (gosom)
https://github.com/gosom/google-maps-scraper

The engine is a Go binary built from a pinned tag and commit
(`worker/vendor/engine.json`, mirrored by `ARG GMS_VERSION` / `ARG GMS_COMMIT` in
`worker/Dockerfile`) and run as a child process by `worker/gmaps_engine.py`.
It is **not** vendored as source into this repository: only its licence, its pin
and the interface notes live in `worker/vendor/`.

Copyright (c) 2023 Georgios Komninos. Licensed under the MIT License:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

The full text is kept in `worker/vendor/LICENSE-google-maps-scraper.txt`.

## Transitively bundled by the engine

These ship inside the worker image because the engine needs them at runtime.
Their own licences apply; they are fetched from their official sources during
the Docker build rather than copied into this repository.

| Component | Role | Licence |
| --- | --- | --- |
| [playwright-go](https://github.com/mxschmitt/playwright-go) | drives the browser from Go | Apache-2.0 |
| [Playwright](https://github.com/microsoft/playwright) driver + Chromium build | the actual browser automation and headless browser | Apache-2.0 / BSD-3-Clause |
| [scrapemate](https://github.com/gosom/scrapemate) | the engine's scraping/job framework and JSONL writer | MIT |
| Chromium | headless browser binary installed by Playwright | BSD-3-Clause and third-party notices |

## Python runtime

| Package | Role | Licence |
| --- | --- | --- |
| [requests](https://github.com/psf/requests) | Nominatim geocoding, website scan, worker control plane | Apache-2.0 |
| [dnspython](https://github.com/rthalley/dnspython) | DNS MX verification of discovered addresses | ISC |

## Geocoding

Location → bounding box resolution uses OpenStreetMap's public
[Nominatim](https://nominatim.org/) endpoint (`worker/coverage.py`) under the
ODbL data licence and Nominatim's usage policy (1 request/second, attributed).
No API key is required and no Google service is contacted.

## Removed

The previously vendored **GoogleMapScraper** by SoCloseSociety
(https://github.com/SoCloseSociety/GoogleMapScraper, MIT) and its Selenium /
chromedriver / BeautifulSoup dependency chain were removed from this repository
when the engine above replaced them. Its licence text is no longer distributed
here because no part of that project is shipped any more.
