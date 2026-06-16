// Obter os dados do escopo global expostos por fiat_data.js
const fiatData = window.fiatData;

// Elementos DOM principais
const mainLoader = document.getElementById('main-loader');
const mainContent = document.getElementById('main-content');

// Variáveis Globais de Controle das Abas
let currentOilCar = null;
let selectedRootModel = null;

let currentRevCar = null;
let selectedRevRootModel = null;
let selectedRevIndex = 0;
let selectedPackageName = 'fabrica';
let adicionaisDesmarcados = {};

// Itens e preços de acréscimo para os pacotes de serviço
const serviçosAdicionais = {
    basico: [
        { nome: "Limpeza do Bico Injetor", pn: "OF20005", preco: 154.82 },
        { nome: "Geometria e Balanceamento", pn: "GEL/BAL", preco: 191.95 },
        { nome: "Limpeza do TBI", pn: "OF20003", preco: 183.17 },
        { nome: "Limpeza do Sistema de Freio", pn: "OF20004", preco: 165.27 }
    ],
    intermediario: [
        { nome: "Limpeza do Bico Injetor", pn: "OF20005", preco: 154.82 },
        { nome: "Geometria e Balanceamento", pn: "GEL/BAL", preco: 191.95 },
        { nome: "Limpeza do TBI", pn: "OF20003", preco: 183.17 },
        { nome: "Limpeza do Sistema de Freio", pn: "OF20004", preco: 165.27 },
        { nome: "Higienização do Ar Condicionado", pn: "OF20006", preco: 266.95 },
        { nome: "Lubrificação das Partes Móveis", pn: "FT7088810", preco: 104.37 },
    ],
    premium: [
        { nome: "Limpeza do Bico Injetor", pn: "OF20005", preco: 154.82 },
        { nome: "Geometria e Balanceamento", pn: "GEL/BAL", preco: 191.95 },
        { nome: "Limpeza do TBI", pn: "OF20003", preco: 183.17 },
        { nome: "Limpeza do Sistema de Freio", pn: "OF20004", preco: 165.27 },
        { nome: "Higienização do Ar Condicionado", pn: "OF20006", preco: 266.95 },
        { nome: "Lubrificação das Partes Móveis", pn: "FT7088810", preco: 104.37 },
        { nome: "Oxisanitização", pn: "OXI", preco: 80.27 },
        { nome: "Limpeza Técnica do Motor", pn: "OF20021", preco: 107.35 },
        { nome: "Cristalizador de Para-brisa", pn: "OF20002", preco: 84.37 }
    ]
};

// Injeção da data atual formatada
function initDate() {
    const dateDisplay = document.getElementById('current-date-display');
    if (!dateDisplay) return;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    let dateStr = today.toLocaleDateString('pt-BR', options);
    // Capitalizar a primeira letra
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    dateDisplay.innerText = dateStr;
}


// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializar ícones do Lucide (apenas se a lib estiver disponível)
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        } else {
            console.warn('Lucide Icons não carregado. Ícones não serão renderizados.');
        }

        // Verificar se os dados do fiatData estão disponíveis
        if (typeof fiatData !== 'undefined' && fiatData !== null) {
            // Ocultar Loader e mostrar conteúdo principal
            mainLoader.classList.add('hidden');
            mainContent.classList.remove('hidden');

            // Inicializar componentes
            initDate();
            initTabs();
            initRevisoes();
            initTabelaGeral();
            initTrocaOleo();

            // Re-renderizar ícones
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } else {
            showError("O arquivo de base de dados (fiat_data.js) não foi encontrado na pasta ou está vazio.");
        }
    } catch (err) {
        console.error("Erro na inicialização da aplicação:", err);
        showError("Ocorreu um erro ao carregar a aplicação. Detalhes: " + err.message);
    }
});

