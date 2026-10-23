# Redhill Peaks Studio

A 3D interior design studio for our Redhill Peaks BTO (Blk 147A, 4-Room Type 1(H)). See [MASTER_PROMPT.md](MASTER_PROMPT.md) for the full brief and phase plan.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Where things live

- `src/data/redhillPeaks.ts`: the flat traced from the HDB plan in `Image/` (walls, doors, windows, rooms, in metres)
- `src/features/scene/`: the 3D view (React Three Fiber) and procedural floor finishes
- `src/features/floorplan/`: the 2D plan view over the HDB drawing
- `src/components/`: app shell panels
- `src/store/useAppStore.ts`: UI state. Finishes, paint and view settings are kept in localStorage.
