/* ============================================================
   OPCIONAL · Cloudflare Worker para a IA (Claude): leitura de capas e resumos com pesquisa na internet
   Variáveis do Worker (Settings > Variables):
     ANTHROPIC_API_KEY  (secreta)  chave da API da Anthropic
     FIREBASE_API_KEY              o mesmo apiKey do firebase-config.js
     MODEL                         modelo Claude com visão (ex.: o modelo Sonnet mais recente)
     ORIGEM                        https://SEU-USUARIO.github.io
   Só atende quem está logado na biblioteca com um dos 4 logins.
   ============================================================ */
const PERMITIDOS = ["marubens","mariley","marina","marcus"].map(l => l + "@biblioteca.mariorubens.app");
export default {
  async fetch(req, env) {
    const cors = { "Access-Control-Allow-Origin": env.ORIGEM || "*", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Método não permitido", { status: 405, headers: cors });
    // 1) confere o login no Firebase
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const chk = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: token }) });
    const user = chk.ok ? (await chk.json()).users?.[0] : null;
    if (!user || !PERMITIDOS.includes(user.email)) return new Response("Não autorizado", { status: 401, headers: cors });
    // 2) envia capa + pergunta ao Claude
    const { prompt, images = [], web = false } = await req.json();
    const content = [...images.slice(0, 3).map(data => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })), { type: "text", text: prompt }];
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: env.MODEL, max_tokens: web ? 8000 : 2000, messages: [{ role: "user", content }], ...(web ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }] } : {}) }) });
    if (!r.ok) return new Response(await r.text(), { status: r.status, headers: cors });
    const j = await r.json();
    const fontes = []; const vistos = new Set();
    for (const c of (j.content || [])) if (c.type === "web_search_tool_result" && Array.isArray(c.content)) for (const f of c.content) if (f.url && !vistos.has(f.url)) { vistos.add(f.url); fontes.push({ url: f.url, titulo: f.title || "" }) }
    const text = (j.content || []).filter(c => c.type === "text").map(c => c.text || "").join("");
    return new Response(JSON.stringify({ text, fontes }), { headers: { ...cors, "content-type": "application/json" } });
  }
};
