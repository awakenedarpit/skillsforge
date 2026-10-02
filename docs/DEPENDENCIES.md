# SkillsForge: Allowed Dependencies Justification

Per Section 2.1 of the master specification, all packages used in the project must be strictly justified:

| Package | Category | Justification |
|---|---|---|
| `next@14.0.4` | Framework | Pinned exact App Router framework version required by QuikIT platform. |
| `react@18.3.1` / `react-dom@18.3.1` | UI Library | Pinned exact React 18 version with npm overrides. |
| `typescript` | Language | Strict static typing. |
| `tailwindcss@3` | Styling | Platform standard utility CSS. |
| `postcss` / `autoprefixer` | Tooling | Tailwind CSS build pipeline. |
| `prisma` / `@prisma/client@5.7.x` | Database | PostgreSQL client and multiSchema management. |
| `next-auth@^4.24` | Auth | Platform standard session/JWT authentication. |
| `zod` | Validation | Shared client and server validation. |
| `@tanstack/react-query@^5` | State / Data Fetching | Client-side data fetching and mutation cache invalidation. |
| `next-themes` | Theming | Dark / Light theme toggle support. |
| `lucide-react` | Icons | Platform approved icon library (no emojis). |
| `@radix-ui/react-*` | Primitives | Accessible headless UI components (Dialog, Popover, Slider, Tabs, Tooltip). |
| `clsx` / `tailwind-merge` | Utility | Class name merging (`cn`). |
| `recharts` | Visualizations | Workload distribution chart only (MVP-3). |
| `@fontsource-variable/inter` | Typography | Self-hosted Latin font for offline operation. |
| `@fontsource/noto-sans-devanagari` | Typography | Self-hosted Devanagari Hindi font for offline operation. |
| `vitest` / `@vitejs/plugin-react` | Testing | Fast unit and integration test runner. |
| `vitest-mock-extended` | Testing | Deep PrismaClient mock generator for unit tests. |
| `@testing-library/react` / `jsdom` | Testing | Component DOM testing. |
| `@playwright/test` | Testing | End-to-end browser automation. |
| `tsx` | Tooling | TypeScript script execution for seed and job runners. |
| `turbo` | Monorepo Tooling | Turborepo 2.0 workspace task orchestration. |