// Exibir mensagem de erro amigável no lugar do loader
function showError(msg) {
    mainLoader.innerHTML = `
        <div style="text-align: center; padding: 2rem; max-width: 500px; margin: 0 auto; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; box-shadow: 0 8px 32px var(--shadow-color);">
            <div style="font-size: 3rem; color: var(--accent-red); margin-bottom: 1rem;">⚠️</div>
            <p style="color: var(--text-primary); font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">Erro de Inicialização</p>
            <p style="color: var(--text-secondary); font-family: 'Inter', sans-serif; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">${msg}</p>
            <button onclick="window.location.reload();" style="background: var(--accent-red); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-family: 'Outfit', sans-serif; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;">
                Recarregar Página
            </button>
        </div>
    `;
}

// FORMATADORES AUXILIARES
function compareCarNames(a, b) {
    const isTitanoA = a.toUpperCase().includes("TITANO");
    const isTitanoB = b.toUpperCase().includes("TITANO");

    if (isTitanoA && isTitanoB) {
        const order = [
            "TITANO 2.2D MT (Antiga/9VC)",
            "TITANO 2.2D AT (Antiga/9VC)",
            "TITANO 2.2D MT (Nova/8AP)",
            "TITANO 2.2D AT (Nova/8AP)"
        ];
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) {
            return idxA - idxB;
        }
    }
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// DETERMINADORES DE NOMES E HEURÍSTICAS
function getRootModel(name) {
    const nameUpper = name.toUpperCase();
    if (nameUpper.includes("STRADA")) return "STRADA";
    if (nameUpper.includes("SIENA")) return "GRAND SIENA";
    if (nameUpper.includes("PALIO")) return "PALIO";
    if (nameUpper.includes("FASTBACK")) return "FASTBACK";
    if (nameUpper.includes("DUCATO")) return "DUCATO";
    if (nameUpper.includes("SCUDO")) return "SCUDO";
    if (nameUpper.includes("DOBLO")) return "DOBLO";
    if (nameUpper.includes("FIORINO")) return "FIORINO";
    if (nameUpper.includes("CRONOS")) return "CRONOS";
    if (nameUpper.includes("ARGO")) return "ARGO";
    if (nameUpper.includes("MOBI")) return "MOBI";
    if (nameUpper.includes("PULSE")) return "PULSE";
    if (nameUpper.includes("TITANO")) return "TITANO";
    if (nameUpper.includes("TORO")) return "TORO";
    if (nameUpper.includes("UNO")) return "UNO";

    return name.split(" ")[0].toUpperCase();
}

function parseVersionName(fullName) {
    const root = getRootModel(fullName);
    let rest = fullName;

    if (fullName.toUpperCase().startsWith(root)) {
        rest = fullName.substring(root.length).trim();
    } else if (fullName.toUpperCase().startsWith("NOVA " + root)) {
        rest = fullName.substring(("NOVA " + root).length).trim();
    } else if (fullName.toUpperCase().startsWith("NOVO " + root)) {
        rest = fullName.substring(("NOVO " + root).length).trim();
    } else if (fullName.toUpperCase().startsWith("PALIO WEEKEND")) {
        rest = fullName.substring("PALIO WEEKEND".length).trim();
    } else if (fullName.toUpperCase().startsWith("GRAND SIENA")) {
        rest = fullName.substring("GRAND SIENA".length).trim();
    }

    let title = rest;
    let subtitle = "";

    const myIndex = rest.toUpperCase().indexOf("MY");
    const ateIndex = rest.toUpperCase().indexOf("ATÉ");
    const parenIndex = rest.indexOf("(");

    let splitIndex = -1;
    if (myIndex !== -1) splitIndex = myIndex;
    if (ateIndex !== -1 && (splitIndex === -1 || ateIndex < splitIndex)) splitIndex = ateIndex;
    if (parenIndex !== -1 && (splitIndex === -1 || parenIndex < splitIndex)) splitIndex = parenIndex;

    if (splitIndex !== -1) {
        title = rest.substring(0, splitIndex).trim();
        subtitle = rest.substring(splitIndex).trim();

        if (subtitle.startsWith("(") && subtitle.endsWith(")")) {
            subtitle = subtitle.substring(1, subtitle.length - 1).trim();
        }
    }

    if (!title) {
        title = fullName;
    }

    return { title, subtitle };
}

