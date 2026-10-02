# SkillsForge App Rules

## Strict Application Rules ("The Do Not List")
1. **NO `any` or `@ts-ignore`**: Use `catch (error: unknown)` and `instanceof Error`. `as unknown as T` only with comment.
2. **NO query without `orgId`**: Every single Prisma query MUST filter by `orgId` from the session.
3. **NO modifying `packages/` directly**: We operate in Mode B with local shims under `shims/quikit/`.
4. **NO unauthorized dependencies**: Strictly adhere to the allowed dependencies in section 2.1.
5. **NO inline styles**: Use Tailwind utility classes only.
6. **NO hard-coded user-visible strings**: All text must be rendered through `t(...)` from `en.json` / `hi.json`. Product name "SkillsForge" is the only exception.
7. **Frozen Provider Order**:
   `SessionProvider` -> `QueryClientProvider` -> `ThemeProvider` -> `ConfirmProvider` -> `LocaleProvider` (innermost).
8. **Consistent API Envelope**:
   `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
9. **Dev port is 3011**: Both `dev` and `start` must run on port 3011.
