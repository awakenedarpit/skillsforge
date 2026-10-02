// End-to-end integration and smoke test runner for production server
const BASE_URL = "http://localhost:3011";

async function run() {
  console.log("=== STARTING END-TO-END PRODUCTION TEST SUITE ===");

  // Helper for cookie jar
  let cookieHeader = "";
  function updateCookies(res) {
    const setCookies = res.headers.get("set-cookie");
    if (setCookies) {
      // Split and extract cookie name=value
      const parts = setCookies.split(/,(?=[^;]+=[^;]+)/);
      for (const p of parts) {
        const match = p.trim().match(/^([^=]+=[^;]+)/);
        if (match) {
          const cookiePair = match[1];
          const name = cookiePair.split("=")[0];
          // Remove old cookie with same name
          const existing = cookieHeader.split("; ").filter((c) => !c.startsWith(name + "="));
          existing.push(cookiePair);
          cookieHeader = existing.join("; ");
        }
      }
    }
  }

  async function api(path, options = {}) {
    const headers = { ...options.headers };
    if (cookieHeader) headers["Cookie"] = cookieHeader;
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
    updateCookies(res);
    return res;
  }

  async function login(email) {
    cookieHeader = ""; // reset cookies
    const csrfRes = await api("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();

    const body = new URLSearchParams({
      csrfToken,
      email,
      json: "true",
    });

    const res = await api("/api/auth/callback/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
    return res;
  }

  // 1. Health endpoint
  console.log("\n1. Testing /api/health (public)...");
  const healthRes = await api("/api/health");
  const healthData = await healthRes.json();
  console.log("Health status:", healthRes.status, healthData);
  if (healthRes.status !== 200 || !healthData.ok) throw new Error("Health check failed");

  // 2. Unauthenticated access check
  console.log("\n2. Testing unauthenticated access to /api/skills (expect 401)...");
  cookieHeader = "";
  const unauthRes = await api("/api/skills");
  const unauthJson = await unauthRes.json();
  console.log("Unauth status:", unauthRes.status, unauthJson);
  if (unauthRes.status !== 401) throw new Error("Expected 401 for unauthenticated request");

  // 3. Login as Admin
  console.log("\n3. Logging in as Admin (asha.verma@skillsforge.quikit.io)...");
  await login("asha.verma@skillsforge.quikit.io");
  const sessionRes = await api("/api/auth/session");
  const sessionData = await sessionRes.json();
  console.log("Admin session:", sessionData?.user);
  if (!sessionData?.user || sessionData.user.membershipRole !== "org_admin") {
    throw new Error("Admin session not valid");
  }

  // 4. Skills Search (case-insensitive ASCII)
  console.log("\n4. Testing /api/skills search with mixed case 'cNc'...");
  const skillsRes = await api("/api/skills?q=cNc");
  const skillsData = await skillsRes.json();
  console.log(`Found ${skillsData.data?.data?.length || skillsData.data?.length} skills`);
  if (!skillsRes.ok) throw new Error("Skills search failed");

  // 5. Operators Search
  console.log("\n5. Testing /api/operators search with mixed case 'rAvI'...");
  const opsRes = await api("/api/operators?q=rAvI");
  const opsData = await opsRes.json();
  console.log(`Found ${opsData.data?.data?.length || opsData.data?.length} operators`);
  if (!opsRes.ok) throw new Error("Operators search failed");

  // 6. Paginated Grid
  console.log("\n6. Testing /api/grid with pagination...");
  const gridRes = await api("/api/grid?page=1&pageSize=5");
  const gridData = await gridRes.json();
  console.log("Grid pagination:", gridData.data?.pagination);
  if (!gridData.data?.pagination || gridData.data.pagination.pageSize !== 5) {
    throw new Error("Grid pagination failed");
  }

  // 7. Grid CSV Export
  console.log("\n7. Testing /api/grid/export (CSV export)...");
  const exportRes = await api("/api/grid/export");
  const exportCsv = await exportRes.text();
  console.log("CSV Content-Type:", exportRes.headers.get("content-type"));
  console.log("CSV Preview (first 2 lines):\n", exportCsv.split("\n").slice(0, 2).join("\n"));
  if (exportRes.status !== 200 || !exportCsv.includes("Employee Code")) {
    throw new Error("CSV export failed");
  }

  // 8. Shifts CRUD API
  console.log("\n8. Testing Shifts CRUD API...");
  // List shifts
  const shiftsListRes = await api("/api/shifts");
  const shiftsList = await shiftsListRes.json();
  console.log(`Current shifts count: ${shiftsList.data?.length}`);

  // Create new test shift
  const newShiftCode = "Z_" + Date.now().toString().slice(-4);
  const createShiftRes = await api("/api/shifts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: newShiftCode,
      startTime: "23:00",
      endTime: "07:00",
    }),
  });
  const createdShift = await createShiftRes.json();
  console.log("Created shift:", createShiftRes.status, createdShift.data?.code);
  if (createShiftRes.status !== 201) throw new Error("Failed to create shift");

  const createdId = createdShift.data.id;

  // Edit shift
  const patchShiftRes = await api(`/api/shifts/${createdId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startTime: "23:30" }),
  });
  console.log("Updated shift status:", patchShiftRes.status);
  if (patchShiftRes.status !== 200) throw new Error("Failed to patch shift");

  // Delete shift
  const delShiftRes = await api(`/api/shifts/${createdId}`, {
    method: "DELETE",
  });
  console.log("Deleted shift status:", delShiftRes.status);
  if (delShiftRes.status !== 200) throw new Error("Failed to delete shift");

  // 9. Audit Log
  console.log("\n9. Testing /api/audit-log (admin view)...");
  const auditRes = await api("/api/audit-log?page=1&pageSize=5");
  const auditData = await auditRes.json();
  console.log("Audit log total entries:", auditData.data?.pagination?.total);
  if (auditRes.status !== 200 || !auditData.success) throw new Error("Failed to fetch audit log");

  // 10. Simulator Forecast
  console.log("\n10. Testing /api/simulate/forecast?horizon=60...");
  const forecastRes = await api("/api/simulate/forecast?horizon=60");
  const forecastData = await forecastRes.json();
  console.log("Forecast summary:", forecastData.data?.summary);
  if (forecastRes.status !== 200 || forecastData.data?.horizonDays !== 60) {
    throw new Error("Failed to fetch forecast");
  }

  // 11. Rate limiter on expiry-check
  console.log("\n11. Testing rate limiter on /api/jobs/expiry-check...");
  let got429 = false;
  for (let i = 1; i <= 7; i++) {
    const jobRes = await api("/api/jobs/expiry-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    console.log(`Request #${i} status: ${jobRes.status}`);
    if (jobRes.status === 429) {
      got429 = true;
      console.log("Got 429 Retry-After:", jobRes.headers.get("retry-after"));
      break;
    }
  }
  if (!got429) throw new Error("Rate limiter did not block excessive requests with 429");

  // 12. Non-superadmin access to /api/superadmin/orgs (expect 403)
  console.log("\n12. Testing non-superadmin access to /api/superadmin/orgs (expect 403)...");
  const forbiddenSuperRes = await api("/api/superadmin/orgs");
  console.log("Non-superadmin status:", forbiddenSuperRes.status);
  if (forbiddenSuperRes.status !== 403) throw new Error("Expected 403 for non-superadmin");

  // 12b. Superadmin login and access to /api/superadmin/orgs (expect 200)
  console.log("\n12b. Logging in as Superadmin (superadmin@skillsforge.quikit.io)...");
  await login("superadmin@skillsforge.quikit.io");
  const superRes = await api("/api/superadmin/orgs");
  const superData = await superRes.json();
  console.log("Superadmin status:", superRes.status, "Orgs count:", superData.data?.length);
  if (superRes.status !== 200 || !superData.success) throw new Error("Expected 200 for superadmin");

  // 13. Login as Member User (Rohit Kulkarni)
  console.log("\n13. Logging in as Member (rohit.kulkarni@skillsforge.quikit.io)...");
  await login("rohit.kulkarni@skillsforge.quikit.io");
  const memberSessionRes = await api("/api/auth/session");
  const memberSessionData = await memberSessionRes.json();
  console.log("Member session:", memberSessionData?.user);
  if (memberSessionData?.user?.membershipRole !== "member") {
    throw new Error("Expected member membershipRole for Rohit Kulkarni");
  }

  // Member role permissions
  console.log("Testing member access to /api/audit-log (expect 403)...");
  const memberAuditRes = await api("/api/audit-log");
  console.log("Member audit status:", memberAuditRes.status);
  if (memberAuditRes.status !== 403) throw new Error("Expected 403 for member audit log");

  console.log("Testing member row filtering on /api/grid...");
  const memberGridRes = await api("/api/grid");
  const memberGridData = await memberGridRes.json();
  console.log(`Member grid rows: ${memberGridData.data?.matrix ? Object.keys(memberGridData.data.matrix).length : 0}`);
  if (memberGridData.data?.matrix && Object.keys(memberGridData.data.matrix).length > 1) {
    throw new Error("Member received more than their own row on /api/grid");
  }

  console.log("\n=== ALL E2E SMOKE TESTS COMPLETED SUCCESSFULLY ===");
}

run().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
