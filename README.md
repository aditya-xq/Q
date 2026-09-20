<div align="center">

![Q Logo](static/assets/banner.svg)

# Q - Your Productive New Tab

Transform every new tab into a focused productivity hub. Stay organized, write distraction-free, and access everything you need without leaving your browser.

[Live Demo](https://q.xqbuilds.com) · [Report Bug](https://github.com/aditya-xq/Q/issues) · [Request Feature](https://github.com/aditya-xq/Q/issues)

</div>

---

## What You Get

| Feature                 | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| Sticky Notes            | Jot a multi-point checklist and stick it anywhere (Alt + Q) |
| Projects                | Organize work streams in one place                          |
| Writer Mode             | Distraction-free writing when you need to focus             |
| Voice Typing            | Dictate into the editor with native speech recognition      |
| Quick Links & Top Sites | One-click access to your most visited sites                 |
| Weather Widget          | Check conditions at a glance                                |
| Daily Inspiration       | Quotes and facts to spark curiosity                         |
| Deep Links              | Share a view with `?view=projects` / `?view=writer`         |
| Customizable            | Tailor Q to match your workflow                             |

---

## Getting Started

### Browser Extension

Microsoft Edge  
Install from the [Edge Add-ons Store](https://microsoftedge.microsoft.com/addons/detail/q/caclhkefejgdigpilgjbljkjejnlfibd)

Chrome  
Coming soon to the Chrome Web Store

Manual Installation

1. Download the latest `q-extension.zip` from [Releases](https://github.com/aditya-xq/Q/releases)
2. Extract the zip file to a folder
3. Open `chrome://extensions/` or `edge://extensions/`
4. Turn on Developer mode
5. Click Load unpacked and select the extracted folder
6. Open a new tab to see Q in action

### Web App

Try Q at [q.xqbuilds.com](https://q.xqbuilds.com)

---

## For Developers

### Prerequisites

- [Bun](https://bun.sh/) (package manager — do not use npm/yarn/pnpm)

### Build from Source

```bash
git clone https://github.com/aditya-xq/Q.git
cd Q
bun install

bun run dev          # start the Vite dev server
```

### Scripts

| Command             | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `bun run dev`       | Vite dev server                                             |
| `bun run check`     | SvelteKit + TypeScript typecheck (`svelte-check`)           |
| `bun run lint`      | ESLint + Prettier check                                     |
| `bun run verify`    | `check` + `lint` + unit tests                               |
| `bun run test:unit` | Bun unit tests (`tests/**`)                                 |
| `bun run format`    | Prettier write                                              |
| `bun run build:web` | Static/PWA build → `build/`                                 |
| `bun run build:ext` | MV3 extension build → `build-extension/`                    |
| `bun run release`   | Sync manifest version, build both targets, tag, and release |

The build target is selected with `BUILD_TARGET=web|extension` (wired into the build scripts and `svelte.config.js` / `vite.config.ts`).

### Testing

Unit tests cover the pure modules (title/draft-title derivation, voice text post-processing, URL/date/weather/view/task/note helpers) with [Bun's test runner](https://bun.sh/docs/cli/test):

```bash
bun run test:unit           # run unit tests
bun run test:unit:coverage  # with coverage
```

End-to-end tests use [Playwright](https://playwright.dev/):

```bash
bun run test:e2e:install    # one-time browser download
bun run test:e2e            # web e2e (builds + previews automatically)
bun run test:e2e:ui         # interactive UI mode
bun run test:e2e:extension  # MV3 extension load test (headed Chromium)
bun run test:e2e:live       # smoke test against https://q.xqbuilds.com
```

Override targets with `E2E_BASE_URL` and `LIVE_BASE_URL`.

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes and test locally (`bun run verify && bun run test:e2e`)
4. Submit a pull request

---

## Permissions

Q asks for minimal permissions:

- Top Sites
- Geolocation
- Clipboard Write (for copying drafts)

---

## License

Released under the [MIT License](LICENSE)
