// ============================================================
// ORDENS-SERVICO.JS
// Módulo de gestão de Ordens de Serviço
// Facção de Jeans - Sistema de Gestão
// ============================================================

if (typeof openFormModal !== "function") {
  console.error(
    "ERRO: openFormModal não está definida. Carregue modals.js antes deste módulo.",
  );
}
if (typeof $ !== "function") {
  console.error(
    "ERRO: $ não está definido. Carregue utils.js antes deste módulo.",
  );
}

// ============================================================
// VARIÁVEIS DE ESTADO
// ============================================================
let filtrosAtivos = {
  status: "",
  clienteId: "",
  dataInicio: "",
  dataFim: "",
};

const LIMITE_PADRAO = 20;
let limiteAtual = LIMITE_PADRAO;
let totalRegistros = 0;

// ============================================================
// CORREÇÃO VISUAL DE SELECTS
// ============================================================
function aplicarEstiloSelects() {
  document.querySelectorAll("select.form-select").forEach((select) => {
    select.style.backgroundColor = "var(--black-medium, #2a2a2a)";
    select.style.color = "var(--white, #f5f5f5)";
    select.style.border = "1px solid rgba(255,255,255,0.1)";
    select.addEventListener("mouseenter", () => {
      select.style.borderColor = "var(--pink, #e91e63)";
    });
    select.addEventListener("mouseleave", () => {
      select.style.borderColor = "rgba(255,255,255,0.1)";
    });
  });
}

// ============================================================
// MÁSCARA DE CNPJ SIMPLES
// ============================================================
function mascararCNPJ(input) {
  input.addEventListener("input", function () {
    let val = this.value.replace(/\D/g, "");
    if (val.length > 14) val = val.slice(0, 14);
    if (val.length > 2) val = val.slice(0, 2) + "." + val.slice(2);
    if (val.length > 6) val = val.slice(0, 6) + "." + val.slice(6);
    if (val.length > 10) val = val.slice(0, 10) + "/" + val.slice(10);
    if (val.length > 15) val = val.slice(0, 15) + "-" + val.slice(15);
    this.value = val;
  });
}

