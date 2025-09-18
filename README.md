# Electron + Vite + Pixi.js Starter

A minimal Electron application that uses Vite for renderer tooling and Pixi.js for rendering. The renderer bundle can be distributed as a web build or packaged with Electron using electron-builder.

## Getting Started

### Development

```bash
npm install
npm run dev
```

This starts the Vite dev server and launches Electron once it is ready. The renderer hot reloads automatically.

### Browser Distribution

```bash
npm run build       # produces dist/ for static hosting
npm run preview:web # optional local preview via Vite
```

Copy the contents of `dist/` to any static host or CDN to ship the browser version of the game.

### Electron Production Preview

```bash
npm run build
npm start
```

This launches Electron against the renderer bundle generated in `dist/`, mirroring the packaged runtime.

### Packaging Installers

The project ships with an electron-builder configuration targeting macOS (DMG/ZIP), Windows (NSIS/ZIP), and Linux (AppImage/tar.gz/deb). The Debian package installs an AppArmor profile so the Electron binary can create unprivileged user namespaces on Ubuntu 23.10 and newer.

```bash
npm run package      # full installers for the current platform
npm run package:dir  # unpacked app for side-loading/debugging
```

Build artifacts are written to `release/`. Place platform-specific icons in `build/` before packaging (see `build/README.md`).

### Linux AppArmor profile

- Debian/Ubuntu users installing the `.deb` produced by `npm run package` get the AppArmor profile automatically.
- When distributing the AppImage or tarball, ship the profile in `build/apparmor/usr.bin.electron-vite-pixi-starter` and instruct players to copy it to `/etc/apparmor.d/` followed by `sudo apparmor_parser -r /etc/apparmor.d/usr.bin.electron-vite-pixi-starter`.

## Project Structure

```text
.
├── electron
│   ├── main.js        # Electron main process
│   └── preload.js     # Context bridge exposed to the renderer
├── src
│   ├── main.js        # Pixi.js renderer entry point
│   └── style.css      # Global styles for the renderer
├── index.html         # Vite entry point
├── vite.config.js     # Vite configuration
├── package.json       # Scripts + electron-builder config
├── build/             # Packaging assets (icons)
└── README.md
```

Extend this setup with additional tooling (tests, linting, TypeScript, CI) as your game grows.
