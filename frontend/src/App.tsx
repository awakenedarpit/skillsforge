import { Route, Routes } from "react-router-dom";
import { Layout, Placeholder } from "./components/Layout";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Placeholder title="Coverage floor" note="Heatmap, alerts, and top risks land here once the coverage service is in place." />} />
        <Route path="/grid" element={<Placeholder title="Skill grid" note="Operators by machines, edited in place." />} />
        <Route path="/assign" element={<Placeholder title="Assignment check" note="Green or red, with the reason." />} />
        <Route path="/simulator" element={<Placeholder title="What if someone resigns?" note="Read-only coverage simulation." />} />
        <Route path="/workload" element={<Placeholder title="Workload fairness" note="Who is carrying the last 14 days." />} />
        <Route path="/training" element={<Placeholder title="Cross-training" note="Who to train so a red cell goes away." />} />
        <Route path="/history" element={<Placeholder title="Change history" note="Who changed a level, and a one-click revert." />} />
        <Route path="/reports" element={<Placeholder title="Reports" note="Printable gap report and assignment verdict." />} />
        <Route path="/reports/gaps" element={<Placeholder title="Gap report" note="Skills with no backup." />} />
        <Route path="/reports/verdict" element={<Placeholder title="Verdict" note="Printable assignment verdict." />} />
        <Route path="/admin" element={<Placeholder title="Admin" note="People, machines, and demo tools." />} />
      </Route>
    </Routes>
  );
}