// ============================================================
// CARREGAMENTO DA LISTA DE ORDENS DE SERVIÇO
// ============================================================
async function loadOrdensServico(resetLimite = true) {
  if (resetLimite) limiteAtual = LIMITE_PADRAO;

  const term = ($("#searchInput")?.value || "").trim().toLowerCase();

  let query = supabase
    .from("service_orders")
    .select(
      `id, order_number, customer_id, product_description, product_reference,
       total_quantity, unit_price, total, received_date, expected_delivery,
       status, notes, created_at, updated_at, started_date,
       customers(company_name, trade_name, contact_name, phone)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (term && AppState.currentPage === "ordens-servico") {
    query = query.or(
      `order_number.ilike.%${term}%,product_description.ilike.%${term}%,product_reference.ilike.%${term}%,customers.company_name.ilike.%${term}%,customers.trade_name.ilike.%${term}%`,
    );
  }

  if (filtrosAtivos.status) {
    query = query.eq("status", filtrosAtivos.status);
  } else {
    query = query.not("status", "in", '("entregue","cancelado")');
  }
  if (filtrosAtivos.clienteId)
    query = query.eq("customer_id", filtrosAtivos.clienteId);
  if (filtrosAtivos.dataInicio)
    query = query.gte("received_date", filtrosAtivos.dataInicio);
  if (filtrosAtivos.dataFim)
    query = query.lte("received_date", filtrosAtivos.dataFim);

  query = query.limit(limiteAtual);

  const { data, error, count } = await query;
  if (error) {
    console.error("Erro ao carregar ordens de serviço:", error);
    showFeedback("Erro", "Falha ao carregar ordens de serviço.", "error");
    return;
  }

  totalRegistros = count || 0;
  const hoje = new Date();

  // Mapa de progresso
  const osIds = data ? data.map((os) => os.id) : [];
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

  // Cards de resumo
  const countEmProducao = data
    ? data.filter((os) => ["em_costura", "em_revisao"].includes(os.status))
        .length
    : 0;
  const countAtrasadas = data
    ? data.filter((os) => {
        const prazo = new Date(os.expected_delivery);
        return prazo < hoje && !["entregue", "cancelado"].includes(os.status);
      }).length
    : 0;
  const countEntregues = data
    ? data.filter((os) => os.status === "entregue").length
    : 0;

  let cardsContainer = document.querySelector(
    "#page-ordens-servico .cards-grid",
  );
  if (!cardsContainer) {
    cardsContainer = document.createElement("div");
    cardsContainer.className = "cards-grid";
    const pageHeader = document.querySelector(
      "#page-ordens-servico .page-header",
    );
    if (pageHeader)
      pageHeader.insertAdjacentElement("afterend", cardsContainer);
  }
  cardsContainer.innerHTML = `
    <div class="card card-pink">
      <div class="card-icon"><i class="ph ph-files"></i></div>
      <div class="card-info">
        <span class="card-label">Total de OS</span>
        <span class="card-value">${totalRegistros}</span>
        <span class="card-detail">ordens ativas</span>
      </div>
    </div>
    <div class="card card-dark">
      <div class="card-icon"><i class="ph ph-sewing-needle"></i></div>
      <div class="card-info">
        <span class="card-label">Em Produção</span>
        <span class="card-value">${countEmProducao}</span>
        <span class="card-detail">em costura ou revisão</span>
      </div>
    </div>
    <div class="card card-gold">
      <div class="card-icon"><i class="ph ph-truck"></i></div>
      <div class="card-info">
        <span class="card-label">Entregues</span>
        <span class="card-value">${countEntregues}</span>
        <span class="card-detail">lotes finalizados</span>
      </div>
    </div>
    <div class="card card-pink-light">
      <div class="card-icon"><i class="ph ph-warning-circle"></i></div>
      <div class="card-info">
        <span class="card-label">Atrasadas</span>
        <span class="card-value" style="color: ${countAtrasadas > 0 ? "var(--error)" : "inherit"};">
          ${countAtrasadas}
        </span>
        <span class="card-detail">prazo vencido</span>
      </div>
    </div>
  `;

  garantirFiltrosOS();

  const tbody = $("#table-ordens-servico tbody");
  if (!tbody) return;

  const theadRow = document.querySelector("#table-ordens-servico thead tr");
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
      <th style="text-align:center;">Início Cost.</th>
      <th style="text-align:center;">Prazo</th>
      <th style="text-align:center; width: 60px;">Ações</th>
    `;
  }

  if (!data || !data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center" style="padding: 40px; color: var(--gray);">
          <i class="ph ph-files" style="font-size: 2rem; display: block; margin-bottom: 12px;"></i>
          Nenhuma ordem de serviço encontrada.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = data
      .map((os) => {
        const statusFormatado = formatStatus(os.status);
        const dataPrazo = os.expected_delivery
          ? formatDate(os.expected_delivery)
          : "-";
        const dataRecebimento = os.received_date
          ? formatDate(os.received_date)
          : "-";
        const dataInicio = os.started_date ? formatDate(os.started_date) : "—";
        const nomeCliente =
          os.customers?.trade_name || os.customers?.company_name || "-";
        const prazo = new Date(os.expected_delivery);
        const atrasado =
          prazo < hoje && !["entregue", "cancelado"].includes(os.status);
        const totalFormatado = formatCurrency(
          os.total || os.total_quantity * os.unit_price,
        );

        const prog = progressoMap[os.id] || {
          total: os.total_quantity,
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

        const menuId = `menu-os-${os.id}`;
        const menuItems = gerarMenuAcoes(os, menuId);

        return `
          <tr class="${atrasado ? "os-atrasada" : ""}" style="${atrasado ? "background-color: rgba(255, 82, 82, 0.08);" : ""}">
            <td style="word-wrap: break-word;">
              <div style="display: flex; align-items: center; gap: 4px;">
                ${atrasado ? '<i class="ph ph-timer" style="color: var(--error);" title="Atrasada"></i>' : ""}
                <strong style="color: var(--gold-light);">${os.order_number}</strong>
              </div>
              ${atrasado ? `<span style="color: var(--error); font-size: 0.65rem;">⚠️ ${Math.abs(Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24)))} dias</span>` : ""}
            </td>
            <td style="word-wrap: break-word;">${nomeCliente}</td>
            <td style="word-wrap: break-word;">
              ${os.product_description || "-"}
              ${os.product_reference ? `<br><small>Ref: ${os.product_reference}</small>` : ""}
            </td>
            <td class="text-center">${os.total_quantity}</td>
            <td>${progressoHtml}</td>
            <td class="text-center">${totalFormatado}</td>
            <td class="text-center">
              <span class="status-badge status-${os.status}">${statusFormatado}</span>
            </td>
            <td class="text-center">${dataRecebimento}</td>
            <td class="text-center">${dataInicio}</td>
            <td class="text-center">
              <span style="${atrasado ? "color: var(--error); font-weight: 600;" : ""}">${dataPrazo}</span>
            </td>
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

    // Configurar eventos dos botões de ação
    configurarEventosAcoes();
  }

  // Paginação
  const paginacaoDiv = document.getElementById("paginacaoOS");
  if (totalRegistros > limiteAtual) {
    if (!paginacaoDiv) {
      const div = document.createElement("div");
      div.id = "paginacaoOS";
      div.style.cssText = "text-align: center; margin-top: 16px;";
      const panelBody = document.querySelector(
        "#page-ordens-servico .panel-body",
      );
      if (panelBody) panelBody.appendChild(div);
    }
    if (document.getElementById("paginacaoOS")) {
      document.getElementById("paginacaoOS").innerHTML = `
        <button class="btn btn-ghost" id="btnCarregarMais" style="width: 100%;">
          <i class="ph ph-plus-circle"></i> Carregar mais (${totalRegistros - limiteAtual} restantes)
        </button>
      `;
      document
        .getElementById("btnCarregarMais")
        ?.addEventListener("click", async () => {
          limiteAtual += LIMITE_PADRAO;
          await loadOrdensServico(false);
        });
    }
  } else if (paginacaoDiv) {
    paginacaoDiv.innerHTML = "";
  }

  // Botão exportar CSV
  if (!document.getElementById("btnExportarOS")) {
    const filtroDiv = document.getElementById("filtrosOS");
    if (filtroDiv) {
      const expBtn = document.createElement("button");
      expBtn.id = "btnExportarOS";
      expBtn.className = "btn btn-ghost btn-sm";
      expBtn.innerHTML = '<i class="ph ph-download-simple"></i> CSV';
      expBtn.title = "Exportar lista atual";
      expBtn.addEventListener("click", exportarCSV);
      filtroDiv.parentNode.insertBefore(expBtn, filtroDiv.nextSibling);
    }
  }

  const novaBtn = document.querySelector("#page-ordens-servico .btn-primary");
  if (novaBtn) novaBtn.setAttribute("data-action", "nova-os");

  aplicarEstiloSelects();
}

// ============================================================
// CONFIGURAR EVENTOS DOS BOTÕES DE AÇÃO (DROPDOWN FIXO)
// ============================================================
function configurarEventosAcoes() {
  // Remove eventos antigos para não duplicar
  document.querySelectorAll(".btn-actions-trigger").forEach((btn) => {
    btn.removeEventListener("click", handleActionTrigger);
    btn.addEventListener("click", handleActionTrigger);
  });

  // Fecha menus ao clicar fora
  document.removeEventListener("click", fecharMenusAcoes);
  document.addEventListener("click", fecharMenusAcoes);
}

function handleActionTrigger(e) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const menuId = btn.dataset.menuId;
  const menu = document.getElementById(menuId);
  if (!menu) return;

  // Fecha todos os outros menus primeiro
  document.querySelectorAll(".dropdown-actions-menu").forEach((m) => {
    if (m.id !== menuId) {
      m.style.display = "none";
      m.classList.remove("show");
    }
  });

  // Alterna o menu atual
  const isOpen = menu.classList.contains("show");
  if (isOpen) {
    menu.style.display = "none";
    menu.classList.remove("show");
  } else {
    // Posiciona o menu fixo na tela com base na posição do botão
    const rect = btn.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = rect.bottom + 4 + "px";
    menu.style.left = Math.min(rect.left, window.innerWidth - 240) + "px";
    menu.style.display = "block";
    menu.classList.add("show");
    menu.style.zIndex = "9999";
  }
}

function fecharMenusAcoes(e) {
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
// GERAR MENU DE AÇÕES (GAVETA)
// ============================================================
function gerarMenuAcoes(os, menuId) {
  const itens = [];

  // Visualizar
  itens.push(`
    <a href="#" class="action-item action-view" data-action="view" data-id="${os.id}" data-menu="${menuId}">
      <i class="ph ph-eye"></i> Visualizar
    </a>
  `);

  // Editar
  itens.push(`
    <a href="#" class="action-item action-edit" data-action="edit" data-id="${os.id}" data-menu="${menuId}">
      <i class="ph ph-pencil-simple"></i> Editar
    </a>
  `);

  itens.push(
    `<div class="dropdown-divider" style="margin: 4px 0; border-color: rgba(255,255,255,0.05);"></div>`,
  );

  // Registrar costura parcial (para status que permitem)
  if (os.status === "recebido" || os.status === "em_costura") {
    itens.push(`
      <a href="#" class="action-item action-register" data-action="register" data-id="${os.id}" data-menu="${menuId}">
        <i class="ph ph-thread"></i> Registrar Costura Parcial
      </a>
    `);
  }

  // Ações específicas de status
  switch (os.status) {
    case "recebido":
      itens.push(`
        <a href="#" class="action-item action-start" data-action="start" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-play"></i> Iniciar Costura
        </a>
      `);
      itens.push(
        `<div class="dropdown-divider" style="margin: 4px 0; border-color: rgba(255,255,255,0.05);"></div>`,
      );
      itens.push(`
        <a href="#" class="action-item action-cancel" data-action="cancel" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-x-circle"></i> Cancelar Lote
        </a>
      `);
      break;
    case "em_costura":
      itens.push(`
        <a href="#" class="action-item action-finish" data-action="finish" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-check-circle"></i> Concluir Costura
        </a>
      `);
      itens.push(`
        <a href="#" class="action-item action-review" data-action="review" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-warning-circle"></i> Enviar para Revisão
        </a>
      `);
      itens.push(
        `<div class="dropdown-divider" style="margin: 4px 0; border-color: rgba(255,255,255,0.05);"></div>`,
      );
      itens.push(`
        <a href="#" class="action-item action-cancel" data-action="cancel" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-x-circle"></i> Cancelar Lote
        </a>
      `);
      break;
    case "costurado":
      itens.push(`
        <a href="#" class="action-item action-deliver" data-action="deliver" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-truck"></i> Marcar como Entregue
        </a>
      `);
      itens.push(`
        <a href="#" class="action-item action-review" data-action="review" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-warning-circle"></i> Enviar para Revisão
        </a>
      `);
      itens.push(
        `<div class="dropdown-divider" style="margin: 4px 0; border-color: rgba(255,255,255,0.05);"></div>`,
      );
      itens.push(`
        <a href="#" class="action-item action-back" data-action="back" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-arrow-u-up-left"></i> Voltar para Costura
        </a>
      `);
      break;
    case "em_revisao":
      itens.push(`
        <a href="#" class="action-item action-deliver" data-action="deliver" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-truck"></i> Marcar como Entregue
        </a>
      `);
      itens.push(`
        <a href="#" class="action-item action-back" data-action="back" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-arrow-u-up-left"></i> Voltar para Costura
        </a>
      `);
      itens.push(
        `<div class="dropdown-divider" style="margin: 4px 0; border-color: rgba(255,255,255,0.05);"></div>`,
      );
      itens.push(`
        <a href="#" class="action-item action-cancel" data-action="cancel" data-id="${os.id}" data-menu="${menuId}">
          <i class="ph ph-x-circle"></i> Cancelar Lote
        </a>
      `);
      break;
  }

  itens.push(
    `<div class="dropdown-divider" style="margin: 4px 0; border-color: rgba(255,255,255,0.05);"></div>`,
  );

  // Duplicar
  itens.push(`
    <a href="#" class="action-item action-duplicate" data-action="duplicate" data-id="${os.id}" data-menu="${menuId}">
      <i class="ph ph-copy"></i> Duplicar
    </a>
  `);

  // Excluir
  itens.push(`
    <a href="#" class="action-item action-delete" data-action="delete" data-id="${os.id}" data-menu="${menuId}">
      <i class="ph ph-trash"></i> Excluir
    </a>
  `);

  return itens.join("");
}

// ============================================================
// DELEGAÇÃO DE EVENTOS DO MENU DE AÇÕES
// ============================================================
document.addEventListener("click", async (e) => {
  const actionItem = e.target.closest(".action-item");
  if (!actionItem) return;

  e.preventDefault();
  const action = actionItem.dataset.action;
  const id = actionItem.dataset.id;
  const menuId = actionItem.dataset.menu;

  // Fecha o menu
  const menu = document.getElementById(menuId);
  if (menu) {
    menu.style.display = "none";
    menu.classList.remove("show");
  }

  // Executa a ação correspondente
  switch (action) {
    case "view":
      await viewOS(id);
      break;
    case "edit":
      await editOS(id);
      break;
    case "register":
      await registrarCosturaParcial(id);
      break;
    case "start":
      await iniciarCostura(id);
      break;
    case "finish":
      await concluirCostura(id);
      break;
    case "review":
      await marcarRevisao(id);
      break;
    case "deliver":
      await marcarEntregue(id);
      break;
    case "back":
      await voltarCostura(id);
      break;
    case "cancel":
      await cancelarLote(id);
      break;
    case "duplicate":
      await duplicateOS(id);
      break;
    case "delete":
      await deleteOS(id);
      break;
  }
});

// ============================================================
// EXPORTAÇÃO CSV
// ============================================================
function exportarCSV() {
  const rows = [];
  const thead = document.querySelectorAll("#table-ordens-servico thead th");
  const headers = Array.from(thead).map((th) => th.textContent.trim());
  rows.push(headers.join(";"));

  const tbody = document.querySelectorAll("#table-ordens-servico tbody tr");
  tbody.forEach((tr) => {
    const cols = tr.querySelectorAll("td");
    const rowData = Array.from(cols).map(
      (td) => `"${td.innerText.replace(/\n/g, " ").trim()}"`,
    );
    rows.push(rowData.join(";"));
  });

  const blob = new Blob(["\uFEFF" + rows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ordens_servico.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// BARRA DE FILTROS DA OS
// ============================================================
function garantirFiltrosOS() {
  const filtroContainer = document.getElementById("filtrosOS");
  if (!filtroContainer) return;

  if (filtroContainer.children.length === 0) {
    filtroContainer.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <select id="filtroStatusOS" class="form-select" style="width: auto; min-width: 160px;">
          <option value="">Ativos (padrão)</option>
          <option value="recebido">Recebido</option>
          <option value="em_costura">Em Costura</option>
          <option value="costurado">Costurado</option>
          <option value="em_revisao">Em Revisão</option>
          <option value="entregue">Entregue</option>
          <option value="cancelado">Cancelado</option>
          <option value="parcialmente_entregue">Parcialmente Entregue</option>
        </select>

        <div style="position: relative; flex: 1; min-width: 200px;">
          <input type="text" id="filtroClienteOS" class="form-input" placeholder="Filtrar por cliente..." autocomplete="off">
          <div id="filtroClienteOSDropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: var(--black-medium); border: 1px solid rgba(255,255,255,0.1); border-radius: 0 0 8px 8px; max-height: 200px; overflow-y: auto; display: none; z-index: 25;"></div>
        </div>

        <input type="date" id="filtroDataInicioOS" class="form-input" style="width: auto;" title="Data início (recebimento)">
        <input type="date" id="filtroDataFimOS" class="form-input" style="width: auto;" title="Data fim (recebimento)">

        <button id="btnLimparFiltrosOS" class="btn btn-ghost btn-sm" title="Limpar filtros">
          <i class="ph ph-funnel-x"></i> Limpar
        </button>
      </div>
    `;

    // Eventos dos filtros
    $("#filtroStatusOS")?.addEventListener("change", function () {
      filtrosAtivos.status = this.value;
      loadOrdensServico();
    });
    $("#filtroDataInicioOS")?.addEventListener("change", function () {
      filtrosAtivos.dataInicio = this.value;
      loadOrdensServico();
    });
    $("#filtroDataFimOS")?.addEventListener("change", function () {
      filtrosAtivos.dataFim = this.value;
      loadOrdensServico();
    });
    $("#btnLimparFiltrosOS")?.addEventListener("click", function () {
      filtrosAtivos = {
        status: "",
        clienteId: "",
        dataInicio: "",
        dataFim: "",
      };
      $("#filtroStatusOS").value = "";
      $("#filtroClienteOS").value = "";
      $("#filtroDataInicioOS").value = "";
      $("#filtroDataFimOS").value = "";
      loadOrdensServico();
    });

    // Autocomplete do campo cliente
    const inputCliente = document.getElementById("filtroClienteOS");
    const dropdownCliente = document.getElementById("filtroClienteOSDropdown");

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
          '<div style="padding: 8px 12px; color: var(--gray);">Nenhum cliente encontrado</div>';
        dropdownCliente.style.display = "block";
      }
    });

    dropdownCliente?.addEventListener("click", function (e) {
      const item = e.target.closest(".dropdown-item");
      if (item) {
        inputCliente.value = item.textContent;
        filtrosAtivos.clienteId = item.dataset.id;
        dropdownCliente.style.display = "none";
        loadOrdensServico();
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
  aplicarEstiloSelects();
}

// ============================================================
// VISUALIZAR ORDEM DE SERVIÇO (DETALHES COMPLETOS)
// ============================================================
async function viewOS(id) {
  const { data: os, error } = await supabase
    .from("service_orders")
    .select(
      `*, customers(company_name, trade_name, contact_name, phone, email, cnpj)`,
    )
    .eq("id", id)
    .single();

  if (error || !os) {
    showFeedback("Erro", "Ordem de Serviço não encontrada.", "error");
    return;
  }

  const { data: items } = await supabase
    .from("service_order_items")
    .select("*")
    .eq("service_order_id", id)
    .order("size");

  const { data: sewingRecords } = await supabase
    .from("sewing_records")
    .select(
      `*, employees(full_name), service_order_items!inner(service_order_id)`,
    )
    .eq("service_order_items.service_order_id", id)
    .order("start_time", { ascending: false })
    .limit(10);

  const { data: shipments } = await supabase
    .from("shipments")
    .select("*")
    .eq("service_order_id", id)
    .order("ship_date", { ascending: false });

  const { data: materiaisConsumidos } = await supabase
    .from("material_consumption")
    .select(`*, material_receipts(material_type, description, unit)`)
    .eq("service_order_id", id);

  const totalPecas = items?.length
    ? items.reduce((sum, i) => sum + i.quantity, 0)
    : os.total_quantity;
  const valorTotal = os.total || totalPecas * os.unit_price;
  const statusFormatado = formatStatus(os.status);
  const hoje = new Date();
  const prazo = new Date(os.expected_delivery);
  const atrasado =
    prazo < hoje && !["entregue", "cancelado"].includes(os.status);

  const formHtml = `
    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px;">
      <h4 style="color: var(--gold-light); margin: 0;">${os.order_number}</h4>
      <span class="status-badge status-${os.status}">${statusFormatado}</span>
      ${atrasado ? '<span style="color: var(--error); font-weight: 600;">⚠️ Atrasada</span>' : ""}
      <span style="margin-left: auto; font-weight: 700; color: var(--gold-light);">${formatCurrency(valorTotal)}</span>
    </div>

    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px;">
      <button class="tab-btn active" data-tab="info">Informações</button>
      <button class="tab-btn" data-tab="grade">Grade (${totalPecas} peças)</button>
      <button class="tab-btn" data-tab="costura">Costura</button>
      <button class="tab-btn" data-tab="expedicao">Expedição</button>
      <button class="tab-btn" data-tab="materiais">Materiais</button>
    </div>

    <div class="tab-content" id="tab-info" style="display: block;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          <strong style="color: var(--gold-light);">Cliente</strong>
          <p>${os.customers?.trade_name || os.customers?.company_name || "-"}</p>
          ${os.customers?.contact_name ? `<small>Contato: ${os.customers.contact_name} • ${os.customers.phone || ""}</small>` : ""}
        </div>
        <div>
          <strong style="color: var(--gold-light);">Produto</strong>
          <p>${os.product_description || "-"}</p>
          ${os.product_reference ? `<small>Ref: ${os.product_reference}</small>` : ""}
        </div>
        <div><strong>Recebimento:</strong> ${formatDate(os.received_date)}</div>
        <div><strong>Início da Costura:</strong> ${os.started_date ? formatDateTime(os.started_date) : "Ainda não iniciado"}</div>
        <div><strong>Prazo:</strong> <span style="${atrasado ? "color: var(--error); font-weight: 600;" : ""}">${formatDate(os.expected_delivery)}</span></div>
        <div><strong>Peças:</strong> ${totalPecas} × ${formatCurrency(os.unit_price)} = ${formatCurrency(valorTotal)}</div>
      </div>
      ${os.notes ? `<p style="margin-top: 8px;"><strong>Obs:</strong> ${os.notes}</p>` : ""}
    </div>

    <div class="tab-content" id="tab-grade" style="display: none;">
      <div style="overflow-y: auto;">
        <table class="table">
          <thead><tr><th>Tamanho</th><th>Solicitado</th><th>Costurado</th><th>Entregue</th><th>Pendente</th></tr></thead>
          <tbody>
            ${
              items && items.length > 0
                ? items
                    .map(
                      (item) => `
                <tr>
                  <td><strong>${item.size}</strong></td>
                  <td>${item.quantity}</td>
                  <td>${item.sewn_quantity || 0}</td>
                  <td>${item.delivered_quantity || 0}</td>
                  <td>${item.quantity - (item.delivered_quantity || 0)}</td>
                </tr>`,
                    )
                    .join("")
                : '<tr><td colspan="5" style="color: var(--gray);">Nenhuma grade cadastrada</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="tab-content" id="tab-costura" style="display: none;">
      <div style="overflow-y: auto;">
        <table class="table">
          <thead><tr><th>Data</th><th>Funcionário</th><th>Peças</th><th>Defeitos</th></tr></thead>
          <tbody>
            ${
              sewingRecords && sewingRecords.length > 0
                ? sewingRecords
                    .map(
                      (r) => `
                <tr>
                  <td>${formatDateTime(r.start_time)}</td>
                  <td>${r.employees?.full_name || "-"}</td>
                  <td>${r.pieces_sewn}</td>
                  <td>${r.defects || 0}</td>
                </tr>`,
                    )
                    .join("")
                : '<tr><td colspan="4" style="color: var(--gray);">Nenhum apontamento</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="tab-content" id="tab-expedicao" style="display: none;">
      <div style="overflow-y: auto;">
        <table class="table">
          <thead><tr><th>Data</th><th>Transportadora</th><th>Rastreio</th></tr></thead>
          <tbody>
            ${
              shipments && shipments.length > 0
                ? shipments
                    .map(
                      (s) => `
                <tr>
                  <td>${formatDate(s.ship_date)}</td>
                  <td>${s.carrier || "-"}</td>
                  <td>${s.tracking_code || "-"}</td>
                </tr>`,
                    )
                    .join("")
                : '<tr><td colspan="3" style="color: var(--gray);">Nenhum envio</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="tab-content" id="tab-materiais" style="display: none;">
      <div style="overflow-y: auto;">
        <table class="table">
          <thead><tr><th>Data</th><th>Material</th><th>Qtd</th></tr></thead>
          <tbody>
            ${
              materiaisConsumidos && materiaisConsumidos.length > 0
                ? materiaisConsumidos
                    .map(
                      (m) => `
                <tr>
                  <td>${formatDateTime(m.consumption_date)}</td>
                  <td>${m.material_receipts?.material_type || "-"}</td>
                  <td>${m.quantity_used} ${m.material_receipts?.unit || ""}</td>
                </tr>`,
                    )
                    .join("")
                : '<tr><td colspan="3" style="color: var(--gray);">Nenhum consumo</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>

    <style>
      .tab-btn { background: none; border: none; color: var(--gray); padding: 6px 12px; cursor: pointer; border-bottom: 2px solid transparent; font-weight: 500; transition: all var(--transition-fast); font-size: 0.8rem; }
      .tab-btn.active { color: var(--gold-light); border-bottom-color: var(--gold-light); }
      .tab-btn:hover { color: var(--white); }
    </style>
  `;

  openFormModalCustomSize(`OS ${os.order_number}`, formHtml, () => {}, "750px");

  setTimeout(() => {
    const tabs = document.querySelectorAll("#dynamicForm .tab-btn");
    const contents = document.querySelectorAll("#dynamicForm .tab-content");
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.forEach((b) => b.classList.remove("active"));
        contents.forEach((c) => (c.style.display = "none"));
        btn.classList.add("active");
        const tabId = btn.dataset.tab;
        const content = document.getElementById(`tab-${tabId}`);
        if (content) content.style.display = "block";
      });
    });
  }, 100);

  replaceSubmitWithCloseButton();

  const form = document.getElementById("dynamicForm");
  if (form) {
    const btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className = "btn btn-primary";
    btnEdit.innerHTML = '<i class="ph ph-pencil-simple"></i> Editar';
    btnEdit.style.marginRight = "8px";
    btnEdit.addEventListener("click", () => {
      $("#modalContainer").innerHTML = "";
      editOS(id);
    });
    const closeBtn = form.querySelector("button");
    if (closeBtn) closeBtn.parentNode.insertBefore(btnEdit, closeBtn);
  }
}

