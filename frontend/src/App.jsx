import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Clients from "./pages/Clients";
import Influencers from "./pages/Influencers";
import Campaigns from "./pages/Campaigns";
import Events from "./pages/Events";
import Vendors from "./pages/Vendors";
import Tasks from "./pages/Tasks";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import VigorSpace from "./pages/VigorSpace";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<ProtectedRoute page="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute page="leads"><Leads /></ProtectedRoute>} />
        <Route path="/leads/:id" element={<ProtectedRoute page="leads"><Leads /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute page="clients"><Clients /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute page="clients"><Clients /></ProtectedRoute>} />
        <Route path="/influencers" element={<ProtectedRoute page="influencers"><Influencers /></ProtectedRoute>} />
        <Route path="/influencers/:id" element={<ProtectedRoute page="influencers"><Influencers /></ProtectedRoute>} />
        <Route path="/campaigns" element={<ProtectedRoute page="campaigns"><Campaigns /></ProtectedRoute>} />
        <Route path="/campaigns/:id" element={<ProtectedRoute page="campaigns"><Campaigns /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute page="events"><Events /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute page="events"><Events /></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute page="vendors"><Vendors /></ProtectedRoute>} />
        <Route path="/vendors/:id" element={<ProtectedRoute page="vendors"><Vendors /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute page="tasks"><Tasks /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute page="finance"><Finance /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute page="reports"><Reports /></ProtectedRoute>} />
        <Route path="/vigor-space" element={<ProtectedRoute page="vigor-space"><VigorSpace /></ProtectedRoute>} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute page="settings">
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
