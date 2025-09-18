# Build Resources

Place platform-specific application icons and other assets in this directory before running `npm run package`.

AppArmor profiles and Debian maintainer scripts live under `build/apparmor/` and `build/linux/` respectively and are copied into the packaged application automatically.

- Windows icon: `icon.ico`
- macOS icon: `icon.icns`
- Linux icon: `icon.png`

Electron-builder will automatically pick these up when present.