// ============================================================
// FUNÇÃO AUXILIAR PARA MODAL COM TAMANHO PERSONALIZADO
// ============================================================
function openFormModalCustomSize(
  title,
  formHtml,
  onSubmit,
  maxWidth = "520px",
) {
  const html = `
    <div class="modal-overlay" id="formOverlay">
      <div class="modal" style="max-width:${maxWidth}; max-height: 90vh; overflow-y: auto; padding: 16px;">
        <div class="modal-header" style="margin-bottom: 12px;">
          <h3 style="font-size: 1rem;">${title}</h3>
          <button class="modal-close" id="closeFormModal">&times;</button>
        </div>
        <form id="dynamicForm" style="display:grid; gap:8px;">
          ${formHtml}
          <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Salvar</button>
        </form>
      </div>
    </div>
  `;

  const container = document.getElementById("modalContainer");
  if (!container) {
    console.error("Elemento #modalContainer não encontrado no DOM.");
    return;
  }
  container.innerHTML = html;

  const closeModal = () => {
    container.innerHTML = "";
  };
  document
    .getElementById("closeFormModal")
    .addEventListener("click", closeModal);
  document.getElementById("formOverlay").addEventListener("click", (e) => {
    if (e.target.id === "formOverlay") closeModal();
  });
  document.addEventListener("keydown", function escForm(e) {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escForm);
    }
  });
  document
    .getElementById("dynamicForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      await onSubmit();
    });
  setTimeout(aplicarEstiloSelects, 50);
}
window.openFormModalCustomSize = openFormModalCustomSize;

