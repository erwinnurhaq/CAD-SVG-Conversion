## CAD Conversion and Compare (Frontend)

A Vite + React (TypeScript) frontend for browsing, converting, visualizing, and comparing CAD files as SVG. The app communicates with a backend API to:

- List uploaded files
- Upload and delete files
- Trigger CAD-to-SVG conversions
- Fetch conversion results and metadata
- Compare two files and visualize differences

### Tech Stack

- React 19 + TypeScript
- Vite 7 (SWC React plugin)
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- Radix UI primitives (Accordion, Checkbox, Label, Popover)
- D3.js for SVG manipulation, zoom, and pan
- Lucide React icons

### Requirements

- Node.js 18+ (recommended 20+)
- npm 9+ (or pnpm/bun if you prefer; commands below use npm)
- A running backend that exposes the required endpoints (see API expectations below)

### Getting Started

1) Install dependencies

```bash
npm install
```

2) Configure environment

Create a `.env.local` (or `.env`) in the project root with your backend URL:

```bash
# Backend base URL (defaults to http://localhost:5000 if unset)
VITE_BE_URL=http://localhost:5000
```

3) Run the dev server

```bash
npm run dev
```

- Dev server: http://localhost:3031
- Preview build server: http://localhost:3030

### Available Scripts

- `npm run dev` – Start Vite dev server (port 3031)
- `npm run build` – Type-checks and builds for production
- `npm run preview` – Serves the production build (port 3030)
- `npm run lint` – Runs ESLint

### Configuration Highlights

- Vite config: `vite.config.ts` sets React SWC, Tailwind plugin, and alias `@ -> ./src`
- Ports: Dev 3031, Preview 3030
- Env var precedence for backend URL in `src/constants.ts`:
  - `import.meta.env.VITE_BE_URL` → `process.env.VITE_BE_URL` → `http://localhost:5000`

### API Expectations (Backend)

The frontend assumes a backend exposing the following endpoints under `VITE_BE_URL`:

- `GET /api/files` → `{ data: FileRecord[] }`
- `POST /api/files` (multipart form: `file`) → upload file
- `DELETE /api/files/:fileId` → delete file
- `POST /api/conversions` (JSON: `{ fileId, parameters }`) → `{ data: { conversionId } }`
- `GET /api/conversions/:conversionId?wait=true` → `{ data: ConversionFileRecord }` with SVG and metadata

Types used by the UI are declared in `src/types.ts`:

```ts
export interface FileRecord {
  id: number
  fileId: string
  filename: string
  url: string
  createdAt: string
}

export type ConversionStatus = 'pending' | 'success' | 'failed'

export interface ConversionFileRecord {
  id?: number
  conversionId: string
  conversionUrl: string | null
  conversionType: string
  fileId: string
  compareFileId: string | null
  status: ConversionStatus
  error: string | null
  createdAt: string
}
```

### Core Features

- Upload CAD files to the backend
- Convert a selected file to SVG with default parameters
- Zoom, pan, and reset view using D3
- Toggle CAD layers on/off from metadata
- Compare two files and visualize differences
- Delete files from the list

Layer and conversion defaults live in `src/constants.ts` (`DEFAULT_CONVERSION_PARAMS`).

### Project Structure

```
src/
  App.tsx              # Main UI logic: files list, actions, D3 viewer
  main.tsx             # App bootstrap
  index.css            # Tailwind and base styles
  constants.ts         # BE_URL and default conversion params
  types.ts             # Shared domain types
  components/ui/*      # UI primitives (Accordion, Button, Card, Checkbox, Label, Popover)
  lib/utils.ts         # Utility helpers
```

### Styling

- Tailwind CSS 4 is configured via the Vite plugin `@tailwindcss/vite`
- Global styles live in `src/index.css`

### Build

```bash
npm run build
npm run preview
```

The production build output is served locally at http://localhost:3030.

### Notes & Tips

- Ensure `VITE_BE_URL` points to a reachable backend; otherwise file lists, conversions, and comparisons will fail.
- The app expects conversion responses to include SVG content and a `cadviewer_LayerTable` in metadata for layer toggling.

### License
ISC (see `package.json`).

