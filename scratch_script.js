/* =========================
   SUPABASE AUTH CONFIG
   ========================= */
const SUPABASE_URL = 'https://mbaglidxyqoatoudaywv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rDV65MqkhE_2zRszFM98LA_Lp7d3M6-';
// Google Client ID: 605674763807-00htdje42ank3u1cb6mflolgrc1djept.apps.googleusercontent.com

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Gerenciamento de Autenticação


async function verificarUsuario() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('Erro de autenticação Supabase:', error);
      if (error.message.includes('fetch')) {
        showToast('Erro de conexão com o banco de dados. Verifique se o projeto Supabase está ativo.', 'error');
      }
    }

    if (session && !localStorage.getItem('last_login_timestamp')) {
      localStorage.setItem('last_login_timestamp', new Date().getTime().toString());
    }

    gerenciarEstadoAuth(session);
  } catch (err) {
    console.error('Erro crítico ao conectar ao Supabase:', err);
    if (typeof showToast === 'function') {
      showToast('Falha na conexão com o servidor. O projeto pode estar pausado.', 'error');
    }
  }
}

// Função para verificar se o e-mail está na lista de aprovados (e cadastra se não existir)
async function verificarSeAutorizado(user) {
  if (!user || !user.email) return false;

  const email = user.email.toLowerCase();
  const nome = user.user_metadata?.full_name || email;

  try {
    // 1. Tenta buscar o usuário
    let { data, error } = await supabaseClient
      .from('usuarios_aprovados')
      .select('status')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar autorização:', error);
      return false;
    }

    // 2. Se não existir, cadastra como pendente automaticamente
    if (!data) {
      const { error: insertError } = await supabaseClient
        .from('usuarios_aprovados')
        .insert([{
          email: email,
          nome: nome,
          status: 'pendente'
        }]);

      if (insertError) {
        console.error('Erro ao auto-registrar:', insertError);
        if (typeof showToast === 'function') {
          showToast('Erro ao registrar acesso: ' + (insertError.message || 'Verifique o RLS no Supabase'), 'error');
        }
      }
      return false; // Retorna falso pois acabou de ser cadastrado como pendente
    }

    // 3. Verifica se o status é 'aprovado'
    return data.status === 'aprovado';
  } catch (err) {
    console.error('Erro inesperado na verificação:', err);
    return false;
  }
}

async function gerenciarEstadoAuth(session) {
  const loginScreen = document.getElementById('login-screen');
  const appContainer = document.querySelector('.app');
  const pendingScreen = document.getElementById('pending-approval');
  const googleOptions = document.querySelector('.login-auth-options');
  const emailDisplay = document.getElementById('user-email-pending');
  const greetingEl = document.getElementById('user-greeting');
  const greetingName = document.getElementById('user-greeting-name');


  // 2. Lógica de Autenticação
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:";
  const devMode = new URLSearchParams(window.location.search).has('dev');

  if (session || (isLocal && devMode)) {
    const autorizado = session ? await verificarSeAutorizado(session.user) : true;

    if (autorizado) {
      if (loginScreen) loginScreen.style.display = 'none';
      if (appContainer) appContainer.style.display = 'block';
      if (pendingScreen) pendingScreen.classList.add('hidden');

      // Mostrar saudação com o primeiro nome do usuário
      if (greetingEl && greetingName && session && session.user) {
        const fullName = session.user.user_metadata?.full_name || session.user.email || 'Usuário';
        const firstName = fullName.split(' ')[0];
        greetingName.innerHTML = `Olá, <strong>${firstName}</strong>`;
        greetingEl.style.display = 'inline-flex';
      }
    } else {
      // Autenticado mas não autorizado (Pendente ou Bloqueado)
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
      if (googleOptions) googleOptions.classList.add('hidden');
      if (pendingScreen) pendingScreen.classList.remove('hidden');
      if (emailDisplay) emailDisplay.innerText = session.user.email;
      if (greetingEl) greetingEl.style.display = 'none';
    }
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    if (googleOptions) googleOptions.classList.remove('hidden');
    if (pendingScreen) pendingScreen.classList.add('hidden');
    if (greetingEl) greetingEl.style.display = 'none';
  }
}

// Escutar mudanças de estado (Login/Logout)
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Atualiza o timestamp de login quando o usuário entra
    localStorage.setItem('last_login_timestamp', new Date().getTime().toString());
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('last_login_timestamp');
  }
  gerenciarEstadoAuth(session);
});

// Eventos de Click para Login
window.addEventListener('load', () => {
  verificarUsuario();

  // Atualização periódica do estado de autenticação
  setInterval(async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    gerenciarEstadoAuth(session);
  }, 60000);

  const btnGoogle = document.getElementById('google-login-btn');
  if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account consent',
            access_type: 'offline'
          }
        }
      });
      if (error) if (typeof showToast === 'function') showToast('Erro Google: ' + error.message, 'error');
    });
  }
});

/* =========================
   CONTINUAÇÃO DO SCRIPT ORIGINAL
   ========================= */

function replicarDadosCliente() {
  const campos = {
    nomeCompleto: document.getElementById('global_nomeCompleto').value.toUpperCase(),
    cpfCnpj: document.getElementById('global_cpfCnpj').value.toUpperCase(),
    endereco: document.getElementById('global_endereco').value.toUpperCase(),
    bairro: document.getElementById('global_bairro').value.toUpperCase(),
    cep: document.getElementById('global_cep').value.toUpperCase(),
    cidade: document.getElementById('global_cidade').value.toUpperCase(),
    estado: document.getElementById('global_estado').value.toUpperCase()
  };

  // Mapeamento de campos globais para campos locais
  const mapa = {
    'acordo_nomeCompleto': campos.nomeCompleto, 'acordo_cpfCnpj': campos.cpfCnpj, 'acordo_endereco': campos.endereco, 'acordo_bairro': campos.bairro, 'acordo_cep': campos.cep, 'acordo_cidade': campos.cidade, 'acordo_estado': campos.estado,
    'rec_nomeCompleto': campos.nomeCompleto, 'rec_cpfCnpj': campos.cpfCnpj, 'rec_endereco': campos.endereco, 'rec_bairro': campos.bairro, 'rec_cidade': campos.cidade, 'rec_estado': campos.estado,
    'quit_nomeCompleto': campos.nomeCompleto, 'quit_cpfCnpj': campos.cpfCnpj, 'quit_cidade': campos.cidade,
    'res_nomeCompleto': campos.nomeCompleto, 'res_cpfCnpj': campos.cpfCnpj, 'res_endereco': campos.endereco, 'res_bairro': campos.bairro, 'res_cidade': campos.cidade, 'res_estado': campos.estado,
    'dep_nomeCompleto': campos.nomeCompleto, 'dep_cpfCnpj': campos.cpfCnpj, 'dep_cidade': campos.cidade,
    'inst_nomeCompleto': campos.nomeCompleto, 'inst_cpfCnpj': campos.cpfCnpj, 'inst_cidade': campos.cidade,
    'orc_proprietario': campos.nomeCompleto, 'orc_cpfCnpj': campos.cpfCnpj
  };

  for (let id in mapa) {
    const el = document.getElementById(id);
    if (el) el.value = mapa[id];
  }
}

/* =========================
   UI CONTROLS & STATE
   ========================= */
const root = document.documentElement;
const shell = document.getElementById("shell");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("page subtitle");
let currentSectionId = "home";
// Sidebar
const LS_SIDEBAR = "central_sidebar_collapsed";
const LS_FAVORITE = "central_favoritos_v2"; // Nova chave para array

