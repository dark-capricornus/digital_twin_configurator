import { produce, type Draft } from 'immer';
import { create } from 'zustand';
import type { Asset, Department, ID, Machine, MachineType, Project, Selection, TagDef } from '../types';
import { createDepartment, createMachine, nextDepartmentSlot, nextMachineSlot } from '../lib/factory';
import { newId, toCode, uniqueCode, uniqueName } from '../lib/id';
import { blankTag, instantiateTags, toTemplate } from '../lib/tags';
import { deptAt, findDepartment, findMachine, tagListOf } from '../lib/tree';

const HISTORY_LIMIT = 200;
const MERGE_WINDOW_MS = 1200;

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

interface ProjectState {
  project: Project | null;
  past: Project[];
  future: Project[];
  lastMerge: { key: string; at: number } | null;
  selection: Selection | null;
  saveState: SaveState;

  open: (p: Project) => void;
  close: () => void;
  /**
   * The single entry point for edits. Records undo history.
   * Edits sharing a `mergeKey` within a short window collapse into one undo step
   * (e.g. typing in a text field).
   */
  mutate: (recipe: (draft: Draft<Project>) => void, mergeKey?: string) => void;
  undo: () => void;
  redo: () => void;
  select: (sel: Selection | null) => void;
  setSaveState: (s: SaveState) => void;
}

export const useProject = create<ProjectState>((set, get) => ({
  project: null,
  past: [],
  future: [],
  lastMerge: null,
  selection: null,
  saveState: 'saved',

  open: (p) => set({ project: p, past: [], future: [], lastMerge: null, selection: { kind: 'plant', id: p.plant.id }, saveState: 'saved' }),
  close: () => set({ project: null, past: [], future: [], lastMerge: null, selection: null }),

  mutate: (recipe, mergeKey) => {
    const { project, past, lastMerge } = get();
    if (!project) return;
    const next = produce(project, (d) => {
      recipe(d);
      d.updatedAt = new Date().toISOString();
    });
    const now = Date.now();
    const merging = !!mergeKey && lastMerge?.key === mergeKey && now - lastMerge.at < MERGE_WINDOW_MS;
    set({
      project: next,
      past: merging ? past : [...past.slice(-HISTORY_LIMIT + 1), project],
      future: [],
      lastMerge: mergeKey ? { key: mergeKey, at: now } : null,
      saveState: 'unsaved',
    });
  },

  undo: () => {
    const { project, past, future } = get();
    if (!project || past.length === 0) return;
    const prev = past[past.length - 1];
    set({ project: prev, past: past.slice(0, -1), future: [project, ...future], lastMerge: null, saveState: 'unsaved' });
    fixSelection();
  },

  redo: () => {
    const { project, past, future } = get();
    if (!project || future.length === 0) return;
    const [next, ...rest] = future;
    set({ project: next, past: [...past, project], future: rest, lastMerge: null, saveState: 'unsaved' });
    fixSelection();
  },

  select: (selection) => set({ selection }),
  setSaveState: (saveState) => set({ saveState }),
}));

/** Drop the selection if undo/redo removed the selected node. */
function fixSelection() {
  const { project, selection } = useProject.getState();
  if (!project || !selection) return;
  const exists =
    selection.kind === 'plant' ||
    (selection.kind === 'department' && !!findDepartment(project, selection.id)) ||
    (selection.kind === 'machine' && !!findMachine(project, selection.id));
  if (!exists) useProject.setState({ selection: { kind: 'plant', id: project.plant.id } });
}

const mutate = (recipe: (d: Draft<Project>) => void, mergeKey?: string) => useProject.getState().mutate(recipe, mergeKey);
const select = (sel: Selection | null) => useProject.getState().select(sel);
const current = () => useProject.getState().project;

const cloneTags = (tags: TagDef[]) => tags.map((t) => ({ ...structuredClone(t), id: newId('tag') }));

function cloneMachine(m: Machine, dept: Department, offset: [number, number]): Machine {
  return {
    ...structuredClone(m),
    id: newId('mac'),
    name: uniqueName(m.name, dept.machines.map((x) => x.name)),
    code: uniqueCode(m.code.replace(/_\d+$/, ''), dept.machines.map((x) => x.code), true),
    position: [m.position[0] + offset[0], m.position[1], m.position[2] + offset[1]],
    tags: cloneTags(m.tags),
  };
}

/* ======================================================================
 * Domain actions. Components call these rather than writing recipes inline
 * so behaviour stays consistent across tree, viewport and inspector.
 * ==================================================================== */
