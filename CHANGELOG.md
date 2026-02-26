## [1.19.0](https://github.com/tux86/presto/compare/v1.18.0...v1.19.0) (2026-02-26)

### Features

* add delete account feature with password confirmation ([59a7420](https://github.com/tux86/presto/commit/59a742097f5640c9b3fe7af3e55a4931a79395c7))

## [1.18.0](https://github.com/tux86/presto/compare/v1.17.0...v1.18.0) (2026-02-26)

### Features

* add change password feature with tabbed profile modal ([12e9af3](https://github.com/tux86/presto/commit/12e9af3e24098b6d29fb24ce1f30e8af8f41210b))

## [1.17.0](https://github.com/tux86/presto/compare/v1.16.0...v1.17.0) (2026-02-25)

### Features

* add company filter to Reporting, Dashboard, and Missions pages ([0295c70](https://github.com/tux86/presto/commit/0295c7079b4d1d1331374d2688804ba2079c2d21))
* add suffix prop to Input component and widen dashboard grid at xl breakpoint ([aab8fdd](https://github.com/tux86/presto/commit/aab8fdd0f128bb034a740081b4ed111881f15cb4))
* enlarge activity card dots and simplify PDF filename ([be1b409](https://github.com/tux86/presto/commit/be1b4094290f7257ad3649df5dc042cd2896d701))
* expand command palette with actions, companies nav, and theme preferences ([bd04dd0](https://github.com/tux86/presto/commit/bd04dd0e5fc8eab3b2ef4ed4299ef002cc7826c7))
* expand E2E test coverage, persist preferences in localStorage, and fix auth UX ([c9ba978](https://github.com/tux86/presto/commit/c9ba978a0a749a88c1a1c530fbe04a754b7131ca))
* polish activity report editor UX and refine frontend UI ([6311577](https://github.com/tux86/presto/commit/631157711ff02239924cc47c7dc58cb5cea3f7f6))
* replace user.company with Company entity linked to missions ([a28af8a](https://github.com/tux86/presto/commit/a28af8af73c163527f24e484c1b587115847208d))
* use Inter font across frontend and PDF exports ([4a85ffd](https://github.com/tux86/presto/commit/4a85ffdaa67fd3fdf89d4ea4d832f1d28ed8d80f))

## [1.16.0](https://github.com/tux86/presto/compare/v1.15.0...v1.16.0) (2026-02-25)

### Features

* redesign preferences modal with polished layout and searchable currency picker ([ca96d6b](https://github.com/tux86/presto/commit/ca96d6bd82f4e8818740f5e804194db86a1ebf48))

## [1.15.0](https://github.com/tux86/presto/compare/v1.14.0...v1.15.0) (2026-02-24)

### Features

* add deletion safeguards, revert-to-draft confirmation, and UI improvements ([77928a3](https://github.com/tux86/presto/commit/77928a362ccf9557ca5b97043cdaabd2102a1013)), closes [#4](https://github.com/tux86/presto/issues/4) [#11](https://github.com/tux86/presto/issues/11)

### Bug Fixes

* correct delete messages, entry cycle order, and utilization calculation ([fd17453](https://github.com/tux86/presto/commit/fd17453b0261ac54dcf301d02703def43f2419db))

### Refactoring

* add structured logging with consola and improve code quality ([0f04b73](https://github.com/tux86/presto/commit/0f04b73e0aea5c1ff7dd7804428e3c2234ba4e85))
* decouple exchange rate fetching from API requests ([a45be83](https://github.com/tux86/presto/commit/a45be83ac2058ecc625f9c15d265fd9ae43fb4d6))
* remove MySQL/SQLite support, keep PostgreSQL only ([ff0fe95](https://github.com/tux86/presto/commit/ff0fe95d13eedee2608335698fc17c699aeb2647))

## [1.14.0](https://github.com/tux86/presto/compare/v1.13.0...v1.14.0) (2026-02-23)

### Features

* add client-colored calendar cells, reporting enhancements, and DRY refactors ([544f8b1](https://github.com/tux86/presto/commit/544f8b1c23a8d661d5a1898890a478beba6f8ca2))
* add editable user profile modal in sidebar ([679d5e9](https://github.com/tux86/presto/commit/679d5e9f8705df6f58730142b500afbb26058eed))
* redesign client modal with two-column grid, 12-color palette, and auto-color picker ([e578384](https://github.com/tux86/presto/commit/e5783842aa399327c011585fdabb471bb108d254))
* snapshot dailyRate on activity reports ([06adff7](https://github.com/tux86/presto/commit/06adff79d9b5e26930efb5aaa574efe00f1e79cc))

### Performance

* optimize seed with bulk inserts and pre-generated IDs ([4fdb280](https://github.com/tux86/presto/commit/4fdb280bea408dc5e3bd4a7c6c7f0047a54cfb26))

### Refactoring

* migrate ID generation from cuid2 to nanoid ([a562537](https://github.com/tux86/presto/commit/a562537bc223cebbb8ad38be8630fd5a3dfab768))

## [1.13.0](https://github.com/tux86/presto/compare/v1.12.1...v1.13.0) (2026-02-23)

### Features

* add user-configurable client color with dark/light theme support ([b222ad3](https://github.com/tux86/presto/commit/b222ad3ded7b3532e3383c3930747b736212e364))

## [1.12.1](https://github.com/tux86/presto/compare/v1.12.0...v1.12.1) (2026-02-23)

### Bug Fixes

* comprehensive backend audit — transaction safety, auth hardening, type fixes ([a6ed052](https://github.com/tux86/presto/commit/a6ed052fd4b9ee43d19a59c3df98d50371b4a8a6))

## [1.12.0](https://github.com/tux86/presto/compare/v1.11.1...v1.12.0) (2026-02-23)

### Features

* add i18n support for German, Spanish, and Portuguese ([0eb91d5](https://github.com/tux86/presto/commit/0eb91d526f6c2fc3b6a05cc1c99a395f7ca5e5f9))

### Bug Fixes

* correct Kimai holiday-aware calendars in comparison table ([15ad7eb](https://github.com/tux86/presto/commit/15ad7eb5dc3185a690de391f3654ee3cbf32d0c5))

## [1.11.1](https://github.com/tux86/presto/compare/v1.11.0...v1.11.1) (2026-02-23)

### Performance

* switch Docker runtime base to Alpine for smaller image ([a3e47cd](https://github.com/tux86/presto/commit/a3e47cdd2f9a578106ab81f7a33c1c32a72b0039))

## [1.11.0](https://github.com/tux86/presto/compare/v1.10.0...v1.11.0) (2026-02-23)

### Features

* migrate from Prisma to Drizzle ORM with multi-dialect support ([0370ec2](https://github.com/tux86/presto/commit/0370ec2dbdb5e0a731936936f33273d5593cf7a8))

## [1.10.0](https://github.com/tux86/presto/compare/v1.9.0...v1.10.0) (2026-02-23)

### Features

* add 101 API E2E tests with Bun test runner ([860aea0](https://github.com/tux86/presto/commit/860aea04b94ed96c3078598fee523cba5305cc90))

## [1.9.0](https://github.com/tux86/presto/compare/v1.8.0...v1.9.0) (2026-02-23)

### Features

* add client/mission filters to dashboard and fix completed report revert ([4a8a74d](https://github.com/tux86/presto/commit/4a8a74d548080476e136afbf918de77e861b6848))
* add per-client holiday country and searchable selects ([546ef27](https://github.com/tux86/presto/commit/546ef27508aebaa0d4b179d599b0f97887832ac8))

### Refactoring

* flatten Docker runtime layout and minimize node_modules ([a441421](https://github.com/tux86/presto/commit/a441421a279115b334ce21de289bd776895470c8))
* replace inline SVGs with lucide-react icons and SVG country flags ([11a6f33](https://github.com/tux86/presto/commit/11a6f33022378c2e9a32913b911141ec0a4d2444))

## [1.8.0](https://github.com/tux86/presto/compare/v1.7.2...v1.8.0) (2026-02-22)

### Features

* optimize Dockerfile with multi-stage build ([8628b98](https://github.com/tux86/presto/commit/8628b984fb6bb21ecff52007d41398dc7456f53a))

### Bug Fixes

* **frontend:** handle Zod validation errors in API client ([78741c0](https://github.com/tux86/presto/commit/78741c03d8f9779f828d0404bcdfdb24ca045f8d))

## [1.7.2](https://github.com/tux86/presto/compare/v1.7.1...v1.7.2) (2026-02-22)

### Bug Fixes

* **backend:** prevent cascade deletion, allow nullable fields, validate date ranges ([a5a31d3](https://github.com/tux86/presto/commit/a5a31d3e555f316bd437ffcc7735b8e39cfba274))
* update architecture diagram, reduce logo text size in SVGs ([a82d26b](https://github.com/tux86/presto/commit/a82d26b28e6ebc8b555f0f0cd4055de12055bc7a))

## [1.7.1](https://github.com/tux86/presto/compare/v1.7.0...v1.7.1) (2026-02-22)

### Bug Fixes

* **frontend:** reduce sidebar logo text size and overall logo height ([8577a19](https://github.com/tux86/presto/commit/8577a19d563a044be63975da83cc69ea30c0b9d7))
* **security:** harden authentication, authorization, and production defaults ([5bd2986](https://github.com/tux86/presto/commit/5bd2986cdf258cb4f724f7948dd71840fb80e7fa))

## [1.7.0](https://github.com/tux86/presto/compare/v1.6.0...v1.7.0) (2026-02-22)

### Features

* redesign PDF CRA with professional styling and entry notes ([9cf82ac](https://github.com/tux86/presto/commit/9cf82ac4b1ea0f46b16f3552853007e04d9b7ff0)), closes [#4f46e5](https://github.com/tux86/presto/issues/4f46e5)

## [1.6.0](https://github.com/tux86/presto/compare/v1.5.1...v1.6.0) (2026-02-22)

### Features

* redesign login page with split branding layout and update logos ([177fad7](https://github.com/tux86/presto/commit/177fad7d7c341fbb3724c0e42ae73c3e7d3033ea))

### Bug Fixes

* add explicit type="button" to non-submit buttons ([cccab12](https://github.com/tux86/presto/commit/cccab129aebc5df8743ad64bc3aa71102497a7db))

## [1.5.1](https://github.com/tux86/presto/compare/v1.5.0...v1.5.1) (2026-02-22)

### Bug Fixes

* use server-provided filename for PDF downloads ([377aff3](https://github.com/tux86/presto/commit/377aff3c623191d825d0796f16158f5428e874b5))

### Refactoring

* code review fixes, REST improvements, and squashed migrations ([942268e](https://github.com/tux86/presto/commit/942268ee0419def6ad002a862747f7d830cb1cf0))

## [1.5.0](https://github.com/tux86/presto/compare/v1.4.0...v1.5.0) (2026-02-22)

### Features

* enforce report status rules on PDF export and entry editing ([d7be6d2](https://github.com/tux86/presto/commit/d7be6d2b94f9bb71d61616796ea01b72cf16cc5a))

## [1.4.0](https://github.com/tux86/presto/compare/v1.3.3...v1.4.0) (2026-02-21)

### Features

* **ci:** publish Docker image to both GHCR and Docker Hub ([c0d0729](https://github.com/tux86/presto/commit/c0d072952900affdf01743aa9227da365a6f03f0))

## [1.3.3](https://github.com/tux86/presto/compare/v1.3.2...v1.3.3) (2026-02-21)

### Bug Fixes

* **docker:** use ARG for dummy DATABASE_URL needed by prisma generate ([c78b23b](https://github.com/tux86/presto/commit/c78b23ba37cdd1e6e96570cf15a779c021ecd921))

## [1.3.2](https://github.com/tux86/presto/compare/v1.3.1...v1.3.2) (2026-02-21)

### Bug Fixes

* **docker:** provide dummy DATABASE_URL for prisma generate in Docker build ([aa33128](https://github.com/tux86/presto/commit/aa33128f00233424b117ac69da8b955e9184857e))

## [1.3.1](https://github.com/tux86/presto/compare/v1.3.0...v1.3.1) (2026-02-21)

### Bug Fixes

* **ci:** use RELEASE_TOKEN PAT in release workflow to trigger Docker build ([4702afa](https://github.com/tux86/presto/commit/4702afadb9cc9b624b51a267f04d1f174adedb30))

### Refactoring

* **backend:** audit and harden API routes ([a5c4fab](https://github.com/tux86/presto/commit/a5c4fab1cdcc43fb4b5336a36295213d88ba693f))
* **frontend:** extract shared components and reduce duplication ([5f01852](https://github.com/tux86/presto/commit/5f018525add3ca02bc296751620d0cbf32d1742f))

## [1.3.0](https://github.com/tux86/presto/compare/v1.2.0...v1.3.0) (2026-02-21)

### Features

* **shared:** replace hardcoded French holidays with date-holidays library ([31d0e38](https://github.com/tux86/presto/commit/31d0e38fdd54d3235d2c4702a90f5ffe23cfa50a))

## [1.2.0](https://github.com/tux86/presto/compare/v1.1.0...v1.2.0) (2026-02-21)

### Features

* **frontend:** replace PNG logos with theme-aware SVGs ([86ebc1e](https://github.com/tux86/presto/commit/86ebc1e4755e0001ee97af2e97e5f7afe23c2e21))

## [1.1.0](https://github.com/tux86/presto/compare/v1.0.0...v1.1.0) (2026-02-21)

### Features

* **docker:** unify frontend and backend into single Docker image ([4fabbf8](https://github.com/tux86/presto/commit/4fabbf8fc8422f33b739d88baaa967dc0caa3512))

## 1.0.0 (2026-02-20)

### Bug Fixes

* **ci:** disable husky hooks in release workflow and relax commitlint body length ([238cd87](https://github.com/tux86/presto/commit/238cd874c2f07ce09bec4559a6250f89dccd1a42))
* **ci:** provide dummy DATABASE_URL for Prisma generate in CI ([ff3c59a](https://github.com/tux86/presto/commit/ff3c59aa6cca83f2b2fdf9d509ba55754ed507af))

# Changelog

All notable changes to this project will be documented in this file.