// ============================================================
// EDITAR ORDEM DE SERVIÇO
// ============================================================
async function editOS(id) {
  const { data: os, error } = await supabase
    .from("service_orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !os) {
    showFeedback("Erro", "OS não encontrada.", "error");
    return;
  }

  const { data: clientes } = await supabase
    .from("customers")
    .select("id, company_name, trade_name")
    .eq("active", true)
    .order("company_name");
  const optsClientes = clientes?.length
    ? clientes
        .map((c) => {
          const nome = c.trade_name || c.company_name;
          const sel = c.id === os.customer_id ? "selected" : "";
          return `<option value="${c.id}" ${sel}>${nome}</option>`;
        })
        .join("")
    : '<option value="">Nenhum cliente</option>';
  const statusList = [
    "recebido",
    "em_costura",
    "costurado",
    "em_revisao",
    "entregue",
    "cancelado",
    "parcialmente_entregue",
  ];
  const optsStatus = statusList
    .map(
      (s) =>
        `<option value="${s}" ${s === os.status ? "selected" : ""}>${formatStatus(s)}</option>`,
    )
    .join("");

  let formModificado = false;
  const marcarModificado = () => {
    formModificado = true;
  };

  const formHtml = `
    <input type="hidden" id="editOsId" value="${os.id}">
    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label">Cliente *</label>
      <select id="editCliente" class="form-select" required onchange="marcarModificado()">${optsClientes}</select>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Número da OS</label>
        <input id="editNumero" class="form-input" value="${os.order_number || ""}" readonly style="opacity:0.7;">
      </div>
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Referência do Produto</label>
        <input id="editReferencia" class="form-input" value="${os.product_reference || ""}" oninput="marcarModificado()">
      </div>
    </div>
    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label">Descrição do Produto *</label>
      <input id="editProduto" class="form-input" value="${os.product_description || ""}" required oninput="marcarModificado()">
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Quantidade Total *</label>
        <input id="editQtd" type="number" min="1" class="form-input" value="${os.total_quantity}" required oninput="calcularTotalEdicao(); marcarModificado();">
      </div>
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Preço Unitário (R$) *</label>
        <input id="editPreco" type="number" step="0.01" min="0.01" class="form-input" value="${os.unit_price}" required oninput="calcularTotalEdicao(); marcarModificado();">
      </div>
    </div>
    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label">Total do Lote</label>
      <input id="editTotalCalculado" class="form-input" value="${formatCurrency(os.total || os.total_quantity * os.unit_price)}" readonly style="background: rgba(255,255,255,0.05); font-weight: 600; color: var(--gold-light);">
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
      <div class="form-group" style="min-width:0; margin-bottom: 8px;">
        <label class="form-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size:0.65rem;">Data de Recebimento *</label>
        <input id="editDataRecebimento" type="date" class="form-input" value="${os.received_date || ""}" required oninput="marcarModificado()">
      </div>
      <div class="form-group" style="min-width:0; margin-bottom: 8px;">
        <label class="form-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size:0.65rem;">Prazo de Entrega *</label>
        <input id="editPrazo" type="date" class="form-input" value="${os.expected_delivery || ""}" required oninput="marcarModificado()">
      </div>
      <div class="form-group" style="min-width:0; margin-bottom: 8px;">
        <label class="form-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size:0.65rem;">Status</label>
        <select id="editStatus" class="form-select" onchange="marcarModificado()">${optsStatus}</select>
      </div>
    </div>
    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label">Observações</label>
      <textarea id="editObservacoes" class="form-input" rows="2" oninput="marcarModificado()">${os.notes || ""}</textarea>
    </div>
  `;

  window.marcarModificado = marcarModificado;

  const fecharComConfirmacao = () => {
    if (formModificado) {
      if (confirm("Há alterações não salvas. Deseja realmente sair?")) {
        document.getElementById("modalContainer").innerHTML = "";
      }
    } else {
      document.getElementById("modalContainer").innerHTML = "";
    }
  };

  openFormModal("Editar Ordem de Serviço", formHtml, async () => {
    const recebimento = $("#editDataRecebimento").value;
    const prazo = $("#editPrazo").value;
    if (prazo && recebimento && new Date(prazo) < new Date(recebimento)) {
      showFeedback(
        "Erro",
        "Prazo de entrega não pode ser anterior à data de recebimento.",
        "error",
      );
      return;
    }

    const updates = {
      customer_id: $("#editCliente").value,
      product_description: $("#editProduto").value,
      product_reference: $("#editReferencia").value || null,
      total_quantity: parseInt($("#editQtd").value),
      unit_price: parseFloat($("#editPreco").value),
      received_date: recebimento,
      expected_delivery: prazo,
      status: $("#editStatus").value,
      notes: $("#editObservacoes").value || null,
      total: parseInt($("#editQtd").value) * parseFloat($("#editPreco").value),
    };

    const { error: updateError } = await supabase
      .from("service_orders")
      .update(updates)
      .eq("id", id);
    if (updateError) {
      showFeedback(
        "Erro",
        `Falha ao atualizar: ${updateError.message}`,
        "error",
      );
    } else {
      $("#modalContainer").innerHTML = "";
      showFeedback("Sucesso", "OS atualizada com sucesso!", "success", () =>
        loadOrdensServico(),
      );
    }
  });

  setTimeout(() => {
    const closeBtn = document.getElementById("closeFormModal");
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener("click", fecharComConfirmacao);
    }
    const overlay = document.getElementById("formOverlay");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target.id === "formOverlay") fecharComConfirmacao();
      });
    }
    window.calcularTotalEdicao = () => {
      const qtd = parseFloat(document.getElementById("editQtd")?.value) || 0;
      const preco =
        parseFloat(document.getElementById("editPreco")?.value) || 0;
      document.getElementById("editTotalCalculado").value = formatCurrency(
        qtd * preco,
      );
    };
  }, 50);
}

