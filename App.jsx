import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Tu es un agent expert en analyse des Event Monitoring Logs Salesforce.
Tu détectes les anomalies, erreurs, risques de sécurité et problèmes de performance. Tu t'exprimes en français, de façon claire et concise.

Pour chaque analyse :
1. Identifie les anomalies par type (sécurité, performance, erreur code, gouvernance)
2. Attribue une criticité : CRITIQUE, AVERTISSEMENT, INFO
3. Explique la cause probable
4. Propose des actions correctives concrètes avec les étapes Salesforce exactes

Quand tu listes des anomalies, formate ce bloc JSON séparé :
ANOMALIES_JSON:[{"severity":"critical|warning|info","event":"nom","description":"courte description","time":"heure"}]

Sois direct, actionnable, et cite les noms de classes/champs Salesforce exacts quand pertinent.`;

const SAMPLE_LOGS = `{"eventType":"ApexUnexpectedException","userId":"0053X00000AbCdE","timestamp":"2024-01-15T10:23:11Z","message":"System.LimitException: Too many SOQL queries: 101","className":"OpportunityTriggerHandler","lineNumber":47}
{"eventType":"ApexUnexpectedException","userId":"0053X00000AbCdE","timestamp":"2024-01-15T10:23:18Z","message":"System.LimitException: Too many SOQL queries: 101","className":"OpportunityTriggerHandler","lineNumber":47}
{"eventType":"LoginAs","userId":"0053X00000AbCdF","timestamp":"2024-01-15T10:24:00Z","delegateUserId":"0053X00000Admin1","sourceIp":"185.220.101.45"}
{"eventType":"ApiEvent","userId":"0053X00000AbCdG","timestamp":"2024-01-15T10:25:30Z","method":"GET","uri":"/services/data/v58.0/query","queryString":"SELECT+Id,Password__c+FROM+User","statusCode":200}
{"eventType":"ApexExecution","userId":"0053X00000AbCdH","timestamp":"2024-01-15T10:26:10Z","cpuTime":9800,"dbTotalTime":45000,"entryPoint":"AccountBatchJob"}
{"eventType":"LoginEvent","userId":"0053X00000AbCdI","timestamp":"2024-01-15T10:27:00Z","loginStatus":"FAILED","sourceIp":"185.220.101.45","loginType":"Application"}
{"eventType":"LoginEvent","userId":"0053X00000AbCdI","timestamp":"2024-01-15T10:27:05Z","loginStatus":"FAILED","sourceIp":"185.220.101.45","loginType":"Application"}
{"eventType":"LoginEvent","userId":"0053X00000AbCdI","timestamp":"2024-01-15T10:27:11Z","loginStatus":"FAILED","sourceIp":"185.220.101.45","loginType":"Application"}
{"eventType":"ApexUnexpectedException","userId":"0053X00000AbCdJ","timestamp":"2024-01-15T10:28:00Z","message":"System.NullPointerException: Attempt to de-reference a null object","className":"LeadConversionService","lineNumber":112}
{"eventType":"ContentDistribution","userId":"0053X00000AbCdK","timestamp":"2024-01-15T10:29:15Z","contentDocumentId":"069XX000000ABCD","externalAccessCount":47}`;

function getSeverityLabel(s) {
  return s === "critical" ? "Critique" : s === "warning" ? "Avertissement" : "Info";
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";

  let anomalies = null;
  let displayText = msg.content;
  const jsonMatch = msg.content.match(/ANOMALIES_JSON:(\[[\s\S]*?\])/);
  if (jsonMatch) {
    try { anomalies = JSON.parse(jsonMatch[1]); } catch (e) {}
    displayText = msg.content.replace(/ANOMALIES_JSON:\[[\s\S]*?\]/, "").trim();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", gap: 4, maxWidth: "85%" }}>
      <div style={{
        padding: "10px 14px",
        borderRadius: 14,
        fontSize: 14,
        lineHeight: 1.6,
        background: isUser ? "#1D4ED8" : "#F8FAFC",
        color: isUser ? "#fff" : "#1e293b",
        border: isUser ? "none" : "1px solid #E2E8F0",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
      }}>
        {displayText}
        {anomalies && anomalies.length > 0 && (
          <div style={{ marginTop: 12, border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            {anomalies.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: i < anomalies.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, flexShrink: 0,
                  background: a.severity === "critical" ? "#FEE2E2" : a.severity === "warning" ? "#FEF3C7" : "#DBEAFE",
                  color: a.severity === "critical" ? "#991B1B" : a.severity === "warning" ? "#92400E" : "#1E40AF"
                }}>{getSeverityLabel(a.severity)}</span>
                <span style={{ fontSize: 13, color: "#334155", flex: 1 }}>{a.event} — {a.description}</span>
                {a.time && <span style={{ fontSize: 11, color: "#94A3B8" }}>{a.time}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, color: "#94A3B8", padding: "0 4px" }}>{msg.time}</span>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{
    role: "agent", content: "Bonjour ! Je suis votre agent d'analyse des Event Monitoring Logs Salesforce.\n\nCollez vos logs dans la zone ci-dessus puis posez vos questions — je détecte les anomalies, explique les erreurs et propose des actions correctives.", time: now()
  }]);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [logStatus, setLogStatus] = useState("");
  const messagesEnd = useRef(null);
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  function now() {
    return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  async function send(text) {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userContent = logs ? `Logs Salesforce :\n\`\`\`\n${logs}\n\`\`\`\n\nQuestion : ${text}` : text;
    const newHistory = [...history, { role: "user", content: userContent }];
    setHistory(newHistory);
    setMessages(m => [...m, { role: "user", content: text, time: now() }]);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, system: SYSTEM_PROMPT, messages: newHistory })
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Erreur de réponse.";
      setHistory(h => [...h, { role: "assistant", content: reply }]);
      setMessages(m => [...m, { role: "agent", content: reply, time: now() }]);
    } catch {
      setMessages(m => [...m, { role: "agent", content: "Erreur de connexion. Vérifiez votre clé API.", time: now() }]);
    }
    setLoading(false);
  }

  const quickActions = [
    "Analyse ces logs et détecte toutes les anomalies",
    "Quels sont les risques de sécurité ?",
    "Quel utilisateur est le plus suspect ?",
    "Génère un rapport de synthèse"
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F8FAFC", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", background: "#fff", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="#fff" strokeWidth="2" strokeLinecap="round" d="M9 12h6M9 16h4M7 4H4a1 1 0 00-1 1v14a1 1 0 001 1h16a1 1 0 001-1V5a1 1 0 00-1-1h-3"/><rect x="7" y="2" width="10" height="4" rx="1" stroke="#fff" strokeWidth="2"/></svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#0F172A" }}>SF Log Agent</div>
          <div style={{ fontSize: 12, color: "#64748B" }}>Event Monitoring · Détection d'anomalies</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }}></div>
          <span style={{ fontSize: 12, color: "#64748B" }}>En ligne</span>
        </div>
      </div>

      {/* Log input zone */}
      <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Collez vos Event Monitoring Logs (JSON, CSV ou texte brut)</div>
        <textarea
          value={logs}
          onChange={e => { setLogs(e.target.value); setLogStatus(e.target.value ? `${e.target.value.split('\n').filter(Boolean).length} lignes chargées` : ""); }}
          style={{ width: "100%", height: 80, fontSize: 12, fontFamily: "monospace", resize: "vertical", border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 10px", background: "#F8FAFC", color: "#334155", outline: "none" }}
          placeholder='{"eventType":"ApexUnexpectedException","timestamp":"2024-01-15T10:23:11Z","message":"System.LimitException: Too many SOQL queries: 101",...}'
        />
        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
          <button onClick={() => { setLogs(SAMPLE_LOGS); setLogStatus("10 événements chargés"); }} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #93C5FD", background: "#EFF6FF", color: "#1D4ED8", cursor: "pointer" }}>Charger exemple</button>
          <button onClick={() => { setLogs(""); setLogStatus(""); }} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #CBD5E1", background: "transparent", color: "#64748B", cursor: "pointer" }}>Effacer</button>
          {logStatus && <span style={{ fontSize: 12, color: "#22C55E" }}>{logStatus}</span>}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, width: "fit-content" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#94A3B8", animation: `bounce 1.2s ${i * 0.2}s infinite` }}></div>
            ))}
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Quick actions */}
      {!loading && (
        <div style={{ padding: "0 16px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {quickActions.map((q, i) => (
            <button key={i} onClick={() => send(q)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "1px solid #CBD5E1", background: "#fff", color: "#334155", cursor: "pointer" }}>{q}</button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding: "10px 16px", background: "#fff", borderTop: "1px solid #E2E8F0", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send(input)}
          placeholder="Ex: Pourquoi y a-t-il autant d'erreurs SOQL ?"
          disabled={loading}
          style={{ flex: 1, fontSize: 14, border: "1px solid #CBD5E1", borderRadius: 10, padding: "10px 14px", outline: "none", background: "#F8FAFC", color: "#0F172A" }}
        />
        <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#1D4ED8", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>
          Envoyer
        </button>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
    </div>
  );
}
