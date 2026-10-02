export const manifest = {
  appId: "skillsforge",
  name: "SkillsForge",
  description: "Operator Skill Matrix & Certification Tracker",
  routePrefix: "/",
  navigation: [
    { key: "dashboard", label: "Dashboard", href: "/" },
    { key: "grid", label: "Skill Grid", href: "/grid" },
    { key: "assign", label: "Assign", href: "/assign" },
    { key: "simulator", label: "Simulator", href: "/simulator" },
    { key: "workload", label: "Workload", href: "/workload" },
    { key: "reports", label: "Reports", href: "/reports/gaps" },
    { key: "history", label: "History", href: "/history" },
    { key: "admin", label: "Admin", href: "/admin" },
  ],
  permissions: [],
};