// ============================================================
// DUPLICAR ORDEM DE SERVIÇO
// ============================================================
async function duplicateOS(id) {
  const { data: os, error } = await supabase
    .from("service_orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !os) {
    showFeedback("Erro", "OS não encontrada.", "error");
    return;
  }

  openFormModal(
    "Duplicar Ordem de Serviço",
    `<p>Deseja realmente duplicar a OS <strong>${os.order_number}</strong>?</p>
     <p style="color: var(--gray);">Uma nova OS será criada com os mesmos dados, mas com novo número e status "Recebido".</p>`,
    async () => {
      const newOS = {
        customer_id: os.customer_id,
        product_description: os.product_description,
        product_reference: os.product_reference,
        total_quantity: os.total_quantity,
        unit_price: os.unit_price,
        received_date: todayISO(),
        expected_delivery: os.expected_delivery,
        status: "recebido",
        notes: os.notes
          ? `[Duplicado da ${os.order_number}] ${os.notes}`
          : `[Duplicado da ${os.order_number}]`,
        order_number: generateOrderNumber(),
        total: os.total_quantity * os.unit_price,
      };
      const { error: insertError } = await supabase
        .from("service_orders")
        .insert(newOS);
      if (insertError) {
        showFeedback(
          "Erro",
          `Falha ao duplicar: ${insertError.message}`,
          "error",
        );
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback("Sucesso", "OS duplicada com sucesso!", "success", () =>
          loadOrdensServico(),
        );
      }
    },
  );
}

