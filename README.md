# InsertForge

InsertForge is a Svelte + JSCad application for designing 3D printable board game inserts.

It started as a fork of [Counter Slayer](https://github.com/Siege-Perilous/counterslayer) by [Dave Snider](https://davesnider.com), and the app keeps visible attribution to the original project.

![Screenshot](./screenshot.png)

## What It Supports

- `Box`
- `Empty box`
- `Layered Box`
- `Board`
- `Loose tray`
- multiple tray types for box and layered-box workflows

Supported tray families currently include:

- `Counter Tray`
- `Card Draw Tray`
- `Card Divider Tray`
- `Card Well Tray`
- `Cup Tray`
- `Miniature Rack` as a loose-tray-only item for now

## Current Capabilities

- Generate printable insert geometry with configurable dimensions and tolerances.
- Design regular boxes with trays, lids, embossing, and optional honeycomb lid structure.
- Design layered boxes with multiple internal layers and mixed section types.
- Place `Board`, `Box`, `Layered Box`, and `Loose tray` items directly in a layer.
- Use `Edit layout` to manually arrange items inside a layer.
- Use `Adapt to gap` for `Box` and `Layered Box` to grow or shrink into available layer space when valid.
- Export printable geometry and PDF reference material.
- Preview counters, cards, and miniature-base occupancy in supported tray types.

## Miniature Rack

`Miniature Rack` is an in-progress tray type intended for storing miniatures by their bases.

Current status:

- available from `Add loose tray`
- dedicated editor with manual slot list
- configurable rail wall thickness, lip inset, slot spacing, and base tolerances
- stacked preview showing how many miniature bases fit in each rail
- triangular side-wall reinforcement
- exportable as printable geometry

Current limitation:

- it is `loose tray` only for now

## Credits

- Original project: [Counter Slayer](https://github.com/Siege-Perilous/counterslayer)
- Original author: [Dave Snider](https://davesnider.com)
- Related project by the original author: [Table Slayer](https://tableslayer.com)

## Development

InsertForge uses `pnpm`.

```bash
pnpm install
pnpm dev
```

Type-checking:

```bash
pnpm run check
```

Production build:

```bash
pnpm run build
```

Typical dev server:

- `http://localhost:5175/`

## Debug / Analysis Workflow

This repo still includes the geometry-debugging workflow used during development.

- In dev mode, `Regenerate` can save layout/debug artifacts into `mesh-analysis/`.
- `Import / Export` includes debug-oriented export paths used for geometry inspection.
- View capture tooling is available through the scripts in `scripts/`.

Example:

```bash
npx tsx scripts/capture-view.ts --angle iso
```

## License

InsertForge is derived from Counter Slayer and remains available under the functional source [license](./LICENSE.md) that becomes Apache 2.0 after two years.

You can host and modify it for personal use under that license, but not monetize the app itself during the restricted period.

Generated STL files and printable models remain yours.