// ==========================================
// 1. GERENCIADOR DE ABAS
// ==========================================
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.add('hidden'));

            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    });
}

// ==========================================
// 2. REVISÕES PROGRAMADAS (ABA 1)
// ==========================================
function initRevisoes() {
    const searchInput = document.getElementById('rev-model-search');
    const rootListContainer = document.getElementById('rev-root-list-container');
    const listContainer = document.getElementById('rev-vehicle-list-container');

    const carNames = Object.keys(fiatData.modelos)
        .filter(name => name.toLowerCase() !== '500e')
        .sort(compareCarNames);

    const rootGroups = {};
    carNames.forEach((name) => {
        const root = getRootModel(name);
        if (!rootGroups[root]) {
            rootGroups[root] = [];
        }
        rootGroups[root].push(name);
    });

    const rootModelsList = Object.keys(rootGroups).sort();

    function renderRootList(filterText = '') {
        rootListContainer.innerHTML = '';
        const filteredRoots = rootModelsList.filter(root =>
            root.toLowerCase().includes(filterText.toLowerCase())
        );

        filteredRoots.forEach((root) => {
            const btn = document.createElement('button');
            btn.className = 'root-model-btn';
            if (selectedRevRootModel === root) {
                btn.classList.add('active');
            }
            btn.innerHTML = `<span>${root}</span>`;

            btn.addEventListener('click', () => {
                rootListContainer.querySelectorAll('.root-model-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedRevRootModel = root;
                renderVersionList();
            });

            rootListContainer.appendChild(btn);
        });
    }

    function renderVersionList() {
        listContainer.innerHTML = '';
        if (!selectedRevRootModel) return;

        const versions = rootGroups[selectedRevRootModel] || [];

        versions.forEach((name) => {
            const btn = document.createElement('button');
            btn.className = 'model-item-btn rev-model-btn';
            if (currentRevCar && currentRevCar.modelo === name) {
                btn.classList.add('active');
            }

            const parsed = parseVersionName(name);
            const subtitleHtml = parsed.subtitle ? `<span class="version-subtitle">${parsed.subtitle}</span>` : '';
            btn.innerHTML = `
                <div class="version-info">
                    <span class="version-title">${parsed.title}</span>
                    ${subtitleHtml}
                </div>
                <i data-lucide="chevron-right" class="chevron"></i>
            `;

            btn.addEventListener('click', () => {
                listContainer.querySelectorAll('.rev-model-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectRevCar(name);
            });
            listContainer.appendChild(btn);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    searchInput.addEventListener('input', (e) => {
        renderRootList(e.target.value);
    });

    if (rootModelsList.length > 0) {
        selectedRevRootModel = rootModelsList.includes("TORO") ? "TORO" : rootModelsList[0];
        renderRootList();
        renderVersionList();
    }
}

function selectRevCar(carName) {
    try {
        currentRevCar = fiatData.modelos[carName];
        selectedRevIndex = 0;
        adicionaisDesmarcados = {};

        document.getElementById('rev-car-name').innerText = currentRevCar.modelo;

        const welcomeCover = document.getElementById('rev-welcome-cover');
        const dataContainer = document.getElementById('rev-data-container');

        if (welcomeCover) welcomeCover.style.display = 'none';
        if (dataContainer) dataContainer.style.display = 'block';

        renderRevKmGrid();
        renderRevisionDetails(0);
    } catch (err) {
        console.error("Erro ao selecionar veículo para revisão:", err);
        alert("Erro ao selecionar o veículo: " + err.message);
    }
}

function renderRevKmGrid() {
    const kmGrid = document.getElementById('rev-km-grid');
    kmGrid.innerHTML = '';

    currentRevCar.revisoes.forEach((revName, idx) => {
        const kmLabel = currentRevCar.quilometragens[idx] || `${idx + 1}a`;

        const btn = document.createElement('button');
        btn.className = 'km-btn';
        if (selectedRevIndex === idx) {
            btn.classList.add('active');
        }
        btn.innerText = kmLabel;

        btn.addEventListener('click', () => {
            kmGrid.querySelectorAll('.km-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRevIndex = idx;
            renderRevisionDetails(idx);
        });

        kmGrid.appendChild(btn);
    });
}

function selectPackage(packageName) {
    selectedPackageName = packageName;
    adicionaisDesmarcados = {};
    if (currentRevCar) {
        renderRevisionDetails(selectedRevIndex);
    }
}

window.toggleServicoAdicional = function(nomeServico, event) {
    if (event) event.stopPropagation();
    adicionaisDesmarcados[nomeServico] = !adicionaisDesmarcados[nomeServico];
    if (currentRevCar) {
        renderRevisionDetails(selectedRevIndex);
    }
};

function renderRevisionDetails(revIdx) {
    const revName = currentRevCar.revisoes[revIdx];
    const totalPrice = currentRevCar.custos_totais[revIdx] || 0;

    // Cálculo dos preços dos pacotes (Acréscimos Reais calculados dinamicamente)
    const getAdicionaisPreco = (packageName) => {
        const itens = serviçosAdicionais[packageName] || [];
        return itens.reduce((sum, item) => {
            if (adicionaisDesmarcados[item.nome]) {
                return sum;
            }
            return sum + item.preco;
        }, 0);
    };

    const adicionaisBasico = getAdicionaisPreco('basico');
    const adicionaisIntermediario = getAdicionaisPreco('intermediario');
    const adicionaisPremium = getAdicionaisPreco('premium');

    const priceBasico = totalPrice + adicionaisBasico;
    const priceIntermediario = totalPrice + adicionaisIntermediario;
    const pricePremium = totalPrice + adicionaisPremium;

    // Atualização dos valores exibidos nos boxes
    const priceBasicoElem = document.getElementById('price-basico');
    const priceIntermediarioElem = document.getElementById('price-intermediario');
    const pricePremiumElem = document.getElementById('price-premium');
    const priceFabricaElem = document.getElementById('rev-total-price');

    if (priceBasicoElem) priceBasicoElem.innerText = formatCurrency(priceBasico);
    if (priceIntermediarioElem) priceIntermediarioElem.innerText = formatCurrency(priceIntermediario);
    if (pricePremiumElem) pricePremiumElem.innerText = formatCurrency(pricePremium);
    if (priceFabricaElem) priceFabricaElem.innerText = formatCurrency(totalPrice);

    // Sincronizar classes de pacotes ativos/inativos no DOM
    const packages = ['basico', 'intermediario', 'premium', 'fabrica'];
    packages.forEach(p => {
        const box = document.getElementById(`box-${p}`);
        if (box) {
            if (p === selectedPackageName) {
                box.classList.add('active-package');
            } else {
                box.classList.remove('active-package');
            }
        }
    });

    const partsTableBody = document.getElementById('rev-parts-table-body');
    partsTableBody.innerHTML = '';

    let subtotalPecas = 0;
    let moHoras = 0;
    let moPrecoHora = 349.0;
    let moSubtotal = 0;
    let indexItem = 0;
    let totalPecasExibidas = 0;

    currentRevCar.itens.forEach(item => {
        const qty = item.trocas[revName];
        const custo = item.custos[revName];

        if (item.tipo === 'serviço') {
            if (qty !== undefined && qty > 0) {
                moHoras = parseFloat(qty) || 0;
                moPrecoHora = parseFloat(item.preco_unitario) || 349.0;
                moSubtotal = parseFloat(custo) || (moHoras * moPrecoHora);
            }
        } else {
            const precoUnit = parseFloat(item.preco_unitario) || 0;
            const itemQty = (qty !== undefined && qty > 0) ? qty : 0;
            const totalItem = (qty !== undefined && qty > 0) ? (parseFloat(custo) || (qty * precoUnit)) : 0;

            subtotalPecas += totalItem;

            // Só exibe o componente na lista se a quantidade for maior que zero (se for trocado nesta revisão)
            if (itemQty > 0) {
                const tr = document.createElement('tr');
                const textStyle = 'class="text-right td-highlight"';

                tr.innerHTML = `
                    <td class="item-name-cell" data-label="Componente">${item.nome}</td>
                    <td data-label="Código (PN)"><span class="item-pn">${item.pn}</span></td>
                    <td class="text-right" data-label="Preço Unit.">${formatCurrency(precoUnit)}</td>
                    <td ${textStyle} data-label="QTD">${itemQty}</td>
                    <td ${textStyle} data-label="Subtotal">${formatCurrency(totalItem)}</td>
                `;
                partsTableBody.appendChild(tr);
                totalPecasExibidas++;
                indexItem++;
            }
        }
    });

    // Injetar os itens adicionais de serviço correspondentes ao pacote selecionado na tabela
    const adicionais = serviçosAdicionais[selectedPackageName] || [];
    adicionais.forEach(item => {
        const tr = document.createElement('tr');
        let packageColor = '';
        if (selectedPackageName === 'basico') packageColor = '#6b7280';
        else if (selectedPackageName === 'intermediario') packageColor = '#22c55e';
        else if (selectedPackageName === 'premium') packageColor = '#ef4444';

        const isDesmarcado = !!adicionaisDesmarcados[item.nome];
        const buttonTitle = isDesmarcado ? `Clique para incluir ${item.nome}` : `Clique para desmarcar ${item.nome}`;

        const cellNomeContent = `
            <div class="clickable-service-name ${isDesmarcado ? 'desmarcado' : ''}" onclick="toggleServicoAdicional('${item.nome}', event)" title="${buttonTitle}">
                <span class="status-dot" style="background-color: ${isDesmarcado ? 'var(--text-muted)' : packageColor};"></span>
                <span>${item.nome}</span>
            </div>
        `;

        let cellQtdContent = '1';
        let cellSubtotalContent = formatCurrency(item.preco);
        let extraRowStyle = '';

        if (isDesmarcado) {
            cellQtdContent = '0';
            cellSubtotalContent = formatCurrency(0);
            extraRowStyle = ' style="opacity: 0.5;"';
        }

        tr.innerHTML = `
            <td class="item-name-cell" data-label="Componente" style="font-weight: 600; color: ${packageColor};"${extraRowStyle}>${cellNomeContent}</td>
            <td data-label="Código (PN)"${extraRowStyle}><span class="item-pn" style="background-color: rgba(0, 0, 0, 0.04); color: ${packageColor}; border-color: rgba(0, 0, 0, 0.08);">${item.pn}</span></td>
            <td class="text-right"${extraRowStyle} data-label="Preço Unit.">${formatCurrency(item.preco)}</td>
            <td class="text-right td-highlight"${extraRowStyle} style="color: ${packageColor};" data-label="QTD">${cellQtdContent}</td>
            <td class="text-right td-highlight"${extraRowStyle} style="color: ${packageColor};" data-label="Subtotal">${cellSubtotalContent}</td>
        `;
        partsTableBody.appendChild(tr);
        totalPecasExibidas++;
    });

    if (totalPecasExibidas === 0) {
        partsTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    Nenhum componente físico cadastrado para este veículo.
                </td>
            </tr>
        `;
    }

    document.getElementById('rev-parts-count').innerText = `${indexItem + adicionais.length} item(ns) total(is)`;

    document.getElementById('rev-mo-hours').innerText = `${moHoras.toFixed(2)}h`;
    document.getElementById('rev-mo-rate').innerText = formatCurrency(moPrecoHora);
    document.getElementById('rev-mo-subtotal').innerText = formatCurrency(moSubtotal);

    // Lógica do resumo consolidado do pacote
    let finalPrice = totalPrice;
    let adjustmentAmount = 0;
    let adjustmentLabel = '';
    let packageColor = '';

    if (selectedPackageName === 'basico') {
        finalPrice = priceBasico;
        adjustmentAmount = adicionaisBasico;
        adjustmentLabel = 'Adicionais Pacote Básico:';
        packageColor = '#6b7280';
    } else if (selectedPackageName === 'intermediario') {
        finalPrice = priceIntermediario;
        adjustmentAmount = adicionaisIntermediario;
        adjustmentLabel = 'Adicionais Pacote Intermediário:';
        packageColor = '#22c55e';
    } else if (selectedPackageName === 'premium') {
        finalPrice = pricePremium;
        adjustmentAmount = adicionaisPremium;
        adjustmentLabel = 'Adicionais Pacote Premium:';
        packageColor = '#ef4444';
    }

    const packageRow = document.getElementById('rev-sum-package-row');
    const packageLabel = document.getElementById('rev-sum-package-label');
    const packageCost = document.getElementById('rev-sum-package-cost');

    if (packageRow) {
        if (selectedPackageName !== 'fabrica') {
            packageRow.style.display = 'flex';
            if (packageLabel) packageLabel.innerText = adjustmentLabel;
            if (packageCost) {
                packageCost.innerText = '+' + formatCurrency(adjustmentAmount);
                packageCost.style.color = packageColor;
            }
        } else {
            packageRow.style.display = 'none';
        }
    }

    document.getElementById('rev-sum-parts-cost').innerText = formatCurrency(subtotalPecas);
    document.getElementById('rev-sum-mo-cost').innerText = formatCurrency(moSubtotal);
    document.getElementById('rev-sum-total-cost').innerText = formatCurrency(finalPrice);

    // Re-renderizar ícones Lucide para garantir que o ícone do botão seja desenhado
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}


// ==========================================
// 4. TABELA GERAL (ABA 3)
// ==========================================
function initTabelaGeral() {
    const searchInput = document.getElementById('tabela-geral-search-input');

    renderTabelaGeral();

    searchInput.addEventListener('input', (e) => {
        renderTabelaGeral(e.target.value);
    });
}

function renderTabelaGeral(filterText = '') {
    const tbody = document.getElementById('tabela-geral-body');
    tbody.innerHTML = '';

    const carNames = Object.keys(fiatData.modelos)
        .filter(name => name.toLowerCase() !== '500e')
        .sort(compareCarNames);

    carNames.forEach(name => {
        if (filterText && !name.toLowerCase().includes(filterText.toLowerCase())) {
            return;
        }

        const car = fiatData.modelos[name];
        const tr = document.createElement('tr');
        tr.className = 'highlight-row';

        let revCells = '';
        let totalAcumulado10 = 0;

        for (let i = 0; i < 10; i++) {
            const cost = car.custos_totais[i];
            if (cost !== undefined) {
                revCells += `<td class="text-right">${formatCurrency(cost)}</td>`;
                totalAcumulado10 += cost;
            } else {
                revCells += `<td class="text-right" style="color: var(--text-muted);">-</td>`;
            }
        }

        tr.innerHTML = `
            <td class="item-name-cell" style="font-weight: 600;">${name}</td>
            ${revCells}
            <td class="text-right td-total-highlight" style="color: var(--accent-red); font-weight: 700;">${formatCurrency(totalAcumulado10)}</td>
        `;

        tbody.appendChild(tr);
    });
}

// ==========================================
// 5. TROCA DE ÓLEO (ABA 4 - MANTIDA IDÊNTICA)
// ==========================================
function initTrocaOleo() {
    const searchInput = document.getElementById('oil-model-search');
    const rootListContainer = document.getElementById('oil-root-list-container');
    const listContainer = document.getElementById('oil-vehicle-list-container');

    const carNames = Object.keys(fiatData.modelos)
        .filter(name => name.toLowerCase() !== '500e' && name.toLowerCase() !== 'e-scudo')
        .sort(compareCarNames);

    const rootGroups = {};
    carNames.forEach((name) => {
        const root = getRootModel(name);
        if (!rootGroups[root]) {
            rootGroups[root] = [];
        }
        rootGroups[root].push(name);
    });

    const rootModelsList = Object.keys(rootGroups).sort();

    function renderRootList(filterText = '') {
        rootListContainer.innerHTML = '';
        const filteredRoots = rootModelsList.filter(root =>
            root.toLowerCase().includes(filterText.toLowerCase())
        );

        filteredRoots.forEach((root) => {
            const btn = document.createElement('button');
            btn.className = 'root-model-btn';
            if (selectedRootModel === root) {
                btn.classList.add('active');
            }
            btn.innerHTML = `<span>${root}</span>`;

            btn.addEventListener('click', () => {
                rootListContainer.querySelectorAll('.root-model-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedRootModel = root;
                renderVersionList();
            });

            rootListContainer.appendChild(btn);
        });
    }

    function renderVersionList() {
        listContainer.innerHTML = '';

        if (!selectedRootModel) return;

        const versions = rootGroups[selectedRootModel] || [];

        versions.forEach((name) => {
            const btn = document.createElement('button');
            btn.className = 'model-item-btn oil-model-btn';
            if (currentOilCar && currentOilCar.modelo === name) {
                btn.classList.add('active');
            }

            const parsed = parseVersionName(name);
            const subtitleHtml = parsed.subtitle ? `<span class="version-subtitle">${parsed.subtitle}</span>` : '';
            btn.innerHTML = `
                <div class="version-info">
                    <span class="version-title">${parsed.title}</span>
                    ${subtitleHtml}
                </div>
                <i data-lucide="chevron-right" class="chevron"></i>
            `;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.oil-model-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectOilCar(name);
            });
            listContainer.appendChild(btn);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    searchInput.addEventListener('input', (e) => {
        renderRootList(e.target.value);
    });

    if (rootModelsList.length > 0) {
        selectedRootModel = rootModelsList.includes("TORO") ? "TORO" : rootModelsList[0];
        renderRootList();
        renderVersionList();
    }
}

function selectOilCar(carName) {
    try {
        currentOilCar = fiatData.modelos[carName];

        let defaultHours = 0.15;
        const nameLower = carName.toLowerCase();
        if (nameLower.includes('titano') ||
            nameLower.includes('scudo') ||
            nameLower.includes('toro') ||
            nameLower.includes('ducato')) {
            defaultHours = 0.30;
        }

        document.getElementById('oil-car-name').innerText = currentOilCar.modelo;

        const welcomeCover = document.getElementById('oil-welcome-cover');
        const combustionContainer = document.getElementById('oil-combustion-container');
        const electricAlert = document.getElementById('oil-electric-alert');

        if (welcomeCover) welcomeCover.style.display = 'none';

        const isElectric = carName.toLowerCase() === '500e' || carName.toLowerCase() === 'e-scudo';
        if (isElectric) {
            combustionContainer.style.display = 'none';
            electricAlert.style.display = 'block';
            electricAlert.classList.remove('hidden');

            const pElem = electricAlert.querySelector('p');
            if (pElem) {
                pElem.innerHTML = `
                    O <strong>${currentOilCar.modelo}</strong> utiliza propulsão 100% elétrica. Por não possuir motor a combustão interna, ele <strong>não necessita de óleo lubrificante de motor</strong> nem filtro de óleo, resultando em um custo de <strong>R$ 0,00</strong> para este serviço.
                `;
            }

            document.getElementById('oil-total-price').innerText = 'R$ 0,00';
            return;
        }

        combustionContainer.style.display = 'block';
        combustionContainer.classList.remove('hidden');
        electricAlert.style.display = 'none';

        const partsTableBody = document.getElementById('oil-parts-table-body');
        partsTableBody.innerHTML = '';

        const firstRevName = currentOilCar.revisoes[0];

        let subtotalPecas = 0;
        let moHoras = 0;
        let moPrecoHora = 0;
        let moSubtotal = 0;
        let indexItem = 0;

        currentOilCar.itens.forEach(item => {
            const qty = item.trocas[firstRevName];
            const custo = item.custos[firstRevName];

            if (item.tipo === 'serviço' && qty !== undefined && qty > 0) {
                moHoras = defaultHours;
                moPrecoHora = parseFloat(item.preco_unitario) || 0;
                moSubtotal = moHoras * moPrecoHora;
            }

            const nameLower = item.nome.toLowerCase();

            const isFiltroOleo = item.tipo === 'peça' &&
                (nameLower.includes('filtro de óleo') ||
                    nameLower.includes('filtro óleo') ||
                    nameLower.includes('filtro de oleo') ||
                    nameLower.includes('filtro oleo') ||
                    nameLower.includes('filtrante do filtro óleo') ||
                    nameLower.includes('filtrante do óleo') ||
                    nameLower.includes('filtrante de óleo') ||
                    nameLower.includes('filtrante de oleo') ||
                    nameLower.includes('filtrante do filtro oleo') ||
                    nameLower.includes('filtrante do oleo'));

            const isOleoMotor = item.tipo === 'peça' &&
                (nameLower.includes('mopar maxpro') ||
                    nameLower.includes('oleo motor') ||
                    nameLower.includes('óleo motor') ||
                    nameLower.includes('selenia') ||
                    nameLower.includes('ineo') ||
                    nameLower.includes('0w20') ||
                    nameLower.includes('5w30') ||
                    nameLower.includes('0w30')) &&
                !(nameLower.includes('cambio') ||
                    nameLower.includes('câmbio') ||
                    nameLower.includes('diferencial') ||
                    nameLower.includes('freio') ||
                    nameLower.includes('caixa') ||
                    nameLower.includes('transferência') ||
                    nameLower.includes('direção'));

            if (isFiltroOleo || isOleoMotor) {
                const itemQty = (qty !== undefined && qty > 0) ? qty : 1;
                const precoUnit = parseFloat(item.preco_unitario) || 0;
                const totalItem = (custo !== undefined && qty !== undefined && qty > 0) ? parseFloat(custo) : (itemQty * precoUnit);

                subtotalPecas += totalItem;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="item-name-cell" data-label="Componente">${item.nome}</td>
                    <td data-label="Código (PN)"><span class="item-pn">${item.pn}</span></td>
                    <td class="text-right" data-label="Preço Unit.">${formatCurrency(precoUnit)}</td>
                    <td class="text-right td-highlight" data-label="QTD">${itemQty}</td>
                    <td class="text-right td-highlight" data-label="Subtotal">${formatCurrency(totalItem)}</td>
                `;
                partsTableBody.appendChild(tr);
                indexItem++;
            }
        });

        if (indexItem === 0) {
            partsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        Nenhum componente de óleo ou filtro identificado para este modelo.
                    </td>
                </tr>
            `;
        }

        if (moSubtotal === 0) {
            moHoras = defaultHours;
            moPrecoHora = 349.0;
            moSubtotal = moHoras * moPrecoHora;
        }

        const custoTotalTroca = subtotalPecas + moSubtotal;

        document.getElementById('oil-mo-hours').innerText = `${moHoras.toFixed(2)}h`;
        document.getElementById('oil-mo-rate').innerText = formatCurrency(moPrecoHora);
        document.getElementById('oil-mo-subtotal').innerText = formatCurrency(moSubtotal);

        document.getElementById('oil-sum-parts-cost').innerText = formatCurrency(subtotalPecas);
        document.getElementById('oil-sum-mo-cost').innerText = formatCurrency(moSubtotal);
        document.getElementById('oil-sum-total-cost').innerText = formatCurrency(custoTotalTroca);
        document.getElementById('oil-total-price').innerText = formatCurrency(custoTotalTroca);
    } catch (err) {
        console.error("Erro ao selecionar o veículo para óleo:", err);
        alert("Erro ao selecionar o veículo: " + err.message);
    }
}