// ============================================================
// EXCLUIR ORDEM DE SERVIÇO
// ============================================================
async function deleteOS(id) {
  const { data: os, error } = await supabase
    .from("service_orders")
    .select("order_number, status, product_description")
    .eq("id", id)
    .single();
  if (error || !os) {
    showFeedback("Erro", "OS não encontrada.", "error");
    return;
  }

  const { count: countSewing } = await supabase
    .from("sewing_records")
    .select("*", { count: "exact", head: true })
    .eq("service_order_item.service_order_id", id);
  const temProducao = countSewing > 0;
  const mensagemAviso = temProducao
    ? `<p style="color: var(--warning); margin-bottom: 12px;">⚠️ <strong>Atenção!</strong> Esta OS possui ${countSewing} registro(s) de costura vinculados.</p>`
    : "";

  openFormModal(
    "Confirmar Exclusão",
    `${mensagemAviso}
     <p>Deseja realmente excluir a OS <strong>${os.order_number}</strong>?</p>
     <p style="color: var(--gray);">Produto: ${os.product_description || "-"}</p>
     <p style="color: var(--gray);">Status atual: ${formatStatus(os.status)}</p>
     <p style="color: var(--error); margin-top: 12px;">Esta ação não pode ser desfeita.</p>`,
    async () => {
      await supabase
        .from("service_order_items")
        .delete()
        .eq("service_order_id", id);
      const { error: deleteError } = await supabase
        .from("service_orders")
        .delete()
        .eq("id", id);
      if (deleteError) {
        showFeedback(
          "Erro",
          `Falha ao excluir: ${deleteError.message}`,
          "error",
        );
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          `OS ${os.order_number} excluída.`,
          "success",
          () => loadOrdensServico(),
        );
      }
    },
  );
}

// ============================================================
// NOVA ORDEM DE SERVIÇO (COM AJUSTE DE ESPAÇAMENTO PARA EVITAR ROLAGEM)
// ============================================================
async function novaOS() {
  if (typeof openFormModal !== "function") {
    alert("Erro: módulo de modais não carregado.");
    return;
  }

  const formHtml = `
    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label">Cliente *</label>
      <div style="position: relative;">
        <input type="text" id="osClienteInput" class="form-input" placeholder="Digite o nome do cliente..." autocomplete="off" required>
        <input type="hidden" id="osClienteId">
        <div id="osClienteDropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: var(--black-medium); border: 1px solid rgba(255,255,255,0.1); border-radius: 0 0 8px 8px; max-height: 200px; overflow-y: auto; display: none; z-index: 30;"></div>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" id="btnNovoCliente" style="margin-top: 4px;">
        <i class="ph ph-plus-circle"></i> Cadastrar novo cliente
      </button>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Descrição do Produto *</label>
        <input id="osProduto" class="form-input" placeholder="Ex: Calça Jeans Slim" required>
      </div>
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Referência do Produto</label>
        <input id="osReferencia" class="form-input" placeholder="Referência interna ou do cliente">
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Quantidade Total *</label>
        <input id="osQtd" type="number" min="1" class="form-input" placeholder="Ex: 500" required oninput="calcularTotalNova()">
      </div>
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Preço Unitário (R$) *</label>
        <input id="osPreco" type="number" step="0.01" min="0.01" class="form-input" placeholder="Ex: 15,00" required oninput="calcularTotalNova()">
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label">Total do Lote</label>
      <input id="osTotalCalculado" class="form-input" value="R$ 0,00" readonly style="background: rgba(255,255,255,0.05); font-weight: 600; color: var(--gold-light);">
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Data de Recebimento *</label>
        <input id="osDataRecebimento" type="date" class="form-input" value="${todayISO()}" required>
      </div>
      <div class="form-group" style="margin-bottom: 8px;">
        <label class="form-label">Prazo de Entrega *</label>
        <input id="osPrazo" type="date" class="form-input" required>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label">Grade de Tamanhos (opcional)</label>
      <small style="color: var(--gray);">Separe os tamanhos por vírgula e a quantidade por dois-pontos. Ex: P:100, M:200, G:150, GG:50</small>
      <input id="osGrade" class="form-input" placeholder="Ex: P:100, M:200, G:150, GG:50" style="margin-top: 2px;">
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label">Observações</label>
      <textarea id="osObservacoes" class="form-input" rows="2" placeholder="Informações adicionais..."></textarea>
    </div>
  `;

  openFormModal("Nova Ordem de Serviço", formHtml, async () => {
    const clienteId = $("#osClienteId").value;
    if (!clienteId) {
      showFeedback("Erro", "Selecione um cliente.", "error");
      return;
    }

    const recebimento = $("#osDataRecebimento").value;
    const prazo = $("#osPrazo").value;
    if (prazo && recebimento && new Date(prazo) < new Date(recebimento)) {
      showFeedback(
        "Erro",
        "Prazo de entrega não pode ser anterior à data de recebimento.",
        "error",
      );
      return;
    }

    const qtd = parseInt($("#osQtd").value);
    const preco = parseFloat($("#osPreco").value);
    const insert = {
      customer_id: clienteId,
      product_description: $("#osProduto").value,
      product_reference: $("#osReferencia").value || null,
      total_quantity: qtd,
      unit_price: preco,
      received_date: recebimento,
      expected_delivery: prazo,
      status: "recebido",
      notes: $("#osObservacoes").value || null,
      order_number: generateOrderNumber(),
      total: qtd * preco,
    };

    const { data: novaOSData, error: insertError } = await supabase
      .from("service_orders")
      .insert(insert)
      .select("id")
      .single();
    if (insertError) {
      showFeedback("Erro", `Falha: ${insertError.message}`, "error");
      return;
    }

    const gradeInput = $("#osGrade").value.trim();
    if (gradeInput) {
      const itensGrade = gradeInput
        .split(",")
        .map((item) => {
          const [size, qty] = item.split(":").map((s) => s.trim());
          return {
            service_order_id: novaOSData.id,
            size,
            quantity: parseInt(qty) || 0,
            sewn_quantity: 0,
            delivered_quantity: 0,
          };
        })
        .filter((item) => item.size && item.quantity > 0);
      if (itensGrade.length > 0) {
        const { error: gradeError } = await supabase
          .from("service_order_items")
          .insert(itensGrade);
        if (gradeError) {
          showFeedback(
            "Aviso",
            "OS criada, mas houve erro na grade.",
            "warning",
          );
          return;
        }
      }
    } else {
      // Criar item único automático
      const { error: itemError } = await supabase
        .from("service_order_items")
        .insert({
          service_order_id: novaOSData.id,
          size: "Único",
          quantity: qtd,
          sewn_quantity: 0,
          delivered_quantity: 0,
        });
      if (itemError) console.error("Erro ao criar item único:", itemError);
    }

    $("#modalContainer").innerHTML = "";
    showFeedback("Sucesso", "OS criada com sucesso!", "success", () => {
      loadOrdensServico();
      const term = ($("#searchInput")?.value || "").trim();
      if (term) {
        $("#searchInput").value = "";
        $("#searchInput").focus();
      }
    });
  });

  setTimeout(() => {
    const input = document.getElementById("osClienteInput");
    const hidden = document.getElementById("osClienteId");
    const dropdown = document.getElementById("osClienteDropdown");

    input?.addEventListener("input", async function () {
      const termo = this.value.trim();
      if (termo.length < 2) {
        dropdown.style.display = "none";
        return;
      }
      const { data: clientes } = await supabase
        .from("customers")
        .select("id, company_name, trade_name")
        .or(`company_name.ilike.%${termo}%,trade_name.ilike.%${termo}%`)
        .eq("active", true)
        .limit(8);
      dropdown.innerHTML = clientes?.length
        ? clientes
            .map(
              (c) =>
                `<div class="dropdown-item" data-id="${c.id}">${c.trade_name || c.company_name}</div>`,
            )
            .join("")
        : '<div style="padding:8px 12px;color:var(--gray);">Nenhum cliente</div>';
      dropdown.style.display = "block";
    });

    dropdown?.addEventListener("click", (e) => {
      const item = e.target.closest(".dropdown-item");
      if (item) {
        hidden.value = item.dataset.id;
        input.value = item.textContent;
        dropdown.style.display = "none";
      }
    });

    document.addEventListener("click", (e) => {
      if (!input?.contains(e.target) && !dropdown?.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });

    document
      .getElementById("btnNovoCliente")
      ?.addEventListener("click", async (e) => {
        e.preventDefault();
        await cadastrarClienteRapido((novoCliente) => {
          hidden.value = novoCliente.id;
          input.value = novoCliente.trade_name || novoCliente.company_name;
          dropdown.style.display = "none";
        });
      });

    const cnpjField = document.querySelector("#clienteCnpj");
    if (cnpjField) mascararCNPJ(cnpjField);

    window.calcularTotalNova = () => {
      const qtd = parseFloat(document.getElementById("osQtd")?.value) || 0;
      const preco = parseFloat(document.getElementById("osPreco")?.value) || 0;
      document.getElementById("osTotalCalculado").value = formatCurrency(
        qtd * preco,
      );
    };
  }, 50);
}

// ============================================================
// AÇÕES RÁPIDAS (INICIAR, CONCLUIR, REVISÃO, ENTREGUE, CANCELAR, VOLTAR)
// ============================================================
async function iniciarCostura(id) {
  const { data: lote } = await supabase
    .from("service_orders")
    .select("order_number")
    .eq("id", id)
    .single();
  if (!lote) {
    showFeedback("Erro", "Lote não encontrado.", "error");
    return;
  }

  openFormModal(
    "Iniciar Costura",
    `<p>Deseja iniciar a costura do lote <strong>${lote.order_number}</strong>?</p>`,
    async () => {
      const { error } = await supabase
        .from("service_orders")
        .update({
          status: "em_costura",
          started_date: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) {
        showFeedback("Erro", `Falha ao atualizar: ${error.message}`, "error");
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          `Lote ${lote.order_number} iniciado!`,
          "success",
          () => {
            if (AppState.currentPage === "producao") loadProducao();
            else loadOrdensServico();
          },
        );
      }
    },
  );
}

async function concluirCostura(id) {
  const { data: lote } = await supabase
    .from("service_orders")
    .select("order_number, product_description")
    .eq("id", id)
    .single();
  if (!lote) {
    showFeedback("Erro", "Lote não encontrado.", "error");
    return;
  }

  openFormModal(
    "Concluir Costura",
    `<p>Deseja marcar a costura do lote <strong>${lote.order_number}</strong> como concluída?</p>`,
    async () => {
      const { error } = await supabase
        .from("service_orders")
        .update({ status: "costurado" })
        .eq("id", id);
      if (error) {
        showFeedback("Erro", `Falha ao atualizar: ${error.message}`, "error");
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          `Lote ${lote.order_number} concluído!`,
          "success",
          () => {
            if (AppState.currentPage === "producao") loadProducao();
            else loadOrdensServico();
          },
        );
      }
    },
  );
}

