/* ============================================================
   Biblioteca Mário Rubens · configuração do Firebase
   1) No console do Firebase: Configurações do projeto > Seus apps > Web.
   2) Copie o objeto firebaseConfig e cole abaixo, no lugar dos campos vazios.
   Estes dados identificam o projeto e não são senha: a proteção dos dados
   está no login e nas regras do Firestore (firestore.rules).
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBqUF9xdn4MZCvVy4yNfscQwhE9iWkHgmE",
  authDomain: "biblioteca-mario-rubens.firebaseapp.com",
  projectId: "biblioteca-mario-rubens",
  storageBucket: "biblioteca-mario-rubens.firebasestorage.app",
  messagingSenderId: "89988060694",
  appId: "1:89988060694:web:956b3927d6130e60c64737"
};

/* Logins autorizados (o login vira o e-mail interno login@biblioteca.mariorubens.app) */
window.BIBLIOTECA_USUARIOS = ["marubens", "mariley", "marina", "marcus"];
window.BIBLIOTECA_ADMIN = "marubens";

/* Opcional: endereço do Cloudflare Worker que faz a leitura de capas por IA.
   Deixe vazio para desativar a leitura por foto (o cadastro com foto da capa continua funcionando). */
window.CLAUDE_PROXY_URL = "";
