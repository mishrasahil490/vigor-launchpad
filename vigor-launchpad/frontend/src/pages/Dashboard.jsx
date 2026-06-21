import { useEffect, useState } from "react";
import {
  Target, Building2, Megaphone, Sparkles, Truck, CalendarDays,
  IndianRupee, TrendingUp, Wallet, Clock, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import api from "../api/client";
import KpiCard from "../components/KpiCard";
import PageHeader from "../components/PageHeader";

const COLORS = ["#5d4ce8", "#ff6b5e", "#f0a83a", "#21b894", "#7d70f0", "#4734d4", "#a098f6", "#e3e1fd"];

function fmtCurrency(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [charts, setCharts] = useState(null);

  useEffect(() => {
    api.get("/dashboard/kpis").then((res) => setKpis(res.data.data));
    api.get("/dashboard/charts").then((res) => setCharts(res.data.data));
  }, []);

  if (!kpis || !charts) {
    return <div className="text-ink-400 p-10 text-center">Loading dashboard...</div>;
  }

  return (
    <div>
      <PageHeader title="Executive Dashboard" subtitle="Real-time overview across leads, campaigns, events, and finance." />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard icon={Target} label="Total Leads" value={kpis.totalLeads} accent="brand" />
        <KpiCard icon={Target} label="Active Leads" value={kpis.activeLeads} accent="gold" />
        <KpiCard icon={Building2} label="Total Clients" value={kpis.totalClients} accent="brand" />
        <KpiCard icon={Megaphone} label="Active Campaigns" value={kpis.activeCampaigns} accent="mint" />
        <KpiCard icon={Sparkles} label="Influencers" value={kpis.totalInfluencers} accent="coral" />
        <KpiCard icon={Truck} label="Vendors" value={kpis.totalVendors} accent="brand" />
        <KpiCard icon={CalendarDays} label="Total Events" value={kpis.totalEvents} accent="gold" />
        <KpiCard icon={IndianRupee} label="Revenue (Month)" value={fmtCurrency(kpis.revenueThisMonth)} accent="mint" />
        <KpiCard icon={TrendingUp} label="Revenue (Quarter)" value={fmtCurrency(kpis.revenueThisQuarter)} accent="mint" />
        <KpiCard icon={Wallet} label="Campaign Spend" value={fmtCurrency(kpis.campaignSpend)} accent="coral" />
        <KpiCard icon={Clock} label="Pending Follow-ups" value={kpis.pendingFollowUps} accent="gold" />
        <KpiCard icon={AlertTriangle} label="Overdue Tasks" value={kpis.overdueTasks} accent="coral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-ink-800 dark:text-white mb-1">Lead Funnel</h3>
          <p className="text-xs text-ink-400 mb-3">Pipeline distribution across stages</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.leadFunnel} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-ink-100 dark:text-ink-700" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 12 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#5d4ce8" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-ink-800 dark:text-white mb-1">Revenue Trend</h3>
          <p className="text-xs text-ink-400 mb-3">Invoiced revenue, last 6 months</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts.revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtCurrency} />
              <Tooltip formatter={(v) => fmtCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#21b894" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-ink-800 dark:text-white mb-1">Campaign Status</h3>
          <p className="text-xs text-ink-400 mb-3">Distribution across all campaigns</p>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={charts.campaignStatusDistribution} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {charts.campaignStatusDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-ink-800 dark:text-white mb-1">Influencer Categories</h3>
          <p className="text-xs text-ink-400 mb-3">Creator database by content category</p>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={charts.influencerCategoryDistribution} dataKey="count" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {charts.influencerCategoryDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-ink-800 dark:text-white mb-1">Monthly Lead Acquisition</h3>
          <p className="text-xs text-ink-400 mb-3">New leads created, last 6 months</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={charts.monthlyLeadAcquisition}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="leads" fill="#f0a83a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-ink-800 dark:text-white mb-1">Employee Performance</h3>
          <p className="text-xs text-ink-400 mb-3">Leads won &amp; tasks completed per team member</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.employeePerformance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="leadsWon" name="Leads Won" fill="#5d4ce8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="tasksCompleted" name="Tasks Completed" fill="#21b894" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-ink-800 dark:text-white mb-1">Brand-wise Campaign Performance</h3>
          <p className="text-xs text-ink-400 mb-3">Budget vs spend by client</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.brandCampaignPerformance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="brand" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtCurrency} />
              <Tooltip formatter={(v) => fmtCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="budget" name="Budget" fill="#a098f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="spend" name="Spend" fill="#ff6b5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
