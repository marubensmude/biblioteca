/* ============================================================
   Biblioteca Mário Rubens · camada de acesso para o GitHub Pages
   Login (Firebase Authentication) + dados (Cloud Firestore).
   Expõe window.claude.use(...) com a mesma interface usada pelo
   sistema, para que o código principal seja idêntico nas duas versões.
   ============================================================ */
(function(){
  const CFG=window.FIREBASE_CONFIG||{};
  const DOMINIO="biblioteca.mariorubens.app";              // e-mail interno (não recebe mensagens)
  const PERMITIDOS=window.BIBLIOTECA_USUARIOS||["marubens","mariley","marina","marcus"];
  const ADMIN=window.BIBLIOTECA_ADMIN||"marubens";
  const loginToEmail=l=>String(l||"").trim().toLowerCase()+"@"+DOMINIO;
  const emailToLogin=e=>String(e||"").split("@")[0];
  let fs=null, usuario=null, resolveDb, dbPronto=new Promise(r=>resolveDb=r);

  /* ---------- Tela de login ---------- */
  const css=`
  .lg-wrap{position:fixed;inset:0;z-index:100;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:16px}
  .lg-box{width:min(400px,100%);display:flex;flex-direction:column;gap:14px}
  .lg-box .mk{width:64px;height:64px;border-radius:14px}
  .lg-box h1{font-size:34px}
  .lg-box form{display:flex;flex-direction:column;gap:12px;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:20px}
  .lg-box label{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;display:flex;flex-direction:column;gap:6px}
  .lg-box input{border:1px solid var(--line);background:var(--bg);border-radius:6px;padding:11px 12px;font-size:16px;text-transform:none;letter-spacing:0;color:var(--ink)}
  .lg-box .msg{font-size:13.5px;min-height:1.2em}
  .lg-box .msg.err{color:var(--bad)} .lg-box .msg.ok{color:var(--ok)}
  .lg-box .alt{background:none;border:0;color:var(--gold-ink);cursor:pointer;font:inherit;font-size:13.5px;text-decoration:underline;padding:0;align-self:flex-start}
  .acct{position:relative}
  .acct-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;background:var(--surface);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:8px;display:flex;flex-direction:column;gap:4px;min-width:240px}
  .acct-menu button{text-align:left;border:0;background:transparent;padding:9px 10px;border-radius:6px;cursor:pointer;font:inherit;color:var(--ink)}
  .acct-menu button:hover{background:var(--sunk)}
  .acct-menu small{color:var(--muted);padding:4px 10px}`;
  const st=document.createElement("style"); st.textContent=css; document.head.appendChild(st);

  function telaLogin(modo){
    let el=document.getElementById("lgWrap"); if(!el){ el=document.createElement("div"); el.id="lgWrap"; el.className="lg-wrap"; document.body.appendChild(el) }
    const criar=modo==="criar";
    el.innerHTML=`<div class="lg-box">
      <img class="mk" src="favicon.svg" alt="">
      <div><span class="eyebrow">Ex libris · acervo pessoal</span><h1>Biblioteca <em>Mário Rubens</em></h1></div>
      <form id="lgForm" autocomplete="on">
        <label>Login<input id="lgUser" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
        <label>Senha<input id="lgPass" name="password" type="password" autocomplete="${criar?"new-password":"current-password"}" required minlength="6"></label>
        ${criar?`<label>Repita a senha<input id="lgPass2" type="password" autocomplete="new-password" required minlength="6"></label>`:""}
        <button class="btn primary" type="submit" id="lgBtn">${criar?"Criar meu acesso":"Entrar"}</button>
        <div class="msg" id="lgMsg" role="status"></div>
        <button class="alt" type="button" id="lgAlt">${criar?"Já tenho acesso: entrar":"Primeiro acesso? Criar minha senha"}</button>
      </form>
      <p class="note">Acesso restrito à família. Ex libris, acervo pessoal.</p>
    </div>`;
    document.getElementById("lgAlt").onclick=()=>telaLogin(criar?"entrar":"criar");
    document.getElementById("lgForm").onsubmit=async e=>{
      e.preventDefault();
      const login=document.getElementById("lgUser").value.trim().toLowerCase(), senha=document.getElementById("lgPass").value, msg=document.getElementById("lgMsg"), btn=document.getElementById("lgBtn");
      msg.className="msg"; msg.textContent="";
      if(!PERMITIDOS.includes(login)){ msg.className="msg err"; msg.textContent="Login não autorizado."; return }
      if(criar&&senha!==document.getElementById("lgPass2").value){ msg.className="msg err"; msg.textContent="As senhas não conferem."; return }
      btn.disabled=true; btn.textContent="Aguarde…";
      try{
        if(criar) await firebase.auth().createUserWithEmailAndPassword(loginToEmail(login),senha);
        else await firebase.auth().signInWithEmailAndPassword(loginToEmail(login),senha);
      }catch(err){
        const c=err&&err.code||"";
        msg.className="msg err";
        msg.textContent=c.includes("email-already-in-use")?"Este login já tem senha. Use Entrar.":
          c.includes("weak-password")?"A senha precisa ter ao menos 6 caracteres.":
          c.includes("too-many-requests")?"Muitas tentativas. Aguarde alguns minutos.":
          c.includes("network")?"Sem conexão com a internet.":
          c.includes("operation-not-allowed")||c.includes("admin-restricted")?"A criação de novos acessos está desativada. Peça ao administrador.":
          "Login ou senha incorretos.";
        btn.disabled=false; btn.textContent=criar?"Criar meu acesso":"Entrar";
      }
    };
    setTimeout(()=>{const u=document.getElementById("lgUser"); u&&u.focus()},50);
  }

  /* ---------- Menu da conta ---------- */
  function menuConta(){
    const box=document.querySelector(".head-actions"); if(!box||document.getElementById("acctBtn")) return;
    const w=document.createElement("div"); w.className="acct";
    w.innerHTML=`<button class="btn ghost" type="button" id="acctBtn">Conta: ${usuario}</button>`;
    box.prepend(w);
    document.getElementById("acctBtn").onclick=()=>{
      const old=document.getElementById("acctMenu"); if(old){old.remove();return}
      const m=document.createElement("div"); m.className="acct-menu"; m.id="acctMenu";
      m.innerHTML=`<small>Conectado como <b>${usuario}</b></small>
        <button type="button" id="acBackup">Baixar cópia de segurança (JSON)</button>
        ${usuario===ADMIN?`<button type="button" id="acImport">Importar acervo de um backup</button>`:""}
        <button type="button" id="acSenha">Trocar minha senha</button>
        <button type="button" id="acSair">Sair</button>`;
      w.appendChild(m);
      document.getElementById("acSair").onclick=()=>firebase.auth().signOut().then(()=>location.reload());
      document.getElementById("acBackup").onclick=baixarBackup;
      document.getElementById("acSenha").onclick=trocarSenha;
      const im=document.getElementById("acImport"); if(im) im.onclick=importarBackup;
    };
  }
  async function trocarSenha(){
    const root=document.getElementById("busyRoot");
    root.innerHTML=`<div class="busy"><div class="box"><h3>Trocar minha senha</h3>
      <label class="note">Nova senha<input id="nsP" type="password" autocomplete="new-password" minlength="6" style="width:100%;border:1px solid var(--line);border-radius:6px;padding:10px;margin-top:4px"></label>
      <label class="note">Repita<input id="nsP2" type="password" autocomplete="new-password" minlength="6" style="width:100%;border:1px solid var(--line);border-radius:6px;padding:10px;margin-top:4px"></label>
      <div class="note" id="nsMsg"></div>
      <div style="display:flex;gap:8px"><button class="btn primary" id="nsOk" type="button">Salvar</button><button class="btn ghost" id="nsNo" type="button">Cancelar</button></div></div></div>`;
    document.getElementById("nsNo").onclick=()=>root.innerHTML="";
    document.getElementById("nsOk").onclick=async()=>{
      const a=document.getElementById("nsP").value,b=document.getElementById("nsP2").value,msg=document.getElementById("nsMsg");
      if(a.length<6){msg.textContent="Use ao menos 6 caracteres.";return} if(a!==b){msg.textContent="As senhas não conferem.";return}
      try{ await firebase.auth().currentUser.updatePassword(a); root.innerHTML=""; alertToast("Senha alterada.") }
      catch(e){ msg.textContent=(e.code||"").includes("recent-login")?"Por segurança, saia e entre de novo antes de trocar a senha.":"Não foi possível trocar a senha." }
    };
  }
  const alertToast=t=>{const r=document.getElementById("toastRoot"); if(r){r.innerHTML=`<div class="toast">${t}</div>`; setTimeout(()=>r.innerHTML="",3000)}};
  function salvarArquivo(nome,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
  async function baixarBackup(){
    const [ls,cs,cf]=await Promise.all([fs.collection("livros").get(),fs.collection("capas").get(),fs.doc("config/geral").get()]);
    const out={formato:"biblioteca-mario-rubens-backup",versao:1,gerado_em:new Date().toISOString(),
      livros:ls.docs.map(d=>({id:d.id,...d.data()})),capas:Object.fromEntries(cs.docs.map(d=>[d.id,d.data().data])),config:cf.exists?cf.data():null};
    salvarArquivo(`backup-biblioteca-${new Date().toISOString().slice(0,10)}.json`,new Blob([JSON.stringify(out)],{type:"application/json"}));
    alertToast(`Cópia de segurança com ${out.livros.length} livros baixada.`);
  }
  function importarBackup(){
    const inp=document.createElement("input"); inp.type="file"; inp.accept=".json,application/json";
    inp.onchange=async()=>{
      const f=inp.files[0]; if(!f) return; let j; try{ j=JSON.parse(await f.text()) }catch(e){ alertToast("Arquivo inválido."); return }
      if(!j||!Array.isArray(j.livros)){ alertToast("Este arquivo não é um backup da biblioteca."); return }
      const root=document.getElementById("busyRoot");
      root.innerHTML=`<div class="busy"><div class="box"><h3>Importar ${j.livros.length} livros?</h3><p class="note">Livros com o mesmo registro (MR) serão substituídos pelos do arquivo. ${Object.keys(j.capas||{}).length} capas serão importadas.</p><div class="note" id="imMsg"></div><div style="display:flex;gap:8px"><button class="btn primary" id="imOk" type="button">Importar</button><button class="btn ghost" id="imNo" type="button">Cancelar</button></div></div></div>`;
      document.getElementById("imNo").onclick=()=>root.innerHTML="";
      document.getElementById("imOk").onclick=async()=>{
        const msg=document.getElementById("imMsg"); document.getElementById("imOk").disabled=true;
        try{
          const ops=[]; j.livros.forEach(b=>{const {id,...data}=b; ops.push(["livros",id||data.codigo,data])});
          Object.entries(j.capas||{}).forEach(([id,data])=>ops.push(["capas",id,{data}]));
          if(j.config) ops.push(["config","geral",j.config]);
          for(let i=0;i<ops.length;i+=300){ const bt=fs.batch(); ops.slice(i,i+300).forEach(([c,id,d])=>bt.set(fs.collection(c).doc(id),d)); await bt.commit(); msg.textContent=`Gravados ${Math.min(i+300,ops.length)} de ${ops.length}…` }
          root.innerHTML=""; alertToast(`Importação concluída: ${j.livros.length} livros.`);
        }catch(e){ msg.textContent="Falha na importação: "+(e.message||e.code||"erro") }
      };
    };
    inp.click();
  }

  /* ---------- Capas (guardadas no Firestore, coleção "capas") ---------- */
  const capaCache={};
  window.capaURL=function(id){
    if(!id) return ""; if(capaCache[id]) return capaCache[id];
    if(capaCache[id]===undefined&&fs){ capaCache[id]=null; fs.collection("capas").doc(id).get().then(s=>{ if(s.exists){ capaCache[id]=s.data().data; document.querySelectorAll(`[data-capa="${id}"]`).forEach(img=>{img.src=capaCache[id];img.hidden=false;const sp=img.nextElementSibling;if(sp&&sp.classList.contains("d-spine"))sp.hidden=true}) } }) }
    return "";
  };
  function blobToDataURL(b){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(b)})}

  /* ---------- Leitura por foto (opcional, via Cloudflare Worker) ---------- */
  function sampleAdapter(){
    const url=window.CLAUDE_PROXY_URL; if(!url) return null;
    const fn=async()=>{throw {code:"invalid_request"}};
    fn.limits=async()=>({images:{maxCount:3}});
    fn.json=async(prompt,opts={})=>{
      const imgs=[]; for(const b of [].concat(opts.images||[])){ const d=await blobToDataURL(b); imgs.push(d.split(",")[1]) }
      const tok=await firebase.auth().currentUser.getIdToken();
      let r; try{ r=await fetch(url,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+tok},body:JSON.stringify({prompt,images:imgs,web:!!opts.web}),signal:opts.signal}) }
      catch(e){ throw {code:e&&e.name==="AbortError"?"cancelled":"upstream_error",message:"Falha de conexão"} }
      if(!r.ok) throw {code:r.status===429?"rate_limited":"upstream_error",message:"HTTP "+r.status};
      const {text,fontes}=await r.json(); const a=text.indexOf("{"), z=text.lastIndexOf("}");
      let o; try{ o=JSON.parse(text.slice(a,z+1)) }catch(e){ throw {code:"invalid_json",text} }
      if(o&&typeof o==="object"&&Array.isArray(fontes)) o._fontes=fontes; return o;
    };
    return fn;
  }

  /* ---------- window.claude.use ---------- */
  window.claude={ use: async name=>{
    if(name==="db"){ await dbPronto; return fs }
    if(name==="user"){ await dbPronto; return {id:async()=>usuario,isOwner:()=>usuario===ADMIN,canEdit:()=>true,can:async()=>true,me:async()=>({id:usuario,name:usuario})} }
    if(name==="assets"){ await dbPronto; return { upload: async blob=>{ const id="c"+Date.now().toString(36)+Math.random().toString(36).slice(2,7); const data=await blobToDataURL(blob); await fs.collection("capas").doc(id).set({data,criado_em:new Date().toISOString(),por:usuario}); capaCache[id]=data; return {id,url:data,sizeBytes:blob.size,contentType:"image/jpeg"} } } }
    if(name==="downloads") return { save: async ({filename,data})=>salvarArquivo(filename,data instanceof Blob?data:new Blob([data])) };
    if(name==="sample"){ await dbPronto; return sampleAdapter() }
    return null;
  }};

  /* ---------- Inicialização ---------- */
  if(!CFG.apiKey){ document.addEventListener("DOMContentLoaded",()=>{ document.body.insertAdjacentHTML("afterbegin",`<div class="lg-wrap"><div class="lg-box"><h1>Configuração pendente</h1><p class="note">Preencha o arquivo <b>firebase-config.js</b> com os dados do projeto Firebase.</p></div></div>`) }); return }
  firebase.initializeApp(CFG);
  fs=firebase.firestore();
  try{ fs.enablePersistence({synchronizeTabs:true}).catch(()=>{}) }catch(e){}
  firebase.auth().onAuthStateChanged(u=>{
    if(u&&PERMITIDOS.includes(emailToLogin(u.email))){
      usuario=emailToLogin(u.email); const el=document.getElementById("lgWrap"); if(el) el.remove();
      resolveDb(); const t=setInterval(()=>{ if(document.querySelector(".head-actions")){ clearInterval(t); menuConta() } },100);
    } else {
      if(u) firebase.auth().signOut();
      const show=()=>telaLogin("entrar"); if(document.body) show(); else document.addEventListener("DOMContentLoaded",show);
    }
  });
})();
