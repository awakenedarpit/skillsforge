import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMemberPortal } from "@/app/api/member/portal/route";
import { POST as postLeave, DELETE as deleteLeave } from "@/app/api/member/leaves/route";
import { POST as postCertificate } from "@/app/api/member/certificates/route";
import { setSession, resetSession } from "../setup";

describe("Member Portal APIs", () => {
  beforeEach(() => {
    resetSession();
    // Default session as Vikas Rao (member / operator)
    setSession({
      user: {
        id: "usr-vikas-3",
        email: "vikas.rao@skillsforge.quikit.io",
        name: "Vikas Rao",
        orgId: "org-demo-manufacturing",
        membershipRole: "member",
        operatorId: "op-001",
      },
      expires: "2099-01-01",
    });
  });

  describe("GET /api/member/portal", () => {
    it("returns 401 when unauthenticated", async () => {
      setSession(null);
      const req = new NextRequest("http://localhost:3011/api/member/portal");
      const res = await getMemberPortal(req);
      expect(res.status).toBe(401);
    });

    it("returns operator profile, allotted duty & machine, certificates and leaves", async () => {
      const req = new NextRequest("http://localhost:3011/api/member/portal?operatorId=op-001");
      const res = await getMemberPortal(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.operator).toBeDefined();
      expect(json.data.operator.id).toBe("op-001");

      // Verify today's duty & machine allotment
      expect(json.data.todayDuty).toBeDefined();
      expect(json.data.todayDuty.station.machineId).toBeDefined();
      expect(json.data.todayDuty.station.machineName).toBeDefined();
      expect(json.data.todayDuty.shift.code).toBe("A");
      expect(json.data.todayDuty.supervisor).toContain("Rohit Kulkarni");
      expect(json.data.scheduleDays).toBeInstanceOf(Array);
      expect(json.data.scheduleDays.length).toBe(7);

      // Verify certificates
      expect(json.data.certificates).toBeInstanceOf(Array);
      expect(json.data.certificates.length).toBeGreaterThan(0);
      const firstCert = json.data.certificates[0];
      expect(firstCert.machine).toBeDefined();
      expect(typeof firstCert.level).toBe("number");
      expect(["certified", "expiring_soon", "expired", "not_certified"]).toContain(firstCert.status);

      // Verify leave balance and requests
      expect(json.data.leaveSummary).toBeDefined();
      expect(json.data.leaves).toBeInstanceOf(Array);
    });
  });

  describe("POST & DELETE /api/member/leaves", () => {
    it("creates a new leave request and calculates duration", async () => {
      const req = new NextRequest("http://localhost:3011/api/member/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: "op-001",
          leaveType: "CASUAL",
          startDate: "2026-10-15",
          endDate: "2026-10-16",
          reason: "Attending family function",
        }),
      });

      const res = await postLeave(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.leaveType).toBe("CASUAL");
      expect(json.data.daysCount).toBe(2);
      expect(json.data.status).toBe("PENDING");

      // Now cancel the leave request
      const cancelReq = new NextRequest(`http://localhost:3011/api/member/leaves?id=${json.data.id}`, {
        method: "DELETE",
      });
      const cancelRes = await deleteLeave(cancelReq);
      const cancelJson = await cancelRes.json();

      expect(cancelRes.status).toBe(200);
      expect(cancelJson.success).toBe(true);
    });

    it("rejects invalid leave submission with 400", async () => {
      const req = new NextRequest("http://localhost:3011/api/member/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: "op-001",
          leaveType: "CASUAL",
          // missing dates
        }),
      });

      const res = await postLeave(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/member/certificates", () => {
    it("submits a certificate update and applies it to skill matrix", async () => {
      const req = new NextRequest("http://localhost:3011/api/member/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: "op-001",
          skillId: "sk-grd-3",
          level: 3,
          issuedOn: "2026-09-01",
          certifiedUntil: "2027-12-31",
          certificateNumber: "CERT-GRD-2026-99",
          notes: "Completed advanced precision grinding workshop",
        }),
      });

      const res = await postCertificate(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.skillId).toBe("sk-grd-3");
      expect(json.data.level).toBe(3);

      // Verify portal reflection
      const portalReq = new NextRequest("http://localhost:3011/api/member/portal?operatorId=op-001");
      const portalRes = await getMemberPortal(portalReq);
      const portalJson = await portalRes.json();

      const grinderCert = portalJson.data.certificates.find((c: any) => c.machine.id === "sk-grd-3");
      expect(grinderCert).toBeDefined();
      expect(grinderCert.level).toBe(3);
      expect(grinderCert.status).toBe("certified");
    });
  });
});
