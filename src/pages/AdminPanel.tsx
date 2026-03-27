import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "barber";
  barbershop_name?: string;
  plan?: string;
  status?: "active" | "trialing" | "past_due" | "canceled" | "inactive";
  created_at: string;
  whatsapp?: string;
  total_appointments?: number;
  total_revenue?: number;
}

interface SystemStats {
  total_users: number;
  total_barbershops: number;
  active_subscriptions: number;
  total_appointments: number;
  total_revenue: number;
  new_users_today: number;
  new_users_week: number;
  plans: { basic: number; starter: number; pro: number; master: number };
}

type View = "dashboard" | "users" | "barbershops" | "subscriptions" | "logs";

// ─── Constants ────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "trixsistemas@gmail.com";
const ADMIN_PASSWORD = "Trix@System123";

const PLAN_COLORS: Record<string, string> = {
  basic: "#00DDFA",
  starter: "#025D7A",
  pro: "#02D7A0",
  master: "#043756",
  inactive: "#666",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: "rgba(2,215,160,0.15)",  text: "#02D7A0", label: "Ativo"       },
  trialing:  { bg: "rgba(0,221,250,0.15)",  text: "#00DDFA", label: "Trial"       },
  past_due:  { bg: "rgba(255,165,0,0.15)",  text: "#FFA500", label: "Atrasado"    },
  canceled:  { bg: "rgba(220,53,69,0.15)",  text: "#DC3545", label: "Cancelado"   },
  inactive:  { bg: "rgba(100,100,100,0.15)",text: "#888",    label: "Inativo"     },
};

// ─── Mock Data Generator ──────────────────────────────────────────────────────
function generateMockUsers(): AdminUser[] {
  const plans = ["basic", "starter", "pro", "master"];
  const statuses = ["active", "active", "active", "trialing", "past_due", "canceled"] as const;
  const names = [
    ["João Silva", "Barbearia do João"],
    ["Pedro Santos", "Barber Shop Santos"],
    ["Carlos Oliveira", "Cortes & Estilo"],
    ["Rafael Lima", "Studio Rafael"],
    ["Bruno Costa", "Premium Cuts"],
    ["Diego Ferreira", "The Barber Club"],
    ["Lucas Mendes", "Mendes Barber"],
    ["Felipe Rocha", "Rocha Hair"],
    ["Thiago Alves", "Alves Studio"],
    ["Mateus Gomes", "Gomes Barbearia"],
    ["André Nunes", "André Classic"],
    ["Rodrigo Pinto", "Pinto & Cia"],
    ["Gabriel Souza", "Souza Barber"],
    ["Henrique Lima", "Lima Premium"],
    ["Vinícius Cruz", "Cruz Cuts"],
    ["Eduardo Dias", "Dias Studio"],
    ["Marcelo Teixeira", "Teixeira Hair"],
    ["Leonardo Carvalho", "Carvalho Barber"],
    ["Anderson Ribeiro", "Ribeiro Cuts"],
    ["Gustavo Martins", "Martins & Sons"],
  ];

  return names.map(([name, shop], i) => ({
    id: `user_${i + 1}`,
    email: `${name.split(" ")[0].toLowerCase()}@email.com`,
    full_name: name,
    role: "owner" as const,
    barbershop_name: shop,
    plan: plans[i % plans.length],
    status: statuses[i % statuses.length],
    created_at: new Date(Date.now() - Math.random() * 180 * 86400000).toISOString(),
    whatsapp: `(${10 + i}) 9${String(Math.floor(Math.random() * 90000000 + 10000000))}`,
    total_appointments: Math.floor(Math.random() * 500 + 10),
    total_revenue: Math.floor(Math.random() * 50000 + 500),
  }));
}

