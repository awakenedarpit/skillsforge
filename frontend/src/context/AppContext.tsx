import React, { createContext, useContext, useReducer } from "react";
import {
  type AuthUser,
  type Certificate,
  type Employee,
  type Skill,
  type SkillLevel,
  loadAuth,
  loadEmployees,
  MANAGER_CREDENTIALS,
  saveAuth,
  saveEmployees,
} from "../data/store";

// ── State ─────────────────────────────────────────────────────────────────────

interface AppState {
  employees: Employee[];
  auth: AuthUser | null;
}

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOGIN"; payload: AuthUser }
  | { type: "LOGOUT" }
  | { type: "UPDATE_SKILL"; employeeId: string; skill: Skill }
  | { type: "ADD_CERTIFICATE"; employeeId: string; cert: Certificate }
  | { type: "UPDATE_CERT_STATUS"; employeeId: string; certId: string; status: Certificate["status"] }
  | { type: "DELETE_CERTIFICATE"; employeeId: string; certId: string }
  | { type: "UPDATE_PROFILE"; employeeId: string; patch: Partial<Pick<Employee, "phone" | "email">> };

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOGIN":
      saveAuth(action.payload);
      return { ...state, auth: action.payload };

    case "LOGOUT":
      saveAuth(null);
      return { ...state, auth: null };

    case "UPDATE_SKILL": {
      const employees = state.employees.map(emp => {
        if (emp.id !== action.employeeId) return emp;
        const existing = emp.skills.findIndex(s => s.machineId === action.skill.machineId);
        const skills = existing >= 0
          ? emp.skills.map((s, i) => (i === existing ? action.skill : s))
          : [...emp.skills, action.skill];
        return { ...emp, skills };
      });
      saveEmployees(employees);
      return { ...state, employees };
    }

    case "ADD_CERTIFICATE": {
      const employees = state.employees.map(emp =>
        emp.id === action.employeeId
          ? { ...emp, certificates: [...emp.certificates, action.cert] }
          : emp
      );
      saveEmployees(employees);
      return { ...state, employees };
    }

    case "UPDATE_CERT_STATUS": {
      const employees = state.employees.map(emp => {
        if (emp.id !== action.employeeId) return emp;
        return {
          ...emp,
          certificates: emp.certificates.map(c =>
            c.id === action.certId ? { ...c, status: action.status } : c
          ),
        };
      });
      saveEmployees(employees);
      return { ...state, employees };
    }

    case "DELETE_CERTIFICATE": {
      const employees = state.employees.map(emp =>
        emp.id === action.employeeId
          ? { ...emp, certificates: emp.certificates.filter(c => c.id !== action.certId) }
          : emp
      );
      saveEmployees(employees);
      return { ...state, employees };
    }

    case "UPDATE_PROFILE": {
      const employees = state.employees.map(emp =>
        emp.id === action.employeeId ? { ...emp, ...action.patch } : emp
      );
      saveEmployees(employees);
      return { ...state, employees };
    }

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  login: (email: string, password: string) => "ok" | "bad-creds";
  logout: () => void;
  updateSkill: (employeeId: string, machineId: string, machineName: string, level: SkillLevel) => void;
  addCertificate: (employeeId: string, cert: Omit<Certificate, "id" | "status">) => void;
  updateCertStatus: (employeeId: string, certId: string, status: Certificate["status"]) => void;
  deleteCertificate: (employeeId: string, certId: string) => void;
  updateProfile: (employeeId: string, patch: Partial<Pick<Employee, "phone" | "email">>) => void;
  currentEmployee: Employee | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    employees: loadEmployees(),
    auth: loadAuth(),
  });

  const login = (email: string, password: string): "ok" | "bad-creds" => {
    const trimEmail = email.trim().toLowerCase();
    const trimPass  = password.trim();

    // Manager login
    if (trimEmail === MANAGER_CREDENTIALS.email && trimPass === MANAGER_CREDENTIALS.password) {
      dispatch({ type: "LOGIN", payload: { role: "manager" } });
      return "ok";
    }

    // Employee login
    const emp = state.employees.find(
      e => e.email.toLowerCase() === trimEmail && e.password === trimPass
    );
    if (emp) {
      dispatch({ type: "LOGIN", payload: { role: "employee", employeeId: emp.id } });
      return "ok";
    }

    return "bad-creds";
  };

  const logout = () => dispatch({ type: "LOGOUT" });

  const updateSkill = (employeeId: string, machineId: string, machineName: string, level: SkillLevel) => {
    dispatch({
      type: "UPDATE_SKILL",
      employeeId,
      skill: { machineId, machineName, level, updatedAt: new Date().toISOString().split("T")[0] },
    });
  };

  const addCertificate = (employeeId: string, cert: Omit<Certificate, "id" | "status">) => {
    dispatch({
      type: "ADD_CERTIFICATE",
      employeeId,
      cert: { ...cert, id: `c${Date.now()}`, status: "pending" },
    });
  };

  const updateCertStatus = (employeeId: string, certId: string, status: Certificate["status"]) => {
    dispatch({ type: "UPDATE_CERT_STATUS", employeeId, certId, status });
  };

  const deleteCertificate = (employeeId: string, certId: string) => {
    dispatch({ type: "DELETE_CERTIFICATE", employeeId, certId });
  };

  const updateProfile = (employeeId: string, patch: Partial<Pick<Employee, "phone" | "email">>) => {
    dispatch({ type: "UPDATE_PROFILE", employeeId, patch });
  };

  const currentEmployee = state.auth?.role === "employee"
    ? state.employees.find(e => e.id === state.auth?.employeeId)
    : undefined;

  return (
    <AppContext.Provider value={{
      state, login, logout,
      updateSkill, addCertificate, updateCertStatus, deleteCertificate, updateProfile,
      currentEmployee,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
