// ── Types ────────────────────────────────────────────────────────────────────

export type SkillLevel = 0 | 1 | 2 | 3 | 4;
// 0=नहीं जानते, 1=थोड़ा जानते, 2=जानते हैं, 3=अच्छे से जानते, 4=माहिर

export interface Certificate {
  id: string;
  name: string;
  issuedBy: string;
  dateEarned: string;   // ISO date string
  expiryDate?: string;
  status: "approved" | "pending" | "rejected";
}

export interface Skill {
  machineId: string;
  machineName: string;
  level: SkillLevel;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
  joiningDate: string;
  email: string;
  phone: string;
  password: string; // in real app this would be hashed
  skills: Skill[];
  certificates: Certificate[];
  avatar: string; // initials
}

export interface Machine {
  id: string;
  name: string;
  department: string;
  minCoverage: number; // how many trained operators needed
}

export type UserRole = "employee" | "manager";

export interface AuthUser {
  role: UserRole;
  employeeId?: string; // set when role = employee
}

// ── Seed Data ────────────────────────────────────────────────────────────────

export const MACHINES: Machine[] = [
  { id: "m1", name: "CNC मशीन", department: "उत्पादन", minCoverage: 2 },
  { id: "m2", name: "वेल्डिंग मशीन", department: "उत्पादन", minCoverage: 3 },
  { id: "m3", name: "लेथ मशीन", department: "उत्पादन", minCoverage: 2 },
  { id: "m4", name: "ड्रिलिंग मशीन", department: "उत्पादन", minCoverage: 2 },
  { id: "m5", name: "ग्राइंडर", department: "उत्पादन", minCoverage: 1 },
  { id: "m6", name: "पंच प्रेस", department: "असेम्बली", minCoverage: 2 },
  { id: "m7", name: "कन्वेयर बेल्ट", department: "असेम्बली", minCoverage: 1 },
  { id: "m8", name: "इंजेक्शन मोल्डिंग", department: "प्लास्टिक", minCoverage: 2 },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "e1",
    name: "राजेश कुमार",
    employeeCode: "EMP001",
    department: "उत्पादन",
    designation: "वरिष्ठ ऑपरेटर",
    joiningDate: "2019-04-10",
    email: "rajesh@skillforge.in",
    phone: "9876543210",
    password: "rajesh123",
    avatar: "रा",
    skills: [
      { machineId: "m1", machineName: "CNC मशीन", level: 4, updatedAt: "2024-01-15" },
      { machineId: "m2", machineName: "वेल्डिंग मशीन", level: 3, updatedAt: "2024-02-20" },
      { machineId: "m3", machineName: "लेथ मशीन", level: 2, updatedAt: "2023-11-05" },
    ],
    certificates: [
      { id: "c1", name: "CNC प्रोग्रामिंग सर्टिफिकेट", issuedBy: "CIPET", dateEarned: "2023-06-10", expiryDate: "2026-06-10", status: "approved" },
      { id: "c2", name: "वेल्डिंग सेफ्टी", issuedBy: "NSDC", dateEarned: "2022-03-15", status: "approved" },
    ],
  },
  {
    id: "e2",
    name: "प्रिया शर्मा",
    employeeCode: "EMP002",
    department: "असेम्बली",
    designation: "ऑपरेटर",
    joiningDate: "2021-08-01",
    email: "priya@skillforge.in",
    phone: "9876543211",
    password: "priya123",
    avatar: "प्र",
    skills: [
      { machineId: "m6", machineName: "पंच प्रेस", level: 3, updatedAt: "2024-03-01" },
      { machineId: "m7", machineName: "कन्वेयर बेल्ट", level: 4, updatedAt: "2023-12-20" },
    ],
    certificates: [
      { id: "c3", name: "असेम्बली तकनीक", issuedBy: "ITI मुंबई", dateEarned: "2021-12-10", status: "approved" },
    ],
  },
  {
    id: "e3",
    name: "अमित वर्मा",
    employeeCode: "EMP003",
    department: "उत्पादन",
    designation: "जूनियर ऑपरेटर",
    joiningDate: "2023-01-15",
    email: "amit@skillforge.in",
    phone: "9876543212",
    password: "amit123",
    avatar: "अ",
    skills: [
      { machineId: "m4", machineName: "ड्रिलिंग मशीन", level: 2, updatedAt: "2023-07-10" },
      { machineId: "m5", machineName: "ग्राइंडर", level: 1, updatedAt: "2023-09-15" },
    ],
    certificates: [
      { id: "c4", name: "सुरक्षा प्रशिक्षण", issuedBy: "फैक्ट्री मैनेजमेंट", dateEarned: "2023-02-05", status: "pending" },
    ],
  },
  {
    id: "e4",
    name: "सुनीता पटेल",
    employeeCode: "EMP004",
    department: "प्लास्टिक",
    designation: "वरिष्ठ ऑपरेटर",
    joiningDate: "2018-11-20",
    email: "sunita@skillforge.in",
    phone: "9876543213",
    password: "sunita123",
    avatar: "सु",
    skills: [
      { machineId: "m8", machineName: "इंजेक्शन मोल्डिंग", level: 4, updatedAt: "2024-01-05" },
      { machineId: "m5", machineName: "ग्राइंडर", level: 3, updatedAt: "2023-10-15" },
    ],
    certificates: [
      { id: "c5", name: "मोल्डिंग एक्सपर्ट", issuedBy: "CIPET", dateEarned: "2020-09-20", expiryDate: "2025-09-20", status: "approved" },
      { id: "c6", name: "क्वालिटी कंट्रोल", issuedBy: "BIS", dateEarned: "2022-06-30", status: "approved" },
    ],
  },
  {
    id: "e5",
    name: "विकास सिंह",
    employeeCode: "EMP005",
    department: "उत्पादन",
    designation: "ऑपरेटर",
    joiningDate: "2020-06-01",
    email: "vikas@skillforge.in",
    phone: "9876543214",
    password: "vikas123",
    avatar: "वि",
    skills: [
      { machineId: "m1", machineName: "CNC मशीन", level: 2, updatedAt: "2023-08-10" },
      { machineId: "m2", machineName: "वेल्डिंग मशीन", level: 3, updatedAt: "2024-02-05" },
      { machineId: "m3", machineName: "लेथ मशीन", level: 1, updatedAt: "2023-05-20" },
    ],
    certificates: [],
  },
  {
    id: "e6",
    name: "अनिता देशमुख",
    employeeCode: "EMP006",
    department: "असेम्बली",
    designation: "जूनियर ऑपरेटर",
    joiningDate: "2022-03-10",
    email: "anita@skillforge.in",
    phone: "9876543215",
    password: "anita123",
    avatar: "अन",
    skills: [
      { machineId: "m6", machineName: "पंच प्रेस", level: 1, updatedAt: "2022-09-10" },
      { machineId: "m7", machineName: "कन्वेयर बेल्ट", level: 2, updatedAt: "2023-01-15" },
    ],
    certificates: [
      { id: "c7", name: "इलेक्ट्रिकल सेफ्टी", issuedBy: "NSDC", dateEarned: "2023-05-10", status: "rejected" },
    ],
  },
];

// Manager credentials
export const MANAGER_CREDENTIALS = { email: "manager@skillforge.in", password: "manager123" };

// ── LocalStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "skillforge_employees";
const AUTH_KEY    = "skillforge_auth";

export function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Employee[]) : INITIAL_EMPLOYEES;
  } catch {
    return INITIAL_EMPLOYEES;
  }
}

export function saveEmployees(employees: Employee[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
}

export function loadAuth(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveAuth(auth: AuthUser | null): void {
  if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_KEY);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function levelLabel(level: SkillLevel): string {
  const labels = ["नहीं जानते", "थोड़ा जानते", "जानते हैं", "अच्छे से जानते", "माहिर"];
  return labels[level];
}

export function levelColor(level: SkillLevel): string {
  const colors = ["badge-red", "badge-yellow", "badge-blue", "badge-green", "badge-purple"];
  return colors[level];
}

export function getCoverageStatus(machine: Machine, employees: Employee[]): "ok" | "low" | "critical" {
  const count = employees.filter(e => e.skills.some(s => s.machineId === machine.id && s.level >= 2)).length;
  if (count >= machine.minCoverage) return "ok";
  if (count === machine.minCoverage - 1) return "low";
  return "critical";
}
