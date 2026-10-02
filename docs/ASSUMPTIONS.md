# SkillsForge: Architecture & Design Assumptions

This document records deliberate design and architectural decisions made per Rule 7 of the master specification (`skillsforge_antigravity_prompt.md`).

---

### 1. Platform Mode: Mode B Stand-ins
- **Decision:** As real platform packages `@quikit/*` are not present in the repository, we implement thin local stand-ins under `apps/skillsforge/shims/quikit/{auth,database,shared,ui,redis}/` and map `@quikit/*` to them via `tsconfig.json` paths and `vitest.config.ts`.
- **Reason:** Keeps application code 100% compliant with QuikIT monorepo import conventions, allowing smooth drop-in replacement upon platform integration.

### 2. Database Provider & MultiSchema
- **Decision:** Target schema is `app_skillsforge` on PostgreSQL 14+ via Prisma 5.7+ with `multiSchema` preview feature. For local development where PostgreSQL container may not be active, the schema is kept clean and compatible with both PostgreSQL and direct connection pooling (`DATABASE_URL`, `DATABASE_URL_DIRECT`).

### 3. Locale & Numbers: Latin Numerals for Shop-Floor
- **Decision:** In both English (`en`) and Hindi (`hi`), we format numerals with Latin digits (`-u-nu-latn`) for consistency, readability, and machine codes on the factory shop-floor (e.g. `OP-001`, `CNC-L1`, shift codes `A`, `B`, `C`).
- **Reason:** Factory operators and supervisors in Indian manufacturing environments universally recognize Latin numerals for machine IDs and counts.

### 4. Locale Persistence: Cookie-based
- **Decision:** Store the selected language code in a cookie named `sf_locale` (valid for 1 year, `path=/`, `SameSite=Lax`).
- **Reason:** Avoids route prefixing (`/en/...`, `/hi/...`), preventing interference with the platform middleware matcher.

### 5. Mode B Authentication: Dev Login
- **Decision:** When `SKILLSFORGE_DEV_AUTH="true"`, NextAuth Credentials provider provides a demo login interface allowing one-click sign-in as Asha Verma (`org_admin`), Rohit Kulkarni (`app_admin`), or Vikas Rao (`member`).
- **Reason:** Mandatory for standalone demonstration without external OAuth/IdP provider.

### 6. Demo Seed Exception
- **Decision:** An app-level seed script (`apps/skillsforge/lib/demo/seed.ts`) is included to provide the required 15 operators × 8 machines dataset and support the "Reset demo data" admin action.
- **Reason:** Explicitly required by the master specification.
