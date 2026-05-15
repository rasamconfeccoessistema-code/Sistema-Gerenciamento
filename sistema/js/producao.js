// ============================================================
// PRODUCAO.JS
// Módulo de controle de produção - Visão Gerencial por Lote
// Facção de Jeans - Sistema de Gestão
// ============================================================

// Estado local dos filtros da Produção
let filtrosProducao = {
  status: "",
  clienteId: "",
  dataInicio: "",
  dataFim: "",
};

// ============================================================
// CARREGAMENTO DA TELA DE PRODUÇÃO
// ============================================================
async function loadProducao() {
  await loadResumoProducao();
  await loadLotesAtivos();
}

// ============================================================
// CARDS DE RESUMO DA PRODUÇÃO
// ============================================================
async function loadResumoProducao() {
  try {
    const hoje = todayISO();
    const { data: lotes, error } = await supabase
      .from("service_orders")
      .select(
        "status, order_number, expected_delivery, updated_at, started_date",
      )
      .not("status", "in", '("entregue","cancelado")');

    if (error) return;

    let emCostura = 0,
      recebidos = 0,
      emRevisao = 0,
      costurados = 0,
      atrasados = 0;
    const agora = new Date();

    if (lotes) {
      lotes.forEach((lote) => {
        switch (lote.status) {
          case "recebido":
            recebidos++;
            break;
          case "em_costura":
            emCostura++;
            break;
          case "costurado":
            costurados++;
            break;
          case "em_revisao":
            emRevisao++;
            break;
        }
        const prazo = new Date(lote.expected_delivery);
        if (prazo < agora && !["entregue", "cancelado"].includes(lote.status)) {
          atrasados++;
        }
      });
    }

    const { count: entreguesHoje } = await supabase
      .from("service_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "entregue")
      .gte("updated_at", hoje)
      .lte("updated_at", hoje + "T23:59:59");

    let cardsContainer = document.querySelector("#page-producao .cards-grid");
    if (!cardsContainer) {
      cardsContainer = document.createElement("div");
      cardsContainer.className = "cards-grid";
      const pageHeader = document.querySelector("#page-producao .page-header");
      if (pageHeader)
        pageHeader.insertAdjacentElement("afterend", cardsContainer);
    }

    cardsContainer.innerHTML = `
      <div class="card card-dark">
        <div class="card-icon"><i class="ph ph-sewing-needle"></i></div>
        <div class="card-info">
          <span class="card-label">Em Costura</span>
          <span class="card-value">${emCostura}</span>
          <span class="card-detail">lotes em andamento</span>
        </div>
      </div>
      <div class="card card-pink-light">
        <div class="card-icon"><i class="ph ph-hourglass"></i></div>
        <div class="card-info">
          <span class="card-label">Aguardando Início</span>
          <span class="card-value">${recebidos}</span>
          <span class="card-detail">lotes parados</span>
        </div>
      </div>
      <div class="card card-gold">
        <div class="card-icon"><i class="ph ph-check-circle"></i></div>
        <div class="card-info">
          <span class="card-label">Costurados</span>
          <span class="card-value">${costurados}</span>
          <span class="card-detail">aguardando revisão/entrega</span>
        </div>
      </div>
      <div class="card card-pink">
        <div class="card-icon"><i class="ph ph-warning-circle"></i></div>
        <div class="card-info">
          <span class="card-label">Em Revisão</span>
          <span class="card-value">${emRevisao}</span>
          <span class="card-detail">peças com defeito</span>
        </div>
      </div>
      <div class="card" style="border: 1px solid rgba(255, 82, 82, 0.3);">
        <div class="card-icon" style="background: rgba(255, 82, 82, 0.15); color: #ff8a80;">
          <i class="ph ph-timer"></i>
        </div>
        <div class="card-info">
          <span class="card-label">Atrasados</span>
          <span class="card-value" style="color: ${atrasados > 0 ? "var(--error)" : "var(--white)"};">${atrasados}</span>
          <span class="card-detail">lotes com prazo vencido</span>
        </div>
      </div>
      <div class="card" style="border: 1px solid rgba(76, 175, 80, 0.3);">
        <div class="card-icon" style="background: rgba(76, 175, 80, 0.15); color: #a5d6a7;">
          <i class="ph ph-truck"></i>
        </div>
        <div class="card-info">
          <span class="card-label">Entregues Hoje</span>
          <span class="card-value">${entreguesHoje || 0}</span>
          <span class="card-detail">lotes enviados hoje</span>
        </div>
      </div>
    `;
  } catch (e) {
    console.error("Erro ao carregar resumo da produção:", e);
  }
}

// ============================================================
// CARREGAR LOTES ATIVOS
// ============================================================
async function loadLotesAtivos() {
  try {
    let query = supabase
      .from("service_orders")
      .select(
        `id, order_number, product_description, product_reference,
         total_quantity, unit_price, total, received_date, expected_delivery,
         status, notes, created_at, updated_at, started_date,
         customers(company_name, trade_name, contact_name, phone)`,
      )
      .order("expected_delivery", { ascending: true });

    if (!filtrosProducao.status) {
      query = query.not("status", "in", '("entregue","cancelado")');
    } else {
      query = query.eq("status", filtrosProducao.status);
    }
    if (filtrosProducao.clienteId)
      query = query.eq("customer_id", filtrosProducao.clienteId);
    if (filtrosProducao.dataInicio)
      query = query.gte("received_date", filtrosProducao.dataInicio);
    if (filtrosProducao.dataFim)
      query = query.lte("received_date", filtrosProducao.dataFim);

    const { data: lotes, error } = await query;
    if (error) {
      console.error("Erro ao carregar lotes:", error);
      return;
    }

    const osIds = lotes ? lotes.map((l) => l.id) : [];
    let progressoMap = {};
    if (osIds.length > 0) {
      const { data: items } = await supabase
        .from("service_order_items")
        .select("service_order_id, quantity, sewn_quantity, delivered_quantity")
        .in("service_order_id", osIds);
      if (items) {
        items.forEach((item) => {
          if (!progressoMap[item.service_order_id]) {
            progressoMap[item.service_order_id] = {
              total: 0,
              costurado: 0,
              entregue: 0,
            };
          }
          progressoMap[item.service_order_id].total += item.quantity;
          progressoMap[item.service_order_id].costurado +=
            item.sewn_quantity || 0;
          progressoMap[item.service_order_id].entregue +=
            item.delivered_quantity || 0;
        });
      }
    }

    renderizarTabelaLotes(lotes || [], progressoMap);
    configurarEventosAcoesProducao(); // Ativar eventos dos menus de ação
  } catch (e) {
    console.error("Erro ao carregar lotes ativos:", e);
  }
}

// ============================================================
// RENDERIZAÇÃO DA TABELA DE LOTES (com gaveta de ações)
// ============================================================
function renderizarTabelaLotes(lotes, progressoMap) {
  const tbody = document.querySelector("#table-lotes-ativos tbody");
  if (!tbody) return;

  const theadRow = document.querySelector("#table-lotes-ativos thead tr");
  if (theadRow) {
    theadRow.innerHTML = `
      <th>Nº OS</th>
      <th>Cliente</th>
      <th>Produto</th>
      <th style="text-align:center;">Peças</th>
      <th>Progresso</th>
      <th style="text-align:center;">Total</th>
      <th style="text-align:center;">Status</th>
      <th style="text-align:center;">Recebimento</th>
      <th style="text-align:center;">Início Costura</th>
      <th style="text-align:center;">Prazo</th>
      <th style="text-align:center; width: 60px;">Ações</th>
    `;
  }

  if (!lotes || lotes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center" style="padding: 40px; color: var(--gray);">
          <i class="ph ph-sewing-needle" style="font-size: 2rem; display: block; margin-bottom: 12px;"></i>
          Nenhum lote encontrado.
        </td>
      </tr>
    `;
    return;
  }

  const hoje = new Date();
  tbody.innerHTML = lotes
    .map((lote) => {
      const statusFormatado = formatStatus(lote.status);
      const dataPrazo = lote.expected_delivery
        ? formatDate(lote.expected_delivery)
        : "-";
      const dataRecebimento = lote.received_date
        ? formatDate(lote.received_date)
        : "-";
      const dataInicio = lote.started_date
        ? formatDate(lote.started_date)
        : "—";
      const nomeCliente =
        lote.customers?.trade_name || lote.customers?.company_name || "-";
      const totalFormatado = formatCurrency(
        lote.total || lote.total_quantity * lote.unit_price,
      );
      const prazo = new Date(lote.expected_delivery);
      const atrasado =
        prazo < hoje && !["entregue", "cancelado"].includes(lote.status);
      const diffDays = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
      let prazoInfo = dataPrazo;
      if (atrasado)
        prazoInfo = `<span style="color: var(--error); font-weight: 600;">${dataPrazo} (${Math.abs(diffDays)} dias atraso)</span>`;
      else if (diffDays <= 3)
        prazoInfo = `<span style="color: var(--warning); font-weight: 600;">${dataPrazo} (${diffDays} dias)</span>`;

      const prog = progressoMap[lote.id] || {
        total: lote.total_quantity,
        costurado: 0,
        entregue: 0,
      };
      const percentCosturado =
        prog.total > 0 ? Math.round((prog.costurado / prog.total) * 100) : 0;
      const percentEntregue =
        prog.total > 0 ? Math.round((prog.entregue / prog.total) * 100) : 0;
      const progressoHtml = `
        <div style="font-size: 0.7rem; color: var(--gray);">
          ${prog.costurado}/${prog.total} cost.
          <div style="height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; margin: 2px 0;">
            <div style="height: 100%; width: ${percentCosturado}%; background: var(--gold); border-radius: 2px;"></div>
          </div>
          ${prog.entregue}/${prog.total} entr.
          <div style="height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; margin: 2px 0;">
            <div style="height: 100%; width: ${percentEntregue}%; background: var(--pink); border-radius: 2px;"></div>
          </div>
        </div>
      `;

      const menuId = `menu-prod-${lote.id}`;
      // Reutiliza a função global de menu de ações do módulo de OS
      const menuItems =
        typeof gerarMenuAcoes === "function"
          ? gerarMenuAcoes(lote, menuId)
          : "";

      let rowStyle = "";
      if (atrasado) rowStyle = 'style="border-left: 3px solid var(--error);"';
      else if (lote.status === "recebido")
        rowStyle = 'style="border-left: 3px solid var(--gray);"';
      else if (lote.status === "em_costura")
        rowStyle = 'style="border-left: 3px solid #2196f3;"';
      else if (lote.status === "costurado")
        rowStyle = 'style="border-left: 3px solid #4caf50;"';
      else if (lote.status === "em_revisao")
        rowStyle = 'style="border-left: 3px solid var(--warning);"';

      return `
        <tr ${rowStyle}>
          <td>
            <strong style="color: var(--gold-light);">${lote.order_number}</strong>
            ${atrasado ? '<br><span style="color: var(--error); font-size: 0.7rem;">⚠️ Atrasado</span>' : ""}
          </td>
          <td>${nomeCliente}</td>
          <td>${lote.product_description || "-"}</td>
          <td class="text-center">${lote.total_quantity}</td>
          <td>${progressoHtml}</td>
          <td class="text-center">${totalFormatado}</td>
          <td class="text-center"><span class="status-badge status-${lote.status}">${statusFormatado}</span></td>
          <td class="text-center">${dataRecebimento}</td>
          <td class="text-center">${dataInicio}</td>
          <td class="text-center">${prazoInfo}</td>
          <td class="text-center">
            <button class="btn-actions-trigger" data-menu-id="${menuId}" title="Ações">
              <i class="ph ph-gear-six"></i>
            </button>
            <div id="${menuId}" class="dropdown-actions-menu" style="display: none;">
              ${menuItems}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ============================================================
// CONFIGURAR EVENTOS DOS MENUS DE AÇÃO (cópia da lógica do OS)
// ============================================================
function configurarEventosAcoesProducao() {
  document.querySelectorAll(".btn-actions-trigger").forEach((btn) => {
    btn.removeEventListener("click", handleProdActionTrigger);
    btn.addEventListener("click", handleProdActionTrigger);
  });

  document.removeEventListener("click", fecharMenusProducao);
  document.addEventListener("click", fecharMenusProducao);
}

function handleProdActionTrigger(e) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const menuId = btn.dataset.menuId;
  const menu = document.getElementById(menuId);
  if (!menu) return;

  document.querySelectorAll(".dropdown-actions-menu").forEach((m) => {
    if (m.id !== menuId) {
      m.style.display = "none";
      m.classList.remove("show");
    }
  });

  const isOpen = menu.classList.contains("show");
  if (isOpen) {
    menu.style.display = "none";
    menu.classList.remove("show");
  } else {
    const rect = btn.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = rect.bottom + 4 + "px";
    menu.style.left = Math.min(rect.left, window.innerWidth - 240) + "px";
    menu.style.display = "block";
    menu.classList.add("show");
    menu.style.zIndex = "9999";
  }
}

function fecharMenusProducao(e) {
  if (
    !e.target.closest(".btn-actions-trigger") &&
    !e.target.closest(".dropdown-actions-menu")
  ) {
    document.querySelectorAll(".dropdown-actions-menu").forEach((m) => {
      m.style.display = "none";
      m.classList.remove("show");
    });
  }
}

// ============================================================
// BARRA DE FILTROS AVANÇADA
// ============================================================
function setupFiltrosProducao() {
  const panelHeader = document.querySelector("#page-producao .panel-header");
  if (!panelHeader) return;
  if (document.getElementById("filtros-producao")) return;

  const filtrosHTML = `
    <div id="filtros-producao" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 8px;">
      <select id="filtroStatusProducao" class="form-select" style="width: auto; min-width: 160px;">
        <option value="">Todos Ativos</option>
        <option value="recebido">Recebido</option>
        <option value="em_costura">Em Costura</option>
        <option value="costurado">Costurado</option>
        <option value="em_revisao">Em Revisão</option>
        <option value="entregue">Entregue</option>
        <option value="cancelado">Cancelado</option>
        <option value="parcialmente_entregue">Parcialmente Entregue</option>
      </select>

      <div style="position: relative; flex: 1; min-width: 200px;">
        <input type="text" id="filtroClienteProducao" class="form-input" placeholder="Filtrar por cliente..." autocomplete="off">
        <div id="filtroClienteProducaoDropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: var(--black-medium); border: 1px solid rgba(255,255,255,0.1); border-radius: 0 0 8px 8px; max-height: 200px; overflow-y: auto; display: none; z-index: 25;"></div>
      </div>

      <input type="date" id="filtroDataInicioProducao" class="form-input" style="width: auto;" title="Data início (recebimento)">
      <input type="date" id="filtroDataFimProducao" class="form-input" style="width: auto;" title="Data fim (recebimento)">

      <button id="btnLimparFiltrosProducao" class="btn btn-ghost btn-sm">
        <i class="ph ph-funnel-x"></i> Limpar
      </button>
    </div>
  `;

  panelHeader.insertAdjacentHTML("beforeend", filtrosHTML);

  $("#filtroStatusProducao")?.addEventListener("change", function () {
    filtrosProducao.status = this.value;
    loadProducao();
  });
  $("#filtroDataInicioProducao")?.addEventListener("change", function () {
    filtrosProducao.dataInicio = this.value;
    loadProducao();
  });
  $("#filtroDataFimProducao")?.addEventListener("change", function () {
    filtrosProducao.dataFim = this.value;
    loadProducao();
  });
  $("#btnLimparFiltrosProducao")?.addEventListener("click", function () {
    filtrosProducao = {
      status: "",
      clienteId: "",
      dataInicio: "",
      dataFim: "",
    };
    $("#filtroStatusProducao").value = "";
    $("#filtroClienteProducao").value = "";
    $("#filtroDataInicioProducao").value = "";
    $("#filtroDataFimProducao").value = "";
    loadProducao();
  });

  const inputCliente = document.getElementById("filtroClienteProducao");
  const dropdownCliente = document.getElementById(
    "filtroClienteProducaoDropdown",
  );

  inputCliente?.addEventListener("input", async function () {
    const termo = this.value.trim();
    if (termo.length < 2) {
      dropdownCliente.style.display = "none";
      return;
    }
    const { data: clientes } = await supabase
      .from("customers")
      .select("id, company_name, trade_name")
      .or(`company_name.ilike.%${termo}%,trade_name.ilike.%${termo}%`)
      .eq("active", true)
      .limit(10);
    if (clientes?.length) {
      dropdownCliente.innerHTML = clientes
        .map(
          (c) =>
            `<div class="dropdown-item" data-id="${c.id}" style="cursor: pointer; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">${c.trade_name || c.company_name}</div>`,
        )
        .join("");
      dropdownCliente.style.display = "block";
    } else {
      dropdownCliente.innerHTML =
        '<div style="padding: 8px 12px; color: var(--gray);">Nenhum cliente</div>';
      dropdownCliente.style.display = "block";
    }
  });

  dropdownCliente?.addEventListener("click", function (e) {
    const item = e.target.closest(".dropdown-item");
    if (item) {
      inputCliente.value = item.textContent;
      filtrosProducao.clienteId = item.dataset.id;
      dropdownCliente.style.display = "none";
      loadProducao();
    }
  });

  document.addEventListener("click", function (e) {
    if (
      !inputCliente?.contains(e.target) &&
      !dropdownCliente?.contains(e.target)
    ) {
      dropdownCliente.style.display = "none";
    }
  });
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function initProducao() {
  setupFiltrosProducao();
}

// ============================================================
// EXPORTAÇÃO GLOBAL
// ============================================================
window.loadProducao = loadProducao;
window.loadResumoProducao = loadResumoProducao;
window.loadLotesAtivos = loadLotesAtivos;
window.initProducao = initProducao;
