// src/app.jsx — prototype shell (wires AdminLayout + screens)
const { useState: useStateA, useEffect: useEffectA } = React;

const ROUTES = {
  dashboard:  { label: "Operations Dashboard", component: () => <window.Dashboard /> },
  distress:   { label: "Distress Queue",       component: () => <window.DistressQueue /> },
  clusters:   { label: "Ticket Cluster Analytics", component: () => <window.TicketClusters /> },
  dictionary: { label: "Data Dictionary",          component: () => <window.DictPanel /> },
};

function PlaceholderScreen({ title, sub }) {
  return (
    <div className="bg-white" style={{
      border: "1px dashed var(--border)",
      background: "repeating-linear-gradient(135deg, #fff 0 12px, #F7FAFC 12px 24px)",
      borderRadius: 8,
      padding: "64px 32px",
      textAlign: "center",
    }}>
      <div style={{
        display: "inline-block",
        background: "var(--pale-blue)",
        color: "var(--dark-blue)",
        fontFamily: "Montserrat",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.12em",
        padding: "4px 12px",
        borderRadius: 999,
        marginBottom: 14,
      }}>IN DEVELOPMENT</div>
      <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 22, color: "var(--dark-blue)" }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--dark-gray)", marginTop: 8, maxWidth: 540, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
        {sub} This screen will be implemented in a follow-up sprint.
      </p>
    </div>
  );
}

function getInitialRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  return ROUTES[hash] ? hash : "dashboard";
}

function App() {
  const [route, setRoute] = useStateA(getInitialRoute());

  useEffectA(() => {
    const onHash = () => setRoute(getInitialRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (r) => {
    window.location.hash = r;
    setRoute(r);
  };

  const Screen = ROUTES[route].component;
  return (
    <window.AdminLayout pageTitle={ROUTES[route].label} currentRoute={route} onNavigate={navigate}>
      <Screen />
    </window.AdminLayout>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
