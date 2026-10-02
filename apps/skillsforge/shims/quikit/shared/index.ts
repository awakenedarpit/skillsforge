// LOCAL STAND-IN for @quikit/shared: delete at integration

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ORG_ADMIN: "org_admin",
  ADMIN: "admin",
  APP_ADMIN: "app_admin",
  EXECUTIVE: "executive",
  MANAGER: "manager",
  MEMBER: "member",
  EMPLOYEE: "employee",
  COACH: "coach",
} as const;

export const MEMBERSHIP_ROLES = ROLES;

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 6,
  org_admin: 5,
  admin: 5,
  app_admin: 4,
  executive: 4,
  manager: 3,
  member: 2,
  employee: 2,
  coach: 1,
};

export interface PaginationParams {
  page: number;
  limit: number;
}

export function parsePaginationParams(urlOrParams: URL | URLSearchParams | Record<string, string | undefined>): PaginationParams {
  let pageStr: string | null = null;
  let limitStr: string | null = null;

  if (urlOrParams instanceof URL) {
    pageStr = urlOrParams.searchParams.get("page");
    limitStr = urlOrParams.searchParams.get("limit");
  } else if (urlOrParams instanceof URLSearchParams) {
    pageStr = urlOrParams.get("page");
    limitStr = urlOrParams.get("limit");
  } else {
    pageStr = urlOrParams.page ?? null;
    limitStr = urlOrParams.limit ?? null;
  }

  let page = pageStr ? parseInt(pageStr, 10) : 1;
  let limit = limitStr ? parseInt(limitStr, 10) : 20;

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  return { page, limit };
}

export function paginationToSkipTake(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginationResponse<T> {
  const totalPages = Math.ceil(total / params.limit) || 1;
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
    },
  };
}

export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}
