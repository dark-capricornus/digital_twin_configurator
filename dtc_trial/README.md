# Digital Twin Configurator

Internal tool for building and editing digital twins for different industries.
You define the **plant → departments → machines** hierarchy, place 3D models on the floor,
and attach **tag definitions** (name, data type, unit, access, connection, address, visual
binding). The configurator never stores live values. The runtime resolves those from the
connections each tag points to.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle in dist/
```

## What v0.1 does

| Area | Capability |
|---|---|
| Projects | Create from an industry template (Blank, Automotive, Food & Bev, Pharma, Metal Fab). Open, duplicate and delete twins. Autosave to IndexedDB. Import/export JSON. |
| Hierarchy | Plant → Department (floor zone) → Machine. Add, rename, duplicate and delete. Filter the tree. Validation dots on nodes with problems. |
| 3D layout | Zones on the plant floor. Drag machine types from the Library onto a zone. Move/rotate with a gizmo (W/E, 0.5 m / 15° snap). Moving a machine into another zone re-parents it. Fit/top/focus views. |
| Models | 10 built-in parametric models (CNC, robot, conveyor, tank, mixer, press, oven, packer, AGV, block) sized in metres. You can also import your own GLB/GLTF, which is scaled to fit. |
| Machine library | Reusable machine types: model + tag template + code prefix. Edit a type and push new tags to the existing machines of that type. "Save as type" turns any configured machine into a type. |
| Tags | Per plant, department or machine. The path is derived from the hierarchy (`PREFIX.PLANT.DEPT.MACHINE.Tag`). The address comes from the project template (e.g. `ns=2;s={path}`) unless you override it per tag. The connection is inherited tag → machine → department → project default. |
| Bindings | Tags can drive the model: status colour (stack light), rotation speed, fill level, alarm flash or value label. **Simulate** previews the bindings with fake values; nothing is written to the twin. |
| Registry & checks | Searchable tag registry across the whole twin. Live validation: duplicate codes and paths, invalid names, missing connections, machines outside their zone, overlapping zones, missing models. |
| Export | Full twin JSON (re-importable), tag list CSV for the controls team, and a runtime manifest (resolved addresses and bindings) for the viewer. |
| Editing | Undo/redo for every change (Ctrl+Z / Ctrl+Shift+Z). Typing is merged into one step. Ctrl+D duplicates, Del deletes, F focuses, Esc deselects. |

## Architecture

```
src/
  types.ts                 Domain model (Project, Plant, Department, Machine, TagDef, MachineType…)
  lib/
    factory.ts             Create projects / departments / machines, slot packing
    library.ts             Built-in machine types + tag templates
    templates.ts           Industry starter templates
    tags.ts                Tag templates, path / address / connection resolution, flattenTags()
    bindings.ts            Tag bindings + values → VisualState for the 3D model
    validation.ts          Static checks → Issue[]
    exporters.ts           JSON / CSV / runtime manifest
    persistence.ts         IndexedDB storage + schema migration hook
    assets.ts              GLB/GLTF import (stored as data URLs in the project)
  store/
    projectStore.ts        Zustand + Immer. `mutate()` is the single write path (undo history).
                           `actions` holds the domain operations used by every panel.
    uiStore.ts             Panels, gizmo mode, view requests, toasts
    simStore.ts            Preview-only value simulator
  components/
    viewport/              R3F scene, zones, machine nodes, procedural models, DOM label layer
    panels/                Hierarchy tree, library, inspector, tag editor, registry/validation
    dialogs/               Start screen, project settings, machine-type editor
```

Design rules worth keeping as features are added:

- **Every edit goes through `useProject.getState().mutate()`** (usually via `actions.*`). That's what gives undo/redo, autosave and the "unsaved" state for free.
- **Machines are dept-relative.** `machine.position` is local to its department's centre, so moving a zone carries its machines with it.
- **Machines copy their type.** Model and tags are copied on creation, so later type edits don't silently change existing twins. Propagation is explicit ("Sync tags" / "Add new tags to existing machines").
- **Bump `SCHEMA_VERSION` and add a step in `persistence.migrate()`** whenever the saved shape changes, so older exports keep loading.

## Suggested roadmap (feature by feature)

1. **Live data preview.** Connect the Simulate pipeline to a real source (MQTT over WebSocket or an OPC UA gateway's REST API). `simStore` already has the right shape: `values[tagId]`.
2. **Bulk tag tools.** CSV import/round-trip of the tag list, find and replace on addresses, and multi-select edit.
3. **Sub-assemblies.** A `components` level under machines (spindle, axis, motor) with their own tags.
4. **Template governance.** A shared machine-type library across projects with versioning, and "update available" prompts on machines.
5. **Layout aids.** Aisles and walls, a ground-plane image (CAD/PDF floor plan underlay), measuring and alignment guides.
6. **Multi-user.** A backend (Postgres + REST) in place of IndexedDB, with project sharing, review/approval and an audit log.
7. **Runtime viewer.** A read-only app that consumes the runtime manifest.
