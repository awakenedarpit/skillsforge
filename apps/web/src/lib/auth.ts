// Dummy auth module for now, as we use mock data and a generic orgId for testing

export const DEMO_ORG_ID = 'demo-org-id';

export async function getSessionOrgId(): Promise<string> {
  // In a real app, this would get the orgId from the session/JWT
  return DEMO_ORG_ID;
}
