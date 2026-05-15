// ============================================================
// EXPEDICAO.JS
// Módulo de controle de expedição e envios
// Facção de Jeans - Sistema de Gestão
// ============================================================

(function () {
  // Estado local dos filtros de Expedição
  let filtrosExpedicao = {
    transportadora: "",
    clienteId: "",
    dataInicio: "",
    dataFim: "",
    semRastreio: false,
  };

  const LIMITE_PADRAO = 20;
  let limiteAtual = LIMITE_PADRAO;
  let totalRegistros = 0;

  let ordenacao = {
    coluna: "ship_date",
    ascendente: false,
  };

  let chartEnviosDiarios = null;

  // ============================================================
  // CARREGAMENTO DA TELA DE EXPEDIÇÃO
  // ============================================================
  async function loadExpedicao(resetLimite = true) {
    if (resetLimite) limiteAtual = LIMITE_PADRAO;

    try {
      const btn = document.querySelector("#page-expedicao .btn-primary");
      if (btn) btn.setAttribute("data-action", "novo-envio");

      setupFiltrosExpedicao();

      const termoBusca = ($("#searchInput")?.value || "").trim().toLowerCase();

      let query = supabase
        .from("shipments")
        .select(
          `id, service_order_id, ship_date, carrier, tracking_code, notes, created_at,
           service_orders(order_number, product_description, total_quantity, unit_price, status, customers(company_name, trade_name, contact_name, phone))`,
          { count: "exact" },
        )
        .order("ship_date", { ascending: false });

      if (filtrosExpedicao.transportadora) {
        query = query.ilike("carrier", `%${filtrosExpedicao.transportadora}%`);
      }
      if (filtrosExpedicao.clienteId) {
        query = query.eq(
          "service_orders.customer_id",
          filtrosExpedicao.clienteId,
        );
      }
      if (filtrosExpedicao.dataInicio) {
        query = query.gte("ship_date", filtrosExpedicao.dataInicio);
      }
      if (filtrosExpedicao.dataFim) {
        query = query.lte("ship_date", filtrosExpedicao.dataFim);
      }
      if (filtrosExpedicao.semRastreio) {
        query = query.is("tracking_code", null);
      }

      if (termoBusca && AppState.currentPage === "expedicao") {
        query = query.or(
          `carrier.ilike.%${termoBusca}%,tracking_code.ilike.%${termoBusca}%,service_orders.order_number.ilike.%${termoBusca}%,service_orders.customers.company_name.ilike.%${termoBusca}%,service_orders.customers.trade_name.ilike.%${termoBusca}%`,
        );
      }

      query = query.limit(limiteAtual);
      const { data: envios, error, count } = await query;
      if (error) {
        console.error("Erro ao carregar expedição:", error);
        showFeedback("Erro", "Falha ao carregar dados de expedição.", "error");
        return;
      }

      totalRegistros = count || 0;

      if (!envios || envios.length === 0) {
        renderizarCardsResumoExpedicao([], {});
        // Renderiza o cabeçalho mesmo sem dados para garantir que os ícones de ordenação existam
        renderizarTabelaExpedicao([], {});
        const tbody = document.querySelector("#table-expedicoes tbody");
        if (tbody)
          tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 40px; color: var(--gray);"><i class="ph ph-truck" style="font-size: 2rem; display: block; margin-bottom: 12px;"></i>Nenhum envio registrado.<br><span style="font-size: 0.8rem;">Clique em "Registrar Envio" quando um lote for despachado.</span></td></tr>`;
        removerPaginacaoExpedicao();
        return;
      }

      const idsEnvios = envios.map((e) => e.id);
      const { data: itensEnvio } = await supabase
        .from("shipment_items")
        .select("shipment_id, shipped_quantity")
        .in("shipment_id", idsEnvios);

      const pecasPorEnvio = {};
      if (itensEnvio) {
        itensEnvio.forEach((item) => {
          if (!pecasPorEnvio[item.shipment_id])
            pecasPorEnvio[item.shipment_id] = 0;
          pecasPorEnvio[item.shipment_id] += item.shipped_quantity;
        });
      }

      let enviosFiltrados = ordenarEnvios(envios, pecasPorEnvio);

      renderizarCardsResumoExpedicao(enviosFiltrados, pecasPorEnvio);
      renderizarTabelaExpedicao(enviosFiltrados, pecasPorEnvio);
      renderizarPaginacaoExpedicao();
      renderizarGraficoEnviosDiarios(enviosFiltrados);
    } catch (e) {
      console.error("Erro ao carregar expedição:", e);
      showFeedback("Erro", "Falha ao carregar dados de expedição.", "error");
    }
  }

  // ============================================================
  // ORDENAÇÃO
  // ============================================================
  function ordenarEnvios(envios, pecasPorEnvio) {
    if (!envios || !envios.length) return envios;
    const col = ordenacao.coluna;
    const asc = ordenacao.ascendente;

    return [...envios].sort((a, b) => {
      let valA, valB;
      switch (col) {
        case "ship_date":
          valA = a.ship_date || "";
          valB = b.ship_date || "";
          break;
        case "carrier":
          valA = (a.carrier || "").toLowerCase();
          valB = (b.carrier || "").toLowerCase();
          break;
        case "cliente":
          valA = (
            a.service_orders?.customers?.trade_name ||
            a.service_orders?.customers?.company_name ||
            ""
          ).toLowerCase();
          valB = (
            b.service_orders?.customers?.trade_name ||
            b.service_orders?.customers?.company_name ||
            ""
          ).toLowerCase();
          break;
        case "pecas":
          valA = pecasPorEnvio[a.id] || a.service_orders?.total_quantity || 0;
          valB = pecasPorEnvio[b.id] || b.service_orders?.total_quantity || 0;
          break;
        case "tracking_code":
          valA = a.tracking_code ? 1 : 0;
          valB = b.tracking_code ? 1 : 0;
          break;
        default:
          return 0;
      }
      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  }

  function toggleOrdenacaoExpedicao(coluna) {
    if (ordenacao.coluna === coluna) {
      ordenacao.ascendente = !ordenacao.ascendente;
    } else {
      ordenacao.coluna = coluna;
      ordenacao.ascendente = true;
    }
    loadExpedicao(false);
  }

  // ============================================================
  // CARDS DE RESUMO
  // ============================================================
  function renderizarCardsResumoExpedicao(envios, pecasPorEnvio) {
    let cardsContainer = document.querySelector("#expedicao-cards-grid");
    if (!cardsContainer) {
      cardsContainer = document.createElement("div");
      cardsContainer.className = "cards-grid";
      cardsContainer.id = "expedicao-cards-grid";
      const pageHeader = document.querySelector("#page-expedicao .page-header");
      if (pageHeader)
        pageHeader.insertAdjacentElement("afterend", cardsContainer);
      else {
        const page = document.getElementById("page-expedicao");
        if (page) page.prepend(cardsContainer);
        else return;
      }
    }

    const hoje = todayISO();
    const enviosHoje = envios.filter((e) => e.ship_date === hoje);
    const mesAtual = hoje.substring(0, 7);
    const enviosMes = envios.filter(
      (e) => e.ship_date && e.ship_date.startsWith(mesAtual),
    );
    const semRastreio = envios.filter((e) => !e.tracking_code).length;

    let pecasHoje = 0,
      pecasMes = 0;
    enviosHoje.forEach((e) => {
      pecasHoje += pecasPorEnvio[e.id] || e.service_orders?.total_quantity || 0;
    });
    enviosMes.forEach((e) => {
      pecasMes += pecasPorEnvio[e.id] || e.service_orders?.total_quantity || 0;
    });

    cardsContainer.innerHTML = `
      <div class="card card-pink" data-filtro="hoje">
        <div class="card-icon"><i class="ph ph-clock"></i></div>
        <div class="card-info">
          <span class="card-label">Envios Hoje</span>
          <span class="card-value">${enviosHoje.length}</span>
          <span class="card-detail">${pecasHoje} peças</span>
        </div>
      </div>
      <div class="card card-gold" data-filtro="mes">
        <div class="card-icon"><i class="ph ph-calendar"></i></div>
        <div class="card-info">
          <span class="card-label">Envios no Mês</span>
          <span class="card-value">${enviosMes.length}</span>
          <span class="card-detail">${pecasMes} peças</span>
        </div>
      </div>
      <div class="card card-dark" data-filtro="semRastreio">
        <div class="card-icon"><i class="ph ph-warning"></i></div>
        <div class="card-info">
          <span class="card-label">Sem Rastreio</span>
          <span class="card-value" style="color: ${semRastreio > 0 ? "var(--warning)" : "var(--white)"};">${semRastreio}</span>
          <span class="card-detail">envios pendentes</span>
        </div>
      </div>
      <div class="card card-pink-light">
        <div class="card-icon"><i class="ph ph-truck"></i></div>
        <div class="card-info">
          <span class="card-label">Total de Envios</span>
          <span class="card-value">${envios.length}</span>
          <span class="card-detail">histórico completo</span>
        </div>
      </div>
    `;

    // Eventos de clique nos cards
    cardsContainer.querySelectorAll(".card[data-filtro]").forEach((card) => {
      card.addEventListener("click", () => {
        const tipo = card.dataset.filtro;
        filtrosExpedicao.dataInicio = "";
        filtrosExpedicao.dataFim = "";
        filtrosExpedicao.semRastreio = false;

        if (tipo === "hoje") {
          filtrosExpedicao.dataInicio = hoje;
          filtrosExpedicao.dataFim = hoje;
        } else if (tipo === "mes") {
          filtrosExpedicao.dataInicio = `${mesAtual}-01`;
          filtrosExpedicao.dataFim = hoje;
        } else if (tipo === "semRastreio") {
          filtrosExpedicao.semRastreio = true;
        }

        loadExpedicao();
      });
    });
  }

  // ============================================================
  // RENDERIZAÇÃO DA TABELA (COM GARANTIA DE CRIAÇÃO DO THEAD)
  // ============================================================
  function renderizarTabelaExpedicao(envios, pecasPorEnvio) {
    const tbody = document.querySelector("#table-expedicoes tbody");
    if (!tbody) return;

    // Garante que o thead tenha um tr
    let thead = document.querySelector("#table-expedicoes thead");
    if (!thead) {
      thead = document.createElement("thead");
      const table = document.querySelector("#table-expedicoes");
      if (table) table.prepend(thead);
    }
    let theadRow = thead.querySelector("tr");
    if (!theadRow) {
      theadRow = document.createElement("tr");
      thead.appendChild(theadRow);
    }

    // Preenche o cabeçalho
    theadRow.innerHTML = `
      <th class="sortable" data-sort="ship_date" style="cursor:pointer;">Data ${ordenacao.coluna === "ship_date" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
      <th>OS / Produto</th>
      <th class="sortable" data-sort="cliente" style="cursor:pointer;">Cliente ${ordenacao.coluna === "cliente" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
      <th class="sortable" data-sort="carrier" style="cursor:pointer;">Transportadora ${ordenacao.coluna === "carrier" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
      <th class="sortable text-center" data-sort="pecas" style="cursor:pointer;">Peças ${ordenacao.coluna === "pecas" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
      <th class="sortable text-center" data-sort="tracking_code" style="cursor:pointer;">Rastreio ${ordenacao.coluna === "tracking_code" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
      <th class="text-center">Obs</th>
      <th class="text-center" style="width:70px;">
        <button class="btn btn-ghost btn-sm" id="btnExportarCSVExpedicao" title="Exportar CSV" style="font-size:0.7rem;"><i class="ph ph-download-simple"></i></button>
      </th>
    `;

    if (!envios || envios.length === 0) {
      // Se não houver envios, o tbody será preenchido pela função chamadora (loadExpedicao)
      // Mas precisamos configurar os eventos do cabeçalho
      setupOrdenacaoHeadersExpedicao();
      document
        .getElementById("btnExportarCSVExpedicao")
        ?.addEventListener("click", exportarCSVExpedicao);
      return;
    }

    tbody.innerHTML = envios
      .map((envio) => {
        const dataEnvio = envio.ship_date ? formatDate(envio.ship_date) : "-";
        const osNumber = envio.service_orders?.order_number || "-";
        const produto = envio.service_orders?.product_description || "-";
        const transportadora = envio.carrier || "Não informada";
        const rastreio = envio.tracking_code || "-";
        const totalPecas =
          pecasPorEnvio[envio.id] || envio.service_orders?.total_quantity || 0;
        const nomeCliente =
          envio.service_orders?.customers?.trade_name ||
          envio.service_orders?.customers?.company_name ||
          "-";
        const valorTotal = totalPecas * (envio.service_orders?.unit_price || 0);
        const menuId = `menu-envio-${envio.id}`;

        let rastreioHtml = rastreio;
        if (envio.tracking_code) {
          const link = gerarLinkRastreio(envio.tracking_code, transportadora);
          rastreioHtml = `<a href="${link}" target="_blank" style="color: var(--gold-light); text-decoration: underline;" title="Rastrear pacote">${envio.tracking_code}</a>`;
        }

        return `<tr>
        <td>${dataEnvio}</td>
        <td><strong style="color: var(--gold-light);">${osNumber}</strong><br><small style="color: var(--gray);">${produto}</small></td>
        <td><strong>${nomeCliente}</strong></td>
        <td>${transportadora}</td>
        <td class="text-center"><strong>${totalPecas}</strong><br><small style="color: var(--gray);">${formatCurrency(valorTotal)}</small></td>
        <td class="text-center">${rastreioHtml}</td>
        <td class="text-center">${envio.notes ? `<i class="ph ph-note" title="${escapeHtml(envio.notes)}" style="color: var(--gray-light); cursor:help;"></i>` : "-"}</td>
        <td class="text-center">
          <button class="btn-actions-trigger" data-menu-id="${menuId}" title="Ações"><i class="ph ph-gear-six"></i></button>
          <div id="${menuId}" class="dropdown-actions-menu" style="display: none;">
            <a href="#" class="action-item action-view" data-action="ver-detalhes-envio" data-id="${envio.id}" data-menu="${menuId}"><i class="ph ph-eye"></i> Visualizar</a>
            <a href="#" class="action-item action-edit" data-action="editar-envio" data-id="${envio.id}" data-menu="${menuId}"><i class="ph ph-pencil-simple"></i> Editar</a>
            <div class="dropdown-divider" style="margin:4px 0; border-color:rgba(255,255,255,0.05);"></div>
            <a href="#" class="action-item action-delete" data-action="excluir-envio" data-id="${envio.id}" data-menu="${menuId}"><i class="ph ph-trash"></i> Excluir</a>
          </div>
        </td>
      </tr>`;
      })
      .join("");

    configurarEventosAcoesExpedicao();
    setupOrdenacaoHeadersExpedicao();
    document
      .getElementById("btnExportarCSVExpedicao")
      ?.addEventListener("click", exportarCSVExpedicao);
  }

  // ============================================================
  // EVENTOS DO MENU DE AÇÕES
  // ============================================================
  function configurarEventosAcoesExpedicao() {
    document
      .querySelectorAll("#table-expedicoes .btn-actions-trigger")
      .forEach((btn) => {
        btn.removeEventListener("click", handleActionTriggerExpedicao);
        btn.addEventListener("click", handleActionTriggerExpedicao);
      });
  }

  function handleActionTriggerExpedicao(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const menuId = btn.dataset.menuId;
    const menu = document.getElementById(menuId);
    if (!menu) return;

    document
      .querySelectorAll("#table-expedicoes .dropdown-actions-menu")
      .forEach((m) => {
        if (m.id !== menuId) {
          m.style.display = "none";
          m.classList.remove("show");
        }
      });

    if (menu.classList.contains("show")) {
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

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#table-expedicoes .btn-actions-trigger") &&
      !e.target.closest("#table-expedicoes .dropdown-actions-menu")
    ) {
      document
        .querySelectorAll("#table-expedicoes .dropdown-actions-menu")
        .forEach((m) => {
          m.style.display = "none";
          m.classList.remove("show");
        });
    }
  });

  // ============================================================
  // ORDENAÇÃO NOS HEADERS
  // ============================================================
  function setupOrdenacaoHeadersExpedicao() {
    document.querySelectorAll("#table-expedicoes th.sortable").forEach((th) => {
      th.addEventListener("click", function () {
        const coluna = this.dataset.sort;
        if (coluna) toggleOrdenacaoExpedicao(coluna);
      });
    });
  }

  // ============================================================
  // PAGINAÇÃO
  // ============================================================
  function renderizarPaginacaoExpedicao() {
    const container = document.getElementById("paginacaoExpedicao");
    if (!container) return;

    const mostrados = Math.min(limiteAtual, totalRegistros);
    const info = `Mostrando <strong>${mostrados}</strong> de <strong>${totalRegistros}</strong> envios`;

    if (totalRegistros > limiteAtual) {
      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <span style="color:var(--gray); font-size:0.8rem;">${info}</span>
          <button class="btn btn-ghost btn-sm" id="btnCarregarMaisExpedicao">
            <i class="ph ph-plus-circle"></i> Carregar mais (${totalRegistros - limiteAtual} restantes)
          </button>
        </div>
      `;
      document
        .getElementById("btnCarregarMaisExpedicao")
        ?.addEventListener("click", async () => {
          limiteAtual += LIMITE_PADRAO;
          await loadExpedicao(false);
        });
    } else {
      container.innerHTML = `<span style="color:var(--gray); font-size:0.8rem;">${info}</span>`;
    }
  }

  function removerPaginacaoExpedicao() {
    const container = document.getElementById("paginacaoExpedicao");
    if (container) container.innerHTML = "";
  }

  // ============================================================
  // EXPORTAÇÃO CSV
  // ============================================================
  function exportarCSVExpedicao() {
    const rows = [];
    const headers = [
      "Data",
      "OS",
      "Produto",
      "Cliente",
      "Transportadora",
      "Peças",
      "Valor",
      "Rastreio",
      "Obs",
    ];
    rows.push(headers.join(";"));

    document.querySelectorAll("#table-expedicoes tbody tr").forEach((tr) => {
      const cols = tr.querySelectorAll("td");
      const rowData = Array.from(cols).map((td) => {
        let text = td.innerText.replace(/\n/g, " ").trim();
        return `"${text}"`;
      });
      rowData.pop(); // remove coluna de ações
      rows.push(rowData.join(";"));
    });

    const blob = new Blob(["\uFEFF" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expedicao.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // FILTROS AVANÇADOS
  // ============================================================
  function setupFiltrosExpedicao() {
    const panelHeader = document.querySelector("#page-expedicao .panel-header");
    if (!panelHeader || document.getElementById("filtros-expedicao")) return;

    const filtrosHTML = `
      <div id="filtros-expedicao" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:8px;">
        <div style="position:relative; flex:1; min-width:200px;">
          <input type="text" id="filtroTransportadora" class="form-input" placeholder="Transportadora..." autocomplete="off">
          <div id="filtroTransportadoraDropdown" style="position:absolute; top:100%; left:0; right:0; background:var(--black-medium); border:1px solid rgba(255,255,255,0.1); border-radius:0 0 8px 8px; max-height:200px; overflow-y:auto; display:none; z-index:25;"></div>
        </div>
        <div style="position:relative; flex:1; min-width:200px;">
          <input type="text" id="filtroClienteExpedicao" class="form-input" placeholder="Filtrar por cliente..." autocomplete="off">
          <div id="filtroClienteExpedicaoDropdown" style="position:absolute; top:100%; left:0; right:0; background:var(--black-medium); border:1px solid rgba(255,255,255,0.1); border-radius:0 0 8px 8px; max-height:200px; overflow-y:auto; display:none; z-index:25;"></div>
        </div>
        <input type="date" id="filtroDataInicioExpedicao" class="form-input" style="width:auto;" title="Data início">
        <input type="date" id="filtroDataFimExpedicao" class="form-input" style="width:auto;" title="Data fim">
        <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:var(--gray); cursor:pointer;">
          <input type="checkbox" id="filtroSemRastreio"> Sem rastreio
        </label>
        <button id="btnLimparFiltrosExpedicao" class="btn btn-ghost btn-sm"><i class="ph ph-funnel-x"></i> Limpar</button>
      </div>
    `;
    panelHeader.insertAdjacentHTML("beforeend", filtrosHTML);

    document
      .getElementById("filtroTransportadora")
      ?.addEventListener("input", function () {
        filtrosExpedicao.transportadora = this.value.trim();
        loadExpedicao();
      });
    document
      .getElementById("filtroDataInicioExpedicao")
      ?.addEventListener("change", function () {
        filtrosExpedicao.dataInicio = this.value;
        loadExpedicao();
      });
    document
      .getElementById("filtroDataFimExpedicao")
      ?.addEventListener("change", function () {
        filtrosExpedicao.dataFim = this.value;
        loadExpedicao();
      });
    document
      .getElementById("filtroSemRastreio")
      ?.addEventListener("change", function () {
        filtrosExpedicao.semRastreio = this.checked;
        loadExpedicao();
      });
    document
      .getElementById("btnLimparFiltrosExpedicao")
      ?.addEventListener("click", function () {
        filtrosExpedicao = {
          transportadora: "",
          clienteId: "",
          dataInicio: "",
          dataFim: "",
          semRastreio: false,
        };
        document.getElementById("filtroTransportadora").value = "";
        document.getElementById("filtroClienteExpedicao").value = "";
        document.getElementById("filtroDataInicioExpedicao").value = "";
        document.getElementById("filtroDataFimExpedicao").value = "";
        document.getElementById("filtroSemRastreio").checked = false;
        loadExpedicao();
      });

    // Autocomplete transportadora
    const inputTransportadora = document.getElementById("filtroTransportadora");
    const dropdownTransportadora = document.getElementById(
      "filtroTransportadoraDropdown",
    );
    inputTransportadora?.addEventListener("input", async function () {
      const termo = this.value.trim();
      if (termo.length < 1) {
        dropdownTransportadora.style.display = "none";
        return;
      }
      const { data } = await supabase
        .from("shipments")
        .select("carrier")
        .ilike("carrier", `%${termo}%`)
        .limit(8);
      const carriers = [
        ...new Set(data?.map((d) => d.carrier).filter(Boolean)),
      ];
      if (carriers.length) {
        dropdownTransportadora.innerHTML = carriers
          .map(
            (c) =>
              `<div class="dropdown-item" data-val="${c}" style="cursor:pointer; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.05);">${c}</div>`,
          )
          .join("");
        dropdownTransportadora.style.display = "block";
      } else {
        dropdownTransportadora.innerHTML =
          '<div style="padding:8px 12px; color:var(--gray);">Nenhuma</div>';
        dropdownTransportadora.style.display = "block";
      }
    });
    dropdownTransportadora?.addEventListener("click", function (e) {
      const item = e.target.closest(".dropdown-item");
      if (item) {
        inputTransportadora.value = item.dataset.val;
        filtrosExpedicao.transportadora = item.dataset.val;
        dropdownTransportadora.style.display = "none";
        loadExpedicao();
      }
    });
    document.addEventListener("click", function (e) {
      if (
        !inputTransportadora?.contains(e.target) &&
        !dropdownTransportadora?.contains(e.target)
      )
        dropdownTransportadora.style.display = "none";
    });

    // Autocomplete cliente
    const inputCliente = document.getElementById("filtroClienteExpedicao");
    const dropdownCliente = document.getElementById(
      "filtroClienteExpedicaoDropdown",
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
              `<div class="dropdown-item" data-id="${c.id}" style="cursor:pointer; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.05);">${c.trade_name || c.company_name}</div>`,
          )
          .join("");
        dropdownCliente.style.display = "block";
      } else {
        dropdownCliente.innerHTML =
          '<div style="padding:8px 12px; color:var(--gray);">Nenhum cliente</div>';
        dropdownCliente.style.display = "block";
      }
    });
    dropdownCliente?.addEventListener("click", function (e) {
      const item = e.target.closest(".dropdown-item");
      if (item) {
        inputCliente.value = item.textContent;
        filtrosExpedicao.clienteId = item.dataset.id;
        dropdownCliente.style.display = "none";
        loadExpedicao();
      }
    });
    document.addEventListener("click", function (e) {
      if (
        !inputCliente?.contains(e.target) &&
        !dropdownCliente?.contains(e.target)
      )
        dropdownCliente.style.display = "none";
    });
  }

  // ============================================================
  // GRÁFICO DE ENVIOS DIÁRIOS (ÚLTIMOS 7 DIAS)
  // ============================================================
  function renderizarGraficoEnviosDiarios(envios) {
    const canvas = document.getElementById("chartEnviosDiarios");
    const container = document.getElementById("containerChartEnvios");
    if (!canvas) return;

    if (
      chartEnviosDiarios &&
      typeof chartEnviosDiarios.destroy === "function"
    ) {
      chartEnviosDiarios.destroy();
      chartEnviosDiarios = null;
    }

    const hoje = new Date();
    const labels = [];
    const dataCount = [];
    let temDados = false;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      labels.push(d.toLocaleDateString("pt-BR", { weekday: "short" }));
      const count = envios.filter((e) => e.ship_date === ds).length;
      dataCount.push(count);
      if (count > 0) temDados = true;
    }

    if (!temDados) {
      if (container) container.style.display = "none";
      return;
    }

    if (container) container.style.display = "block";

    chartEnviosDiarios = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Envios",
            data: dataCount,
            backgroundColor: "rgba(233, 30, 99, 0.5)",
            borderColor: "#e91e63",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });

    window.chartEnviosDiarios = chartEnviosDiarios;
  }

  // ============================================================
  // NOVO ENVIO
  // ============================================================
  async function novoEnvio() {
    const { data: ordens } = await supabase
      .from("service_orders")
      .select(
        `id, order_number, product_description, total_quantity, unit_price, status, customers(company_name, trade_name)`,
      )
      .in("status", ["costurado", "em_revisao", "parcialmente_entregue"])
      .order("expected_delivery", { ascending: true });

    if (!ordens || ordens.length === 0) {
      showFeedback("Aviso", "Nenhuma OS pronta para envio.", "warning");
      return;
    }

    const { data: transportadoras } = await supabase
      .from("shipments")
      .select("carrier")
      .not("carrier", "is", null)
      .order("carrier");
    const carriersUnicos = [
      ...new Set(transportadoras?.map((t) => t.carrier).filter(Boolean)),
    ];

    const optsOS = ordens
      .map(
        (os) =>
          `<option value="${os.id}">${os.order_number} - ${os.product_description || "Sem descrição"} | ${os.customers?.trade_name || os.customers?.company_name || "-"} | ${os.total_quantity} pçs</option>`,
      )
      .join("");

    const formHtml = `
      <div class="form-group"><label class="form-label">Ordem de Serviço *</label><select id="envOS" class="form-select" required>${optsOS}</select></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group"><label class="form-label">Transportadora</label><input id="envTransp" class="form-input" list="carriersList" placeholder="Nome"><datalist id="carriersList">${carriersUnicos.map((c) => `<option value="${c}">`).join("")}</datalist></div>
        <div class="form-group"><label class="form-label">Código de Rastreio</label><input id="envRast" class="form-input" placeholder="Ex: BR123456789"></div>
      </div>
      <div class="form-group"><label class="form-label">Quantidade Enviada</label><input id="envQtd" type="number" min="1" class="form-input" placeholder="Deixe em branco para total"></div>
      <div class="form-group"><label class="form-label">Observações</label><textarea id="envObs" class="form-input" rows="2"></textarea></div>
    `;

    openFormModal("Registrar Envio", formHtml, async () => {
      const osId = document.getElementById("envOS").value;
      const transportadora =
        document.getElementById("envTransp").value.trim() || null;
      const rastreio = document.getElementById("envRast").value.trim() || null;
      const qtdEnviada =
        parseInt(document.getElementById("envQtd").value) || null;
      const obs = document.getElementById("envObs").value.trim() || null;

      if (!osId) {
        showFeedback("Erro", "Selecione a OS.", "error");
        return;
      }

      const osSelecionada = ordens.find((o) => o.id === osId);
      const quantidadeTotal = osSelecionada.total_quantity;
      const quantidadeFinal = qtdEnviada || quantidadeTotal;

      if (quantidadeFinal > quantidadeTotal) {
        showFeedback(
          "Erro",
          `Quantidade maior que o total da OS (${quantidadeTotal}).`,
          "error",
        );
        return;
      }

      const isParcial = quantidadeFinal < quantidadeTotal;
      const novoStatus = isParcial ? "parcialmente_entregue" : "entregue";

      const { error: insertError } = await supabase.from("shipments").insert({
        service_order_id: osId,
        ship_date: todayISO(),
        carrier: transportadora,
        tracking_code: rastreio,
        notes: obs,
      });

      if (insertError) {
        showFeedback(
          "Erro",
          `Falha ao registrar envio: ${insertError.message}`,
          "error",
        );
        return;
      }

      await supabase
        .from("service_orders")
        .update({ status: novoStatus })
        .eq("id", osId);

      document.getElementById("modalContainer").innerHTML = "";
      showFeedback(
        "Sucesso",
        `Envio da OS ${osSelecionada.order_number} registrado!`,
        "success",
        () => loadExpedicao(),
      );
    });
  }

  // ============================================================
  // VER DETALHES DO ENVIO
  // ============================================================
  async function verDetalhesEnvio(id) {
    const { data: envio, error } = await supabase
      .from("shipments")
      .select(
        `*, service_orders(order_number, product_description, total_quantity, unit_price, status, received_date, expected_delivery, customers(company_name, trade_name, contact_name, phone))`,
      )
      .eq("id", id)
      .single();

    if (error || !envio) {
      showFeedback("Erro", "Envio não encontrado.", "error");
      return;
    }

    const os = envio.service_orders;
    const nomeCliente =
      os?.customers?.trade_name || os?.customers?.company_name || "-";
    const valorTotal = (os?.total_quantity || 0) * (os?.unit_price || 0);
    const rastreioHtml = envio.tracking_code
      ? `<a href="${gerarLinkRastreio(envio.tracking_code, envio.carrier || "")}" target="_blank" style="color:var(--gold-light); text-decoration:underline;">${envio.tracking_code}</a>`
      : "Não informado";

    const formHtml = `
      <div style="display:grid; gap:12px;">
        <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:12px;">
          <h4 style="color:var(--gold-light);">Envio</h4>
          <p><strong>Data:</strong> ${formatDate(envio.ship_date)}</p>
          <p><strong>Transportadora:</strong> ${envio.carrier || "Não informada"}</p>
          <p><strong>Rastreio:</strong> ${rastreioHtml}</p>
          <p><strong>Observações:</strong> ${envio.notes || "-"}</p>
        </div>
        <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:12px;">
          <h4 style="color:var(--gold-light);">OS</h4>
          <p><strong>${os?.order_number}</strong> - ${os?.product_description || "-"}</p>
          <p>Cliente: ${nomeCliente}</p>
          <p>Peças: ${os?.total_quantity} | Total: ${formatCurrency(valorTotal)}</p>
          <p>Status: <span class="status-badge status-${os?.status}">${formatStatus(os?.status)}</span></p>
        </div>
      </div>
    `;

    openFormModal("Detalhes do Envio", formHtml, () => {});
    replaceSubmitWithCloseButton();
  }

  // ============================================================
  // EDITAR ENVIO
  // ============================================================
  async function editarEnvio(id) {
    const { data: envio, error } = await supabase
      .from("shipments")
      .select(`*, service_orders(order_number)`)
      .eq("id", id)
      .single();

    if (error || !envio) {
      showFeedback("Erro", "Envio não encontrado.", "error");
      return;
    }

    const formHtml = `
      <div class="form-group"><label class="form-label">Transportadora</label><input id="editEnvTransp" class="form-input" value="${escapeHtml(envio.carrier || "")}"></div>
      <div class="form-group"><label class="form-label">Código de Rastreio</label><input id="editEnvRast" class="form-input" value="${escapeHtml(envio.tracking_code || "")}"></div>
      <div class="form-group"><label class="form-label">Observações</label><textarea id="editEnvObs" class="form-input" rows="2">${escapeHtml(envio.notes || "")}</textarea></div>
    `;

    openFormModal(
      `Editar Envio (${envio.service_orders?.order_number})`,
      formHtml,
      async () => {
        const updates = {
          carrier:
            document.getElementById("editEnvTransp").value.trim() || null,
          tracking_code:
            document.getElementById("editEnvRast").value.trim() || null,
          notes: document.getElementById("editEnvObs").value.trim() || null,
        };

        const { error: updateError } = await supabase
          .from("shipments")
          .update(updates)
          .eq("id", id);
        if (updateError) {
          showFeedback(
            "Erro",
            `Falha ao atualizar: ${updateError.message}`,
            "error",
          );
        } else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback("Sucesso", "Envio atualizado!", "success", () =>
            loadExpedicao(),
          );
        }
      },
    );
  }

  // ============================================================
  // EXCLUIR ENVIO
  // ============================================================
  async function excluirEnvio(id) {
    const { data: envio, error } = await supabase
      .from("shipments")
      .select(`id, service_order_id, service_orders(order_number, status)`)
      .eq("id", id)
      .single();

    if (error || !envio) {
      showFeedback("Erro", "Envio não encontrado.", "error");
      return;
    }

    openFormModal(
      "Confirmar Exclusão",
      `
      <p>Deseja realmente excluir o envio da OS <strong>${envio.service_orders?.order_number}</strong>?</p>
      <p style="color:var(--warning);">O status da OS será revertido para "Costurado".</p>
    `,
      async () => {
        await supabase
          .from("service_orders")
          .update({ status: "costurado" })
          .eq("id", envio.service_order_id);
        const { error: deleteError } = await supabase
          .from("shipments")
          .delete()
          .eq("id", id);
        if (deleteError) {
          showFeedback(
            "Erro",
            `Falha ao excluir: ${deleteError.message}`,
            "error",
          );
        } else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback(
            "Sucesso",
            "Envio excluído e status revertido.",
            "success",
            () => loadExpedicao(),
          );
        }
      },
    );
  }

  // ============================================================
  // LINK DE RASTREIO
  // ============================================================
  function gerarLinkRastreio(codigo, transportadora) {
    const t = transportadora.toLowerCase();
    if (t.includes("correio"))
      return `https://www.linkcorreios.com.br/?id=${codigo}`;
    if (t.includes("jadlog"))
      return `https://www.jadlog.com.br/tracking?code=${codigo}`;
    if (t.includes("tnt") || t.includes("fedex"))
      return `https://www.tnt.com/express/pt_br/site/rastreio.html?code=${codigo}`;
    return `https://www.google.com/search?q=rastreio+${codigo}`;
  }

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================
  function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
  }
  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================
  function initExpedicao() {
    setupFiltrosExpedicao();
  }

  // ============================================================
  // EXPORTAÇÃO GLOBAL
  // ============================================================
  window.loadExpedicao = loadExpedicao;
  window.novoEnvio = novoEnvio;
  window.verDetalhesEnvio = verDetalhesEnvio;
  window.editarEnvio = editarEnvio;
  window.excluirEnvio = excluirEnvio;
  window.initExpedicao = initExpedicao;
  window.exportarCSVExpedicao = exportarCSVExpedicao;
})();