async function marcarRevisao(id) {
  const { data: lote } = await supabase
    .from("service_orders")
    .select("order_number, product_description, status")
    .eq("id", id)
    .single();
  if (!lote) {
    showFeedback("Erro", "Lote não encontrado.", "error");
    return;
  }

  openFormModal(
    "Enviar para Revisão",
    `<p>Deseja enviar o lote <strong>${lote.order_number}</strong> para revisão?</p>
     <p style="color: var(--warning);">⚠️ Isso indica que foram encontrados defeitos que precisam ser corrigidos.</p>`,
    async () => {
      const { error } = await supabase
        .from("service_orders")
        .update({ status: "em_revisao" })
        .eq("id", id);
      if (error) {
        showFeedback("Erro", `Falha ao atualizar: ${error.message}`, "error");
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          `Lote ${lote.order_number} enviado para revisão.`,
          "warning",
          () => {
            if (AppState.currentPage === "producao") loadProducao();
            else loadOrdensServico();
          },
        );
      }
    },
  );
}

async function marcarEntregue(id) {
  const { data: lote } = await supabase
    .from("service_orders")
    .select("order_number, product_description, total_quantity, unit_price")
    .eq("id", id)
    .single();
  if (!lote) {
    showFeedback("Erro", "Lote não encontrado.", "error");
    return;
  }

  const valorTotal = lote.total_quantity * lote.unit_price;
  openFormModal(
    "Marcar como Entregue",
    `<p>Deseja marcar o lote <strong>${lote.order_number}</strong> como entregue?</p>
     <p style="color: var(--gray);">Produto: ${lote.product_description || "-"}</p>
     <p style="color: var(--gray);">Quantidade: ${lote.total_quantity} peças</p>
     <p style="color: var(--gold-light);">Valor total: ${formatCurrency(valorTotal)}</p>`,
    async () => {
      const { error } = await supabase
        .from("service_orders")
        .update({ status: "entregue" })
        .eq("id", id);
      if (error) {
        showFeedback("Erro", `Falha ao atualizar: ${error.message}`, "error");
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          `Lote ${lote.order_number} marcado como entregue!`,
          "success",
          () => {
            if (AppState.currentPage === "producao") loadProducao();
            else loadOrdensServico();
          },
        );
      }
    },
  );
}

async function cancelarLote(id) {
  const { data: lote } = await supabase
    .from("service_orders")
    .select("order_number, product_description, total_quantity")
    .eq("id", id)
    .single();
  if (!lote) {
    showFeedback("Erro", "Lote não encontrado.", "error");
    return;
  }

  openFormModal(
    "Cancelar Lote",
    `<p>Deseja realmente cancelar o lote <strong>${lote.order_number}</strong>?</p>
     <p style="color: var(--gray);">Produto: ${lote.product_description || "-"}</p>
     <p style="color: var(--gray);">Quantidade: ${lote.total_quantity} peças</p>
     <p style="color: var(--error); margin-top: 12px;">⚠️ Esta ação não pode ser desfeita. O lote será marcado como cancelado.</p>`,
    async () => {
      const { error } = await supabase
        .from("service_orders")
        .update({ status: "cancelado" })
        .eq("id", id);
      if (error) {
        showFeedback("Erro", `Falha ao cancelar: ${error.message}`, "error");
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          `Lote ${lote.order_number} cancelado.`,
          "success",
          () => {
            if (AppState.currentPage === "producao") loadProducao();
            else loadOrdensServico();
          },
        );
      }
    },
  );
}

async function voltarCostura(id) {
  const { data: lote } = await supabase
    .from("service_orders")
    .select("order_number, product_description")
    .eq("id", id)
    .single();
  if (!lote) {
    showFeedback("Erro", "Lote não encontrado.", "error");
    return;
  }

  openFormModal(
    "Voltar para Costura",
    `<p>Deseja retornar o lote <strong>${lote.order_number}</strong> para costura?</p>
     <p style="color: var(--gray);">O status será alterado para <strong>Em Costura</strong>.</p>`,
    async () => {
      const { error } = await supabase
        .from("service_orders")
        .update({ status: "em_costura" })
        .eq("id", id);
      if (error) {
        showFeedback("Erro", `Falha ao atualizar: ${error.message}`, "error");
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          `Lote ${lote.order_number} voltou para costura.`,
          "success",
          () => {
            if (AppState.currentPage === "producao") loadProducao();
            else loadOrdensServico();
          },
        );
      }
    },
  );
}