export const actions = {
  /* ---------------------------------------------------------- hierarchy */
  addDepartment(name = 'New Department') {
    const p = current();
    if (!p) return;
    const size: [number, number] = [20, 16];
    const dept = createDepartment(p.plant, name, { size, position: nextDepartmentSlot(p.plant, size) });
    mutate((d) => {
      d.plant.departments.push(dept);
      // Grow the floor if the new zone falls outside it.
      const needW = (Math.abs(dept.position[0]) + size[0] / 2) * 2 + 8;
      const needD = (Math.abs(dept.position[1]) + size[1] / 2) * 2 + 8;
      d.plant.size = [Math.max(d.plant.size[0], Math.ceil(needW)), Math.max(d.plant.size[1], Math.ceil(needD))];
    });
    select({ kind: 'department', id: dept.id });
    return dept.id;
  },

  addMachine(deptId: ID, typeId: ID, localPos?: [number, number]) {
    const p = current();
    const dept = p && findDepartment(p, deptId);
    const type = p?.library.find((t) => t.id === typeId);
    if (!p || !dept || !type) return;
    const m = createMachine(type, dept, localPos ? [localPos[0], 0, localPos[1]] : nextMachineSlot(dept, type.model.size));
    mutate((d) => {
      findDepartment(d, deptId)!.machines.push(m);
    });
    select({ kind: 'machine', id: m.id });
    return m.id;
  },

  /** Commits a gizmo move. Re-parents the machine if it was dropped into another zone. */
  placeMachineWorld(machineId: ID, worldX: number, worldZ: number, rotationY: number) {
    const p = current();
    const hit = p && findMachine(p, machineId);
    if (!p || !hit) return;
    const target = deptAt(p, worldX, worldZ) ?? hit.dept;
    const round = (v: number) => Math.round(v * 1000) / 1000;
    mutate((d) => {
      const src = findDepartment(d, hit.dept.id)!;
      const idx = src.machines.findIndex((m) => m.id === machineId);
      const m = src.machines[idx];
      m.rotationY = round(((rotationY % 360) + 360) % 360);
      m.position[0] = round(worldX - target.position[0]);
      m.position[2] = round(worldZ - target.position[1]);
      if (target.id !== src.id) {
        src.machines.splice(idx, 1);
        const dst = findDepartment(d, target.id)!;
        if (dst.machines.some((x) => x.code.toUpperCase() === m.code.toUpperCase())) {
          m.code = uniqueCode(m.code.replace(/_\d+$/, ''), dst.machines.map((x) => x.code), true);
        }
        dst.machines.push(m);
      }
    });
    return target.id !== hit.dept.id ? target : undefined;
  },

  /** Re-parents a machine into another department at the first free slot. */
  moveMachineToDepartment(machineId: ID, deptId: ID) {
    const p = current();
    const hit = p && findMachine(p, machineId);
    const dst = p && findDepartment(p, deptId);
    if (!hit || !dst || hit.dept.id === deptId) return;
    const pos = nextMachineSlot(dst, hit.machine.model.size);
    mutate((d) => {
      const src = findDepartment(d, hit.dept.id)!;
      const target = findDepartment(d, deptId)!;
      const idx = src.machines.findIndex((m) => m.id === machineId);
      const [m] = src.machines.splice(idx, 1);
      m.position = pos;
      if (target.machines.some((x) => x.code.toUpperCase() === m.code.toUpperCase())) {
        m.code = uniqueCode(m.code.replace(/_\d+$/, ''), target.machines.map((x) => x.code), true);
      }
      target.machines.push(m);
    });
  },

  moveDepartment(deptId: ID, x: number, z: number) {
    mutate((d) => {
      const dept = findDepartment(d, deptId);
      if (dept) dept.position = [Math.round(x * 1000) / 1000, Math.round(z * 1000) / 1000];
    });
  },

  deleteNode(sel: Selection) {
    if (sel.kind === 'plant') return;
    const p = current();
    if (!p) return;
    let parent: Selection = { kind: 'plant', id: p.plant.id };
    mutate((d) => {
      if (sel.kind === 'department') {
        d.plant.departments = d.plant.departments.filter((x) => x.id !== sel.id);
      } else {
        const hit = findMachine(d, sel.id);
        if (hit) {
          hit.dept.machines = hit.dept.machines.filter((m) => m.id !== sel.id);
          parent = { kind: 'department', id: hit.dept.id };
        }
      }
    });
    select(parent);
  },

  duplicateNode(sel: Selection) {
    const p = current();
    if (!p || sel.kind === 'plant') return;
    if (sel.kind === 'machine') {
      const hit = findMachine(p, sel.id);
      if (!hit) return;
      const copy = cloneMachine(hit.machine, hit.dept, [hit.machine.model.size[0] + 1, 0]);
      mutate((d) => {
        findDepartment(d, hit.dept.id)!.machines.push(copy);
      });
      select({ kind: 'machine', id: copy.id });
      return;
    }
    const dept = findDepartment(p, sel.id);
    if (!dept) return;
    const name = uniqueName(dept.name, p.plant.departments.map((x) => x.name));
    const copy: Department = {
      ...structuredClone(dept),
      id: newId('dep'),
      name,
      code: uniqueCode(toCode(name), p.plant.departments.map((x) => x.code)),
      position: nextDepartmentSlot(p.plant, dept.size),
      tags: cloneTags(dept.tags),
      machines: [],
    };
    copy.machines = dept.machines.map((m) => ({ ...cloneMachine(m, copy, [0, 0]), code: m.code, name: m.name }));
    mutate((d) => {
      d.plant.departments.push(copy);
      const needW = (Math.abs(copy.position[0]) + copy.size[0] / 2) * 2 + 8;
      d.plant.size[0] = Math.max(d.plant.size[0], Math.ceil(needW));
    });
    select({ kind: 'department', id: copy.id });
  },

  resetModelFromType(machineId: ID) {
    mutate((d) => {
      const hit = findMachine(d, machineId);
      const type = hit && d.library.find((t) => t.id === hit.machine.typeId);
      if (hit && type) hit.machine.model = structuredClone(type.model);
    });
  },

  /* --------------------------------------------------------------- tags */
  addTag(sel: Selection) {
    const p = current();
    const list = p && tagListOf(p, sel);
    if (!list) return;
    const tag = blankTag(uniqueName('NewTag', list.map((t) => t.name)).replace(/\s+/g, ''));
    mutate((d) => {
      tagListOf(d, sel)!.push(tag);
    });
    return tag.id;
  },

  updateTag(sel: Selection, tagId: ID, recipe: (t: Draft<TagDef>) => void, mergeKey?: string) {
    mutate((d) => {
      const t = tagListOf(d, sel)?.find((x) => x.id === tagId);
      if (t) recipe(t);
    }, mergeKey);
  },

  deleteTag(sel: Selection, tagId: ID) {
    mutate((d) => {
      const list = tagListOf(d, sel);
      if (!list) return;
      const i = list.findIndex((t) => t.id === tagId);
      if (i >= 0) list.splice(i, 1);
    });
  },

  duplicateTag(sel: Selection, tagId: ID) {
    mutate((d) => {
      const list = tagListOf(d, sel);
      const i = list?.findIndex((t) => t.id === tagId) ?? -1;
      if (!list || i < 0) return;
      const copy = { ...structuredClone(list[i]), id: newId('tag') };
      copy.name = uniqueName(copy.name, list.map((t) => t.name)).replace(/\s+/g, '');
      list.splice(i + 1, 0, copy);
    });
  },

  moveTag(sel: Selection, tagId: ID, dir: -1 | 1) {
    mutate((d) => {
      const list = tagListOf(d, sel);
      const i = list?.findIndex((t) => t.id === tagId) ?? -1;
      const j = i + dir;
      if (!list || i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
    });
  },

  /** Adds any tags defined on the machine type that the machine is missing (matched by name). */
  syncTagsFromType(machineId: ID): number {
    const p = current();
    const hit = p && findMachine(p, machineId);
    const type = hit && p!.library.find((t) => t.id === hit.machine.typeId);
    if (!hit || !type) return 0;
    const have = new Set(hit.machine.tags.map((t) => t.name.toUpperCase()));
    const missing = type.tagTemplates.filter((t) => !have.has(t.name.toUpperCase()));
    if (missing.length) {
      mutate((d) => {
        findMachine(d, machineId)!.machine.tags.push(...instantiateTags(missing));
      });
    }
    return missing.length;
  },

  /* ------------------------------------------------------------ library */
  saveMachineAsType(machineId: ID): MachineType | undefined {
    const p = current();
    const hit = p && findMachine(p, machineId);
    if (!p || !hit) return;
    const m = hit.machine;
    const type: MachineType = {
      id: newId('type'),
      name: uniqueName(m.name, p.library.map((t) => t.name)),
      category: p.library.find((t) => t.id === m.typeId)?.category ?? 'Custom',
      description: m.description,
      codePrefix: m.code.replace(/_\d+$/, ''),
      model: structuredClone(m.model),
      tagTemplates: m.tags.map(toTemplate),
    };
    mutate((d) => {
      d.library.push(type);
      findMachine(d, machineId)!.machine.typeId = type.id;
    });
    return type;
  },

  /**
   * Creates or replaces a library type. With `propagate`, machines of this type also
   * receive any template tags they are missing — all as a single undo step.
   * Returns the number of tags added to existing machines.
   */
  upsertType(type: MachineType, propagate = false): number {
    let added = 0;
    mutate((d) => {
      const i = d.library.findIndex((t) => t.id === type.id);
      if (i >= 0) d.library[i] = structuredClone(type);
      else d.library.push(structuredClone(type));
      if (!propagate) return;
      for (const dept of d.plant.departments)
        for (const m of dept.machines) {
          if (m.typeId !== type.id) continue;
          const have = new Set(m.tags.map((t) => t.name.toUpperCase()));
          const missing = type.tagTemplates.filter((t) => !have.has(t.name.toUpperCase()));
          m.tags.push(...instantiateTags(missing));
          added += missing.length;
        }
    });
    return added;
  },

  deleteType(typeId: ID) {
    mutate((d) => {
      d.library = d.library.filter((t) => t.id !== typeId);
      // Machines keep their own copy of model + tags; just detach them.
      for (const dept of d.plant.departments) for (const m of dept.machines) if (m.typeId === typeId) m.typeId = null;
    });
  },

  addAsset(asset: Omit<Asset, 'id'>): Asset {
    const full = { ...asset, id: newId('ast') };
    mutate((d) => {
      d.assets.push(full);
    });
    return full;
  },
};
