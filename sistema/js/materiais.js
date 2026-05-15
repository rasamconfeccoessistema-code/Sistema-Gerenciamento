// ============================================================
// MATERIAIS.JS
// Módulo de controle de materiais consignados
// Facção de Jeans - Sistema de Gestão
// ============================================================

(function () {
  // Estado local dos filtros de Materiais
  let filtrosMateriais = {
    statusEstoque: "",
    clienteId: "",
    tipoMaterial: "",
    dataInicio: "",
    dataFim: "",
  };

  const LIMITE_PADRAO = 20;
  let limiteAtual = LIMITE_PADRAO;
  let totalRegistros = 0;

  // Estado da ordenação
  let ordenacao = {
    coluna: "received_date",
    ascendente: false,
  };

  // ============================================================
  // CARREGAMENTO DA TELA DE MATERIAIS
  // ============================================================
  async function loadMateriais(resetLimite = true) {
    if (resetLimite) limiteAtual = LIMITE_PADRAO;

    try {
      const btn = document.querySelector("#page-materiais .btn-primary");
      if (btn) btn.setAttribute("data-action", "nova-entrada-material");

      setupFiltrosMateriais();

      // Termo de busca global
      const termoBusca = ($("#searchInput")?.value || "").trim().toLowerCase();

      let query = supabase
        .from("material_receipts")
        .select(
          `id, customer_id, service_order_id, material_type, description, quantity_received, unit, received_date, notes, created_at, customers(company_name, trade_name), service_orders(order_number, product_description)`,
          { count: "exact" },
        )
        .order("received_date", { ascending: false }); // padrão, será reordenado depois

      // Filtros
      if (filtrosMateriais.clienteId)
        query = query.eq("customer_id", filtrosMateriais.clienteId);
      if (filtrosMateriais.tipoMaterial)
        query = query.ilike(
          "material_type",
          `%${filtrosMateriais.tipoMaterial}%`,
        );
      if (filtrosMateriais.dataInicio)
        query = query.gte("received_date", filtrosMateriais.dataInicio);
      if (filtrosMateriais.dataFim)
        query = query.lte("received_date", filtrosMateriais.dataFim);

      // Busca global (similar a ordens-servico.js)
      if (termoBusca && AppState.currentPage === "materiais") {
        query = query.or(
          `material_type.ilike.%${termoBusca}%,description.ilike.%${termoBusca}%,customers.company_name.ilike.%${termoBusca}%,customers.trade_name.ilike.%${termoBusca}%`,
        );
      }

      query = query.limit(limiteAtual);

      const { data: entradas, error, count } = await query;
      if (error) {
        console.error("Erro ao carregar materiais:", error);
        showFeedback("Erro", "Falha ao carregar materiais.", "error");
        return;
      }

      totalRegistros = count || 0;

      if (!entradas || entradas.length === 0) {
        renderizarCardsResumo([], {});
        const tbody = document.querySelector("#table-materiais tbody");
        if (tbody)
          tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 40px; color: var(--gray);"><i class="ph ph-package" style="font-size: 2rem; display: block; margin-bottom: 12px;"></i>Nenhum material registrado.<br><span style="font-size: 0.8rem;">Clique em "Registrar Entrada" para adicionar materiais recebidos dos clientes.</span></td></tr>`;
        removerPaginacao();
        return;
      }

      const idsMateriais = entradas.map((e) => e.id);
      const { data: consumos } = await supabase
        .from("material_consumption")
        .select("material_receipt_id, quantity_used")
        .in("material_receipt_id", idsMateriais);

      const consumoPorMaterial = {};
      if (consumos) {
        consumos.forEach((c) => {
          if (!consumoPorMaterial[c.material_receipt_id])
            consumoPorMaterial[c.material_receipt_id] = 0;
          consumoPorMaterial[c.material_receipt_id] += parseFloat(
            c.quantity_used,
          );
        });
      }

      let entradasFiltradas = entradas;
      if (filtrosMateriais.statusEstoque) {
        entradasFiltradas = entradas.filter((entrada) => {
          const recebido = parseFloat(entrada.quantity_received);
          const consumido = consumoPorMaterial[entrada.id] || 0;
          const saldo = recebido - consumido;
          if (filtrosMateriais.statusEstoque === "esgotado") return saldo <= 0;
          if (filtrosMateriais.statusEstoque === "baixo")
            return saldo > 0 && saldo < recebido * 0.1;
          if (filtrosMateriais.statusEstoque === "normal")
            return saldo >= recebido * 0.1;
          return true;
        });
      }

      // Ordenação local (após carregar os dados)
      entradasFiltradas = ordenarDados(entradasFiltradas);

      renderizarCardsResumo(entradasFiltradas, consumoPorMaterial);
      renderizarTabelaMateriais(entradasFiltradas, consumoPorMaterial);
      renderizarPaginacao();
    } catch (e) {
      console.error("Erro ao carregar materiais:", e);
      showFeedback("Erro", "Falha ao carregar dados de materiais.", "error");
    }
  }

  // ============================================================
  // ORDENAÇÃO
  // ============================================================
  function ordenarDados(dados) {
    if (!dados || !dados.length) return dados;
    const coluna = ordenacao.coluna;
    const asc = ordenacao.ascendente;

    return [...dados].sort((a, b) => {
      let valA, valB;
      switch (coluna) {
        case "received_date":
          valA = a.received_date || "";
          valB = b.received_date || "";
          break;
        case "customer":
          valA = (
            a.customers?.trade_name ||
            a.customers?.company_name ||
            ""
          ).toLowerCase();
          valB = (
            b.customers?.trade_name ||
            b.customers?.company_name ||
            ""
          ).toLowerCase();
          break;
        case "material_type":
          valA = (a.material_type || "").toLowerCase();
          valB = (b.material_type || "").toLowerCase();
          break;
        case "quantity_received":
          valA = parseFloat(a.quantity_received) || 0;
          valB = parseFloat(b.quantity_received) || 0;
          break;
        case "consumo":
          // Será preenchido após o cálculo, mas aqui podemos usar um valor temporário
          valA = parseFloat(a._consumido || 0);
          valB = parseFloat(b._consumido || 0);
          break;
        case "saldo":
          valA = parseFloat(a._saldo || 0);
          valB = parseFloat(b._saldo || 0);
          break;
        default:
          return 0;
      }

      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  }

  function toggleOrdenacao(coluna) {
    if (ordenacao.coluna === coluna) {
      ordenacao.ascendente = !ordenacao.ascendente;
    } else {
      ordenacao.coluna = coluna;
      ordenacao.ascendente = true;
    }
    loadMateriais(false);
  }

  // ============================================================
  // RENDERIZAÇÃO DA PAGINAÇÃO
  // ============================================================
  function renderizarPaginacao() {
    const container = document.getElementById("paginacaoMateriais");
    if (!container) return;

    const mostrados = Math.min(limiteAtual, totalRegistros);
    const info = `Mostrando <strong>${mostrados}</strong> de <strong>${totalRegistros}</strong> itens`;

    if (totalRegistros > limiteAtual) {
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <span style="color: var(--gray); font-size: 0.8rem;">${info}</span>
          <button class="btn btn-ghost btn-sm" id="btnCarregarMaisMateriais">
            <i class="ph ph-plus-circle"></i> Carregar mais (${totalRegistros - limiteAtual} restantes)
          </button>
        </div>
      `;
      document
        .getElementById("btnCarregarMaisMateriais")
        ?.addEventListener("click", async () => {
          limiteAtual += LIMITE_PADRAO;
          await loadMateriais(false);
        });
    } else {
      container.innerHTML = `<span style="color: var(--gray); font-size: 0.8rem;">${info}</span>`;
    }
  }

  function removerPaginacao() {
    const container = document.getElementById("paginacaoMateriais");
    if (container) container.innerHTML = "";
  }

  // ============================================================
  // RENDERIZAÇÃO DOS CARDS DE RESUMO
  // ============================================================
  function renderizarCardsResumo(entradas, consumoPorMaterial) {
    let cardsContainer = document.querySelector("#page-materiais .cards-grid");
    if (!cardsContainer) {
      cardsContainer = document.createElement("div");
      cardsContainer.className = "cards-grid";
      const pageHeader = document.querySelector("#page-materiais .page-header");
      if (pageHeader)
        pageHeader.insertAdjacentElement("afterend", cardsContainer);
      else {
        const page = document.getElementById("page-materiais");
        if (page) page.prepend(cardsContainer);
        else return;
      }
    }

    const totalItens = entradas.length;
    let totalRecebido = 0,
      totalConsumido = 0,
      itensZerados = 0,
      itensBaixos = 0,
      itensNormais = 0;
    entradas.forEach((e) => {
      const recebido = parseFloat(e.quantity_received);
      const consumido = consumoPorMaterial[e.id] || 0;
      const saldo = recebido - consumido;
      totalRecebido += recebido;
      totalConsumido += consumido;
      if (saldo <= 0) itensZerados++;
      else if (saldo < recebido * 0.1) itensBaixos++;
      else itensNormais++;
    });

    const consumoGeral =
      totalRecebido > 0
        ? Math.round((totalConsumido / totalRecebido) * 100)
        : 0;

    cardsContainer.innerHTML = `
      <div class="card card-pink"><div class="card-icon"><i class="ph ph-package"></i></div><div class="card-info"><span class="card-label">Total de Itens</span><span class="card-value">${totalItens}</span><span class="card-detail">tipos de materiais</span></div></div>
      <div class="card card-gold"><div class="card-icon"><i class="ph ph-chart-bar"></i></div><div class="card-info"><span class="card-label">Consumo Geral</span><span class="card-value">${consumoGeral}%</span><span class="card-detail">do total recebido</span></div></div>
      <div class="card card-dark"><div class="card-icon"><i class="ph ph-check-circle"></i></div><div class="card-info"><span class="card-label">Estoque Normal</span><span class="card-value">${itensNormais}</span><span class="card-detail">acima de 10%</span></div></div>
      <div class="card card-pink-light"><div class="card-icon"><i class="ph ph-warning"></i></div><div class="card-info"><span class="card-label">Estoque Baixo</span><span class="card-value" style="color: ${itensBaixos > 0 ? "var(--warning)" : "var(--white)"};">${itensBaixos}</span><span class="card-detail">menos de 10%</span></div></div>
      <div class="card" style="border: 1px solid rgba(255, 82, 82, 0.3);"><div class="card-icon" style="background: rgba(255, 82, 82, 0.15); color: #ff8a80;"><i class="ph ph-x-circle"></i></div><div class="card-info"><span class="card-label">Esgotados</span><span class="card-value" style="color: ${itensZerados > 0 ? "var(--error)" : "var(--white)"};">${itensZerados}</span><span class="card-detail">saldo zerado</span></div></div>
    `;
  }

  // ============================================================
  // RENDERIZAÇÃO DA TABELA DE MATERIAIS
  // ============================================================
  function renderizarTabelaMateriais(entradas, consumoPorMaterial) {
    const tbody = document.querySelector("#table-materiais tbody");
    if (!tbody) return;

    // Cabeçalho com indicador de ordenação
    const theadRow = document.querySelector("#table-materiais thead tr");
    if (theadRow) {
      theadRow.innerHTML = `
        <th class="sortable" data-sort="received_date" style="cursor: pointer;">
          Data ${ordenacao.coluna === "received_date" ? (ordenacao.ascendente ? "↑" : "↓") : ""}
        </th>
        <th class="sortable" data-sort="customer" style="cursor: pointer;">
          Cliente ${ordenacao.coluna === "customer" ? (ordenacao.ascendente ? "↑" : "↓") : ""}
        </th>
        <th class="sortable" data-sort="material_type" style="cursor: pointer;">
          Material ${ordenacao.coluna === "material_type" ? (ordenacao.ascendente ? "↑" : "↓") : ""}
        </th>
        <th class="sortable text-center" data-sort="quantity_received" style="cursor: pointer;">
          Qtd Recebida ${ordenacao.coluna === "quantity_received" ? (ordenacao.ascendente ? "↑" : "↓") : ""}
        </th>
        <th class="sortable text-center" data-sort="consumo" style="cursor: pointer;">
          Consumo ${ordenacao.coluna === "consumo" ? (ordenacao.ascendente ? "↑" : "↓") : ""}
        </th>
        <th class="sortable text-center" data-sort="saldo" style="cursor: pointer;">
          Saldo ${ordenacao.coluna === "saldo" ? (ordenacao.ascendente ? "↑" : "↓") : ""}
        </th>
        <th class="text-center">Obs</th>
        <th class="text-center" style="width: 70px;">
          <button class="btn btn-ghost btn-sm" id="btnExportarCSVMateriais" title="Exportar CSV" style="font-size: 0.7rem;">
            <i class="ph ph-download-simple"></i>
          </button>
        </th>
      `;
    }

    if (!entradas || entradas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 40px; color: var(--gray);"><i class="ph ph-package" style="font-size: 2rem; display: block; margin-bottom: 12px;"></i>Nenhum material encontrado com os filtros atuais.</td></tr>`;
      return;
    }

    tbody.innerHTML = entradas
      .map((entrada) => {
        const nomeCliente =
          entrada.customers?.trade_name ||
          entrada.customers?.company_name ||
          "-";
        const dataRecebimento = entrada.received_date
          ? formatDate(entrada.received_date)
          : "-";
        const qtdRecebida = parseFloat(entrada.quantity_received);
        const qtdConsumida = consumoPorMaterial[entrada.id] || 0;
        const saldo = qtdRecebida - qtdConsumida;
        const unidade = entrada.unit || "un";

        // Armazena valores para ordenação
        entrada._consumido = qtdConsumida;
        entrada._saldo = saldo;

        let corSaldo = "var(--white)",
          iconeSaldo = "";
        if (saldo <= 0) {
          corSaldo = "var(--error)";
          iconeSaldo = "⚠️ ";
        } else if (saldo < qtdRecebida * 0.1) {
          corSaldo = "var(--warning)";
          iconeSaldo = "⚡ ";
        } else if (saldo === qtdRecebida) corSaldo = "var(--gray)";
        const percentualConsumido =
          qtdRecebida > 0 ? Math.round((qtdConsumida / qtdRecebida) * 100) : 0;
        const menuId = `menu-material-${entrada.id}`;

        return `<tr>
        <td>${dataRecebimento}</td>
        <td><strong>${nomeCliente}</strong></td>
        <td><span style="color: var(--gold-light);">${capitalizeFirst(entrada.material_type)}</span>${entrada.description ? `<br><small style="color: var(--gray);">${entrada.description}</small>` : ""}</td>
        <td class="text-center"><strong>${formatNumero(qtdRecebida)}</strong><br><small style="color: var(--gray);">${unidade}</small></td>
        <td class="text-center"><div><span>${formatNumero(qtdConsumida)}</span>${qtdRecebida > 0 ? `<div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 4px; max-width: 120px; margin-left: auto; margin-right: auto;"><div style="height: 100%; width: ${percentualConsumido}%; background: var(--gold); border-radius: 2px; transition: width 0.3s ease;"></div></div>` : ""}<small style="color: var(--gray);">${percentualConsumido}%</small></div></td>
        <td class="text-center"><span style="color: ${corSaldo}; font-weight: 600;">${iconeSaldo}${formatNumero(saldo)}</span><br><small style="color: var(--gray);">${unidade}</small></td>
        <td class="text-center">${entrada.notes ? `<i class="ph ph-note" title="${escapeHtml(entrada.notes)}" style="color: var(--gray-light); cursor: help;"></i>` : "-"}</td>
        <td class="text-center">
          <button class="btn-actions-trigger" data-menu-id="${menuId}" title="Ações"><i class="ph ph-gear-six"></i></button>
          <div id="${menuId}" class="dropdown-actions-menu" style="display: none;">
            <a href="#" class="action-item action-view" data-action="visualizar-material" data-id="${entrada.id}" data-menu="${menuId}"><i class="ph ph-eye"></i> Visualizar</a>
            <a href="#" class="action-item action-edit" data-action="editar-material" data-id="${entrada.id}" data-menu="${menuId}"><i class="ph ph-pencil-simple"></i> Editar</a>
            <a href="#" class="action-item action-register" data-action="consumir-material" data-id="${entrada.id}" data-menu="${menuId}"><i class="ph ph-arrow-down"></i> Consumir</a>
            <a href="#" class="action-item action-view" data-action="ver-historico-material" data-id="${entrada.id}" data-menu="${menuId}"><i class="ph ph-clock-counter-clockwise"></i> Histórico</a>
            <div class="dropdown-divider" style="margin: 4px 0; border-color: rgba(255,255,255,0.05);"></div>
            <a href="#" class="action-item action-warning" data-action="devolver-material" data-id="${entrada.id}" data-menu="${menuId}"><i class="ph ph-arrow-u-up-left"></i> Devolver ao Cliente</a>
            <a href="#" class="action-item action-cancel" data-action="estornar-material" data-id="${entrada.id}" data-menu="${menuId}"><i class="ph ph-arrow-counter-clockwise"></i> Estornar Consumo</a>
            <div class="dropdown-divider" style="margin: 4px 0; border-color: rgba(255,255,255,0.05);"></div>
            <a href="#" class="action-item action-delete" data-action="excluir-material" data-id="${entrada.id}" data-menu="${menuId}"><i class="ph ph-trash"></i> Excluir</a>
          </div>
        </td>
      </tr>`;
      })
      .join("");

    configurarEventosAcoesMateriais();
    setupOrdenacaoHeaders();
    document
      .getElementById("btnExportarCSVMateriais")
      ?.addEventListener("click", exportarCSVMateriais);
  }

  // ============================================================
  // CONFIGURAÇÃO DOS EVENTOS DE AÇÕES (DROPDOWN)
  // ============================================================
  function configurarEventosAcoesMateriais() {
    document
      .querySelectorAll("#table-materiais .btn-actions-trigger")
      .forEach((btn) => {
        btn.removeEventListener("click", handleActionTrigger);
        btn.addEventListener("click", handleActionTrigger);
      });
  }

  function handleActionTrigger(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const menuId = btn.dataset.menuId;
    const menu = document.getElementById(menuId);
    if (!menu) return;

    document
      .querySelectorAll("#table-materiais .dropdown-actions-menu")
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
      !e.target.closest("#table-materiais .btn-actions-trigger") &&
      !e.target.closest("#table-materiais .dropdown-actions-menu")
    ) {
      document
        .querySelectorAll("#table-materiais .dropdown-actions-menu")
        .forEach((m) => {
          m.style.display = "none";
          m.classList.remove("show");
        });
    }
  });

  // ============================================================
  // EVENTOS DE ORDENAÇÃO
  // ============================================================
  function setupOrdenacaoHeaders() {
    document.querySelectorAll("#table-materiais th.sortable").forEach((th) => {
      th.addEventListener("click", function () {
        const coluna = this.dataset.sort;
        if (coluna) toggleOrdenacao(coluna);
      });
    });
  }

  // ============================================================
  // EXPORTAÇÃO CSV
  // ============================================================
  function exportarCSVMateriais() {
    const rows = [];
    const headers = [
      "Data",
      "Cliente",
      "Material",
      "Qtd Recebida",
      "Consumo",
      "Saldo",
      "Obs",
    ];
    rows.push(headers.join(";"));

    const tbody = document.querySelectorAll("#table-materiais tbody tr");
    tbody.forEach((tr) => {
      const cols = tr.querySelectorAll("td");
      const rowData = Array.from(cols).map((td) => {
        let text = td.innerText.replace(/\n/g, " ").trim();
        // Remove textos auxiliares de unidade e percentuais para ficar limpo
        return `"${text}"`;
      });
      // Remove última coluna (ações)
      rowData.pop();
      rows.push(rowData.join(";"));
    });

    const blob = new Blob(["\uFEFF" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "materiais.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // FILTROS AVANÇADOS
  // ============================================================
  function setupFiltrosMateriais() {
    const panelHeader = document.querySelector("#page-materiais .panel-header");
    if (!panelHeader || document.getElementById("filtros-materiais")) return;

    const filtrosHTML = `
      <div id="filtros-materiais" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 8px;">
        <select id="filtroStatusEstoque" class="form-select" style="width: auto; min-width: 160px;">
          <option value="">Todos os Status</option>
          <option value="normal">Estoque Normal</option>
          <option value="baixo">Estoque Baixo (<10%)</option>
          <option value="esgotado">Esgotado</option>
        </select>
        <div style="position: relative; flex: 1; min-width: 200px;">
          <input type="text" id="filtroClienteMateriais" class="form-input" placeholder="Filtrar por cliente..." autocomplete="off">
          <div id="filtroClienteMateriaisDropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: var(--black-medium); border: 1px solid rgba(255,255,255,0.1); border-radius: 0 0 8px 8px; max-height: 200px; overflow-y: auto; display: none; z-index: 25;"></div>
        </div>
        <input type="text" id="filtroTipoMaterial" class="form-input" placeholder="Filtrar por tipo..." style="width: 160px;">
        <input type="date" id="filtroDataInicioMateriais" class="form-input" style="width: auto;" title="Data início (recebimento)">
        <input type="date" id="filtroDataFimMateriais" class="form-input" style="width: auto;" title="Data fim (recebimento)">
        <button id="btnLimparFiltrosMateriais" class="btn btn-ghost btn-sm"><i class="ph ph-funnel-x"></i> Limpar</button>
      </div>
    `;
    panelHeader.insertAdjacentHTML("beforeend", filtrosHTML);

    document
      .getElementById("filtroStatusEstoque")
      ?.addEventListener("change", function () {
        filtrosMateriais.statusEstoque = this.value;
        loadMateriais();
      });
    document
      .getElementById("filtroTipoMaterial")
      ?.addEventListener("input", function () {
        filtrosMateriais.tipoMaterial = this.value.trim();
        loadMateriais();
      });
    document
      .getElementById("filtroDataInicioMateriais")
      ?.addEventListener("change", function () {
        filtrosMateriais.dataInicio = this.value;
        loadMateriais();
      });
    document
      .getElementById("filtroDataFimMateriais")
      ?.addEventListener("change", function () {
        filtrosMateriais.dataFim = this.value;
        loadMateriais();
      });
    document
      .getElementById("btnLimparFiltrosMateriais")
      ?.addEventListener("click", function () {
        filtrosMateriais = {
          statusEstoque: "",
          clienteId: "",
          tipoMaterial: "",
          dataInicio: "",
          dataFim: "",
        };
        document.getElementById("filtroStatusEstoque").value = "";
        document.getElementById("filtroClienteMateriais").value = "";
        document.getElementById("filtroTipoMaterial").value = "";
        document.getElementById("filtroDataInicioMateriais").value = "";
        document.getElementById("filtroDataFimMateriais").value = "";
        loadMateriais();
      });

    const inputCliente = document.getElementById("filtroClienteMateriais");
    const dropdownCliente = document.getElementById(
      "filtroClienteMateriaisDropdown",
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
        filtrosMateriais.clienteId = item.dataset.id;
        dropdownCliente.style.display = "none";
        loadMateriais();
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
  // NOVA ENTRADA DE MATERIAL
  // ============================================================
  async function novaEntradaMaterial() {
    const { data: clientes } = await supabase
      .from("customers")
      .select("id, company_name, trade_name")
      .eq("active", true)
      .order("company_name");
    const optsClientes = clientes?.length
      ? clientes
          .map(
            (c) =>
              `<option value="${c.id}">${c.trade_name || c.company_name}</option>`,
          )
          .join("")
      : '<option value="">Nenhum cliente cadastrado</option>';
    const { data: ordens } = await supabase
      .from("service_orders")
      .select("id, order_number, product_description")
      .not("status", "in", '("entregue","cancelado")')
      .order("created_at", { ascending: false })
      .limit(50);
    const optsOS = ordens?.length
      ? ordens
          .map(
            (o) =>
              `<option value="${o.id}">${o.order_number} - ${o.product_description || "Sem descrição"}</option>`,
          )
          .join("")
      : '<option value="">Nenhuma OS ativa</option>';
    const tiposMaterial = [
      "Zíper",
      "Botão",
      "Rebite",
      "Ilhós",
      "Linha",
      "Etiqueta",
      "Tag",
      "Tecido",
      "Embalagem",
      "Outro",
    ];
    const optsTipos = tiposMaterial
      .map((t) => `<option value="${t}">${t}</option>`)
      .join("");

    const formHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group"><label class="form-label">Cliente *</label><select id="matCliente" class="form-select" required><option value="">Selecione o cliente...</option>${optsClientes}</select></div>
        <div class="form-group"><label class="form-label">OS Relacionada (opcional)</label><select id="matOS" class="form-select"><option value="">Nenhuma (material sem OS específica)</option>${optsOS}</select></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group"><label class="form-label">Tipo de Material *</label><input id="matTipo" class="form-input" list="tiposMaterialList" placeholder="Ex: Zíper, Botão, Linha..." required><datalist id="tiposMaterialList">${optsTipos}</datalist></div>
        <div class="form-group"><label class="form-label">Unidade *</label><input id="matUnid" class="form-input" list="unidadesList" placeholder="peça, metro, cone, rolo..." required><datalist id="unidadesList"><option value="peça"><option value="metro"><option value="cone"><option value="rolo"><option value="par"><option value="jogo"><option value="pacote"><option value="kg"><option value="unidade"></datalist></div>
      </div>
      <div class="form-group"><label class="form-label">Descrição</label><input id="matDesc" class="form-input" placeholder="Ex: Zíper 15cm azul marinho, Botão metálico 17mm..."></div>
      <div class="form-group"><label class="form-label">Quantidade Recebida *</label><input id="matQtd" type="number" step="0.01" min="0.01" class="form-input" placeholder="Ex: 500" required></div>
      <div class="form-group"><label class="form-label">Observações</label><textarea id="matObservacoes" class="form-input" rows="2" placeholder="Informações adicionais... (ex: lote, cor, marca)"></textarea></div>
    `;

    openFormModal("Registrar Entrada de Material", formHtml, async () => {
      const clienteId = document.getElementById("matCliente").value;
      const materialTipo = document.getElementById("matTipo").value.trim();
      const unidade = document.getElementById("matUnid").value.trim();
      if (!clienteId) {
        showFeedback("Erro", "Selecione um cliente.", "error");
        return;
      }
      if (!materialTipo) {
        showFeedback("Erro", "Informe o tipo de material.", "error");
        return;
      }
      if (!unidade) {
        showFeedback("Erro", "Informe a unidade.", "error");
        return;
      }

      const insert = {
        customer_id: clienteId,
        service_order_id: document.getElementById("matOS").value || null,
        material_type: materialTipo,
        description: document.getElementById("matDesc").value.trim() || null,
        quantity_received: parseFloat(document.getElementById("matQtd").value),
        unit: unidade,
        received_date: todayISO(),
        notes: document.getElementById("matObservacoes").value.trim() || null,
      };

      const { error } = await supabase.from("material_receipts").insert(insert);
      if (error) {
        showFeedback(
          "Erro",
          `Falha ao registrar material: ${error.message}`,
          "error",
        );
        console.error("Erro ao inserir material:", error);
      } else {
        document.getElementById("modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          "Entrada de material registrada com sucesso!",
          "success",
          () => loadMateriais(),
        );
      }
    });
  }

  // ============================================================
  // EDITAR MATERIAL
  // ============================================================
  async function editarMaterial(id) {
    const { data: material, error } = await supabase
      .from("material_receipts")
      .select(`*, customers(company_name, trade_name)`)
      .eq("id", id)
      .single();

    if (error || !material) {
      showFeedback("Erro", "Material não encontrado.", "error");
      return;
    }

    const { data: clientes } = await supabase
      .from("customers")
      .select("id, company_name, trade_name")
      .eq("active", true)
      .order("company_name");
    const optsClientes = clientes?.length
      ? clientes
          .map(
            (c) =>
              `<option value="${c.id}" ${c.id === material.customer_id ? "selected" : ""}>${c.trade_name || c.company_name}</option>`,
          )
          .join("")
      : '<option value="">Nenhum cliente</option>';
    const { data: ordens } = await supabase
      .from("service_orders")
      .select("id, order_number, product_description")
      .not("status", "in", '("entregue","cancelado")')
      .order("created_at", { ascending: false })
      .limit(50);
    const optsOS = ordens?.length
      ? ordens
          .map((o) => {
            const sel = o.id === material.service_order_id ? "selected" : "";
            return `<option value="${o.id}" ${sel}>${o.order_number} - ${o.product_description || "Sem descrição"}</option>`;
          })
          .join("")
      : '<option value="">Nenhuma OS ativa</option>';

    const formHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group"><label class="form-label">Cliente *</label><select id="editMatCliente" class="form-select" required>${optsClientes}</select></div>
        <div class="form-group"><label class="form-label">OS Relacionada</label><select id="editMatOS" class="form-select"><option value="">Nenhuma</option>${optsOS}</select></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group"><label class="form-label">Tipo de Material *</label><input id="editMatTipo" class="form-input" value="${escapeHtml(material.material_type)}" required></div>
        <div class="form-group"><label class="form-label">Unidade *</label><input id="editMatUnid" class="form-input" value="${escapeHtml(material.unit || "")}" required></div>
      </div>
      <div class="form-group"><label class="form-label">Descrição</label><input id="editMatDesc" class="form-input" value="${escapeHtml(material.description || "")}"></div>
      <div class="form-group"><label class="form-label">Quantidade Recebida *</label><input id="editMatQtd" type="number" step="0.01" min="0.01" class="form-input" value="${material.quantity_received}" required></div>
      <div class="form-group"><label class="form-label">Observações</label><textarea id="editMatObs" class="form-input" rows="2">${escapeHtml(material.notes || "")}</textarea></div>
    `;

    openFormModal("Editar Material", formHtml, async () => {
      const updated = {
        customer_id: document.getElementById("editMatCliente").value,
        service_order_id: document.getElementById("editMatOS").value || null,
        material_type: document.getElementById("editMatTipo").value.trim(),
        unit: document.getElementById("editMatUnid").value.trim(),
        description:
          document.getElementById("editMatDesc").value.trim() || null,
        quantity_received: parseFloat(
          document.getElementById("editMatQtd").value,
        ),
        notes: document.getElementById("editMatObs").value.trim() || null,
      };

      if (!updated.material_type || !updated.unit) {
        showFeedback("Erro", "Tipo e unidade são obrigatórios.", "error");
        return;
      }

      const { error: updateError } = await supabase
        .from("material_receipts")
        .update(updated)
        .eq("id", id);
      if (updateError) {
        showFeedback(
          "Erro",
          `Falha ao atualizar: ${updateError.message}`,
          "error",
        );
      } else {
        document.getElementById("modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          "Material atualizado com sucesso!",
          "success",
          () => loadMateriais(),
        );
      }
    });
  }

  // ============================================================
  // EXCLUIR MATERIAL
  // ============================================================
  async function excluirMaterial(id) {
    const { data: material } = await supabase
      .from("material_receipts")
      .select(
        `id, material_type, description, customers(company_name, trade_name)`,
      )
      .eq("id", id)
      .single();

    if (!material) {
      showFeedback("Erro", "Material não encontrado.", "error");
      return;
    }

    const { count: countConsumos } = await supabase
      .from("material_consumption")
      .select("*", { count: "exact", head: true })
      .eq("material_receipt_id", id);

    const mensagem =
      countConsumos > 0
        ? `⚠️ Este material possui ${countConsumos} registro(s) de consumo. A exclusão removerá o material e todo o histórico de consumo vinculado.`
        : `Tem certeza que deseja excluir permanentemente este material?`;

    openFormModal(
      "Confirmar Exclusão",
      `
      <div style="text-align: center; padding: 10px;">
        <p><strong>${capitalizeFirst(material.material_type)}</strong> - ${material.description || "Sem descrição"}</p>
        <p style="color: var(--gray);">${material.customers?.trade_name || material.customers?.company_name || "-"}</p>
        <p style="color: var(--error); margin-top: 12px;">${mensagem}</p>
      </div>
    `,
      async () => {
        if (countConsumos > 0) {
          const { error: deleteConsumosError } = await supabase
            .from("material_consumption")
            .delete()
            .eq("material_receipt_id", id);
          if (deleteConsumosError) {
            showFeedback(
              "Erro",
              `Falha ao excluir consumos: ${deleteConsumosError.message}`,
              "error",
            );
            return;
          }
        }
        const { error: deleteError } = await supabase
          .from("material_receipts")
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
            "Material excluído com sucesso!",
            "success",
            () => loadMateriais(),
          );
        }
      },
    );
  }

  // ============================================================
  // DEVOLUÇÃO DE MATERIAL AO CLIENTE
  // ============================================================
  async function devolverMaterial(id) {
    const { data: material, error } = await supabase
      .from("material_receipts")
      .select(
        `id, material_type, description, quantity_received, unit, customers(company_name, trade_name)`,
      )
      .eq("id", id)
      .single();

    if (error || !material) {
      showFeedback("Erro", "Material não encontrado.", "error");
      return;
    }

    const { data: consumos } = await supabase
      .from("material_consumption")
      .select("quantity_used")
      .eq("material_receipt_id", id);
    const totalConsumido = consumos
      ? consumos.reduce((sum, c) => sum + parseFloat(c.quantity_used), 0)
      : 0;
    const saldoAtual = parseFloat(material.quantity_received) - totalConsumido;

    if (saldoAtual <= 0) {
      showFeedback(
        "Aviso",
        "Não há saldo disponível para devolução.",
        "warning",
      );
      return;
    }

    const formHtml = `
      <div style="display: grid; gap: 12px;">
        <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px;">
          <p><strong>${capitalizeFirst(material.material_type)}</strong> - ${material.description || "Sem descrição"}</p>
          <p style="color: var(--gray);">${material.customers?.trade_name || material.customers?.company_name || "-"}</p>
          <p>Quantidade atual: <strong>${formatNumero(parseFloat(material.quantity_received))} ${material.unit || "un"}</strong></p>
          <p>Saldo disponível para devolução: <strong style="color: var(--success);">${formatNumero(saldoAtual)} ${material.unit || "un"}</strong></p>
        </div>
        <div class="form-group">
          <label class="form-label">Quantidade a Devolver *</label>
          <input id="devQtd" type="number" step="0.01" min="0.01" max="${saldoAtual}" class="form-input" required>
          <small style="color: var(--gray);">Será abatido do total recebido</small>
        </div>
      </div>
    `;

    openFormModal("Devolução ao Cliente", formHtml, async () => {
      const qtd = parseFloat(document.getElementById("devQtd").value);
      if (!qtd || qtd <= 0) {
        showFeedback("Erro", "Informe uma quantidade válida.", "error");
        return;
      }
      if (qtd > saldoAtual) {
        showFeedback(
          "Erro",
          "Quantidade maior que o saldo disponível.",
          "error",
        );
        return;
      }

      const novaQtd = parseFloat(material.quantity_received) - qtd;
      const { error: updateError } = await supabase
        .from("material_receipts")
        .update({ quantity_received: novaQtd })
        .eq("id", id);

      if (updateError) {
        showFeedback(
          "Erro",
          `Falha ao registrar devolução: ${updateError.message}`,
          "error",
        );
      } else {
        document.getElementById("modalContainer").innerHTML = "";
        showFeedback(
          "Devolução Registrada",
          `${formatNumero(qtd)} ${material.unit || "un"} de ${material.material_type} devolvido(s). Estoque atualizado.`,
          "success",
          () => loadMateriais(),
        );
      }
    });
  }

  // ============================================================
  // VISUALIZAR DETALHES DO MATERIAL
  // ============================================================
  async function visualizarMaterial(id) {
    const { data: material, error } = await supabase
      .from("material_receipts")
      .select(
        `id, customer_id, service_order_id, material_type, description, quantity_received, unit, received_date, notes, created_at, customers(company_name, trade_name), service_orders(order_number, product_description)`,
      )
      .eq("id", id)
      .single();

    if (error || !material) {
      showFeedback("Erro", "Material não encontrado.", "error");
      return;
    }

    const { data: consumos } = await supabase
      .from("material_consumption")
      .select("quantity_used")
      .eq("material_receipt_id", id);

    const totalConsumido = consumos
      ? consumos.reduce((sum, c) => sum + parseFloat(c.quantity_used), 0)
      : 0;
    const saldo = parseFloat(material.quantity_received) - totalConsumido;
    const nomeCliente =
      material.customers?.trade_name || material.customers?.company_name || "-";
    const unidade = material.unit || "un";
    const osVinculada =
      material.service_orders?.order_number || "Não vinculada";
    const produtoOS = material.service_orders?.product_description || "-";

    let corSaldo = "var(--success)";
    let iconeSaldo = "✅";
    if (saldo <= 0) {
      corSaldo = "var(--error)";
      iconeSaldo = "❌";
    } else if (saldo < parseFloat(material.quantity_received) * 0.1) {
      corSaldo = "var(--warning)";
      iconeSaldo = "⚠️";
    }

    const formHtml = `
      <div style="display: grid; gap: 12px;">
        <div style="background: rgba(212,160,23,0.08); border: 1px solid rgba(212,160,23,0.2); border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 56px; height: 56px; background: rgba(212,160,23,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--gold-light); flex-shrink: 0;"><i class="ph ph-package"></i></div>
          <div><h4 style="color: var(--gold-light); margin: 0;">${capitalizeFirst(material.material_type)}</h4><p style="margin: 2px 0; font-size: 0.85rem;">${material.description || "Sem descrição"}</p><p style="margin: 0; font-size: 0.75rem; color: var(--gray);">${unidade}</p></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: rgba(255,255,255,0.02); border-radius: 8px; padding: 10px;"><span style="font-size: 0.65rem; text-transform: uppercase; color: var(--gray);">Cliente</span><p style="font-weight: 600; margin: 2px 0;">${nomeCliente}</p></div>
          <div style="background: rgba(255,255,255,0.02); border-radius: 8px; padding: 10px;"><span style="font-size: 0.65rem; text-transform: uppercase; color: var(--gray);">OS Vinculada</span><p style="font-weight: 600; margin: 2px 0;">${osVinculada}</p><small style="color: var(--gray);">${produtoOS}</small></div>
          <div style="background: rgba(255,255,255,0.02); border-radius: 8px; padding: 10px;"><span style="font-size: 0.65rem; text-transform: uppercase; color: var(--gray);">Recebido em</span><p style="font-weight: 600; margin: 2px 0;">${formatDate(material.received_date)}</p></div>
          <div style="background: rgba(255,255,255,0.02); border-radius: 8px; padding: 10px;"><span style="font-size: 0.65rem; text-transform: uppercase; color: var(--gray);">Observações</span><p style="font-weight: 600; margin: 2px 0;">${material.notes || "Nenhuma"}</p></div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center;"><span style="font-size: 0.65rem; text-transform: uppercase; color: var(--gray);">Recebido</span><p style="font-size: 1.2rem; font-weight: 700; margin: 4px 0;">${formatNumero(parseFloat(material.quantity_received))}</p><small style="color: var(--gray);">${unidade}</small></div>
          <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center;"><span style="font-size: 0.65rem; text-transform: uppercase; color: var(--gray);">Consumido</span><p style="font-size: 1.2rem; font-weight: 700; margin: 4px 0;">${formatNumero(totalConsumido)}</p><small style="color: var(--gray);">${unidade}</small></div>
          <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center; border: 1px solid ${corSaldo};"><span style="font-size: 0.65rem; text-transform: uppercase; color: var(--gray);">Saldo</span><p style="font-size: 1.2rem; font-weight: 700; margin: 4px 0; color: ${corSaldo};">${iconeSaldo} ${formatNumero(saldo)}</p><small style="color: var(--gray);">${unidade}</small></div>
        </div>
      </div>
    `;

    openFormModalCustom(
      `📦 ${capitalizeFirst(material.material_type)}`,
      formHtml,
      () => {},
      "580px",
    );
    replaceSubmitWithCloseButton();
  }

  // ============================================================
  // REGISTRAR CONSUMO DE MATERIAL
  // ============================================================
  async function consumirMaterial(id) {
    const { data: material, error } = await supabase
      .from("material_receipts")
      .select(
        `id, customer_id, service_order_id, material_type, description, quantity_received, unit, customers(company_name, trade_name), service_orders(order_number)`,
      )
      .eq("id", id)
      .single();

    if (error || !material) {
      showFeedback("Erro", "Material não encontrado.", "error");
      return;
    }

    const { data: consumos } = await supabase
      .from("material_consumption")
      .select("quantity_used")
      .eq("material_receipt_id", id);

    const totalConsumido = consumos
      ? consumos.reduce((sum, c) => sum + parseFloat(c.quantity_used), 0)
      : 0;
    const saldoAtual = parseFloat(material.quantity_received) - totalConsumido;
    const nomeCliente =
      material.customers?.trade_name || material.customers?.company_name || "-";

    if (saldoAtual <= 0) {
      showFeedback(
        "Aviso",
        "Este material já foi totalmente consumido.",
        "warning",
      );
      return;
    }

    const { data: ordens } = await supabase
      .from("service_orders")
      .select("id, order_number, product_description")
      .not("status", "in", '("entregue","cancelado")')
      .order("created_at", { ascending: false })
      .limit(50);

    const optsOS = ordens?.length
      ? ordens
          .map((o) => {
            const selected =
              o.id === material.service_order_id ? "selected" : "";
            return `<option value="${o.id}" ${selected}>${o.order_number} - ${o.product_description || "Sem descrição"}</option>`;
          })
          .join("")
      : '<option value="">Nenhuma OS ativa</option>';

    const percentualBarra = Math.round(
      (totalConsumido / parseFloat(material.quantity_received)) * 100,
    );

    const formHtml = `
      <div style="display: grid; gap: 12px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span style="font-size: 0.65rem; text-transform: uppercase; color: var(--gold-light);">📦 ${capitalizeFirst(material.material_type)}</span>
              <p style="margin: 2px 0; font-size: 0.8rem;">${material.description || "Sem descrição"}</p>
              <small style="color: var(--gray);">Cliente: ${nomeCliente}</small>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.65rem; text-transform: uppercase; color: var(--gray);">OS vinculada</span>
              <p style="font-weight: 600; margin: 2px 0;">${material.service_orders?.order_number || "Não vinculada"}</p>
            </div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--gray);">Recebido</span><p style="font-weight: 700;">${formatNumero(parseFloat(material.quantity_received))} ${material.unit || "un"}</p></div>
          <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--gray);">Consumido</span><p style="font-weight: 700;">${formatNumero(totalConsumido)} ${material.unit || "un"}</p></div>
          <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--gray);">Disponível</span><p style="font-weight: 700; color: ${saldoAtual < parseFloat(material.quantity_received) * 0.1 ? "var(--warning)" : "var(--success)"};">${formatNumero(saldoAtual)} ${material.unit || "un"}</p></div>
        </div>
        <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${percentualBarra}%; background: var(--gold); border-radius: 3px;"></div>
        </div>
        <div class="form-group"><label class="form-label">Quantidade a Consumir *</label><input id="consQtd" type="number" step="0.01" min="0.01" max="${saldoAtual}" class="form-input" placeholder="Ex: 50" required><small style="color: var(--gray);">Disponível: ${formatNumero(saldoAtual)} ${material.unit || "un"}</small></div>
        <div class="form-group"><label class="form-label">Ordem de Serviço *</label><select id="consOS" class="form-select" required><option value="">Selecione a OS...</option>${optsOS}</select><small style="color: var(--gray);">Lote que receberá este consumo</small></div>
      </div>
    `;

    openFormModal("Registrar Consumo", formHtml, async () => {
      const qtdConsumir = parseFloat(document.getElementById("consQtd").value);
      const osId = document.getElementById("consOS").value;

      if (!qtdConsumir || qtdConsumir <= 0) {
        showFeedback("Erro", "Informe a quantidade.", "error");
        return;
      }
      if (qtdConsumir > saldoAtual) {
        showFeedback(
          "Erro",
          `Máximo: ${formatNumero(saldoAtual)} ${material.unit || "un"}.`,
          "error",
        );
        return;
      }
      if (!osId) {
        showFeedback("Erro", "Selecione a OS.", "error");
        return;
      }

      const insert = {
        material_receipt_id: id,
        service_order_id: osId,
        quantity_used: qtdConsumir,
        consumption_date: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("material_consumption")
        .insert(insert);
      if (insertError) {
        showFeedback(
          "Erro",
          `Falha ao registrar: ${insertError.message}`,
          "error",
        );
        return;
      }

      document.getElementById("modalContainer").innerHTML = "";
      const novosaldo = saldoAtual - qtdConsumir;
      let tipo = "success",
        extra = "";
      if (novosaldo <= 0) {
        tipo = "warning";
        extra = " Material esgotado.";
      } else if (novosaldo < parseFloat(material.quantity_received) * 0.1) {
        tipo = "warning";
        extra = " Estoque baixo!";
      }

      showFeedback(
        "Consumo Registrado",
        `${formatNumero(qtdConsumir)} ${material.unit || "un"} de ${material.material_type} consumido(s). Restam ${formatNumero(novosaldo)} ${material.unit || "un"}.${extra}`,
        tipo,
        () => loadMateriais(),
      );
    });
  }

  // ============================================================
  // VER HISTÓRICO DE CONSUMO DO MATERIAL
  // ============================================================
  async function verHistoricoMaterial(id) {
    const { data: material } = await supabase
      .from("material_receipts")
      .select(
        `id, material_type, description, quantity_received, unit, customers(company_name, trade_name)`,
      )
      .eq("id", id)
      .single();

    if (!material) {
      showFeedback("Erro", "Material não encontrado.", "error");
      return;
    }

    const { data: consumos } = await supabase
      .from("material_consumption")
      .select(
        `id, quantity_used, consumption_date, service_orders(order_number, product_description)`,
      )
      .eq("material_receipt_id", id)
      .order("consumption_date", { ascending: false });

    const nomeCliente =
      material.customers?.trade_name || material.customers?.company_name || "-";
    const totalConsumido = consumos
      ? consumos.reduce((sum, c) => sum + parseFloat(c.quantity_used), 0)
      : 0;
    const saldo = parseFloat(material.quantity_received) - totalConsumido;

    const historicoHtml =
      consumos && consumos.length > 0
        ? consumos
            .map(
              (c) => `
          <tr>
            <td>${formatDateTime(c.consumption_date)}</td>
            <td><strong style="color: var(--gold-light);">${c.service_orders?.order_number || "-"}</strong><br><small>${c.service_orders?.product_description || ""}</small></td>
            <td class="text-center"><strong>${formatNumero(parseFloat(c.quantity_used))}</strong> ${material.unit || "un"}</td>
          </tr>
        `,
            )
            .join("")
        : '<tr><td colspan="3" class="text-center" style="color: var(--gray); padding: 20px;">Nenhum consumo registrado</td></tr>';

    const formHtml = `
      <div style="display: grid; gap: 12px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; background: rgba(212,160,23,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--gold-light); font-size: 1.3rem;"><i class="ph ph-package"></i></div>
            <div>
              <h4 style="margin: 0; color: var(--gold-light);">${capitalizeFirst(material.material_type)}</h4>
              <p style="margin: 2px 0; font-size: 0.8rem;">${material.description || "Sem descrição"}</p>
              <small style="color: var(--gray);">${nomeCliente}</small>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px;">
            <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--gray);">Recebido</span><p style="font-weight: 700;">${formatNumero(parseFloat(material.quantity_received))}</p></div>
            <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--gray);">Consumido</span><p style="font-weight: 700;">${formatNumero(totalConsumido)}</p></div>
            <div style="text-align: center;"><span style="font-size: 0.65rem; color: var(--gray);">Saldo</span><p style="font-weight: 700; color: ${saldo <= 0 ? "var(--error)" : saldo < parseFloat(material.quantity_received) * 0.1 ? "var(--warning)" : "var(--success)"};">${formatNumero(saldo)}</p></div>
          </div>
        </div>
        <h4 style="font-size: 0.9rem; margin: 0;">Histórico de Consumos</h4>
        <div style="overflow-x: auto;"><table class="table"><thead><tr><th>Data/Hora</th><th>OS</th><th class="text-center">Quantidade</th></tr></thead><tbody>${historicoHtml}</tbody></table></div>
      </div>
    `;

    openFormModal("📋 Histórico de Consumo", formHtml, () => {});
    replaceSubmitWithCloseButton();
  }

  // ============================================================
  // ESTORNAR CONSUMO DE MATERIAL
  // ============================================================
  async function estornarConsumoMaterial(materialId) {
    const { data: material } = await supabase
      .from("material_receipts")
      .select(
        `id, material_type, description, quantity_received, unit, customers(company_name, trade_name)`,
      )
      .eq("id", materialId)
      .single();

    if (!material) {
      showFeedback("Erro", "Material não encontrado.", "error");
      return;
    }

    const { data: consumos } = await supabase
      .from("material_consumption")
      .select(
        `id, quantity_used, consumption_date, service_orders(order_number)`,
      )
      .eq("material_receipt_id", materialId)
      .order("consumption_date", { ascending: false });

    if (!consumos || consumos.length === 0) {
      showFeedback("Aviso", "Nenhum consumo registrado para estornar.", "info");
      return;
    }

    const nomeCliente =
      material.customers?.trade_name || material.customers?.company_name || "-";
    const unidade = material.unit || "un";

    const linhasConsumos = consumos
      .map(
        (c) => `
      <tr>
        <td>${formatDateTime(c.consumption_date)}</td>
        <td>${c.service_orders?.order_number || "-"}</td>
        <td class="text-center">${formatNumero(parseFloat(c.quantity_used))} ${unidade}</td>
        <td class="text-center">
          <button class="btn btn-ghost btn-sm estornar-consumo-btn" data-consumo-id="${c.id}" style="color: var(--error);">
            <i class="ph ph-arrow-u-up-left"></i> Estornar
          </button>
        </td>
      </tr>
    `,
      )
      .join("");

    const formHtml = `
      <div style="display: grid; gap: 12px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; background: rgba(233,30,99,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--pink); font-size: 1.3rem;"><i class="ph ph-arrow-u-up-left"></i></div>
            <div>
              <h4 style="margin: 0;">${capitalizeFirst(material.material_type)}</h4>
              <p style="margin: 2px 0; font-size: 0.8rem;">${material.description || "Sem descrição"}</p>
              <small style="color: var(--gray);">${nomeCliente} • ${formatNumero(parseFloat(material.quantity_received))} ${unidade} recebidos</small>
            </div>
          </div>
        </div>
        <p style="font-size: 0.8rem; color: var(--gray);">Selecione o consumo que deseja estornar:</p>
        <div style="overflow-x: auto;"><table class="table"><thead><tr><th>Data/Hora</th><th>OS</th><th class="text-center">Qtd</th><th class="text-center">Ação</th></tr></thead><tbody>${linhasConsumos}</tbody></table></div>
      </div>
    `;

    openFormModal("🔄 Estornar Consumo", formHtml, () => {});
    replaceSubmitWithCloseButton();

    document.querySelectorAll(".estornar-consumo-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const consumoId = btn.dataset.consumoId;
        if (
          !confirm(
            "Tem certeza que deseja estornar este consumo? O saldo será restaurado.",
          )
        )
          return;

        const { error: deleteError } = await supabase
          .from("material_consumption")
          .delete()
          .eq("id", consumoId);
        if (deleteError) {
          showFeedback(
            "Erro",
            `Falha ao estornar: ${deleteError.message}`,
            "error",
          );
        } else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback(
            "Sucesso",
            "Consumo estornado com sucesso!",
            "success",
            () => loadMateriais(),
          );
        }
      });
    });
  }

  // ============================================================
  // FUNÇÃO AUXILIAR PARA MODAL COM TAMANHO PERSONALIZADO
  // ============================================================
  function openFormModalCustom(title, formHtml, onSubmit, maxWidth = "520px") {
    const html = `
      <div class="modal-overlay" id="formOverlay">
        <div class="modal" style="max-width:${maxWidth}; max-height: 90vh; overflow-y: auto; padding: 16px;">
          <div class="modal-header" style="margin-bottom: 12px;">
            <h3 style="font-size: 1rem;">${title}</h3>
            <button class="modal-close" id="closeFormModal">&times;</button>
          </div>
          <form id="dynamicForm" style="display:grid; gap:8px;">
            ${formHtml}
            <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Fechar</button>
          </form>
        </div>
      </div>
    `;

    const container = document.getElementById("modalContainer");
    if (!container) return;
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
        if (typeof onSubmit === "function") await onSubmit();
        closeModal();
      });
  }

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================
  function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
  }
  function formatNumero(num) {
    return Number.isInteger(num)
      ? num.toString()
      : parseFloat(num.toFixed(2)).toString();
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
  function initMateriais() {
    setupFiltrosMateriais();
  }

  // ============================================================
  // EXPORTAÇÃO GLOBAL
  // ============================================================
  window.loadMateriais = loadMateriais;
  window.novaEntradaMaterial = novaEntradaMaterial;
  window.editarMaterial = editarMaterial;
  window.excluirMaterial = excluirMaterial;
  window.devolverMaterial = devolverMaterial;
  window.visualizarMaterial = visualizarMaterial;
  window.consumirMaterial = consumirMaterial;
  window.verHistoricoMaterial = verHistoricoMaterial;
  window.estornarConsumoMaterial = estornarConsumoMaterial;
  window.exportarCSVMateriais = exportarCSVMateriais;
  window.capitalizeFirst = capitalizeFirst;
  window.formatNumero = formatNumero;
  window.escapeHtml = escapeHtml;
  window.openFormModalCustom = openFormModalCustom;
  window.initMateriais = initMateriais;
})();