// ============================================================
// REGISTRAR COSTURA PARCIAL (NOVA FUNÇÃO)
// ============================================================
async function registrarCosturaParcial(id) {
  const { data: os, error } = await supabase
    .from("service_orders")
    .select("id, order_number, total_quantity, status")
    .eq("id", id)
    .single();

  if (error || !os) {
    showFeedback("Erro", "OS não encontrada.", "error");
    return;
  }

  const { data: items } = await supabase
    .from("service_order_items")
    .select("*")
    .eq("service_order_id", id)
    .order("size");

  if (!items || items.length === 0) {
    showFeedback(
      "Erro",
      "Esta OS não possui grade de tamanhos cadastrada.",
      "error",
    );
    return;
  }

  const { data: funcionarios } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name");

  const optsFuncionarios = funcionarios?.length
    ? funcionarios
        .map((f) => `<option value="${f.id}">${f.full_name}</option>`)
        .join("")
    : '<option value="">Nenhum funcionário cadastrado</option>';

  let gradeFields = "";
  items.forEach((item) => {
    const restante = item.quantity - (item.sewn_quantity || 0);
    gradeFields += `
      <div style="border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>Tamanho: ${item.size}</strong>
          <span style="font-size: 0.8rem; color: var(--gray);">Solicitado: ${item.quantity} | Já costurado: ${item.sewn_quantity || 0} | Restante: ${restante}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.65rem;">Qtd Costurada Agora</label>
            <input type="number" min="0" max="${restante}" class="form-input costura-qtd-item" data-item-id="${item.id}" value="0" style="padding: 6px 8px;">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.65rem;">Defeitos</label>
            <input type="number" min="0" class="form-input costura-defeitos-item" data-item-id="${item.id}" value="0" style="padding: 6px 8px;">
          </div>
        </div>
      </div>
    `;
  });

  const formHtml = `
    <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
      <p><strong>OS:</strong> ${os.order_number}</p>
      <p><strong>Total de peças:</strong> ${os.total_quantity}</p>
      <p><strong>Status atual:</strong> <span class="status-badge status-${os.status}">${formatStatus(os.status)}</span></p>
    </div>

    <h4 style="margin-bottom: 12px;">Informar Produção</h4>
    ${gradeFields}

    <div class="form-group" style="margin-top: 16px;">
      <label class="form-label">Funcionário</label>
      <select id="costuraFuncionario" class="form-select">
        <option value="">Selecione o funcionário...</option>
        ${optsFuncionarios}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Máquina (opcional)</label>
      <input id="costuraMaquina" class="form-input" placeholder="Ex: Máquina 01, Overloque...">
    </div>
  `;

  openFormModal("Registrar Costura Parcial", formHtml, async () => {
    const funcionarioId = $("#costuraFuncionario")?.value || null;
    const maquina = $("#costuraMaquina")?.value?.trim() || null;

    let totalCosturadoAgora = 0;
    const updates = [];
    const records = [];

    document.querySelectorAll(".costura-qtd-item").forEach((input) => {
      const itemId = input.dataset.itemId;
      const qtd = parseInt(input.value) || 0;
      const defeitosInput = document.querySelector(
        `.costura-defeitos-item[data-item-id="${itemId}"]`,
      );
      const defeitos = parseInt(defeitosInput?.value) || 0;

      if (qtd > 0) {
        totalCosturadoAgora += qtd;
        updates.push({ id: itemId, qtd, defeitos });
        records.push({
          service_order_item_id: itemId,
          employee_id: funcionarioId,
          pieces_sewn: qtd,
          defects: defeitos,
          machine_id: maquina,
          start_time: new Date().toISOString(),
        });
      }
    });

    if (totalCosturadoAgora === 0) {
      showFeedback(
        "Aviso",
        "Informe pelo menos uma quantidade costurada.",
        "warning",
      );
      return;
    }

    for (const u of updates) {
      const item = items.find((i) => i.id === u.id);
      const novaQtdCosturada = (item.sewn_quantity || 0) + u.qtd;
      const { error: updateError } = await supabase
        .from("service_order_items")
        .update({ sewn_quantity: novaQtdCosturada })
        .eq("id", u.id);
      if (updateError) {
        console.error("Erro ao atualizar item:", updateError);
      }
    }

    if (records.length > 0) {
      const { error: insertError } = await supabase
        .from("sewing_records")
        .insert(records);
      if (insertError) {
        console.error("Erro ao inserir registros de costura:", insertError);
      }
    }

    const { data: itemsAtualizados } = await supabase
      .from("service_order_items")
      .select("sewn_quantity, quantity")
      .eq("service_order_id", id);

    const totalCosturado = itemsAtualizados
      ? itemsAtualizados.reduce((sum, i) => sum + (i.sewn_quantity || 0), 0)
      : 0;

    let sugestaoConcluir = false;
    if (totalCosturado >= os.total_quantity && os.status !== "costurado") {
      sugestaoConcluir = true;
    }

    $("#modalContainer").innerHTML = "";

    if (sugestaoConcluir) {
      openFormModal(
        "Costura Concluída",
        `<p>O total de peças costuradas (<strong>${totalCosturado}</strong>) atingiu ou ultrapassou a quantidade do lote (<strong>${os.total_quantity}</strong>).</p>
         <p>Deseja marcar o lote como <strong>Costurado</strong>?</p>`,
        async () => {
          await supabase
            .from("service_orders")
            .update({ status: "costurado" })
            .eq("id", id);
          $("#modalContainer").innerHTML = "";
          showFeedback(
            "Sucesso",
            "Costura registrada e lote marcado como Costurado!",
            "success",
            () => {
              if (AppState.currentPage === "producao") loadProducao();
              else loadOrdensServico();
            },
          );
        },
      );
      setTimeout(() => {
        const form = document.getElementById("dynamicForm");
        if (form) {
          const btnDepois = document.createElement("button");
          btnDepois.type = "button";
          btnDepois.className = "btn btn-ghost";
          btnDepois.textContent = "Depois";
          btnDepois.style.marginRight = "8px";
          btnDepois.addEventListener("click", () => {
            $("#modalContainer").innerHTML = "";
            showFeedback(
              "Sucesso",
              "Costura registrada com sucesso!",
              "success",
              () => {
                if (AppState.currentPage === "producao") loadProducao();
                else loadOrdensServico();
              },
            );
          });
          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn)
            submitBtn.parentNode.insertBefore(btnDepois, submitBtn);
        }
      }, 100);
    } else {
      showFeedback(
        "Sucesso",
        `${totalCosturadoAgora} peça(s) registrada(s)! Total costurado: ${totalCosturado}/${os.total_quantity}`,
        "success",
        () => {
          if (AppState.currentPage === "producao") loadProducao();
          else loadOrdensServico();
        },
      );
    }
  });

  setTimeout(aplicarEstiloSelects, 50);
}

// ============================================================
// EXPORTAÇÃO GLOBAL
// ============================================================
window.loadOrdensServico = loadOrdensServico;
window.viewOS = viewOS;
window.editOS = editOS;
window.novaOS = novaOS;
window.duplicateOS = duplicateOS;
window.deleteOS = deleteOS;
window.garantirFiltrosOS = garantirFiltrosOS;
window.aplicarEstiloSelects = aplicarEstiloSelects;
window.exportarCSV = exportarCSV;
window.iniciarCostura = iniciarCostura;
window.concluirCostura = concluirCostura;
window.marcarRevisao = marcarRevisao;
window.marcarEntregue = marcarEntregue;
window.cancelarLote = cancelarLote;
window.voltarCostura = voltarCostura;
window.registrarCosturaParcial = registrarCosturaParcial;
window.gerarMenuAcoes = gerarMenuAcoes;