const MODULE_METADATA = {
  // Módulos Principais
  'gerador': { title: 'Gerador de Documentos', desc: 'Crie procurações, termos e declarações rapidamente.', type: 'section' },
  'rh': { title: 'RH / DP', desc: 'Cartilha de integração, carta de férias e ajuste de ponto.', type: 'section' },
  'venda-direta': { title: 'Venda Direta', desc: 'Links e sistemas exclusivos para VD.', type: 'section' },
  'calculadora': { title: 'Calculadora (juros do cartão)', desc: 'Simulações de financiamento e parcelas.', type: 'section' },
  'bancos': { title: 'Portais dos Bancos', desc: 'Acesso rápido aos portais das financeiras.', type: 'section' },
  'plataformas': { title: 'Sistemas', desc: 'DocuSign, AutoAvaliar, Dugestão e outros.', type: 'section' },
  'seminovos': { title: 'Seminovos', desc: 'Estoque, termos de repasse e robô de anúncios.', type: 'section' },
  'textos-contrato': { title: 'Textos para Contrato', desc: 'Modelos de cláusulas e textos legais para contratos de veículos.', type: 'section' },
  'lojas': { title: 'Localização das Lojas', desc: 'Endereços e links de GPS para clientes.', type: 'section' },
  'gestor': { title: 'Apoio para Gestores', desc: 'NBS Shortcut, BI de Avaliações e Leilão.', type: 'section' },
  'certidoes': { title: 'Emitir Certidões', desc: 'Links para emissão de certidões negativas e CND.', type: 'section' },
  'acessorios': { title: 'Catálogo de Acessórios', desc: 'Acesse os catálogos completos de acessórios originais.', type: 'section' },
  'links': { title: 'Links Úteis', desc: 'Atalhos importantes para o dia a dia do vendedor.', type: 'section' },
  'cartas': { title: 'Zero KM', desc: 'Acessos e informações diretas da fábrica/montadora.', type: 'section' },
  'pos-vendas': { title: 'Pós Vendas', desc: 'Sistemas e links de suporte após a venda.', type: 'section' },

  // Itens Internos - Gerador
  'btn-doc-recebimento': { title: 'PROCURAÇÃO DE RECEBIMENTO', type: 'doc', action: 'doc-recebimento' },
  'btn-doc-acordo': { title: 'PROCURAÇÃO DE ACORDO', type: 'doc', action: 'doc-acordo' },
  'btn-doc-instrumento': { title: 'INSTRUMENTO DE RESPONSABILIDADE', type: 'doc', action: 'doc-instrumento' },
  'btn-doc-quitacao': { title: 'TERMO DE QUITAÇÃO', type: 'doc', action: 'doc-quitacao' },
  'btn-doc-residencia': { title: 'DECLARAÇÃO DE RESIDÊNCIA', type: 'doc', action: 'doc-residencia' },
  'btn-doc-deposito': { title: 'DECLARAÇÃO DE DEPÓSITO', type: 'doc', action: 'doc-deposito' },
  'btn-doc-orcamento': { title: 'ORÇAMENTO DE DETRAN', type: 'doc', action: 'doc-orcamento' },
  'btn-doc-test-drive': { title: 'Termo de Test Drive', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/Termo_de_Responsabilidade_do_Test_Drive.xlsx' },
  'btn-doc-retirada': { title: 'Autorização de retirada por Terceiros', type: 'link', action: 'https://github.com/albertomateus10/pdfsdomes/raw/main/autorzacaoretiradaterceiros.doc' },

  // Itens Internos - Bancos
  'btn-banco-psa': { title: 'BANCO PSA', type: 'link', action: 'https://autofacil.stellantisfinanciamentos.com.br/login' },
  'btn-banco-volks': { title: 'BANCO VOLKS', type: 'link', action: 'https://digital.bancovw.com.br/FrontEnd/login' },
  'btn-banco-itau': { title: 'BANCO ITAÚ', type: 'link', action: 'https://www.credlineitau.com.br/' },
  'btn-banco-bradesco': { title: 'BANCO BRADESCO', type: 'link', action: 'https://financiamentos.bradesco/financiamentos/' },
  'btn-banco-safra': { title: 'BANCO SAFRA', type: 'link', action: 'https://financeira.safra.com.br/portal-veiculos/login' },
  'btn-banco-c6': { title: 'BANCO C6 AUTO', type: 'link', action: 'https://c6auto.com.br/originacaolojista/login' },
  'btn-banco-bv': { title: 'BANCO BV', type: 'link', action: 'https://parceiro.bv.com.br/ng-gpar-base-login/#' },
  'btn-banco-pan': { title: 'BANCO PAN', type: 'link', action: 'https://veiculos.bancopan.com.br/login' },

  // Itens Internos - Certidões
  'btn-cert-judicial': { title: 'CERTIDÃO JUDICIAL', type: 'link', action: 'https://www2.trf4.jus.br/trf4/processos/certidao/index.php?string_cpf=01525186060' },
  'btn-cert-trabalhista': { title: 'CERTIDÃO TRABALHISTA', type: 'link', action: 'https://www.tst.jus.br/certidao1' },
  'btn-cert-tjrs': { title: 'CERTIDÃO ANTECEDENTES TJRS', type: 'link', action: 'https://www.tjrs.jus.br/novo/processos-e-servicos/servicos-processuais/emissao-de-antecedentes-e-certidoes/' },
  'btn-cert-trt4': { title: 'CERTIDÕES TRT4', type: 'link', action: 'https://pje.trt4.jus.br/certidoes/inicio' },
  'btn-cert-federal': { title: 'CERTIDÃO REGULARIDADE FISCAL', type: 'link', action: 'https://servicos.receitafederal.gov.br/servico/certidoes/#/home' },

  // Itens Internos - Venda Direta
  'btn-vd-contrato': { title: 'CONTRATO DE VD', type: 'function', action: () => mostrarAvisoConstrucao('vd') },
  'btn-vd-estoque': { title: 'SEMINOVOS A RECEBER', type: 'link', action: 'https://docs.google.com/spreadsheets/d/1ZXum0nBBdqZSwIddWKTyh5IUswc20KHGdyvB36mGh_Q/edit?usp=sharing' },
  'btn-vd-cnpj': { title: 'CARTÃO CNPJ', type: 'link', action: 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp' },
  'btn-vd-ie': { title: 'INSCRIÇÃO ESTADUAL', type: 'link', action: 'https://www.sefaz.rs.gov.br/consultas/contribuinte' },
  'btn-vd-ie-prod': { title: 'IE PRODUTOR RURAL', type: 'link', action: 'https://dfe-portal.svrs.rs.gov.br/cte/ccc?origem=2' },
  'btn-vd-bndes-fio': { title: 'BNDES FIORINO', type: 'link', action: 'https://ws.bndes.gov.br/cfi_catalogo/produto/04281040' },
  'btn-vd-bndes-str-f': { title: 'BNDES STRADA FREEDOM', type: 'link', action: 'https://ws.bndes.gov.br/cfi_catalogo/produto/04260579' },
  'btn-vd-bndes-str-e': { title: 'BNDES STRADA ENDURANCE', type: 'link', action: 'https://ws.bndes.gov.br/cfi_catalogo/produto/04263917' },

  // Itens Internos - Plataformas
  'btn-plat-nbs': { title: 'NBS GOLD', type: 'link', action: 'http://152.67.47.29:8080/crmgold/veiculo.zul' },
  'btn-plat-docusign': { title: 'DOCUSIGN', type: 'link', action: 'https://apps.docusign.com/send/home' },
  'btn-plat-auto': { title: 'AUTOAVALIAR', type: 'link', action: 'https://apps.autoavaliar.com.br/login/app' },
  'btn-plat-dugestao': { title: 'DUGESTÃO', type: 'link', action: 'https://app.dugestao.com.br/#/home' },
  'btn-plat-duleads': { title: 'DULEADS', type: 'link', action: 'https://app.duleads.com.br/#/auth' },
  'btn-plat-treina': { title: 'TREINAMENTOS FIAT', type: 'link', action: 'https://psa.csod.com/login/render.aspx?id=stellantistraining' },
  'btn-plat-linkentry': { title: 'LinkEntry', type: 'link', action: 'https://linkentry-ames.fiat.com/pages/home/' },
  'btn-plat-manuais': { title: 'Manuais do NBS', type: 'link', action: 'https://drive.google.com/drive/folders/11Oyq1zN6VKhpaDZleNjchiB-Fdp0AyPZ?usp=sharing' },
  'btn-plat-uol': { title: 'WebMail San Marino', type: 'link', action: 'https://mailpro.uol.com.br/sanmarinofiat.com.br/' },

  // Itens Internos - Cartas
  'btn-carta-fiat': { title: 'CARTA DO MÊS (Montadora)', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/cartafiat.pdf' },
  'btn-carta-banco': { title: 'CARTA DO MÊS (Banco)', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/cartabanco.pdf' },
  'btn-carta-gama': { title: 'GAMA ATUALIZADA', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/gama.pdf' },

  // Itens Internos - Seminovos
  'btn-semi-estoque': { title: 'ESTOQUE DE SEMINOVOS', type: 'link', action: 'https://sanmarinomultimarcas.com.br/seminovos/' },
  'btn-semi-repasse': { title: 'REPASSE PARA FUNCIONÁRIO', type: 'link', action: 'https://albertomateus10.github.io/termoderepassefuncionario/' },
  'btn-semi-checklist': { title: 'CHECKLIST de ENTREGA', type: 'link', action: 'https://albertomateus10.github.io/preparacaoparaentrega/' },
  'btn-semi-robo': { title: 'ROBÔ DE ANÚNCIOS', type: 'link', action: 'https://chatgpt.com/g/g-67b0af6b29708191982adcba7a5e3fb4-clique-aqui-e-crie-um-anuncio-para-o-seu-veiculo' },
  'btn-semi-qrcode': { title: 'QR CODE DE PREÇOS', type: 'link', action: 'https://amcsolucoesdigitais.github.io/qrcodecompreco/' },
  'btn-semi-aval-matriz': { title: 'AVALIAÇÃO MATRIZ', type: 'link', action: 'https://tradein.autoavaliar.com.br/group/san-marino-matriz/7508zPgjgw/0577zMjgBw?c=6775zPB' },
  'btn-semi-aval-zs': { title: 'AVALIAÇÃO ZONA SUL', type: 'link', action: 'https://tradein.autoavaliar.com.br/group/san-marino-zona-sul/7508zPgjgw/3201zdjMgPCCAC?c=6775zPB' },
  'btn-semi-aval-viam': { title: 'AVALIAÇÃO VIAMÃO', type: 'link', action: 'https://tradein.autoavaliar.com.br/group/san-marino-viamao/7508zPgjgw/3201zPjMgPCCAC?c=6775zPB' },
  'btn-semi-aval-grav': { title: 'AVALIAÇÃO GRAVATAÍ', type: 'link', action: 'https://tradein.autoavaliar.com.br/group/san-marino-gravatai/7508zPgjgw/3201zMjMgPCCAC?c=6775zPB' },
  'btn-semi-fluxo-aval': { title: 'Fluxo de Avaliação', type: 'link', action: 'https://albertomateus10.github.io/fluxodeavaliacao/' },
  'btn-semi-checklist-prep': { title: 'Check List de Preparação', type: 'link', action: 'https://albertomateus10.github.io/solicitacaodemanutencao/' },


  // Itens Internos - Gestor
  'btn-gestor-gps': { title: 'GPS (Precificação de Seminovos)', type: 'link', action: 'https://jaques-edson.github.io/painel-gps-san-marino/' },
  'btn-gestor-nbs': { title: 'NBS SHOTCUT', type: 'link', action: 'http://144.22.144.53/' },
  'btn-gestor-gestauto': { title: 'PORTAL GESTAUTO', type: 'link', action: 'https://portal.gestautobrasil.com.br/auth/login' },
  'btn-gestor-autocorp': { title: 'AUTOCORP', type: 'link', action: 'https://app.autocorp.com.br/portal/Default.aspx?ReturnUrl=%2frestrito%2fpainel-controle%2fdefault.aspx' },

  'btn-gestor-usados-vd': { title: 'USADOS VIA VD', type: 'link', action: 'https://albertomateus10.github.io/carteiravdusados/' },
  'btn-gestor-anuncio-lote': { title: 'Anúncios em Lote do AutoAvaliar', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/anuncioemlote.pdf' },
  'btn-gestor-leilao': { title: 'LEILÃO DO AUTOAVALIAR', type: 'link', action: 'https://adm.autoavaliar.com.br/index.php' },
  'btn-gestor-contrato-compra': { title: 'CONTRATO DE COMPRA DE VEÍCULOS', type: 'link', action: 'https://albertomateus10.github.io/contratodecompradeveiculos/' },
  'btn-gestor-consignacao': { title: 'CONTRATO DE CONSIGNAÇÃO', type: 'function', action: () => mostrarAvisoConstrucao('consignacao') },
  'btn-gestor-procuracao-repasse': { title: 'PROCURAÇÃO DE REPASSE', type: 'link', action: 'https://albertomateus10.github.io/procuracaoderepasse/' },
  'btn-gestor-estoque-pecas': { title: 'ESTOQUE DE PEÇAS', type: 'link', action: 'https://albertomateus10.github.io/estoquedepecas/' },
  'btn-gestor-analise-acessorios': { title: 'ANÁLISE DE ACESSÓRIOS VENDIDOS', type: 'link', action: 'https://albertomateus10.github.io/acessorios/' },
  'btn-gestor-painel-ml': { title: 'Painel Mercado Livre', type: 'link', action: 'https://admin.goparts.com.br/login' },
  'btn-gestor-auditoria-swat': { title: 'Auditoria de Garantia (Swat)', type: 'link', action: 'https://swat.aks.fcagroup.com/' },
  'btn-gestor-witech2': { title: 'Manual do WITech2', type: 'link', action: 'https://drive.google.com/file/d/1TNe6s0vzLVi2HgFJHTQlFxQU5yXVBhuT/view?usp=sharing' },
  'btn-gestor-micropod': { title: 'Software do Micropod', type: 'link', action: 'https://drive.google.com/file/d/1bFFLGyU_cGUG6D6Uh_9jT9PTiRRKG3KI/view?usp=drive_link' },

  // Itens Internos - Pós Vendas
  'btn-pos-tabela-revisoes': { title: 'Preços das Revisões e troca de óleo', type: 'link', action: 'https://albertomateus10.github.io/tabeladerevisoesfiat/' },
  'btn-pos-precos': { title: 'PREÇO DAS REVISÕES (Fiat)', type: 'link', action: 'https://albertomateus10.github.io/tabeladerevisoesfiat/' },
  'btn-pos-apoio-consultor': { title: 'APOIO AO CONSULTOR', type: 'link', action: 'https://drive.google.com/drive/folders/1dn-1v52zMjZCnBZRgHCkAdViAOBfOG2b' },
  'btn-pos-apoio-mecanico': { title: 'APOIO AO MECÂNICO', type: 'link', action: 'https://drive.google.com/drive/folders/1alytD0dOACelokORixMLNd99Ixe77han' },
  'btn-pos-ficha': { title: 'FICHA CADASTRAL', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/fichacadastralpecas.pdf' },
  'btn-pos-ml': { title: 'Loja no Mercado Livre', type: 'link', action: 'https://www.mercadolivre.com.br/loja/san-marino-297048' },
  'btn-pos-programacao-ferias': { title: 'PROGRAMAÇÃO DE FÉRIAS', type: 'link', action: 'https://drive.google.com/drive/folders/1QxnPidWcfDlXJRLto0UujbzqaFX0NFvO' },
  'btn-pos-nbs-consultor': { title: 'NBS (Consultores)', type: 'link', action: 'http://144.22.144.53/' },
  'btn-pos-nbs-parts': { title: 'NBS (CRM Parts)', type: 'link', action: 'http://152.67.47.29:8080/crmparts/app?FrmLogin' },
  'btn-pos-manual': { title: 'MANUAL DE GARANTIA', type: 'link', action: 'https://drive.google.com/file/d/1k1Q1OsH81DSLrh8GUVHE_bJaSQ2c5iOA/view?usp=sharing' },
  'btn-pos-normas': { title: 'NORMAS DA GARANTIA', type: 'link', action: 'https://drive.google.com/file/d/1TkonC-50z83f7yRd0YquwbzxnUrLm2vT/view?usp=sharing' },
  'btn-pos-linkentry': { title: 'LinkEntry', type: 'link', action: 'https://linkentry-ames.fiat.com/pages/home/' },

  // Itens Internos - RH
  'btn-rh-cartilha': { title: 'CARTILHA DE INTEGRAÇÃO', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/cartilha.pdf' },
  'btn-rh-ferias': { title: 'CARTAS DE FÉRIAS', type: 'link', action: 'https://drive.google.com/drive/folders/1sPzfiY9CRUWoITpdj0wQVnDMNx9YbIT8?usp=sharing' },
  'btn-rh-decimo': { title: 'ADIANTAMENTO DE 13º', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/adiantamentodecimo.pdf' },
  'btn-rh-ponto': { title: 'AJUSTE DE PONTO', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/ajusteponto.pdf' },
  'btn-rh-vale-refeicao': { title: 'AUTORIZAÇÃO VALE REFEIÇÃO', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/cartaova.pdf' },
  'btn-rh-vale-transporte': { title: 'AUTORIZAÇÃO VALE TRANSPORTE', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/cartaovt.pdf' },
  'btn-rh-ccg': { title: 'Centro Clínico (CCG)', type: 'link', action: 'https://www.ccgsaude.com.br/agendamento' },
  'btn-rh-unimed': { title: 'Unimed', type: 'link', action: 'https://www.unimed.coop.br/site/web/portoalegre/a-unimed/canais-de-atendimento' },

  // Itens Internos - Acessórios
  'btn-ace-geral': { title: 'CATÁLOGO GERAL', type: 'link', action: 'https://docs.google.com/spreadsheets/d/1uyfpSzx-PHvC5CxaoBhvl0UAkOWmjinl/edit?usp=sharing&ouid=111425340034181852301&rtpof=true&sd=true' },
  'btn-ace-fastback': { title: 'FASTBACK', type: 'link', action: 'https://drive.google.com/file/d/1qmTDng6uee5IfkempmkoLgt0b9ros-vY/view' },
  'btn-ace-pulse': { title: 'PULSE', type: 'link', action: 'https://drive.google.com/file/d/1pUMybKyozoucig3txwNThiVpYFnTTPks/view' },
  'btn-ace-toro': { title: 'TORO', type: 'link', action: 'https://drive.google.com/file/d/1S1X1TYLhCkPelz2BBrgWErmk1rJDzPWv/view' },
  'btn-ace-strada': { title: 'STRADA', type: 'link', action: 'https://drive.google.com/file/d/1eiWgVvv9OdyNWqKUvuXhFUWJL6XiDXIS/view' },
  'btn-ace-argo': { title: 'ARGO', type: 'link', action: 'https://drive.google.com/file/d/1zxKdhjsFpRCmPyFV1SSXvuxnuG5Pp-UD/view' },
  'btn-ace-mobi': { title: 'MOBI', type: 'link', action: 'https://drive.google.com/file/d/1c1qSc5EKP59wkuikTdVub5vy_uLlsOzj/view' },

  // Itens Internos - Links Úteis
  'btn-link-fipe': { title: 'TABELA FIPE', type: 'link', action: 'https://veiculos.fipe.org.br/' },
  'btn-link-ipva': { title: 'VALOR DE IPVA', type: 'link', action: 'https://www.sefaz.rs.gov.br/apps/ipva/principal/tabs/meus-veiculos' },
  'btn-link-detran': { title: 'SITUAÇÃO DO DETRAN', type: 'link', action: 'https://pcsdetran.rs.gov.br/login?redirectUrl=%2Fconsulta-veiculo' },
  'btn-link-mtix': { title: 'Download do Mtix', type: 'link', action: 'https://www.mtix.com.br/' },
  'btn-link-contas': { title: 'CONTAS BANCÁRIAS', type: 'link', action: 'https://albertomateus10.github.io/pdfsdomes/contasbancarias.pdf' },
  'btn-link-cnpj': { title: 'CARTÃO CNPJ', type: 'link', action: 'https://drive.google.com/drive/folders/1HIzoMcC5_ElI2OhDWsG7m_IiY4j3OXV8?usp=sharing' },
  'btn-link-wa-geral': { title: 'GERAL SAN MARINO', type: 'link', action: 'https://wa.me/555130211133' },
  'btn-link-wa-oficina': { title: 'AGENDAMENTO OFICINA', type: 'link', action: 'https://wa.me/555191896086' },
  'btn-link-wa-pecas': { title: 'SETOR DE PEÇAS', type: 'link', action: 'https://wa.me/555199415144' },
  'btn-link-wa-seguros': { title: 'VENDAS DE SEGUROS', type: 'link', action: 'https://wa.me/555199601435' },

  // Itens Internos - Textos
  'btn-txt-garantia': { title: 'TEXTO GARANTIA', type: 'function', action: () => verTextoContrato('garantia') },
  'btn-txt-sem-quitacao': { title: 'TEXTO SEM QUITAÇÃO', type: 'function', action: () => verTextoContrato('sem-quitacao-total') },
  'btn-txt-sem-quitacao-troco': { title: 'TEXTO SEM QUITAÇÃO (TROCO)', type: 'function', action: () => verTextoContrato('sem-quitacao-troco') },
  'btn-txt-com-quitacao': { title: 'TEXTO COM QUITAÇÃO', type: 'function', action: () => verTextoContrato('com-quitacao') },
  'btn-txt-com-quitacao-troco': { title: 'TEXTO COM QUITAÇÃO (TROCO)', type: 'function', action: () => verTextoContrato('com-quitacao-troco') },
  'btn-txt-acessorios': { title: 'TEXTO ACESSÓRIOS', type: 'function', action: () => verTextoContrato('acessorios') },
  'btn-txt-retirada': { title: 'TEXTO RETIRADA', type: 'function', action: () => verTextoContrato('retirada') },
  'btn-txt-consorcio': { title: 'TEXTO CONSÓRCIO', type: 'function', action: () => verTextoContrato('consorcio') },

  // Itens Internos - Checklists de Venda
  'btn-chk-avista': { title: 'CHECKLIST: A VISTA', type: 'function', action: () => mostrarAvisoConstrucao('checklist') },
  'btn-chk-financiamento': { title: 'CHECKLIST: FINANCIAMENTO', type: 'function', action: () => mostrarAvisoConstrucao('checklist') },
  'btn-chk-financiamento-usado': { title: 'CHECKLIST: FINANCIAMENTO + USADO', type: 'function', action: () => mostrarAvisoConstrucao('checklist') },
  'btn-chk-dinheiro-financiamento': { title: 'CHECKLIST: DINHEIRO + FINANCIAMENTO', type: 'function', action: () => mostrarAvisoConstrucao('checklist') },

  // Itens Internos - San Marino Online
  'btn-online-fiat': { title: 'San Marino Fiat', type: 'link', action: 'https://sanmarinofiat.com.br/' },
  'btn-online-multi': { title: 'San Marino Multimarcas', type: 'link', action: 'https://sanmarinomultimarcas.com.br/' },
  'btn-online-insta': { title: 'Instagram', type: 'link', action: 'https://www.instagram.com/sanmarinofiat/' },
  'btn-online-linked': { title: 'Linkedin', type: 'link', action: 'https://www.linkedin.com/company/san-marino-veiculos/posts/?feedView=all' },
  'btn-online-face': { title: 'Facebook', type: 'link', action: 'https://www.facebook.com/sanmarinofiat/' },
};

// Inicialização: Verificar Favoritos
window.addEventListener('DOMContentLoaded', () => {
  // Limpeza de chave antiga para evitar conflitos
  localStorage.removeItem('central_favorito');

  const favorites = getFavorites();
  // Se houver apenas um favorito e ele não for home, podemos até abrir direto, 
  // mas o usuário pediu para "aparecer dessa forma na área inicial" (cards)
  alternarSecao('home');
  updateFavoriteUI();
});

function getFavorites() {
  const stored = localStorage.getItem(LS_FAVORITE);
  if (!stored) return [];
  try { return JSON.parse(stored); } catch (e) { return []; }
}

const savedCollapsed = localStorage.getItem(LS_SIDEBAR);
if (savedCollapsed === "1") shell.classList.add("collapsed");

document.getElementById("btnSidebar").addEventListener("click", () => {
  if (window.innerWidth <= 900) {
    shell.classList.remove("comunicados-open");
    shell.classList.toggle("mobile-open");
  } else {
    shell.classList.toggle("collapsed");
    localStorage.setItem(LS_SIDEBAR, shell.classList.contains("collapsed") ? "1" : "0");
  }
});

document.getElementById("sidebar-overlay").addEventListener("click", () => {
  shell.classList.remove("mobile-open");
  shell.classList.remove("comunicados-open");
});

const btnComunicados = document.getElementById("btnComunicados");
if (btnComunicados) {
  btnComunicados.addEventListener("click", () => {
    if (window.innerWidth <= 1200) {
      shell.classList.remove("mobile-open");
      shell.classList.toggle("comunicados-open");
    } else {
      const panel = document.getElementById("comunicados-panel");
      if (panel) panel.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

/* =========================
   SUBTITLES MAP
   ========================= */
const subtitles = {
  "gerador": "clique nos links abaixo para confeccionar o documento desejado, os dados do cliente você não precisa preencher em todos os documentos, apenas uma vez",
  "": "",
  "bancos": "",
  "certidoes": "",
  "venda-direta": "",
  "plataformas": "",
  "cartas": "",
  "seminovos": "",
  "textos-contrato": "clique no botão copiar do texto desejado para utilizá-lo no contrato",
  "pos-vendas": "",
  "rh": "clique nos botões abaixo para visualizar os documentos de RH",
  "lojas": "",
  "gestor": "",
  "acessorios": "clique nos botões abaixo para visualizar o catálogo desejado",
  "links": "",

};

/* =========================
    (alternarSecao)
   ========================= */
function alternarSecao(secao) {
  if (secao === 'gestor' && !sessionStorage.getItem('gestor_unlocked')) {
    abrirModalSenhaGestor();
    return;
  }

  currentSectionId = secao;

  // 1. Esconder tudo
  const secoes = ['secao-home', 'secao-gerador', 'doc-calculadora', 'doc-contrato', 'doc-contrato-repasse', 'doc-links', 'secao-bancos',
    'secao-certidoes', 'secao-venda-direta', 'secao-plataformas', 'secao-cartas',
    'secao-seminovos', 'secao-textos-contrato', 'secao-gestor', 'secao-pos-vendas', 'secao-rh', 'secao-lojas', 'secao-acessorios', 'secao-online', 'dados-cliente-global'];
  secoes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // 2. Esconder documentos específicos e dados globais (limpar tela)
  const specificDocs = document.querySelectorAll('#docArea .doc-card, #dados-cliente-global');
  specificDocs.forEach(c => c.classList.add('hidden'));

  // 2. Atualizar Navegação (Sidebar)
  const navLinks = document.querySelectorAll('.nav a');
  navLinks.forEach(a => a.classList.remove('active'));

  const targetLink = document.getElementById('btn-' + secao);
  if (targetLink) targetLink.classList.add('active');

  // 3. Atualizar Títulos da Main
  if (pageTitle) {
    if (secao === 'home') {
      pageTitle.textContent = ""; // Removido "Início"
    } else if (targetLink) {
      pageTitle.textContent = targetLink.querySelector('span').textContent;
    }
  }
  if (pageSubtitle) {
    pageSubtitle.textContent = subtitles[secao] || "";
  }

  // 4. Mostrar Seção Alvo
  if (secao === 'home') {
    document.getElementById('secao-home').classList.remove('hidden');
  } else if (secao === 'gerador') {
    document.getElementById('secao-gerador').classList.remove('hidden');
  } else if (secao === 'calculadora') {
    document.getElementById('doc-calculadora').classList.remove('hidden');
  } else if (secao === 'links') {
    document.getElementById('doc-links').classList.remove('hidden');
  } else {
    const el = document.getElementById('secao-' + secao);
    if (el) el.classList.remove('hidden');
  }

  // 5. Botão de Favorito Global
  const btnFavGlobal = document.getElementById('btn-fav-global');
  if (btnFavGlobal) {
    if (secao === 'home') {
      btnFavGlobal.classList.add('hidden');
    } else {
      btnFavGlobal.classList.remove('hidden');
      btnFavGlobal.onclick = () => toggleFavorite(secao);
    }
  }

  updateFavoriteUI();

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Fechar menu mobile se estiver aberto
  shell.classList.remove("mobile-open");

  // Reset de busca ao trocar de seção
  if (typeof filterContent === 'function') {
    const searchContainer = document.getElementById('searchContainer');
    const btnSearch = document.getElementById('btnSearch');
    const globalSearchInput = document.getElementById('globalSearchInput');

    if (globalSearchInput.value !== '') {
      searchContainer.classList.remove('active');
      btnSearch.classList.remove('search-active');
      globalSearchInput.value = '';
      filterContent(''); 
    }
  }
}

/* =========================
    SISTEMA DE FAVORITOS
   ========================= */
function toggleFavorite(id) {
  let favorites = getFavorites();
  const index = favorites.indexOf(id);
  const meta = MODULE_METADATA[id];
  const label = meta ? meta.title : id;

  if (index > -1) {
    favorites.splice(index, 1);
    showToast(`${label} removido dos favoritos.`, 'info');
  } else {
    favorites.push(id);
    showToast(`${label} fixado na Home!`, 'success');
  }

  localStorage.setItem(LS_FAVORITE, JSON.stringify(favorites));
  updateFavoriteUI();
}

function updateFavoriteUI() {
  const favorites = getFavorites();
  
  // 1. Atualizar Estrelas (Módulos Principais e Botões Internos)
  // Seleciona tanto os .fav-btn quanto os novos .inner-fav-btn
  const allFavBtns = document.querySelectorAll('.fav-btn, .inner-fav-btn');
  
  allFavBtns.forEach(btn => {
    // Tenta pegar o ID do argumento da função toggleFavorite no onclick
    const onclickAttr = btn.getAttribute('onclick');
    if (!onclickAttr) return;
    
    const match = onclickAttr.match(/toggleFavorite\(['"](.+?)['"]\)/);
    if (match && match[1]) {
      const id = match[1];
      const isFav = favorites.includes(id);
      
      if (isFav) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fa-solid fa-star"></i>';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fa-regular fa-star"></i>';
      }
    }
  });

  // 2. Atualizar Botão Global de Título (Reflete a seção atual)
  const btnFavGlobal = document.getElementById('btn-fav-global');
  if (btnFavGlobal) {
    const isCurrentFav = favorites.includes(currentSectionId);
    if (isCurrentFav) {
      btnFavGlobal.classList.add('active');
      btnFavGlobal.innerHTML = '<i class="fa-solid fa-star"></i>';
      btnFavGlobal.style.color = "#00d4ff";
    } else {
      btnFavGlobal.classList.remove('active');
      btnFavGlobal.innerHTML = '<i class="fa-regular fa-star"></i>';
      btnFavGlobal.style.color = "";
    }
  }

  // 3. Renderizar Dashboard Dinâmico
  const dynamicGrid = document.getElementById('home-grid-dinamico');
  const homeMsg = document.getElementById('home-msg');
  
  if (dynamicGrid) {
    dynamicGrid.innerHTML = '';
    
    if (favorites.length > 0) {
      favorites.forEach(id => {
        const meta = MODULE_METADATA[id];
        if (!meta) return;

        let iconHtml = '';
        if (meta.type === 'section') {
          const sidebarBtn = document.getElementById('btn-' + id);
          if (sidebarBtn) {
            const svg = sidebarBtn.querySelector('svg');
            if (svg) iconHtml = `<div class="h-icon" style="background: var(--brand-2); margin-bottom: 5px;">${svg.outerHTML}</div>`;
          }
        } else {
          // Ícone padrão para itens internos
          const iconClass = meta.type === 'link' ? 'fa-link' : 'fa-file-lines';
          iconHtml = `<div class="h-icon" style="background: var(--accent); margin-bottom: 5px;"><i class="fa-solid ${iconClass}"></i></div>`;
        }

        let card;
        if (meta.type === 'link') {
          card = document.createElement('a');
          card.href = meta.action;
          card.target = '_blank';
          card.style.textDecoration = 'none';
          
          const originalEl = document.getElementById(id);
          if (originalEl && originalEl.hasAttribute('download')) {
            card.setAttribute('download', originalEl.getAttribute('download'));
          }
        } else {
          card = document.createElement('div');
          card.onclick = () => executarAcaoFavorito(id);
        }
        card.className = 'home-card';
        
        const formattedTitle = meta.title.replace(/\((.*?)\)/g, '<small class="muted-text">($1)</small>');

        card.innerHTML = `
          <button class="fav-btn active" onclick="event.preventDefault(); event.stopPropagation(); toggleFavorite('${id}')" title="Remover">
            <i class="fa-solid fa-star"></i>
          </button>
          ${iconHtml}
          <strong>${formattedTitle}</strong>
        `;
        dynamicGrid.appendChild(card);
      });
      if (homeMsg) homeMsg.textContent = "";
    } else {
      dynamicGrid.innerHTML = '';
      if (homeMsg) homeMsg.textContent = "Selecione os módulos ou botões internos e clique na estrela para fixá-los aqui.";
    }
  }
}

function executarAcaoFavorito(id) {
  const meta = MODULE_METADATA[id];
  if (!meta) return;

  if (meta.type === 'section') {
    alternarSecao(id);
  } else if (meta.type === 'doc') {
    let secaoPai = '';
    if (id.startsWith('btn-doc-')) secaoPai = 'gerador';
    else if (id.startsWith('btn-semi-')) secaoPai = 'seminovos';
    
    if (secaoPai) alternarSecao(secaoPai);
    abrirDocumento(meta.action);
  } else if (meta.type === 'link') {
    window.open(meta.action, '_blank');
  } else if (meta.type === 'function') {
    meta.action();
  }
}

/* =========================
    BUSCA / FILTRO
   ========================= */
const btnSearch = document.getElementById('btnSearch');
const searchContainer = document.getElementById('searchContainer');
const globalSearchInput = document.getElementById('globalSearchInput');

if (btnSearch && searchContainer && globalSearchInput) {
  btnSearch.addEventListener('click', () => {
    searchContainer.classList.toggle('active');
    btnSearch.classList.toggle('search-active');
    if (searchContainer.classList.contains('active')) {
      globalSearchInput.focus();
    } else {
      globalSearchInput.value = '';
      filterContent('');
    }
  });

  globalSearchInput.addEventListener('input', (e) => {
    filterContent(e.target.value);
  });
}

function removeAcentos(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

function filterContent(query) {
  const q = removeAcentos(query.toLowerCase().trim());
  const app = document.querySelector('.app');

  // 1. Reset Total: Limpar destaques e visibilidade de TUDO
  const searchable = document.querySelectorAll('.nav a, .cover-btn, .btn, .card, .link-section a');
  searchable.forEach(item => {
    // Restaurar texto original (usando o atributo salvo ou o innerHTML atual)
    if (!item.getAttribute('data-original-text')) {
      item.setAttribute('data-original-text', item.innerHTML);
    } else {
      item.innerHTML = item.getAttribute('data-original-text');
    }

    // Limpar cache de spans internos se houver
    const spans = item.querySelectorAll('span[data-orig], .cover-doc-pill[data-orig]');
    spans.forEach(s => {
      s.innerHTML = s.getAttribute('data-orig');
    });

    item.style.display = "";
    item.classList.remove('hidden-by-search');
    item.classList.remove('search-match');
  });

  // Resetar visibilidade dos containers principais
  const containers = document.querySelectorAll('.cover, .doc-card, .link-section, .grid-tiles, #secao-home, #secao-gerador');
  containers.forEach(c => c.classList.remove('hidden'));

  if (app) app.classList.remove('is-searching');

  // Se a busca estiver vazia, encerra o modo de busca e volta para Home
  if (q === '') {
    const searchContainer = document.getElementById('searchContainer');
    const btnSearch = document.getElementById('btnSearch');
    if (searchContainer) searchContainer.classList.remove('active');
    if (btnSearch) btnSearch.classList.remove('search-active');

    alternarSecao('home');
    return;
  }

  if (app) app.classList.add('is-searching');

  // 2. Ocultar todos os containers e itens inicialmente para filtrar
  containers.forEach(c => c.classList.add('hidden'));

  // 3. Ocultar todos os botões de ação inicialmente
  searchable.forEach(item => {
    item.style.display = "none";
    item.classList.add('hidden-by-search');
  });

  // 4. Filtrar e Mostrar matches com Destaque
  searchable.forEach(item => {
    const textNormalized = removeAcentos(item.textContent.toLowerCase());

    if (textNormalized.includes(q)) {
      item.style.display = "";
      item.classList.remove('hidden-by-search');
      item.classList.add('search-match');

      // Aplicar highlight
      const regex = new RegExp(`(${query})`, 'gi');
      const highlight = '<mark class="highlight">$1</mark>';

      // Tentar destacar preservando ícones/estrutura
      const span = item.querySelector('span');
      const pill = item.querySelector('.cover-doc-pill');

      if (span) {
        if (!span.getAttribute('data-orig')) span.setAttribute('data-orig', span.innerHTML);
        span.innerHTML = span.getAttribute('data-orig').replace(regex, highlight);
      } else if (pill) {
        if (!pill.getAttribute('data-orig')) pill.setAttribute('data-orig', pill.innerHTML);
        pill.innerHTML = pill.getAttribute('data-orig').replace(regex, highlight);
      } else {
        const originalHTML = item.getAttribute('data-original-text');
        item.innerHTML = originalHTML.replace(regex, highlight);
      }

      // Se for um botão de documento dentro de uma seção oculta, mostrar a seção e seus pais
      let current = item.parentElement;
      while (current && current.id !== 'shell') {
        if (current.classList.contains('hidden')) current.classList.remove('hidden');
        current = current.parentElement;
      }
    }
  });

  // Caso especial para o Gerador e Dados Globais
  const gerador = document.getElementById('secao-gerador');
  const dadosGlobais = document.getElementById('dados-cliente-global');
  if (gerador) {
    const temResultNoGerador = Array.from(gerador.querySelectorAll('.cover-btn'))
      .some(el => el.style.display !== "none");
    if (!temResultNoGerador) {
      gerador.classList.add('hidden');
      if (dadosGlobais) dadosGlobais.classList.add('hidden');
    } else {
      gerador.classList.remove('hidden');
      if (dadosGlobais) dadosGlobais.classList.remove('hidden');
    }
  }
}


/* =========================
   FAVORITOS (Placeholder)
   ========================= */


async function copiarLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copiado para o WhatsApp!', 'success');
  } catch (err) {
    showToast('Erro ao copiar link.', 'error');
  }
}

function abrirDocumento(docId) {
  // 1. Remove classe ACTIVE de todos os botões da capa
  const coverBtns = document.querySelectorAll('.cover-btn');
  coverBtns.forEach(btn => btn.classList.remove('active'));

  // 2. Adiciona classe ACTIVE no botão correspondente
  const btnIdMap = {
    'doc-recebimento': 'btn-doc-recebimento',
    'doc-acordo': 'btn-doc-acordo',
    'doc-instrumento': 'btn-doc-instrumento',
    'doc-quitacao': 'btn-doc-quitacao',
    'doc-residencia': 'btn-doc-residencia',
    'doc-deposito': 'btn-doc-deposito',
    'doc-orcamento': 'btn-doc-orcamento',
    'doc-contrato': 'btn-doc-contrato',
    'doc-contrato-repasse': 'btn-doc-contrato-repasse'
  };

  if (btnIdMap[docId]) {
    const btn = document.getElementById(btnIdMap[docId]);
    if (btn) btn.classList.add('active');
  }

  // Esconder apenas os cards de documentos
  // Esconder apenas os cards de documentos (formulários e dados globais)
  // Mas NÃO esconder o card que contém os botões de seleção no topo
  const cards = document.querySelectorAll('.doc-card');
  cards.forEach(c => {
    // Se o card não tiver ID (é o card de botões) ou for calculadora/links, não esconde
    if (c.id && c.id !== 'doc-calculadora' && c.id !== 'doc-links') {
      c.classList.add('hidden');
    }
  });

  const el = document.getElementById(docId);
  if (el) {
    el.classList.remove('hidden');
    // Mostrar dados do cliente se for um documento do gerador
    const geradorDocs = ['doc-recebimento', 'doc-acordo', 'doc-instrumento', 'doc-quitacao', 'doc-residencia', 'doc-deposito', 'doc-orcamento'];
    if (geradorDocs.includes(docId)) {
      document.getElementById('dados-cliente-global').classList.remove('hidden');
      document.getElementById('dados-cliente-global').style.marginTop = "30px";
    }

    // Scroll suave para o início do formulário, mantendo um pouco dos botões visíveis
    const topOffset = el.getBoundingClientRect().top + window.pageYOffset - 150;
    window.scrollTo({ top: topOffset, behavior: 'smooth' });

    // No mobile, fechar o menu ao abrir um documento (caso tenha sido navegação via busca ou atalho)
    shell.classList.remove("mobile-open");
  }

  // Se abrir o card de contrato, inicializar com o texto da Garantia em Dobro
  if (docId === 'doc-contrato') {
    const textarea = document.getElementById('texto-contratual');
    if (textarea) textarea.value = textoTradicional;
  }
}

/* =========================
   TEXTO CONTRATUAL
   ========================= */
const textoTradicional = `Garantia em Dobro:
O Código de Defesa do Consumidor (Lei 8078/90), em seu artigo 26, inciso II, estabelece que o consumidor tem direito a reclamar pelos vícios aparentes ou de fácil constatação por: "noventa dias, tratando-se de fornecimento de serviço e de produtos duráveis". Nesse caso, pela aquisição do seu veículo, a San Marino, em caráter promocional e temporário, está concedendo GARANTIA EM DOBRO,  estendendo o prazo definido na lei por 90 dias adicionais, totalizando 180 dias,  para o veículo objeto deste contrato. A extensão do prazo adicional fica limitada a 180 dias ou 8.000 km, considerando-se a quilometragem registrada no contrato ou na nota fiscal, valendo a condição que ocorrer primeiro. As condições de extensão do prazo de reclamação, desde o dia 91 até o dia 180 ou até o limite de quilometragem (8.000 km), abrangem, única e exclusivamente, eventos  no motor e na caixa de câmbio que não tenham sido constatados, de forma fácil e aparente, na retirada do veículo, excluindo-se, ainda, defeitos provocados pelo mau uso do veículo.`;

async function copiarTextoContratual() {
  const textarea = document.getElementById('texto-contratual');
  try {
    await navigator.clipboard.writeText(textarea.value);
    showToast('Texto copiado com sucesso!', 'success');
  } catch (err) {
    showToast('Erro ao copiar texto. Tente novamente.', 'error');
  }
}

async function copiarTextoPersonalizado(btn) {
  const card = btn.closest('.text-block-card, .text-block-sub');
  const text = card.querySelector('.text-block-content').innerText.trim();
  try {
    await navigator.clipboard.writeText(text);
    showToast('Texto copiado para a área de transferência!', 'success');
  } catch (err) {
    showToast('Erro ao copiar texto.', 'error');
  }
}

function toggleTextCard(header) {
  const card = header.closest('.text-block-card');
  const content = card.querySelector('.text-block-content-wrapper');
  const icon = header.querySelector('.toggle-icon');
  
  if (content.classList.contains('active')) {
    content.classList.remove('active');
    icon.classList.remove('fa-chevron-up');
    icon.classList.add('fa-chevron-down');
  } else {
    // Fechar outros se quiser comportamento de acordeão único
    // document.querySelectorAll('.text-block-content-wrapper.active').forEach(el => {
    //   el.classList.remove('active');
    //   const h = el.closest('.text-block-card').querySelector('.toggle-icon');
    //   h.classList.remove('fa-chevron-up');
    //   h.classList.add('fa-chevron-down');
    // });

    content.classList.add('active');
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-up');
  }
}

/* =========================
   UI
   ========================= */
// Toast Notification System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = '';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
  else if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
  else if (type === 'info') icon = '<i class="fa-solid fa-circle-info"></i>';

  toast.innerHTML = `
        ${icon}
        <span style="flex: 1;">${message}</span>
        <i class="fa-solid fa-xmark" style="font-size: 14px; opacity: 0.5; cursor: pointer;"></i>
      `;

  container.appendChild(toast);

  const removeToast = () => {
    toast.classList.add('toast-exiting');
    setTimeout(() => toast.remove(), 400);
  };

  const autoRemove = setTimeout(removeToast, 5000);

  toast.onclick = () => {
    clearTimeout(autoRemove);
    removeToast();
  };
}

/* =========================
   Máscaras (DATA e HORA)
   ========================= */
function applyDateMask(el) {
  if (!el) return;
  el.addEventListener('input', () => {
    let v = (el.value || '').replace(/\D/g, '').slice(0, 8); // ddmmyyyy
    if (v.length >= 5) {
      el.value = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
    } else if (v.length >= 3) {
      el.value = v.slice(0, 2) + '/' + v.slice(2);
    } else {
      el.value = v;
    }
  });
}

function applyTimeMask(el) {
  if (!el) return;
  el.addEventListener('input', () => {
    let v = (el.value || '').replace(/\D/g, '').slice(0, 4); // hhmm
    if (v.length >= 3) {
      el.value = v.slice(0, 2) + ':' + v.slice(2);
    } else {
      el.value = v;
    }
  });
}


/* =========================
   Máscara ANO/MODELO (AAAA/AAAA)
   ========================= */
function applyAnoModeloMask(el) {
  if (!el) return;
  el.addEventListener('input', () => {
    // Mantém somente números e limita em 8 dígitos (AAAAMMMM)
    let v = (el.value || '').replace(/\D/g, '').slice(0, 8);

    // Insere a barra após o 4º dígito
    if (v.length >= 5) {
      el.value = v.slice(0, 4) + '/' + v.slice(4);
    } else {
      el.value = v;
    }
  });
}

/* =========================
   Formatação moeda BRL
   ========================= */
function normalizeToAscii(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseCurrencyToNumberBR(value) {
  const v = (value || '').toString().trim();
  if (!v) return NaN;

  let s = v.replace(/R\$\s?/gi, '').replace(/\s/g, '');
  s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function formatBRL(n) {
  if (!Number.isFinite(n)) return '';
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  return formatted.replace(/\u00A0/g, ' ');
}

function attachCurrencyBehavior(el) {
  if (!el) return;
  el.addEventListener('blur', () => {
    const value = el.innerText !== undefined ? el.innerText : el.value;
    const n = parseCurrencyToNumberBR(value);
    if (Number.isFinite(n)) {
      const formatted = formatBRL(n);
      if (el.innerText !== undefined) el.innerText = formatted;
      else el.value = formatted;
    }
  });
}

/* =========================
   Helpers de dados
   ========================= */
function formatarAnoModelo(s) {
  if (!s) return s;
  if (!s.includes('/')) return s;
  const [a1, a2] = s.split('/');
  return (a1.trim().length === 2 ? '20' + a1.trim() : a1.trim()) + '/' + (a2.trim().length === 2 ? '20' + a2.trim() : a2.trim());
}

function upperOr(v, fallback) {
  const t = (v || '').trim();
  return t ? t.toUpperCase() : (fallback || '');
}

function sanitizeForFilename(str) {
  const s = normalizeToAscii((str || '').trim()).toUpperCase();
  const cleaned = s.replace(/[^A-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'SEM_DADO';
}

function nomeCurtoParaArquivo(nomeCompleto) {
  const n = normalizeToAscii((nomeCompleto || '').trim());
  if (!n) return 'CLIENTE';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  return parts[0] + '_' + parts[parts.length - 1];
}

function buildFilename(prefix, placa, nomeCompleto) {
  const p = sanitizeForFilename(placa || 'SEM_PLACA');
  const n = sanitizeForFilename(nomeCurtoParaArquivo(nomeCompleto));
  const pre = sanitizeForFilename(prefix);
  return `${pre}_${p}_${n}.pdf`;
}

/* =========================
   Coleta de dados (INDIVIDUAL)
   ========================= */
function obterDadosAcordo() {
  return {
    nomeCompleto: document.getElementById('acordo_nomeCompleto').value.trim(),
    cpfCnpj: document.getElementById('acordo_cpfCnpj').value.trim(),
    endereco: document.getElementById('acordo_endereco').value.trim(),
    bairro: document.getElementById('acordo_bairro').value.trim(),
    cep: document.getElementById('acordo_cep').value.trim(),
    cidade: document.getElementById('acordo_cidade').value.trim(),
    estado: document.getElementById('acordo_estado').value.trim(),

    modelo: document.getElementById('acordo_modelo').value.trim(),
    placa: document.getElementById('acordo_placa').value.trim(),
    anoModelo: document.getElementById('acordo_anoModelo').value.trim(),
    chassi: document.getElementById('acordo_chassi').value.trim(),
    cor: document.getElementById('acordo_cor').value.trim()
  };
}

function obterDadosRecebimento() {
  return {
    nomeCompleto: document.getElementById('rec_nomeCompleto').value.trim(),
    cpfCnpj: document.getElementById('rec_cpfCnpj').value.trim(),
    endereco: document.getElementById('rec_endereco').value.trim(),
    bairro: document.getElementById('rec_bairro').value.trim(),
    cidade: document.getElementById('rec_cidade').value.trim(),
    estado: document.getElementById('rec_estado').value.trim(),

    modelo: document.getElementById('rec_modelo').value.trim(),
    placa: document.getElementById('rec_placa').value.trim(),
    anoModelo: document.getElementById('rec_anoModelo').value.trim(),
    chassi: document.getElementById('rec_chassi').value.trim(),
    cor: document.getElementById('rec_cor').value.trim()
  };
}

function obterDadosResidencia() {
  return {
    nomeCompleto: document.getElementById('res_nomeCompleto').value.trim(),
    cpfCnpj: document.getElementById('res_cpfCnpj').value.trim(),
    endereco: document.getElementById('res_endereco').value.trim(),
    bairro: document.getElementById('res_bairro').value.trim(),
    cidade: document.getElementById('res_cidade').value.trim(),
    estado: document.getElementById('res_estado').value.trim()
  };
}

function obterDadosDepositoTerceiros() {
  return {
    nomeCompleto: document.getElementById('dep_nomeCompleto').value.trim(),
    cpfCnpj: document.getElementById('dep_cpfCnpj').value.trim(),
    rg: (document.getElementById('dep_rg')?.value || '').trim(),

    valor: document.getElementById('dep_valor').value.trim(),
    valorExtenso: document.getElementById('dep_valorExtenso').value.trim(),
    dataDeposito: document.getElementById('dep_dataDeposito').value.trim(),

    banco: document.getElementById('dep_banco').value.trim(),
    agencia: document.getElementById('dep_agencia').value.trim(),
    conta: document.getElementById('dep_conta').value.trim(),

    chassiPlaca: document.getElementById('dep_chassiPlaca').value.trim(),
    faturadoNome: document.getElementById('dep_faturadoNome').value.trim(),
    faturadoCpfCnpj: document.getElementById('dep_faturadoCpfCnpj').value.trim(),

    cidade: document.getElementById('dep_cidade').value.trim(),
    dia: document.getElementById('dep_dia').value.trim(),
    mesExtenso: document.getElementById('dep_mesExtenso').value.trim(),
    ano: document.getElementById('dep_ano').value.trim()
  };
}

function obterDadosInstrumento() {
  return {
    nomeCompleto: document.getElementById('inst_nomeCompleto').value.trim(),
    cpfCnpj: document.getElementById('inst_cpfCnpj').value.trim(),
    cidade: document.getElementById('inst_cidade').value.trim(),
    placa: document.getElementById('inst_placa').value.trim(),

    modelo: document.getElementById('inst_modelo').value.trim(),
    chassi: document.getElementById('inst_chassi').value.trim(),

    dataEntrega: document.getElementById('inst_dataEntrega').value.trim(),
    horaEntrega: document.getElementById('inst_horaEntrega').value.trim()
  };
}

function obterDadosQuitacao() {
  return {
    nomeCompleto: document.getElementById('quit_nomeCompleto').value.trim(),
    cpfCnpj: document.getElementById('quit_cpfCnpj').value.trim(),
    cidade: document.getElementById('quit_cidade').value.trim(),

    modelo: document.getElementById('quit_modelo').value.trim(),
    anoModelo: document.getElementById('quit_anoModelo').value.trim(),
    placa: document.getElementById('quit_placa').value.trim(),
    chassi: document.getElementById('quit_chassi').value.trim(),
    cor: document.getElementById('quit_cor').value.trim(),

    cedenteNome: document.getElementById('quit_cedenteNome').value.trim(),
    cedenteCpfCnpj: document.getElementById('quit_cedenteCpfCnpj').value.trim(),
    cedenteEndereco: document.getElementById('quit_cedenteEndereco').value.trim(),
    cedenteNumero: document.getElementById('quit_cedenteNumero').value.trim(),

    veiculoAdquiridoModelo: document.getElementById('quit_veiculoAdquiridoModelo').value.trim(),
    veiculoAdquiridoAnoModelo: document.getElementById('quit_veiculoAdquiridoAnoModelo').value.trim(),
    veiculoAdquiridoCor: document.getElementById('quit_veiculoAdquiridoCor').value.trim(),
    veiculoAdquiridoChassi: document.getElementById('quit_veiculoAdquiridoChassi').value.trim(),
    contratoNumero: document.getElementById('quit_contratoNumero').value.trim(),
    valorQuitacao: document.getElementById('quit_valorQuitacao').value.trim()
  };
}

/* =========================
   Padronização do PDF (A4)
   ========================= */
const PDF_LAYOUT = {
  pageWidth: 210,
  pageHeight: 297,
  marginLeft: 25,
  marginRight: 25,
  marginTop: 65,
  marginBottom: 25,
  firstLineIndent: 10,
  paragraphGap: 6
};

// ==============================
// Logomarca da San Marino
//
// Esta constante armazena a imagem da logo em formato
// base64 (data URI). Ela é utilizada para adicionar a logo
// no canto superior esquerdo de todos os PDFs gerados.
// A imagem original foi redimensionada para reduzir o
// tamanho do arquivo incorporado.
const SAN_MARINO_LOGO = 'data:image/jpeg;base64,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';

function createDocA4() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setLineHeightFactor(1.6);
  // Insere a logomarca da San Marino no canto superior esquerdo
  // Aumentado para 60mm de largura e 43mm de altura
  doc.addImage(SAN_MARINO_LOGO, 'JPEG', PDF_LAYOUT.marginLeft, 5, 60, 43);
  return doc;
}

function addWatermark(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    const text = 'Central de Apoio';
    const x = PDF_LAYOUT.pageWidth - 10;
    const y = PDF_LAYOUT.pageHeight - 8;
    doc.text(text, x, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }
}

function contentWidth() {
  return PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginLeft - PDF_LAYOUT.marginRight;
}

function ensureSpace(doc, y, needed) {
  const bottomLimit = PDF_LAYOUT.pageHeight - PDF_LAYOUT.marginBottom;
  if (y + needed > bottomLimit) {
    doc.addPage();
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.setLineHeightFactor(1.6);
    return PDF_LAYOUT.marginTop;
  }
  return y;
}

function addTitle(doc, title, subtitle, opts) {
  const options = opts || {};
  const titleSize = options.titleSize || 14;
  const subtitleSize = options.subtitleSize || 12;
  const gapAfter = options.gapAfter ?? 10;

  let y = PDF_LAYOUT.marginTop;
  const centerX = PDF_LAYOUT.pageWidth / 2;

  doc.setFont('times', 'bold');
  doc.setFontSize(titleSize);
  doc.text(String(title || '').toUpperCase(), centerX, y, { align: 'center' });
  y += 7;

  if (subtitle) {
    doc.setFontSize(subtitleSize);
    const sub = String(subtitle || '').toUpperCase();
    const lines = doc.splitTextToSize(sub, contentWidth());
    doc.text(lines, centerX, y, { align: 'center' });
    y += (lines.length * 6) + 4;
  } else {
    y += 6;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setLineHeightFactor(1.6);

  return y + gapAfter;
}

function addLocalDataLinha(doc, y, cidade) {
  y = ensureSpace(doc, y, 18);
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.text(`${upperOr(cidade, '____________________')}, ____ de ____________________ de ________.`, PDF_LAYOUT.pageWidth / 2, y, { align: 'center' });
  return y + 15;
}

function addAssinaturaSimples(doc, y, label) {
  y = ensureSpace(doc, y, 28);
  const center = PDF_LAYOUT.pageWidth / 2;
  doc.line(center - 55, y, center + 55, y);
  y += 6;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(label || 'Assinatura', center, y, { align: 'center' });
  return y + 8;
}

function addAssinaturasDuplas(doc, y, leftLabel, rightLabel) {
  y = ensureSpace(doc, y, 35);
  doc.line(PDF_LAYOUT.marginLeft, y, PDF_LAYOUT.marginLeft + 70, y);
  doc.line(PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginRight - 70, y, PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginRight, y);
  y += 6;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(leftLabel || 'Assinatura', PDF_LAYOUT.marginLeft + 35, y, { align: 'center' });
  doc.text(rightLabel || 'Assinatura', PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginRight - 35, y, { align: 'center' });
  return y + 10;
}

/* =========================
   Texto justificado (normal)
   ========================= */
function drawJustifiedParagraph(doc, text, x, y, maxWidth, indentFirstLineMm) {
  const raw = (text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return y;

  const indent = Math.max(0, indentFirstLineMm || 0);

  const words = raw.split(' ').filter(Boolean).map(t => ({ text: t }));
  const baseSpaceWidth = doc.getTextWidth(' ');
  const lineHeight = doc.getTextDimensions('Mg').h * doc.getLineHeightFactor();

  function buildLines(targetWidthFirst, targetWidthOther) {
    const lines = [];
    let current = [];
    let isFirstLine = true;

    function lineWidth(ws) {
      let total = 0;
      for (let i = 0; i < ws.length; i++) {
        total += doc.getTextWidth(ws[i].text);
        if (i < ws.length - 1) total += baseSpaceWidth;
      }
      return total;
    }

    for (const w of words) {
      const targetW = isFirstLine ? targetWidthFirst : targetWidthOther;

      if (current.length === 0) {
        current.push(w);
        continue;
      }

      const tentative = current.concat([w]);
      const total = lineWidth(tentative);

      if (total > targetW) {
        lines.push({ words: current, isFirstLine });
        current = [w];
        isFirstLine = false;
      } else {
        current = tentative;
      }
    }
    if (current.length) lines.push({ words: current, isFirstLine });
    return lines;
  }

  const lines = buildLines(maxWidth - indent, maxWidth);

  for (let li = 0; li < lines.length; li++) {
    const { words: lineWords, isFirstLine } = lines[li];
    const isLastLine = (li === lines.length - 1);

    const targetW = isFirstLine ? (maxWidth - indent) : maxWidth;
    const startX = isFirstLine ? (x + indent) : x;

    let wordsOnlyWidth = 0;
    for (const w of lineWords) wordsOnlyWidth += doc.getTextWidth(w.text);

    const numSpaces = Math.max(0, lineWords.length - 1);

    let extraPerSpace = 0;
    if (!isLastLine && numSpaces > 0) {
      const baseLineWidth = wordsOnlyWidth + (numSpaces * baseSpaceWidth);
      const extra = targetW - baseLineWidth;
      extraPerSpace = extra > 0 ? (extra / numSpaces) : 0;
    }

    let cx = startX;
    for (let wi = 0; wi < lineWords.length; wi++) {
      const w = lineWords[wi];
      doc.text(w.text, cx, y);
      cx += doc.getTextWidth(w.text);
      if (wi < lineWords.length - 1) cx += baseSpaceWidth + extraPerSpace;
    }

    y += lineHeight;
    y = ensureSpace(doc, y, lineHeight + 2);
  }

  return y;
}

/* =========================
   Texto justificado com negrito (segmentos)
   ========================= */
function desenharParagrafoJustificadoComNegrito(doc, segments, x, y, maxWidth, indentFirstLineMm) {
  const indent = Math.max(0, indentFirstLineMm || 0);

  const words = [];
  for (const seg of segments) {
    const style = seg.style === 'bold' ? 'bold' : 'normal';
    const parts = (seg.text || '').trim().split(/\s+/).filter(Boolean);
    for (const p of parts) words.push({ text: p, style });
  }

  const baseSpaceWidth = doc.getTextWidth(' ');
  const lineHeight = doc.getTextDimensions('Mg').h * doc.getLineHeightFactor();

  function wordWidth(w) {
    doc.setFont('times', w.style);
    return doc.getTextWidth(w.text);
  }

  function lineWidth(ws) {
    let total = 0;
    for (let i = 0; i < ws.length; i++) {
      total += ws[i]._w;
      if (i < ws.length - 1) total += baseSpaceWidth;
    }
    return total;
  }

  const lines = [];
  let current = [];
  let isFirstLine = true;

  for (const w of words) {
    const wW = wordWidth(w);
    const ww = { ...w, _w: wW };
    const targetW = isFirstLine ? (maxWidth - indent) : maxWidth;

    if (current.length === 0) {
      current.push(ww);
      continue;
    }

    const tentative = current.concat([ww]);
    const total = lineWidth(tentative);

    if (total > targetW) {
      lines.push({ words: current, isFirstLine });
      current = [ww];
      isFirstLine = false;
    } else {
      current = tentative;
    }
  }
  if (current.length) lines.push({ words: current, isFirstLine });

  for (let li = 0; li < lines.length; li++) {
    const { words: lineWords, isFirstLine } = lines[li];
    const isLastLine = (li === lines.length - 1);

    const targetW = isFirstLine ? (maxWidth - indent) : maxWidth;
    const startX = isFirstLine ? (x + indent) : x;

    let wordsOnlyWidth = 0;
    for (const w of lineWords) wordsOnlyWidth += w._w;

    const numSpaces = Math.max(0, lineWords.length - 1);

    let extraPerSpace = 0;
    if (!isLastLine && numSpaces > 0) {
      const baseLineWidth = wordsOnlyWidth + (numSpaces * baseSpaceWidth);
      const extra = targetW - baseLineWidth;
      extraPerSpace = extra > 0 ? (extra / numSpaces) : 0;
    }

    let cx = startX;
    for (let wi = 0; wi < lineWords.length; wi++) {
      const w = lineWords[wi];
      doc.setFont('times', w.style);
      doc.text(w.text, cx, y);
      cx += w._w;
      if (wi < lineWords.length - 1) cx += baseSpaceWidth + extraPerSpace;
    }

    doc.setFont('times', 'normal');

    y += lineHeight;
    y = ensureSpace(doc, y, lineHeight + 2);
  }

  return y;
}

/* =========================
   Documentos
   ========================= */
function gerarProcuracaoAcordo() {
  const dados = obterDadosAcordo();

  if (!dados.nomeCompleto || !dados.cpfCnpj || !dados.placa || !dados.chassi) {
    showToast('Para a Procuração de Acordo, todos os campos do veículo (Placa e Chassi) e do cliente são obrigatórios.', 'error');
    return;
  }

  if (dados.chassi && dados.chassi.length !== 17) {
    validations['acordo_chassi']();
    showToast('O campo Chassi deve ter exatamente 17 caracteres.', 'error');
    return;
  }


  const doc = createDocA4();
  const x = PDF_LAYOUT.marginLeft;
  const w = contentWidth();

  let {
    nomeCompleto, cpfCnpj, endereco, bairro, cep, cidade, estado,
    modelo, placa, anoModelo, chassi, cor
  } = dados;

  anoModelo = formatarAnoModelo(anoModelo);

  let y = addTitle(doc, 'Procuração', null);

  // Ajuste para caber em uma página: fonte 11 e espaçamento menor entre linhas
  doc.setFontSize(11);
  doc.setLineHeightFactor(1.35);

  const p1 = `Por este instrumento particular de procuração, ${upperOr(nomeCompleto, '')}, CPF/CNPJ: ${cpfCnpj}, ENDEREÇO: ${upperOr(endereco, 'NÃO INFORMADO')}, BAIRRO: ${upperOr(bairro, 'NÃO INFORMADO')}, CEP: ${cep || 'NÃO INFORMADO'}, CIDADE: ${upperOr(cidade, 'NÃO INFORMADO')}, ESTADO: ${upperOr(estado, 'NÃO INFORMADO')}.`;
  y = drawJustifiedParagraph(doc, p1, x, y, w, PDF_LAYOUT.firstLineIndent);
  y += PDF_LAYOUT.paragraphGap;

  const segmentosT2 = [
    { style: 'normal', text: 'Dados pelos quais responsabilizo-me civil e criminalmente, nomeio e constituo meu bastante procurador:' },
    { style: 'bold', text: 'Rafael Pickrodt de Castro' },
    { style: 'normal', text: ', portador do CPF: 030.571.800-27 e RG: 2090921905, domiciliado na Rua Alexio Fagherazzi Nº37, na cidade de Porto Alegre; e/ou' },
    { style: 'bold', text: 'Ramiro Ilha' },
    { style: 'normal', text: ', portador do CPF: 375.722.450-72 e RG: 9021949971, domiciliado na Rua Dr. Voltaire Pires, 430 / 1, na cidade de Porto Alegre; e/ou' },
    { style: 'bold', text: 'Alessandra de Souza Santos' },
    { style: 'normal', text: ', portadora do CPF: 971.624.000-78 e RG: 1077846771, domiciliada na Rua Eloema de Oliveira Barcelos, 446, na cidade de Porto Alegre; para os fins específicos de “assinar a GRT – Guia de Responsabilidade Técnica” e também o “de acordo” na compra do veículo descrito abaixo, bem como assinar outros requerimentos, junto ao DETRAN/RS, com a finalidade de proceder com a realização de emplacamento/transferência do veículo objeto deste documento:' }
  ];

  y = ensureSpace(doc, y, 12);
  y = desenharParagrafoJustificadoComNegrito(doc, segmentosT2, x, y, w, PDF_LAYOUT.firstLineIndent);
  y += PDF_LAYOUT.paragraphGap + 2;

  y = ensureSpace(doc, y, 50);
  doc.setFont('times', 'bold');
  doc.text(`MODELO DO VEÍCULO: ${upperOr(modelo, 'NÃO INFORMADO')}`, x, y); y += 6;
  doc.text(`PLACA: ${upperOr(placa, 'SEM PLACA')}`, x, y); y += 6;
  doc.text(`ANO/MODELO: ${anoModelo || 'NÃO INFORMADO'}`, x, y); y += 6;
  doc.text(`CHASSI: ${upperOr(chassi, 'NÃO INFORMADO')}`, x, y); y += 6;
  doc.text(`COR: ${upperOr(cor, 'NÃO INFORMADO')}`, x, y); y += 25;
  doc.setFont('times', 'normal');

  y = addLocalDataLinha(doc, y, cidade);
  y = addAssinaturaSimples(doc, y, '(Assinatura reconhecida por autenticidade)');

  addWatermark(doc);
  doc.save(buildFilename('PROCURACAO_ACORDO', placa, nomeCompleto));
  showToast('PDF da Procuração de Acordo gerado com sucesso!', 'success');
}

function gerarProcuracaoRecebimento() {
  const dados = obterDadosRecebimento();

  if (!dados.nomeCompleto || !dados.placa || !dados.chassi) {
    showToast('Para a Procuração de Recebimento, o nome do cliente, a placa e o chassi do veículo são obrigatórios.', 'error');
    return;
  }

  if (dados.chassi && dados.chassi.length !== 17) {
    validations['rec_chassi']();
    showToast('O campo Chassi deve ter exatamente 17 caracteres.', 'error');
    return;
  }

  // ======== FORMATAÇÃO (COPIADA DO ANTIGO) PARA CABER EM 1 PÁGINA ========
  const doc = createDocA4();

  let {
    nomeCompleto, cpfCnpj, endereco, bairro, cidade, estado,
    modelo, placa, anoModelo, chassi, cor
  } = dados;

  anoModelo = formatarAnoModelo(anoModelo);

  // Título
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text('PROCURAÇÃO DE RECEBIMENTO DO USADO', PDF_LAYOUT.pageWidth / 2, PDF_LAYOUT.marginTop - 15, { align: 'center' });

  // Corpo (compacto)
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setLineHeightFactor(1.3);

  const m = 20, w = 170;
  let y = PDF_LAYOUT.marginTop + 10;

  // Outorgante
  const outorgante = `Outorgante: ${upperOr(nomeCompleto, 'NÃO INFORMADO')} inscrito no CPF/CNPJ sob o nº ${cpfCnpj || 'NÃO INFORMADO'} com endereço: ${upperOr(endereco, 'NÃO INFORMADO')} Bairro: ${upperOr(bairro, 'NÃO INFORMADO')} na cidade de ${upperOr(cidade, 'NÃO INFORMADO')} Estado: ${upperOr(estado, 'NÃO INFORMADO')}.`;
  doc.text(outorgante, m, y, { maxWidth: w, align: 'justify' });
  y += doc.getTextDimensions(outorgante, { maxWidth: w }).h + 4;

  // Outorgado
  const outorgado = 'Outorgado: San Marino Veículos Ltda., situada na Av. Ipiranga, 7110, Bairro Jardim Botânico, na cidade Porto Alegre, Estado Rio Grande do Sul, inscrita no CNPJ sob n.º 90.446.618/0001-72 e inscrição estadual n.º 0960799613.';
  doc.text(outorgado, m, y, { maxWidth: w, align: 'justify' });
  y += doc.getTextDimensions(outorgado, { maxWidth: w }).h + 6;

  // Objeto
  doc.text('Objeto: O objeto desta procuração é o veículo abaixo descrito:', m, y);
  y += 9;

  // Dados do veículo
  doc.setFont('times', 'bold');
  doc.text(`MODELO DO VEÍCULO: ${upperOr(modelo, 'NÃO INFORMADO')}`, m, y); y += 6;
  doc.text(`PLACA: ${upperOr(placa, 'SEM PLACA')}`, m, y); y += 6;
  doc.text(`ANO/MODELO: ${anoModelo || 'NÃO INFORMADO'}`, m, y); y += 6;
  doc.text(`CHASSI: ${upperOr(chassi, 'NÃO INFORMADO')}`, m, y); y += 6;
  doc.text(`COR: ${upperOr(cor, 'NÃO INFORMADO')}`, m, y); y += 10;

  doc.setFont('times', 'normal');

  // Poderes
  const poderes = 'Poderes: O Outorgante, nomeia e constitui seu procurador, o OUTORGADO, para o fim especial de:';
  doc.text(poderes, m, y, { maxWidth: w });
  y += doc.getTextDimensions(poderes, { maxWidth: w }).h + 6;

  const itens = [
    'a) permutar, vender sem prestar contas e a quem melhor interessar, fazer dação em pagamento, aceitar e instituir cláusulas seguidas das demais formalidades relativas a venda do veículo de propriedade do outorgante, acima descrito;',
    'b) receber valores, no todo ou em parcelas, dar e receber quitação, ceder e transigir, desistir, firmar acordo ou compromisso;',
    'c) requerer documentos e/ou informações perante repartições e registros públicos;',
    'd) efetuar qualquer espécie de procedimento ou de processo administrativo relativo ao veículo junto à Divisão de Trânsito;',
    'e) proceder a liquidação das despesas do mesmo no que se refere às multas, transferência de propriedade tanto para terceiro quanto em favor do outorgado;',
    'f) o outorgante, nos casos em que o veículo estiver pendente de quitação na modalidade de leasing junto a instituição financeira, concede os poderes especiais para o outorgado assinar e representa-lo como comprador perante a esta instituição financeira e ao Detran e, posteriormente, na qualidade de vendedor a quem ao outorgado interessar;',
    'g) solicitar e retirar segunda via de CRV e CRLV junto à Divisão de Trânsito;',
    'h) em relação as multas e/ou outras pendências que envolvam valores anteriores à data da venda do veículo para o outorgado, o outorgado resguarda-se o direito de efetuar os devidos pagamentos e proceder com a cobrança em relação ao outorgante, de forma administrativa e/ou judicial;',
    'i) para os atos posteriores e de interesse exclusivo do outorgado, o mesmo compromete-se a assumir todos os encargos daí decorrentes;',
    'j) por fim, o outorgado poderá praticar os atos, por mais especiais que sejam, que se façam necessários ou úteis ao fiel desempenho deste mandato.'
  ];

  // Itens (mais compactos, como no ANTIGO)
  doc.setFontSize(9);
  for (const item of itens) {
    doc.text(item, m, y, { maxWidth: w, align: 'justify' });
    y += doc.getTextDimensions(item, { maxWidth: w }).h + 2;
  }

  // Local/Data + assinatura (sem quebra de página)
  y += 8;
  doc.setFontSize(10);
  doc.text('CIDADE: ____________________, ESTADO: ____, ____ de __________ de ________.', PDF_LAYOUT.pageWidth / 2, y, { align: 'center' });
  y += 22;

  doc.line(70, y, 140, y);
  y += 5;
  doc.text('Outorgante', PDF_LAYOUT.pageWidth / 2, y, { align: 'center' });

  addWatermark(doc);
  doc.save(buildFilename('PROCURACAO_RECEBIMENTO', placa, nomeCompleto));
  showToast('PDF da Procuração de Recebimento gerado com sucesso!', 'success');
}

function gerarDeclaracaoResidencia() {
  const dados = obterDadosResidencia();

  if (!dados.nomeCompleto || !dados.cpfCnpj || !dados.endereco) {
    showToast('Para a Declaração de Residência, preencha pelo menos o nome completo, CPF e endereço.', 'error');
    return;
  }

  const doc = createDocA4();
  const x = PDF_LAYOUT.marginLeft;
  const w = contentWidth();

  let { nomeCompleto, cpfCnpj, endereco, bairro, cidade, estado } = dados;

  let y = addTitle(doc, 'Declaração de Residência', null);

  const p1 = `Eu, ${upperOr(nomeCompleto, '')}, CPF: ${cpfCnpj}, declaro sob as penas da lei que resido à ${upperOr(endereco, '')}, Bairro: ${upperOr(bairro, 'NÃO INFORMADO')}, Cidade: ${upperOr(cidade, 'NÃO INFORMADO')}, Estado: ${upperOr(estado, 'NÃO INFORMADO')}.`;
  y = drawJustifiedParagraph(doc, p1, x, y, w, PDF_LAYOUT.firstLineIndent);
  y += PDF_LAYOUT.paragraphGap;

  const p2 = 'Declaro-me ainda, Civil e Criminalmente responsável pela veracidade da declaração prestada.';
  y = drawJustifiedParagraph(doc, p2, x, y, w, PDF_LAYOUT.firstLineIndent);
  y += 12;

  y = ensureSpace(doc, y, 18);
  doc.text(`${upperOr(cidade, '____________________')}, ______ DE ____________________ 20_______`, PDF_LAYOUT.pageWidth / 2, y, { align: 'center' });
  y += 20;

  y = addAssinaturaSimples(doc, y, 'Assinatura conforme documento apresentado');

  addWatermark(doc);
  doc.save(buildFilename('DECLARACAO_RESIDENCIA', '', nomeCompleto));
  showToast('PDF da Declaração de Residência gerado com sucesso!', 'success');
}

function gerarDeclaracaoDepositoTerceiros() {
  const dados = obterDadosDepositoTerceiros();

  if (!dados.nomeCompleto || !dados.cpfCnpj || !dados.valor) {
    showToast('Para a Declaração de Depósito, preencha pelo menos: nome completo, CPF/CNPJ e valor do depósito.', 'error');
    return;
  }

  const doc = createDocA4();
  const x = PDF_LAYOUT.marginLeft;
  const w = contentWidth();

  const nomeCompleto = dados.nomeCompleto;
  const cpfCnpj = dados.cpfCnpj;
  // const rg = dados.rg || '_______________';

  const nValor = parseCurrencyToNumberBR(dados.valor);
  const valorFmt = Number.isFinite(nValor) ? formatBRL(nValor) : (dados.valor || '________________');
  const valorExt = dados.valorExtenso ? dados.valorExtenso : '________________';

  const banco = upperOr(dados.banco, 'ITAU');
  const agencia = dados.agencia || '0280';
  const conta = dados.conta || '00110-8';
  const dataDeposito = (dados.dataDeposito && dados.dataDeposito.includes('/')) ? dados.dataDeposito : (dados.dataDeposito || '____/____/________');

  const chassiPlaca = dados.chassiPlaca ? dados.chassiPlaca : '______________________________';
  const faturadoNome = dados.faturadoNome ? dados.faturadoNome : '______________________________________';
  const faturadoCpfCnpj = dados.faturadoCpfCnpj ? dados.faturadoCpfCnpj : '____________________________';

  const cidadeLinha = upperOr(dados.cidade, 'Porto Alegre');
  const diaLinha = dados.dia ? dados.dia : '_______';
  const mesLinha = dados.mesExtenso ? dados.mesExtenso : '________________________';
  const anoLinha = dados.ano ? dados.ano : '2025';

  let y = addTitle(doc, 'Declaração de Depósito', 'Para Terceiros');

  // Linha local/data (modelo do arquivo ODT)
  y = ensureSpace(doc, y, 12);
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.text(`${cidadeLinha}, ${diaLinha} de ${mesLinha} de ${anoLinha}.`, x, y);
  y += 14;

  const texto = `Eu, ${upperOr(nomeCompleto, '')}, portador (a) do CPF/CNPJ.: ${cpfCnpj || '___________________'}, declaro que fiz um depósito no valor de ${valorFmt} (${valorExt}) na conta da San Marino Veículos Ltda no banco ${banco}, AGÊNCIA: ${agencia} CONTA CORRENTE: ${conta} em ${dataDeposito} para pagamento parcial ou total de um veículo chassi/placa.: ${chassiPlaca} que está sendo faturado em nome de ${faturadoNome}, CPF/CNPJ.: ${faturadoCpfCnpj}.`;

  y = drawJustifiedParagraph(doc, texto, x, y, w, PDF_LAYOUT.firstLineIndent);
  y += 18;

  y = addAssinaturaSimples(doc, y, 'Assinatura');

  // usa chassi/placa no nome do arquivo (se informado)
  const placaParaNome = dados.chassiPlaca || '';
  addWatermark(doc);
  doc.save(buildFilename('DECLARACAO_DEPOSITO_TERCEIROS', placaParaNome, nomeCompleto));
  showToast('PDF da Declaração de Depósito para Terceiros gerado com sucesso!', 'success');
}

function gerarInstrumentoResponsabilidade() {
  const dados = obterDadosInstrumento();

  if (!dados.nomeCompleto || !dados.cpfCnpj || !dados.chassi || !dados.modelo) {
    showToast('Para o Instrumento de Responsabilidade, preencha pelo menos: nome, CPF/CNPJ, modelo e chassi do veículo.', 'error');
    return;
  }

  if (dados.chassi && dados.chassi.length !== 17) {
    validations['inst_chassi']();
    showToast('O campo Chassi deve ter exatamente 17 caracteres.', 'error');
    return;
  }

  const doc = createDocA4();
  const x = PDF_LAYOUT.marginLeft;
  const w = contentWidth();

  let { nomeCompleto, cpfCnpj, cidade, modelo, chassi, dataEntrega, horaEntrega, placa } = dados;

  let y = addTitle(doc, 'Instrumento Particular de Responsabilidade', 'Civil e Criminal por Entrega de Veículo');

  const dataTxt = (dataEntrega && dataEntrega.includes('/')) ? dataEntrega : (dataEntrega ? dataEntrega : '____________________');
  const horaTxt = (horaEntrega && horaEntrega.includes(':')) ? horaEntrega : (horaEntrega ? horaEntrega : '____________');

  const p1 = `Declaramos que o veículo ${upperOr(modelo, '')}, chassi ${upperOr(chassi, '')}, de propriedade de ${upperOr(nomeCompleto, '')}, CPF/CNPJ ${cpfCnpj || ''}, foi entregue a este estabelecimento em ${dataTxt}, às ${horaTxt}, ficando a San Marino Veículos Ltda. responsável civil e criminalmente por este veículo a contar desta data.`;
  y = drawJustifiedParagraph(doc, p1, x, y, w, PDF_LAYOUT.firstLineIndent);
  y += 18;

  // Adiciona a linha com cidade e espaços para data.
  y = addLocalDataLinha(doc, y, cidade);
  // Aumenta o espaçamento antes das assinaturas para que fiquem mais abaixo na folha.
  y += 15;
  // Desenha as duas linhas de assinatura (cliente e concessionária).
  y = addAssinaturasDuplas(doc, y, 'Assinatura do cliente', 'Assinatura da concessionária');

  addWatermark(doc);
  doc.save(buildFilename('RESPONSABILIDADE_ENTREGA', placa, nomeCompleto));
  showToast('PDF do Instrumento de Responsabilidade gerado com sucesso!', 'success');
}

function gerarTermoQuitacaoTerceiro() {
  const dados = obterDadosQuitacao();

  if (!dados.nomeCompleto || !dados.cpfCnpj || !dados.modelo || !dados.placa || !dados.chassi || !dados.veiculoAdquiridoChassi) {
    showToast('Para o Termo de Quitação, todos os dados do cliente e os campos de Chassi (tanto do veículo entregue quanto do adquirido) são obrigatórios.', 'error');
    return;
  }

  if (dados.chassi && dados.chassi.length !== 17) {
    validations['quit_chassi']();
    showToast('O campo Chassi deve ter exatamente 17 caracteres.', 'error');
    return;
  }

  if (dados.veiculoAdquiridoChassi && dados.veiculoAdquiridoChassi.length !== 17) {
    validations['quit_veiculoAdquiridoChassi']();
    showToast('O campo Chassi do veículo adquirido deve ter exatamente 17 caracteres.', 'error');
    return;
  }

  const doc = createDocA4();
  const x = PDF_LAYOUT.marginLeft;
  const w = contentWidth();

  let {
    nomeCompleto, cpfCnpj, cidade,
    modelo, anoModelo, placa, chassi, cor,
    cedenteNome, cedenteCpfCnpj, cedenteEndereco, cedenteNumero,
    veiculoAdquiridoModelo, veiculoAdquiridoAnoModelo, veiculoAdquiridoCor, veiculoAdquiridoChassi,
    contratoNumero, valorQuitacao
  } = dados;

  anoModelo = formatarAnoModelo(anoModelo);
  veiculoAdquiridoAnoModelo = formatarAnoModelo(veiculoAdquiridoAnoModelo);

  const cedNome = cedenteNome ? cedenteNome : '_______________________________________________';
  const cedCpf = cedenteCpfCnpj ? cedenteCpfCnpj : '___________________________';
  const cedEnd = cedenteEndereco ? cedenteEndereco : '______________________________________';
  const cedNum = cedenteNumero ? cedenteNumero : '__________';

  const vEntModelo = modelo ? modelo : '______________________________';
  const vEntAno = anoModelo ? anoModelo : '_________';
  const vEntPlaca = placa ? placa.toUpperCase() : '______';
  const vEntChassi = chassi ? chassi.toUpperCase() : '______________________________';
  const vEntCor = cor ? cor.toUpperCase() : '__________________';

  const vAdqModelo = veiculoAdquiridoModelo ? veiculoAdquiridoModelo : '______________________________';
  const vAdqAno = veiculoAdquiridoAnoModelo ? veiculoAdquiridoAnoModelo : '_________';
  const vAdqCor = veiculoAdquiridoCor ? veiculoAdquiridoCor.toUpperCase() : '________';
  const vAdqChassi = veiculoAdquiridoChassi ? veiculoAdquiridoChassi.toUpperCase() : '____________________________';
  const cNum = contratoNumero ? contratoNumero : '___________';

  const nValor = parseCurrencyToNumberBR(valorQuitacao);
  const valQuit = Number.isFinite(nValor) ? formatBRL(nValor) : '________________';

  const anuNome = nomeCompleto ? nomeCompleto : '_______________________________________________';
  const anuCpf = cpfCnpj ? cpfCnpj : '_____________________';
  const anuCidade = cidade ? cidade : '_______';

  let y = addTitle(
    doc,
    'Termo de Quitação',
    'Instrumento particular de quitação de entrega de veículo como parte de pagamento em negócio de terceiros'
  );

  const texto = `Eu, ${cedNome}, CPF/CNPJ ${cedCpf}, residente e domiciliado na Rua ${cedEnd}, nº ${cedNum}, declaro que o veículo ${vEntModelo}, ano/modelo ${vEntAno}, placa ${vEntPlaca}, chassi ${vEntChassi}, cor ${vEntCor}, está livre e desembaraçado de qualquer ônus e através deste instrumento, dou quitação total do pagamento pelo valor de ${valQuit}, que serve como entrada para aquisição do automóvel ${vAdqModelo}, ano/modelo ${vAdqAno}, cor ${vAdqCor}, chassi ${vAdqChassi}, contrato nº ${cNum}, feito na San Marino Veículos Ltda., em nome de ${anuNome}, CPF/CNPJ ${anuCpf}, residente e domiciliado em ${anuCidade}. Assim, declaro não ter mais nada a reconsiderar ou exigir na presente transação.`;

  y = drawJustifiedParagraph(doc, texto, x, y, w, PDF_LAYOUT.firstLineIndent);
  y += 16;

  y = ensureSpace(doc, y, 18);
  doc.text('Porto Alegre, ______ de ____________________ de ________.', PDF_LAYOUT.pageWidth / 2, y, { align: 'center' });
  y += 18;

  y = addAssinaturasDuplas(doc, y, '(Cedente do veículo)', '(Anuente – cliente conforme o Contrato)');

  y = ensureSpace(doc, y, 22);
  doc.setFontSize(10);
  doc.text('Nome: ____________________________', PDF_LAYOUT.marginLeft, y);
  doc.text('Nome: ____________________________', PDF_LAYOUT.pageWidth / 2 + 5, y);
  y += 7;
  doc.text('CPF: _____________________________', PDF_LAYOUT.marginLeft, y);
  doc.text('CPF: _____________________________', PDF_LAYOUT.pageWidth / 2 + 5, y);
  y += 14;

  // Espaçamento extra entre as assinaturas e a seção de testemunhas.
  y += 15;

  y = ensureSpace(doc, y, 26);
  doc.setFontSize(11);
  doc.text('Testemunhas:', PDF_LAYOUT.marginLeft, y);
  y += 9;
  doc.text('1) _______________________________', PDF_LAYOUT.marginLeft, y);
  y += 7;
  doc.text('2) _______________________________', PDF_LAYOUT.marginLeft, y);

  addWatermark(doc);
  doc.save(buildFilename('TERMO_QUITACAO_TERCEIRO', placa, nomeCompleto));
  showToast('PDF do Termo de Quitação gerado com sucesso!', 'success');
}

/* =========================
   ORÇAMENTO DETRAN - Gerar PDF
   ========================= */
async function gerarOrcamentoDetran() {
  const orcCard = document.getElementById('printable-orcamento');

  if (!orcCard) {
    showToast('Erro ao localizar o orçamento.', 'error');
    return;
  }

  try {


    // Importar html2canvas dinamicamente
    if (typeof html2canvas === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => script.onload = resolve);
    }

    // Capturar o elemento como imagem
    const canvas = await html2canvas(orcCard, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Criar PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calcular dimensões mantendo proporção
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

    const imgScaledWidth = imgWidth * ratio;
    const imgScaledHeight = imgHeight * ratio;

    // Centralizar na página
    const x = (pdfWidth - imgScaledWidth) / 2;
    const y = (pdfHeight - imgScaledHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, imgScaledWidth, imgScaledHeight);

    // Obter dados para o nome do arquivo
    const proprietario = document.getElementById('orc_proprietario')?.value || 'CLIENTE';
    const placa = document.getElementById('orc_placa')?.value || '';

    addWatermark(pdf);
    pdf.save(buildFilename('ORCAMENTO_DETRAN', placa, proprietario));
    showToast('PDF do Orçamento Detran gerado com sucesso!', 'success');

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    showToast('Erro ao gerar PDF. Tente novamente.', 'error');
  }
}


/* =========================
   Inicialização
   ========================= */

/* =========================
   Validações de Chassi e Renavam
   ========================= */
function setupFieldValidation(id, length) {
  const el = document.getElementById(id);
  const errorEl = document.getElementById('error-' + id);
  if (!el || !errorEl) return null;

  const validate = () => {
    const val = el.value.trim();
    if (val && val.length !== length) {
      el.classList.add('input-error');
      errorEl.style.display = 'block';
      return false;
    } else {
      el.classList.remove('input-error');
      errorEl.style.display = 'none';
      return true;
    }
  };

  el.addEventListener('input', validate);
  el.addEventListener('blur', validate);
  return validate;
}

const validations = {};

window.addEventListener('DOMContentLoaded', () => {
  // Configurar validações individuais
  validations['acordo_chassi'] = setupFieldValidation('acordo_chassi', 17);
  validations['rec_chassi'] = setupFieldValidation('rec_chassi', 17);
  validations['quit_chassi'] = setupFieldValidation('quit_chassi', 17);
  validations['quit_veiculoAdquiridoChassi'] = setupFieldValidation('quit_veiculoAdquiridoChassi', 17);
  validations['inst_chassi'] = setupFieldValidation('inst_chassi', 17);

  // Forçar maiúsculas em todos os campos de input, exceto caixas de comunicados e buscas
  document.body.addEventListener('input', function (e) {
    const ignores = ['com-textarea', 'com-search-input', 'globalSearchInput', 'input-senha-gestor'];
    if (ignores.includes(e.target.id)) return;

    // Verifica se é input ou textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      // Tenta aplicar uppercase
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const original = e.target.value;
      const upper = original.toUpperCase();

      if (original !== upper) {
        e.target.value = upper;
        // Restaura cursor se suportado
        try {
          e.target.setSelectionRange(start, end);
        } catch (err) {
          // Alguns tipos de input nâo suportam selection (ex: number, email em alguns browsers), ignora
        }
      }
    }
  });

  // Ocultar seções de dados do cliente individuais que agora são globais
  const labelsToHide = ['Dados do Cliente', 'Dados do Cliente (Anuente)'];
  document.querySelectorAll('.section-title').forEach(el => {
    if (labelsToHide.includes(el.textContent.trim())) {
      el.style.display = 'none';
      if (el.nextElementSibling && el.nextElementSibling.classList.contains('form-grid')) {
        el.nextElementSibling.style.display = 'none';
      }
    }
  });

  applyDateMask(document.getElementById('inst_dataEntrega'));
  applyTimeMask(document.getElementById('inst_horaEntrega'));
  attachCurrencyBehavior(document.getElementById('quit_valorQuitacao'));
  applyDateMask(document.getElementById('dep_dataDeposito'));
  attachCurrencyBehavior(document.getElementById('dep_valor'));

  // Aplicar comportamento de moeda às células editáveis do orçamento
  document.querySelectorAll('.orc-price[contenteditable="true"]').forEach(cell => {
    attachCurrencyBehavior(cell);
  });
});


/* =========================
   Inicialização de máscaras
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  // Datas/Horas já existentes
  applyDateMask(document.getElementById('inst_dataEntrega'));
  applyTimeMask(document.getElementById('inst_horaEntrega'));
  applyDateMask(document.getElementById('dep_dataDeposito'));

  // Ano/Modelo com barra automática
  applyAnoModeloMask(document.getElementById('acordo_anoModelo'));
  applyAnoModeloMask(document.getElementById('rec_anoModelo'));
  applyAnoModeloMask(document.getElementById('quit_anoModelo'));
  applyAnoModeloMask(document.getElementById('quit_veiculoAdquiridoAnoModelo'));
  applyAnoModeloMask(document.getElementById('dep_ano'));
  applyAnoModeloMask(document.getElementById('orc_anoModeloCor'));

  // Iniciar Orçamento
  setOrcamentoDate();
  updateOrcamentoTotal();
});

/* =========================
   Funções Orçamento Detran
   ========================= */
function setOrcamentoDate() {
  const el = document.getElementById('orc_dataRecibo');
  if (!el) return;
  const today = new Date();
  const d = String(today.getDate()).padStart(2, '0');
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const y = today.getFullYear();
  el.value = `${d}/${m}/${y}`;
}

function updateOrcamentoTotal() {
  const rows = document.querySelectorAll('#orc-body tr');
  let total = 0;
  rows.forEach(row => {
    const checkbox = row.querySelector('.orc-check');
    const priceCell = row.querySelector('.orc-price');
    // Pula a linha de desconto no loop inicial de soma (ela será subtraída depois)
    if (priceCell && priceCell.id === 'orc_desconto') return;

    if (!checkbox || checkbox.checked) {
      total += parseCurrencyToNumberBR(priceCell.innerText || priceCell.value || '0');
    }
  });

  // Subtrai o desconto
  const descontoEl = document.getElementById('orc_desconto');
  if (descontoEl) {
    const valorDesconto = parseCurrencyToNumberBR(descontoEl.innerText || descontoEl.value || '0');
    if (Number.isFinite(valorDesconto)) {
      total -= valorDesconto;
    }
  }

  const totalEl = document.getElementById('orc-total');
  if (totalEl) totalEl.innerText = formatBRL(total);
}

/* =========================
   CALCULADORA DE JUROS (Cartão) - Inicialização
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  const calcBtnBanri = document.getElementById("calc_btnBanri");
  const calcBtnRede = document.getElementById("calc_btnRede");
  const calcEmptyState = document.getElementById("calc_emptyState");
  const calcContent = document.getElementById("calc_content");
  const calcTbody = document.getElementById("calc_tbody");
  const calcBaseInput = document.getElementById("calc_baseValue");

  // Se o card não existir (caso alguém remova), sai sem erro
  if (!calcBtnBanri || !calcBtnRede || !calcEmptyState || !calcContent || !calcTbody || !calcBaseInput) return;

  // Dados (iguais aos da planilha)
  const CALC_BANRI = [
    { label: "Débito", n: 1, taxa: 1.50, fator: 0.985 },
    { label: "1x / 30 dias", n: 1, taxa: 5.80, fator: 0.942 },
    { label: "2x", n: 2, taxa: 7.30, fator: 0.927 },
    { label: "3x", n: 3, taxa: 8.80, fator: 0.912 },
    { label: "4x", n: 4, taxa: 10.30, fator: 0.897 },
  ];

  const CALC_REDE = [
    { label: "1x", n: 1, taxa: 1.55, fator: 0.985 },
    { label: "2x", n: 2, taxa: 3.05, fator: 0.970 },
    { label: "3x", n: 3, taxa: 4.50, fator: 0.954 },
    { label: "4x", n: 4, taxa: 5.38, fator: 0.946 },
    { label: "5x", n: 5, taxa: 6.15, fator: 0.939 },
    { label: "6x", n: 6, taxa: 6.93, fator: 0.931 },
    { label: "7x", n: 7, taxa: 7.90, fator: 0.921 },
    { label: "8x", n: 8, taxa: 8.68, fator: 0.913 },
    { label: "9x", n: 9, taxa: 9.45, fator: 0.906 },
    { label: "10x", n: 10, taxa: 10.23, fator: 0.898 },
  ];

  // Helpers
  const calc_brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const calc_pct = (v) => (v / 100).toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const calc_fator3 = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  function calc_parseBRL(str) {
    if (!str) return 0;
    const s = String(str).trim()
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "");
    const val = Number(s);
    return Number.isFinite(val) ? val : 0;
  }

  function calc_formatBRLInput(el) {
    const v = calc_parseBRL(el.value);
    if (!v) {
      el.value = "";
      return 0;
    }
    el.value = v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v;
  }

  function calc_valorCobrar(base, fator) {
    if (!base || !fator) return 0;
    return base / fator;
  }

  function calc_parcela(total, n) {
    if (!total || !n) return 0;
    return total / n;
  }

  let calcModo = null; // "BANRI" ou "REDE"

  function calc_currentData() {
    return calcModo === "BANRI" ? CALC_BANRI : (calcModo === "REDE" ? CALC_REDE : []);
  }

  function calc_render() {
    const base = calc_parseBRL(calcBaseInput.value);
    const data = calc_currentData();

    if (!calcModo) {
      calcTbody.innerHTML = "";
      return;
    }

    calcTbody.innerHTML = data.map(row => {
      const total = base ? calc_valorCobrar(base, row.fator) : 0;
      const parc = base ? calc_parcela(total, row.n) : 0;

      const totalTxt = base ? calc_brl.format(total) : "—";
      const parcTxt = base ? calc_brl.format(parc) : "—";

      return `
            <tr>
              <td>${row.label}</td>
              <td class="center calc-muted">${calc_pct(row.taxa)}</td>
              <td class="center calc-muted">${calc_fator3(row.fator)}</td>
              <td class="center"><span class="calc-money">${totalTxt}</span></td>
              <td class="center calc-highlight calc-sep">${row.n}x</td>
              <td class="center calc-highlight"><span class="calc-money">${parcTxt}</span></td>
            </tr>
          `;
    }).join("");
  }

  function calc_setModo(next) {
    calcModo = next;

    calcBtnBanri.classList.toggle("active", calcModo === "BANRI");
    calcBtnRede.classList.toggle("active", calcModo === "REDE");

    calcEmptyState.classList.toggle("hidden", !!calcModo);
    calcContent.classList.toggle("hidden", !calcModo);

    calc_render();
  }

  // Eventos
  calcBtnBanri.addEventListener("click", () => calc_setModo("BANRI"));
  calcBtnRede.addEventListener("click", () => calc_setModo("REDE"));

  calcBaseInput.addEventListener("input", () => calc_render());
  calcBaseInput.addEventListener("blur", () => { calc_formatBRLInput(calcBaseInput); calc_render(); });



  // Inicial: sem escolha
  calc_setModo(null);

  // Função Limpar
  window.calc_limpar = function () {
    calcBaseInput.value = "";
    calc_setModo(null);
  };

  // Inicializar na seção do Gerador de Documentos
  alternarSecao('gerador');

  // Contador de Visitas
  fetch('https://api.counterapi.dev/v1/albertomateus-sanmarino/visitas-oficial/up')
    .then(res => res.json())
    .then(data => {
      const el = document.getElementById('visits-count');
      if (el && data.count) el.innerText = data.count.toLocaleString('pt-BR');
    })
    .catch(() => {
      const el = document.getElementById('visits-count');
      if (el) el.innerText = '0';
    });
});

/**
 * Funções para o Modal de Aviso de Construção (Venda Direta)
 */
function mostrarAvisoConstrucao(tipo) {
    const modal = document.getElementById('modal-construcao');
    const textoEl = document.getElementById('modal-construcao-texto');
    const imgEl = document.getElementById('modal-construcao-img');
    const tituloEl = document.getElementById('modal-construcao-titulo');
    
    if (modal && textoEl) {
        if (tipo === 'consignacao') {
            if (tituloEl) tituloEl.textContent = 'Contrato em Construção';
            if (imgEl) imgEl.style.display = 'block';
            textoEl.textContent = 'O Contrato de Consignação está em construção.';
        } else if (tipo === 'checklist') {
            if (tituloEl) tituloEl.textContent = 'Check List em construção';
            if (imgEl) imgEl.style.display = 'none';
            textoEl.textContent = 'Em construção pelo setor financeiro, em breve estará pronto para você usar';
        } else {
            // Padrão ou 'vd'
            if (tituloEl) tituloEl.textContent = 'Contrato em Construção';
            if (imgEl) imgEl.style.display = 'block';
            textoEl.textContent = 'O Contrato de Venda Direta está em construção.';
        }
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Previne scroll
    }
}

function fecharAvisoConstrucao() {
    const modal = document.getElementById('modal-construcao');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restaura scroll
    }
}

// Fechar modal ao clicar fora do conteúdo
window.addEventListener('click', function(event) {
    const modal = document.getElementById('modal-construcao');
    if (event.target == modal) {
        fecharAvisoConstrucao();
    }
    const modalSenha = document.getElementById('modal-senha-gestor');
    if (event.target == modalSenha) {
        fecharModalSenhaGestor();
    }
});

function abrirModalSenhaGestor() {
    const modal = document.getElementById('modal-senha-gestor');
    const input = document.getElementById('input-senha-gestor');
    const erro = document.getElementById('erro-senha-gestor');
    if (modal) {
        if (erro) erro.style.display = 'none';
        if (input) input.value = '';
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Previne scroll
        setTimeout(() => { if (input) input.focus(); }, 100);
    }
}

function fecharModalSenhaGestor() {
    const modal = document.getElementById('modal-senha-gestor');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restaura scroll
    }
}

function confirmarSenhaGestor() {
    const input = document.getElementById('input-senha-gestor');
    const erro = document.getElementById('erro-senha-gestor');
    if (input) {
        const senha = input.value;
        if (senha.toLowerCase() === 'sm1985') {
            sessionStorage.setItem('gestor_unlocked', 'true');
            fecharModalSenhaGestor();
            alternarSecao('gestor');
        } else {
            if (erro) {
                erro.style.display = 'block';
            }
            input.focus();
            input.select();
        }
    }
}


/* =========================
   MÓDULO DE COMUNICADOS
   ========================= */

const Comunicados = (() => {
  // Emails de gestores autorizados a postar
  // Verifique a tabela 'usuarios_aprovados' e o campo 'role'
  // Se não houver campo role, usaremos uma lista de emails gestores
  const GESTORES_EMAILS = [
    'albertomateus.rs@gmail.com'
  ];

  let todosOsComunicados = [];
  let usuarioAtual = null;
  let ehGestor = false;
  let buscaAtual = '';
  let iniciado = false;
  let canalRealtime = null;

  // ── Inicialização ────────────────────────────────────────────────────────────
  async function init() {
    if (iniciado) return;
    iniciado = true;
    const loadingEl = document.getElementById('com-loading');
    const emptyEl   = document.getElementById('com-empty');

    try {
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !session) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
      }

      usuarioAtual = session.user;
      
      // Executa de forma resiliente
      try {
        await verificarPerfilGestor();
      } catch (e) {
        console.error('Erro ao verificar gestor:', e);
      }

      try {
        await carregarComunicados();
      } catch (e) {
        console.error('Erro ao carregar comunicados:', e);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.classList.remove('hidden');
      }

      try {
        configurarComposer();
        configurarBusca();
        configurarRealtime();
      } catch (e) {
        console.error('Erro ao configurar componentes:', e);
      }

    } catch (err) {
      console.error('Erro geral no init de comunicados:', err);
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) emptyEl.classList.remove('hidden');
    }
  }

  // ── Verificar se usuário é gestor ────────────────────────────────────────────
  async function verificarPerfilGestor() {
    if (!usuarioAtual) return;

    try {
      const { data } = await supabaseClient
        .from('usuarios_aprovados')
        .select('role, email')
        .eq('email', usuarioAtual.email.toLowerCase())
        .maybeSingle();

      ehGestor = data?.role === 'gestor' || data?.role === 'admin' ||
                 GESTORES_EMAILS.includes(usuarioAtual.email.toLowerCase());
    } catch {
      ehGestor = GESTORES_EMAILS.includes(usuarioAtual.email?.toLowerCase());
    }

    const composer = document.getElementById('com-composer');
    if (composer) {
      composer.style.display = ehGestor ? 'block' : 'none';
    }
  }

  // ── Carregar Comunicados do Supabase ─────────────────────────────────────────
  async function carregarComunicados() {
    const loadingEl = document.getElementById('com-loading');
    const emptyEl   = document.getElementById('com-empty');
    const feedEl    = document.getElementById('com-feed');

    if (loadingEl) loadingEl.style.display = 'flex';

    try {
      const { data, error } = await supabaseClient
        .from('comunicados')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Tabela pode não existir ainda — mostrar estado vazio
        console.warn('Comunicados: tabela não encontrada ou erro.', error.message);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl)   emptyEl.classList.remove('hidden');
        return;
      }

      todosOsComunicados = data || [];
      renderizarFeed(todosOsComunicados);
      atualizarContador(todosOsComunicados.length);

    } catch (err) {
      console.error('Erro ao carregar comunicados:', err);
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl)   emptyEl.classList.remove('hidden');
    }
  }

  // ── Renderizar Feed ──────────────────────────────────────────────────────────
  function renderizarFeed(lista) {
    const loadingEl = document.getElementById('com-loading');
    const emptyEl   = document.getElementById('com-empty');
    const feedEl    = document.getElementById('com-feed');
    if (!feedEl) return;

    if (loadingEl) loadingEl.style.display = 'none';

    // Limpar cards existentes (mantém loading e empty)
    feedEl.querySelectorAll('.com-msg-card').forEach(el => el.remove());

    if (!lista || lista.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');

    lista.forEach((msg, index) => {
      const card = criarCard(msg, index);
      feedEl.appendChild(card);
    });
  }

  // ── Criar Card de Mensagem ────────────────────────────────────────────────────
  function criarCard(msg, animIndex = 0) {
    const card = document.createElement('div');
    card.className = 'com-msg-card';
    card.dataset.id  = msg.id;
    card.dataset.tag = msg.tag || 'geral';
    card.style.animationDelay = `${animIndex * 40}ms`;

    const primeiraLetra = (msg.autor_nome || 'U').charAt(0).toUpperCase();
    const dataFormatada  = formatarData(msg.created_at);
    const tagLabel       = formatarTag(msg.tag);
    const textoComHighlight = destacarTexto(msg.mensagem || '', buscaAtual);

    const ehAutor = usuarioAtual && (
      msg.autor_email === usuarioAtual.email ||
      ehGestor
    );

    card.innerHTML = `
      <div class="com-msg-top">
        <div class="com-msg-author">
          <div class="com-author-avatar">${primeiraLetra}</div>
          <span class="com-author-name">${escapeHtml(msg.autor_nome || 'Gestor')}</span>
        </div>
        <div class="com-msg-actions">
          <span class="com-msg-tag tag-${msg.tag || 'geral'}">${tagLabel}</span>
          ${ehAutor ? `
          <button class="com-msg-delete" title="Excluir comunicado" onclick="Comunicados.deletar('${msg.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>` : ''}
        </div>
      </div>
      <div class="com-msg-body">${textoComHighlight}</div>
      <div class="com-msg-footer">
        <span class="com-msg-time">${dataFormatada}</span>
      </div>
    `;

    return card;
  }

  // ── Configurar Composer ──────────────────────────────────────────────────────
  function configurarComposer() {
    const textarea  = document.getElementById('com-textarea');
    const charCount = document.getElementById('com-char-count');
    const sendBtn   = document.getElementById('com-send-btn');
    if (!textarea || !sendBtn) return;

    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      charCount.textContent = `${len} / 600`;
      charCount.className = 'com-char-count' +
        (len > 550 ? ' danger' : len > 450 ? ' warning' : '');
      sendBtn.disabled = len === 0;
    });

    sendBtn.disabled = true;
    sendBtn.addEventListener('click', publicarMensagem);

    // Ctrl+Enter para publicar
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') publicarMensagem();
    });
  }

  // ── Publicar Mensagem ────────────────────────────────────────────────────────
  async function publicarMensagem() {
    if (!ehGestor || !usuarioAtual) return;

    const textarea = document.getElementById('com-textarea');
    const tagSel   = document.getElementById('com-tag-select');
    const sendBtn  = document.getElementById('com-send-btn');
    const texto = textarea?.value?.trim();
    if (!texto) return;

    sendBtn.disabled = true;
    sendBtn.innerHTML = `<div class="com-spinner" style="width:14px;height:14px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></div>`;

    const nomeAutor = usuarioAtual.user_metadata?.full_name || usuarioAtual.email;

    const { error } = await supabaseClient.from('comunicados').insert([{
      mensagem:    texto,
      tag:         tagSel?.value || 'geral',
      autor_nome:  nomeAutor,
      autor_email: usuarioAtual.email.toLowerCase(),
    }]);

    sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Publicar`;

    if (error) {
      if (typeof showToast === 'function') showToast('Erro ao publicar: ' + error.message, 'error');
      sendBtn.disabled = false;
      return;
    }

    textarea.value = '';
    document.getElementById('com-char-count').textContent = '0 / 600';
    document.getElementById('com-char-count').className = 'com-char-count';
    sendBtn.disabled = true;
    if (typeof showToast === 'function') showToast('Comunicado publicado!', 'success');
    await carregarComunicados();
  }

  // ── Deletar Mensagem ─────────────────────────────────────────────────────────
  async function deletar(id) {
    if (!ehGestor) return;
    if (!confirm('Excluir este comunicado?')) return;

    const { error } = await supabaseClient.from('comunicados').delete().eq('id', id);
    if (error) {
      if (typeof showToast === 'function') showToast('Erro ao excluir.', 'error');
      return;
    }
    const card = document.querySelector(`.com-msg-card[data-id="${id}"]`);
    if (card) {
      card.style.transition = 'opacity 0.3s, transform 0.3s';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      setTimeout(() => { card.remove(); atualizarContador(); }, 300);
    }
    todosOsComunicados = todosOsComunicados.filter(m => m.id != id);
    atualizarContador(todosOsComunicados.length);
    if (typeof showToast === 'function') showToast('Comunicado removido.', 'success');
  }

  // ── Busca ────────────────────────────────────────────────────────────────────
  function configurarBusca() {
    const input      = document.getElementById('com-search-input');
    const clearBtn   = document.getElementById('com-search-clear');
    const resultadoEl = document.getElementById('com-search-results');
    if (!input) return;

    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        buscaAtual = input.value.trim().toLowerCase();
        clearBtn?.classList.toggle('hidden', !buscaAtual);

        if (!buscaAtual) {
          resultadoEl?.classList.add('hidden');
          renderizarFeed(todosOsComunicados);
          return;
        }

        const filtrado = todosOsComunicados.filter(m =>
          (m.mensagem || '').toLowerCase().includes(buscaAtual) ||
          (m.autor_nome || '').toLowerCase().includes(buscaAtual)
        );

        renderizarFeed(filtrado);

        if (resultadoEl) {
          resultadoEl.classList.remove('hidden');
          resultadoEl.textContent = filtrado.length === 0
            ? 'Nenhum resultado encontrado.'
            : `${filtrado.length} resultado${filtrado.length > 1 ? 's' : ''} encontrado${filtrado.length > 1 ? 's' : ''}.`;
        }
      }, 250);
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      buscaAtual = '';
      clearBtn.classList.add('hidden');
      resultadoEl?.classList.add('hidden');
      renderizarFeed(todosOsComunicados);
      input.focus();
    });
  }

  // ── Realtime (atualização automática) ────────────────────────────────────────
  function configurarRealtime() {
    if (canalRealtime) {
      supabaseClient.removeChannel(canalRealtime);
    }
    canalRealtime = supabaseClient
      .channel('comunicados-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados' }, () => {
        carregarComunicados();
      })
      .subscribe();
  }

  // ── Utilitários ──────────────────────────────────────────────────────────────
  function atualizarContador(n) {
    const badge = document.getElementById('com-count-badge');
    if (badge) badge.textContent = n ?? todosOsComunicados.length;

    const badgeTop = document.getElementById('com-badge-count-top');
    if (badgeTop) {
      const count = n ?? todosOsComunicados.length;
      badgeTop.textContent = count;
      if (count > 0) {
        badgeTop.classList.remove('hidden');
      } else {
        badgeTop.classList.add('hidden');
      }
    }
  }

  function formatarData(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const agora = new Date();
    const diff = Math.floor((agora - d) / 1000);

    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const minuto = String(d.getMinutes()).padStart(2, '0');
    const dataAbsoluta = `${dia}/${mes}/${ano} às ${hora}:${minuto}`;

    let tempoRelativo = '';
    if (diff < 60) {
      tempoRelativo = 'Agora mesmo';
    } else if (diff < 3600) {
      tempoRelativo = `há ${Math.floor(diff / 60)}min`;
    } else if (diff < 86400) {
      tempoRelativo = `há ${Math.floor(diff / 3600)}h`;
    } else {
      const dias = Math.floor(diff / 86400);
      tempoRelativo = `há ${dias}d`;
    }

    return `${tempoRelativo} (${dataAbsoluta})`;
  }

  function formatarTag(tag) {
    const mapa = {
      geral: '📢 Geral',
      info: 'ℹ️ Informativos',
      nps: '📊 NPS',
      meta: '🎯 Meta',
      parabens: '🏆 Parabéns'
    };
    return mapa[tag] || tag;
  }

  function destacarTexto(texto, busca) {
    const seguro = escapeHtml(texto);
    if (!busca) return seguro;
    const re = new RegExp(`(${escapeRegex(busca)})`, 'gi');
    return seguro.replace(re, '<mark class="com-highlight">$1</mark>');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  return { init, deletar };
})();

// Iniciar comunicados após autenticação bem-sucedida
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    setTimeout(() => Comunicados.init(), 800);
  }
});

// Inicializar se já autenticado na carga da página
window.addEventListener('load', async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) setTimeout(() => Comunicados.init(), 1000);
});
