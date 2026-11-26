# Scientific sources and methods

## NASA APOD

- [NASA APOD Feed and API User Guide](https://api.nasa.gov/assets/files/apod/APOD-APIs-and-RSS-info.pdf) documents the APOD Basic single-date route `/wp-json/wp/v2/apod-basic/{YYMMDD}` and its fields.
- [NASA Open APIs](https://api.nasa.gov/) announces the legacy APOD API retirement on 1 December 2026. Its old query parameter table can be confusing beside the new feed guide. Stellar Origin uses the new single-date route and checks the ISO `date` in the response.
- [About APOD](https://science.nasa.gov/apod/apod-about/) explains the project and that individual copyrighted media is credited to its owner.
- APOD began on [16 June 1995](https://apod.nasa.gov/apod/ap950616.html). No earlier-day APOD is claimed.

The feed's `url` and `permalink` are article links. `hdurl`, when present, is an image resource. Some records contain HTML in explanation and credit fields; the application sanitizes a narrow set of text tags/links before displaying it. It does not use `basic_html` as page HTML.

## Positions and the Moon

- [Astronomy Engine](https://github.com/cosinekitty/astronomy) provides `HelioVector` for planet positions, `MoonPhase`, `Illumination`, `GeoMoon` and `SearchMoonPhase` for lunar values.
- Each calendar date is interpreted at **12:00:00 UTC**. Planet coordinates are Sun-centered J2000 equatorial vectors in astronomical units (AU). The scene rotates and rescales them for display; its circular orbit guides are schematic, not actual ephemeris curves. Planets and distances are not shown at a common physical scale.
- The illuminated fraction and Moon distance are Astronomy Engine outputs. Phase labels are categories of lunar elongation. Lunar age is an **estimate**: elongation divided by 360°, multiplied by a mean 29.530588853-day synodic month. The Moon's angular motion is not uniform.

## Planetary age

- [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) supplies mean sidereal orbital periods in Earth days: Mercury 88.0, Venus 224.7, Earth 365.2, Mars 687.0, Jupiter 4331, Saturn 10747, Uranus 30589 and Neptune 59800.
- Planetary age equals elapsed 24-hour days divided by a planet's mean orbital period. The next orbital birthday adds the next whole period to the birth reference date. These are pedagogical estimates, not calculations of exact orbital returns.
- Earth's approximate traveled distance is elapsed mean Earth orbits times the circumference of a circle with radius 149.6 million km, NASA's mean Earth–Sun distance. Earth's real orbit is elliptical.

## Historical shortcuts

- [Webb launch, 25 December 2021](https://science.nasa.gov/mission/webb/launch/).
- [Perseverance landing, 18 February 2021](https://science.nasa.gov/mission/mars-2020-perseverance/).
- [Artemis I launch, 16 November 2022](https://www.nasa.gov/mission/artemis-i/).

These shortcuts set the calendar date; the astronomy remains calculated for 12:00 UTC, which is not necessarily the event's actual time.