function computeStats(users: AdminUser[]): SystemStats {
  const active = users.filter(u => u.status === "active" || u.status === "trialing");
  const plans = { basic: 0, starter: 0, pro: 0, master: 0 };
  users.forEach(u => { if (u.plan && u.plan in plans) (plans as any)[u.plan]++; });
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  return {
    total_users: users.length,
    total_barbershops: users.filter(u => u.role === "owner").length,
    active_subscriptions: active.length,
    total_appointments: users.reduce((s, u) => s + (u.total_appointments || 0), 0),
    total_revenue: users.reduce((s, u) => s + (u.total_revenue || 0), 0),
    new_users_today: users.filter(u => new Date(u.created_at) >= todayStart).length,
    new_users_week: users.filter(u => new Date(u.created_at) >= weekAgo).length,
    plans,
  };
}

// ─── Components ───────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #043756 0%, #02293d 60%, #011828 100%)",
    color: "#ECECEC",
    fontFamily: "'Inter', -apple-system, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  loginWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  loginCard: {
    background: "rgba(4,55,86,0.6)",
    border: "1px solid rgba(2,93,122,0.4)",
    borderRadius: "1.25rem",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "420px",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "2rem",
    justifyContent: "center",
  },
  logoBox: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #025D7A, #00DDFA)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "18px",
    color: "#ECECEC",
  },
  logoText: {
    fontSize: "1.5rem",
    fontWeight: 700,
    background: "linear-gradient(90deg, #025D7A, #00DDFA)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  formTitle: {
    textAlign: "center" as const,
    fontSize: "1.25rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
    color: "#ECECEC",
  },
  formSub: {
    textAlign: "center" as const,
    color: "#888",
    fontSize: "0.85rem",
    marginBottom: "1.75rem",
  },
  label: {
    display: "block",
    fontSize: "0.8rem",
    color: "#AAA",
    marginBottom: "0.4rem",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    padding: "0.625rem 0.875rem",
    background: "rgba(2,41,61,0.8)",
    border: "1px solid rgba(2,93,122,0.4)",
    borderRadius: "8px",
    color: "#ECECEC",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  },
  btn: {
    width: "100%",
    padding: "0.75rem",
    background: "linear-gradient(135deg, #025D7A, #00DDFA)",
    border: "none",
    borderRadius: "8px",
    color: "#ECECEC",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    marginTop: "1.25rem",
    transition: "opacity 0.2s",
  },
  errorBox: {
    background: "rgba(220,53,69,0.15)",
    border: "1px solid rgba(220,53,69,0.4)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "#ff6b6b",
    fontSize: "0.85rem",
    marginBottom: "1rem",
    textAlign: "center" as const,
  },
};

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        onLogin();
      } else {
        setError("Credenciais inválidas. Tente novamente.");
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        <div style={styles.logo}>
          <div style={styles.logoBox}>TA</div>
          <span style={styles.logoText}>Trix Agenda</span>
        </div>
        <h2 style={styles.formTitle}>Painel Administrativo</h2>
        <p style={styles.formSub}>Acesso restrito — Trix Sistemas</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={styles.label}>Email de administrador</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="Código"
              required
              autoFocus
            />
          </div>
          <div>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Autenticando..." : "Entrar no Painel"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#555", fontSize: "0.75rem", marginTop: "1.5rem" }}>
          © 2026 Trix Sistemas · Uso interno restrito
        </p>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: "rgba(4,55,86,0.5)",
      border: `1px solid ${accent ? accent + "44" : "rgba(2,93,122,0.3)"}`,
      borderRadius: "12px",
      padding: "1.25rem 1.5rem",
      transition: "border-color 0.2s",
    }}>
      <p style={{ color: "#888", fontSize: "0.78rem", fontWeight: 500, marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ fontSize: "2rem", fontWeight: 700, color: accent || "#ECECEC", lineHeight: 1.1, marginBottom: sub ? "0.25rem" : 0 }}>{value}</p>
      {sub && <p style={{ color: "#666", fontSize: "0.75rem" }}>{sub}</p>}
    </div>
  );
}

// ── Plan Bar Chart ─────────────────────────────────────────────────────────────
function PlanChart({ plans }: { plans: SystemStats["plans"] }) {
  const total = Object.values(plans).reduce((a, b) => a + b, 0) || 1;
  const entries = [
    { key: "basic", label: "Basic", color: "#00DDFA" },
    { key: "starter", label: "Starter", color: "#025D7A" },
    { key: "pro", label: "Pro", color: "#02D7A0" },
    { key: "master", label: "Master", color: "#043756" },
  ];
  return (
    <div style={{ background: "rgba(4,55,86,0.5)", border: "1px solid rgba(2,93,122,0.3)", borderRadius: "12px", padding: "1.25rem 1.5rem" }}>
      <p style={{ color: "#AAA", fontSize: "0.8rem", fontWeight: 600, marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Distribuição de Planos</p>
      {entries.map(({ key, label, color }) => {
        const count = (plans as any)[key] || 0;
        const pct = (count / total) * 100;
        return (
          <div key={key} style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: color }}>{label}</span>
              <span style={{ fontSize: "0.82rem", color: "#888" }}>{count} ({pct.toFixed(0)}%)</span>
            </div>
            <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "99px", transition: "width 0.6s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Users Table ───────────────────────────────────────────────────────────────
function UsersTable({ users, onSelect }: { users: AdminUser[]; onSelect: (u: AdminUser) => void }) {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "revenue" | "created">("created");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 8;

  const filtered = users
    .filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.barbershop_name || "").toLowerCase().includes(q);
      const matchPlan = filterPlan === "all" || u.plan === filterPlan;
      const matchStatus = filterStatus === "all" || u.status === filterStatus;
      return matchSearch && matchPlan && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "revenue") return (b.total_revenue || 0) - (a.total_revenue || 0);
      if (sortBy === "name") return a.full_name.localeCompare(b.full_name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const inputStyle: React.CSSProperties = {
    background: "rgba(2,41,61,0.8)",
    border: "1px solid rgba(2,93,122,0.4)",
    borderRadius: "8px",
    color: "#ECECEC",
    padding: "0.45rem 0.75rem",
    fontSize: "0.82rem",
    outline: "none",
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
        <input
          placeholder="🔍 Buscar barbearia, email ou nome..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ ...inputStyle, minWidth: "240px", flex: 1 }}
        />
        <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(0); }} style={inputStyle}>
          <option value="all">Todos os planos</option>
          <option value="basic">Basic</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="master">Master</option>
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }} style={inputStyle}>
          <option value="all">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="trialing">Trial</option>
          <option value="past_due">Atrasado</option>
          <option value="canceled">Cancelado</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={inputStyle}>
          <option value="created">Mais recentes</option>
          <option value="revenue">Maior receita</option>
          <option value="name">Nome A–Z</option>
        </select>
        <span style={{ color: "#666", fontSize: "0.8rem", marginLeft: "auto" }}>{filtered.length} resultado(s)</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(2,93,122,0.25)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "rgba(2,93,122,0.2)", borderBottom: "1px solid rgba(2,93,122,0.25)" }}>
              {["Barbearia / Dono", "Email", "Plano", "Status", "Agendamentos", "Receita Total", "Criado em"].map(h => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#888", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((u, i) => {
              const st = STATUS_COLORS[u.status || "inactive"];
              return (
                <tr
                  key={u.id}
                  onClick={() => onSelect(u)}
                  style={{
                    borderBottom: "1px solid rgba(2,93,122,0.1)",
                    background: i % 2 === 0 ? "rgba(4,55,86,0.25)" : "transparent",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(2,93,122,0.2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "rgba(4,55,86,0.25)" : "transparent")}
                >
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontWeight: 600, color: "#ECECEC" }}>{u.barbershop_name}</div>
                    <div style={{ color: "#888", fontSize: "0.75rem" }}>{u.full_name}</div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#AAA" }}>{u.email}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "99px",
                      background: (PLAN_COLORS[u.plan || ""] || "#025D7A") + "33",
                      color: PLAN_COLORS[u.plan || ""] || "#025D7A",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      textTransform: "capitalize",
                    }}>{u.plan}</span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span style={{ padding: "0.2rem 0.6rem", borderRadius: "99px", background: st.bg, color: st.text, fontSize: "0.75rem", fontWeight: 600 }}>{st.label}</span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#AAA" }}>{u.total_appointments?.toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#02D7A0", fontWeight: 600 }}>R$ {u.total_revenue?.toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#666" }}>{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center", alignItems: "center" }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: "0.35rem 0.75rem", background: "rgba(2,93,122,0.3)", border: "1px solid rgba(2,93,122,0.4)", borderRadius: "6px", color: "#AAA", cursor: page === 0 ? "not-allowed" : "pointer", fontSize: "0.8rem", opacity: page === 0 ? 0.4 : 1 }}>← Ant.</button>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)} style={{ padding: "0.35rem 0.6rem", background: page === i ? "linear-gradient(135deg,#025D7A,#00DDFA)" : "rgba(2,93,122,0.2)", border: "1px solid rgba(2,93,122,0.3)", borderRadius: "6px", color: page === i ? "#ECECEC" : "#888", cursor: "pointer", fontSize: "0.8rem", fontWeight: page === i ? 700 : 400 }}>{i + 1}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page === pages - 1} style={{ padding: "0.35rem 0.75rem", background: "rgba(2,93,122,0.3)", border: "1px solid rgba(2,93,122,0.4)", borderRadius: "6px", color: "#AAA", cursor: page === pages - 1 ? "not-allowed" : "pointer", fontSize: "0.8rem", opacity: page === pages - 1 ? 0.4 : 1 }}>Próx. →</button>
        </div>
      )}
    </div>
  );
}

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const st = STATUS_COLORS[user.status || "inactive"];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }} onClick={onClose}>
      <div style={{ background: "#04243a", border: "1px solid rgba(2,93,122,0.5)", borderRadius: "16px", padding: "2rem", maxWidth: "500px", width: "100%", boxShadow: "0 12px 60px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ECECEC", marginBottom: "0.25rem" }}>{user.barbershop_name}</h2>
            <p style={{ color: "#888", fontSize: "0.85rem" }}>{user.full_name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "1.25rem", padding: "0.25rem" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            ["Email", user.email],
            ["WhatsApp", user.whatsapp || "—"],
            ["Plano", user.plan?.toUpperCase()],
            ["Status", st.label],
            ["Agendamentos", (user.total_appointments || 0).toLocaleString("pt-BR")],
            ["Receita Total", `R$ ${(user.total_revenue || 0).toLocaleString("pt-BR")}`],
            ["Ticket Médio", user.total_appointments ? `R$ ${((user.total_revenue || 0) / user.total_appointments).toFixed(2)}` : "—"],
            ["Membro desde", new Date(user.created_at).toLocaleDateString("pt-BR")],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "rgba(2,93,122,0.15)", borderRadius: "8px", padding: "0.75rem" }}>
              <p style={{ color: "#666", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>{label}</p>
              <p style={{ color: label === "Status" ? st.text : "#ECECEC", fontWeight: 600, fontSize: "0.88rem" }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button style={{ flex: 1, padding: "0.6rem", background: "rgba(2,93,122,0.3)", border: "1px solid rgba(2,93,122,0.5)", borderRadius: "8px", color: "#00DDFA", cursor: "pointer", fontSize: "0.82rem" }}>✉ Contato</button>
          <button style={{ flex: 1, padding: "0.6rem", background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.3)", borderRadius: "8px", color: "#DC3545", cursor: "pointer", fontSize: "0.82rem" }}>⚠ Suspender</button>
          <button onClick={onClose} style={{ flex: 1, padding: "0.6rem", background: "linear-gradient(135deg,#025D7A,#00DDFA)", border: "none", borderRadius: "8px", color: "#ECECEC", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ── Activity Log ──────────────────────────────────────────────────────────────
function ActivityLog() {
  const events = [
    { time: "há 2 min",   icon: "✅", text: "Nova assinatura: Bruno Costa — Plano Pro" },
    { time: "há 8 min",   icon: "🔄", text: "Upgrade: Rafael Lima — Starter → Master" },
    { time: "há 15 min",  icon: "❌", text: "Cancelamento: Diego Ferreira — Plano Basic" },
    { time: "há 32 min",  icon: "👤", text: "Novo cadastro: Thiago Alves" },
    { time: "há 1h",      icon: "💳", text: "Pagamento recebido: R$ 97,00 — Mateus Gomes" },
    { time: "há 1h 20min",icon: "⚠",  text: "Pagamento atrasado: André Nunes — Plano Pro" },
    { time: "há 2h",      icon: "✅", text: "Nova assinatura: Rodrigo Pinto — Plano Starter" },
    { time: "há 3h",      icon: "🔄", text: "Upgrade: Gabriel Souza — Basic → Pro" },
    { time: "há 4h",      icon: "💳", text: "Pagamento recebido: R$ 57,00 — Henrique Lima" },
    { time: "há 5h",      icon: "👤", text: "Novo cadastro: Vinícius Cruz" },
  ];
  return (
    <div style={{ background: "rgba(4,55,86,0.5)", border: "1px solid rgba(2,93,122,0.3)", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(2,93,122,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#AAA", fontWeight: 600, fontSize: "0.85rem" }}>📋 Log de Atividades</p>
        <span style={{ color: "#555", fontSize: "0.75rem" }}>Últimas 24h</span>
      </div>
      {events.map((e, i) => (
        <div key={i} style={{ padding: "0.75rem 1.25rem", borderBottom: i < events.length - 1 ? "1px solid rgba(2,93,122,0.1)" : "none", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          <span style={{ fontSize: "1rem", lineHeight: 1.4 }}>{e.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#ECECEC", fontSize: "0.82rem" }}>{e.text}</p>
            <p style={{ color: "#555", fontSize: "0.72rem", marginTop: "0.15rem" }}>{e.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Admin App ─────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [users] = useState<AdminUser[]>(generateMockUsers);
  const [stats] = useState<SystemStats>(() => computeStats(generateMockUsers()));
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: "dashboard",     label: "Dashboard",     icon: "📊" },
    { id: "users",         label: "Usuários",      icon: "👥" },
    { id: "barbershops",   label: "Barbearias",    icon: "✂️" },
    { id: "subscriptions", label: "Assinaturas",   icon: "💳" },
    { id: "logs",          label: "Logs",          icon: "📋" },
  ];

  if (!authed) return <div style={styles.root}><LoginScreen onLogin={() => setAuthed(true)} /></div>;

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{
          width: "220px",
          flexShrink: 0,
          background: "rgba(2,20,32,0.95)",
          borderRight: "1px solid rgba(2,93,122,0.25)",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 0",
        }}>
          {/* Logo */}
          <div style={{ padding: "0 1.25rem 1.5rem", borderBottom: "1px solid rgba(2,93,122,0.2)", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ ...styles.logoBox, width: "36px", height: "36px", fontSize: "13px", borderRadius: "9px" }}>TA</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ECECEC", lineHeight: 1.1 }}>Trix Agenda</p>
                <p style={{ fontSize: "0.65rem", color: "#555" }}>Admin · Trix Sistemas</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "0 0.75rem" }}>
            {navItems.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.65rem 0.75rem",
                  borderRadius: "8px",
                  background: view === id ? "linear-gradient(135deg,rgba(2,93,122,0.4),rgba(0,221,250,0.1))" : "transparent",
                  border: view === id ? "1px solid rgba(2,93,122,0.4)" : "1px solid transparent",
                  color: view === id ? "#00DDFA" : "#777",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: view === id ? 600 : 400,
                  textAlign: "left",
                  marginBottom: "0.25rem",
                  transition: "all 0.15s",
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {id === "users" && <span style={{ marginLeft: "auto", background: "rgba(0,221,250,0.15)", color: "#00DDFA", borderRadius: "99px", padding: "0.1rem 0.45rem", fontSize: "0.7rem", fontWeight: 700 }}>{stats.total_users}</span>}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid rgba(2,93,122,0.2)" }}>
            <button
              onClick={() => setAuthed(false)}
              style={{ width: "100%", padding: "0.6rem", background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.25)", borderRadius: "8px", color: "#DC3545", cursor: "pointer", fontSize: "0.8rem" }}
            >
              🚪 Sair
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: "auto", padding: "2rem" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ECECEC", marginBottom: "0.2rem" }}>
                {view === "dashboard" && "Visão Geral"}
                {view === "users" && "Usuários"}
                {view === "barbershops" && "Barbearias"}
                {view === "subscriptions" && "Assinaturas"}
                {view === "logs" && "Log de Atividades"}
              </h1>
              <p style={{ color: "#555", fontSize: "0.82rem" }}>
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#02D7A0", boxShadow: "0 0 8px #02D7A0" }} />
              <span style={{ color: "#666", fontSize: "0.8rem" }}>Sistema online</span>
            </div>
          </div>

          {/* ── DASHBOARD VIEW ── */}
          {view === "dashboard" && (
            <div>
              {/* KPI Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <StatCard label="Total de Usuários"       value={stats.total_users}          sub={`+${stats.new_users_week} esta semana`} accent="#00DDFA" />
                <StatCard label="Barbearias Ativas"       value={stats.total_barbershops}    sub="owners cadastrados"                    accent="#025D7A" />
                <StatCard label="Assinaturas Ativas"      value={stats.active_subscriptions} sub={`${((stats.active_subscriptions/stats.total_users)*100).toFixed(0)}% do total`} accent="#02D7A0" />
                <StatCard label="Total Agendamentos"      value={stats.total_appointments.toLocaleString("pt-BR")} sub="histórico completo"              />
                <StatCard label="Receita Plataforma"      value={`R$ ${(stats.total_revenue/1000).toFixed(1)}k`} sub="receita total gerada"             accent="#00DDFA" />
                <StatCard label="Novos Hoje"              value={stats.new_users_today}      sub="cadastros no dia"                      accent="#02D7A0" />
              </div>

              {/* Charts Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <PlanChart plans={stats.plans} />

                {/* Status breakdown */}
                <div style={{ background: "rgba(4,55,86,0.5)", border: "1px solid rgba(2,93,122,0.3)", borderRadius: "12px", padding: "1.25rem 1.5rem" }}>
                  <p style={{ color: "#AAA", fontSize: "0.8rem", fontWeight: 600, marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status das Assinaturas</p>
                  {(["active","trialing","past_due","canceled","inactive"] as const).map(s => {
                    const count = users.filter(u => (u.status || "inactive") === s).length;
                    const st = STATUS_COLORS[s];
                    return (
                      <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
                        <span style={{ fontSize: "0.82rem", color: st.text }}>{st.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "80px", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(count/users.length)*100}%`, background: st.text, borderRadius: "99px" }} />
                          </div>
                          <span style={{ color: "#888", fontSize: "0.78rem", minWidth: "24px", textAlign: "right" }}>{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent users */}
              <div style={{ background: "rgba(4,55,86,0.5)", border: "1px solid rgba(2,93,122,0.3)", borderRadius: "12px", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <p style={{ color: "#AAA", fontWeight: 600, fontSize: "0.85rem" }}>🆕 Últimos Cadastros</p>
                  <button onClick={() => setView("users")} style={{ background: "none", border: "none", color: "#00DDFA", cursor: "pointer", fontSize: "0.78rem" }}>Ver todos →</button>
                </div>
                <UsersTable users={[...users].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,5)} onSelect={setSelectedUser} />
              </div>
            </div>
          )}

          {/* ── USERS VIEW ── */}
          {view === "users" && (
            <div>
              <div style={{ background: "rgba(4,55,86,0.5)", border: "1px solid rgba(2,93,122,0.3)", borderRadius: "12px", padding: "1.5rem" }}>
                <UsersTable users={users} onSelect={setSelectedUser} />
              </div>
            </div>
          )}

          {/* ── BARBERSHOPS VIEW ── */}
          {view === "barbershops" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: "1rem" }}>
              {users.map(u => {
                const st = STATUS_COLORS[u.status || "inactive"];
                return (
                  <div key={u.id} onClick={() => setSelectedUser(u)} style={{ background: "rgba(4,55,86,0.5)", border: "1px solid rgba(2,93,122,0.25)", borderRadius: "12px", padding: "1.25rem", cursor: "pointer", transition: "border-color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,221,250,0.5)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(2,93,122,0.25)")}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg,#025D7A,#00DDFA)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#ECECEC", fontSize: "1rem" }}>
                        {u.barbershop_name?.charAt(0)}
                      </div>
                      <span style={{ padding: "0.2rem 0.55rem", borderRadius: "99px", background: st.bg, color: st.text, fontSize: "0.72rem", fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <h3 style={{ fontWeight: 700, color: "#ECECEC", marginBottom: "0.2rem", fontSize: "0.95rem" }}>{u.barbershop_name}</h3>
                    <p style={{ color: "#777", fontSize: "0.78rem", marginBottom: "0.75rem" }}>{u.full_name}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                      <span style={{ color: "#666" }}>{u.total_appointments} agendamentos</span>
                      <span style={{ color: "#02D7A0", fontWeight: 600 }}>R$ {u.total_revenue?.toLocaleString("pt-BR")}</span>
                    </div>
                    <div style={{ marginTop: "0.5rem" }}>
                      <span style={{ padding: "0.15rem 0.5rem", background: (PLAN_COLORS[u.plan||""]||"#025D7A")+"33", color: PLAN_COLORS[u.plan||""]||"#025D7A", borderRadius: "99px", fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize" }}>{u.plan}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── SUBSCRIPTIONS VIEW ── */}
          {view === "subscriptions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
                {(["basic","starter","pro","master"] as const).map(p => {
                  const count = stats.plans[p];
                  const prices: Record<string,number> = { basic:27, starter:37, pro:57, master:97 };
                  return (
                    <div key={p} style={{ background: "rgba(4,55,86,0.5)", border: `1px solid ${PLAN_COLORS[p]}44`, borderRadius: "12px", padding: "1.25rem" }}>
                      <p style={{ color: PLAN_COLORS[p], fontWeight: 700, textTransform: "capitalize", marginBottom: "0.5rem" }}>{p}</p>
                      <p style={{ fontSize: "2rem", fontWeight: 700, color: "#ECECEC" }}>{count}</p>
                      <p style={{ color: "#666", fontSize: "0.78rem" }}>usuários</p>
                      <p style={{ color: "#02D7A0", fontSize: "0.85rem", marginTop: "0.5rem", fontWeight: 600 }}>MRR: R$ {(count * prices[p]).toLocaleString("pt-BR")}</p>
                    </div>
                  );
                })}
              </div>

              {/* MRR total */}
              <div style={{ background: "rgba(2,93,122,0.2)", border: "1px solid rgba(2,93,122,0.4)", borderRadius: "12px", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>MRR TOTAL ESTIMADO</p>
                  <p style={{ fontSize: "2.5rem", fontWeight: 700, color: "#00DDFA" }}>
                    R$ {(stats.plans.basic*27 + stats.plans.starter*37 + stats.plans.pro*57 + stats.plans.master*97).toLocaleString("pt-BR")}
                  </p>
                  <p style={{ color: "#555", fontSize: "0.78rem" }}>Monthly Recurring Revenue — {stats.active_subscriptions} assinaturas ativas</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#888", fontSize: "0.78rem" }}>ARR estimado</p>
                  <p style={{ color: "#02D7A0", fontWeight: 700, fontSize: "1.4rem" }}>
                    R$ {((stats.plans.basic*27 + stats.plans.starter*37 + stats.plans.pro*57 + stats.plans.master*97)*12).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div style={{ background: "rgba(4,55,86,0.5)", border: "1px solid rgba(2,93,122,0.3)", borderRadius: "12px", padding: "1.25rem" }}>
                <UsersTable users={users} onSelect={setSelectedUser} />
              </div>
            </div>
          )}

          {/* ── LOGS VIEW ── */}
          {view === "logs" && <ActivityLog />}
        </main>
      </div>

      {/* User modal */}
      {selectedUser && <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}