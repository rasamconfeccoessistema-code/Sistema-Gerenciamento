// ============================================================
// CONTABIL.JS - VERSÃO 2 (PROFISSIONAL)
// Módulo de Controle Contábil - Obrigações e Comprovantes
// Facção de Jeans - Sistema de Gestão
// ============================================================

(function () {
  let filtrosContabil = {
    mesReferencia: "",
    categoria: "",
    status: "",
    dataInicio: "",
    dataFim: "",
    buscaDescricao: "",
  };

  const LIMITE_PADRAO = 20;
  let limiteAtual = LIMITE_PADRAO;
  let totalRegistros = 0;

  let ordenacao = {
    coluna: "due_date",
    ascendente: true,
  };

  let chartObrigacoes = null;

  // ============================================================
  // CARREGAMENTO DA TELA CONTÁBIL
  // ============================================================
  async function loadContabil(resetLimite = true) {
    if (resetLimite) limiteAtual = LIMITE_PADRAO;

    try {
      const btn = document.querySelector("#page-contabil .btn-primary");
      if (btn) btn.setAttribute("data-action", "nova-obrigacao");

      setupFiltrosContabil();

      const termoBusca = ($("#searchInput")?.value || "").trim().toLowerCase();

      let query = supabase
        .from("accounting_checklist")
        .select("*", { count: "exact" });

      if (filtrosContabil.mesReferencia)
        query = query.eq("reference_month", filtrosContabil.mesReferencia);
      if (filtrosContabil.categoria)
        query = query.eq("category", filtrosContabil.categoria);
      if (filtrosContabil.status)
        query = query.eq("status", filtrosContabil.status);
      if (filtrosContabil.dataInicio)
        query = query.gte("due_date", filtrosContabil.dataInicio);
      if (filtrosContabil.dataFim)
        query = query.lte("due_date", filtrosContabil.dataFim);
      if (filtrosContabil.buscaDescricao)
        query = query.ilike(
          "description",
          `%${filtrosContabil.buscaDescricao}%`,
        );

      if (termoBusca && AppState.currentPage === "contabil") {
        query = query.or(
          `description.ilike.%${termoBusca}%,notes.ilike.%${termoBusca}%,category.ilike.%${termoBusca}%`,
        );
      }

      query = query.order(ordenacao.coluna, {
        ascending: ordenacao.ascendente,
      });
      query = query.limit(limiteAtual);

      const { data: obrigacoes, error, count } = await query;
      if (error) {
        console.error(error);
        showFeedback(
          "Erro",
          "Falha ao carregar obrigações contábeis.",
          "error",
        );
        return;
      }

      totalRegistros = count || 0;
      let dados = obrigacoes || [];

      await renderizarCardsResumoContabil(dados);
      renderizarTabelaContabil(dados);
      renderizarPaginacaoContabil();
      await renderizarGraficoObrigacoes();
    } catch (e) {
      console.error(e);
      showFeedback("Erro", "Falha ao carregar contábil.", "error");
    }
  }

  // ============================================================
  // ORDENAÇÃO
  // ============================================================
  function toggleOrdenacaoContabil(coluna) {
    if (ordenacao.coluna === coluna)
      ordenacao.ascendente = !ordenacao.ascendente;
    else {
      ordenacao.coluna = coluna;
      ordenacao.ascendente = true;
    }
    loadContabil(false);
  }

  // ============================================================
  // CARDS DE RESUMO
  // ============================================================
  async function renderizarCardsResumoContabil(obrigacoes) {
    let cardsContainer = document.querySelector("#page-contabil .cards-grid");
    if (!cardsContainer) {
      cardsContainer = document.createElement("div");
      cardsContainer.className = "cards-grid";
      const pageHeader = document.querySelector("#page-contabil .page-header");
      if (pageHeader)
        pageHeader.insertAdjacentElement("afterend", cardsContainer);
      else {
        const page = document.getElementById("page-contabil");
        if (page) page.prepend(cardsContainer);
        else return;
      }
    }

    const hoje = todayISO();
    const total = obrigacoes.length;
    const concluidas = obrigacoes.filter(
      (o) => o.status === "concluido",
    ).length;
    const pendentes = obrigacoes.filter((o) => o.status === "pendente").length;
    const vencidas = obrigacoes.filter(
      (o) => o.status === "pendente" && o.due_date < hoje,
    ).length;

    cardsContainer.innerHTML = `
      <div class="card card-pink" onclick="filtrosContabil.mesReferencia='${hoje.substring(0, 7)}';loadContabil();" style="cursor:pointer;">
        <div class="card-icon"><i class="ph ph-calculator"></i></div>
        <div class="card-info"><span class="card-label">Total de Obrigações</span><span class="card-value">${total}</span><span class="card-detail">no período</span></div>
      </div>
      <div class="card card-gold" onclick="filtrosContabil.status='concluido';loadContabil();" style="cursor:pointer;">
        <div class="card-icon"><i class="ph ph-check-circle"></i></div>
        <div class="card-info"><span class="card-label">Concluídas</span><span class="card-value">${concluidas}</span><span class="card-detail">${total > 0 ? Math.round((concluidas / total) * 100) : 0}% do total</span></div>
      </div>
      <div class="card card-dark" onclick="filtrosContabil.status='pendente';loadContabil();" style="cursor:pointer;">
        <div class="card-icon"><i class="ph ph-hourglass"></i></div>
        <div class="card-info"><span class="card-label">Pendentes</span><span class="card-value">${pendentes}</span><span class="card-detail">aguardando ação</span></div>
      </div>
      <div class="card card-pink-light" onclick="filtrosContabil.status='pendente';filtrosContabil.dataFim='${hoje}';loadContabil();" style="cursor:pointer;">
        <div class="card-icon"><i class="ph ph-warning-circle"></i></div>
        <div class="card-info"><span class="card-label">Vencidas</span><span class="card-value" style="color:${vencidas > 0 ? "var(--error)" : "var(--white)"};">${vencidas}</span><span class="card-detail">atrasadas</span></div>
      </div>
    `;
  }

  // ============================================================
  // RENDERIZAÇÃO DA TABELA
  // ============================================================
  function renderizarTabelaContabil(obrigacoes) {
    const tbody = document.querySelector("#table-contabil tbody");
    if (!tbody) return;

    const theadRow = document.querySelector("#table-contabil thead tr");
    if (theadRow) {
      theadRow.innerHTML = `
        <th class="sortable" data-sort="due_date" style="cursor:pointer;">Vencimento ${ordenacao.coluna === "due_date" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
        <th class="sortable" data-sort="description" style="cursor:pointer;">Descrição ${ordenacao.coluna === "description" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
        <th>Categoria</th>
        <th class="sortable" data-sort="reference_month" style="cursor:pointer;">Mês Ref. ${ordenacao.coluna === "reference_month" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
        <th class="sortable text-center" data-sort="status" style="cursor:pointer;">Status ${ordenacao.coluna === "status" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
        <th class="text-center">Comprovante</th>
        <th class="text-center">Obs</th>
        <th class="text-center" style="width:70px;">
          <button class="btn btn-ghost btn-sm" id="btnExportarCSVContabil" title="Exportar CSV"><i class="ph ph-download-simple"></i></button>
          <button class="btn btn-ghost btn-sm" id="btnGerarObrigacoes" title="Gerar obrigações do mês" style="margin-left:4px;"><i class="ph ph-lightning"></i></button>
        </th>
      `;
    }

    if (!obrigacoes || obrigacoes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">Nenhuma obrigação encontrada.</td></tr>`;
      return;
    }

    const hoje = todayISO();
    tbody.innerHTML = obrigacoes
      .map((o) => {
        const vencida = o.status === "pendente" && o.due_date < hoje;
        const menuId = `menu-contabil-${o.id}`;
        const categoriaBadge = getCategoriaBadge(o.category);

        return `<tr>
        <td><span style="color:${vencida ? "var(--error)" : "var(--white)"};">${formatDate(o.due_date)}</span></td>
        <td>${o.description || "-"}</td>
        <td>${categoriaBadge}</td>
        <td>${formatarMesReferencia(o.reference_month)}</td>
        <td class="text-center">${formatarStatusContabil(o.status)}</td>
        <td class="text-center">${o.attachment_url ? `<a href="${o.attachment_url}" target="_blank" title="${o.attachment_name || "Comprovante"}" style="color:var(--gold-light); text-decoration:underline;">📎 Ver</a>` : "❌"}</td>
        <td class="text-center">${o.notes ? `<i class="ph ph-note" title="${escapeHtml(o.notes)}" style="color:var(--gray-light); cursor:help;"></i>` : "-"}</td>
        <td class="text-center">
          <button class="btn-actions-trigger" data-menu-id="${menuId}" title="Ações"><i class="ph ph-gear-six"></i></button>
          <div id="${menuId}" class="dropdown-actions-menu" style="display:none;">
            <a href="#" class="action-item action-view" data-action="ver-obrigacao" data-id="${o.id}" data-menu="${menuId}"><i class="ph ph-eye"></i> Visualizar</a>
            <a href="#" class="action-item action-edit" data-action="editar-obrigacao" data-id="${o.id}" data-menu="${menuId}"><i class="ph ph-pencil-simple"></i> Editar</a>
            ${o.status === "pendente" ? `<a href="#" class="action-item action-finish" data-action="concluir-obrigacao" data-id="${o.id}" data-menu="${menuId}"><i class="ph ph-check-circle"></i> Concluir</a>` : ""}
            ${o.status === "concluido" ? `<a href="#" class="action-item action-review" data-action="reabrir-obrigacao" data-id="${o.id}" data-menu="${menuId}"><i class="ph ph-arrow-counter-clockwise"></i> Reabrir</a>` : ""}
            <a href="#" class="action-item action-register" data-action="anexar-comprovante" data-id="${o.id}" data-menu="${menuId}"><i class="ph ph-paperclip"></i> Anexar</a>
            <div class="dropdown-divider" style="margin:4px 0;"></div>
            <a href="#" class="action-item action-delete" data-action="excluir-obrigacao" data-id="${o.id}" data-menu="${menuId}"><i class="ph ph-trash"></i> Excluir</a>
          </div>
        </td>
      </tr>`;
      })
      .join("");

    configurarEventosAcoesContabil();
    setupOrdenacaoHeadersContabil();
    document
      .getElementById("btnExportarCSVContabil")
      ?.addEventListener("click", exportarCSVContabil);
    document
      .getElementById("btnGerarObrigacoes")
      ?.addEventListener("click", gerarObrigacoesRecorrentes);
  }

  // ============================================================
  // BADGES DE CATEGORIA
  // ============================================================
  function getCategoriaBadge(categoria) {
    const badges = {
      FGTS: '<span style="background:rgba(76,175,80,0.2);color:#a5d6a7;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">FGTS</span>',
      INSS: '<span style="background:rgba(33,150,243,0.2);color:#64b5f6;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">INSS</span>',
      DAS: '<span style="background:rgba(156,39,176,0.2);color:#ce93d8;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">DAS</span>',
      Férias:
        '<span style="background:rgba(255,152,0,0.2);color:#ffb74d;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">Férias</span>',
      "13º Salário":
        '<span style="background:rgba(233,30,99,0.2);color:#f48fb1;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">13º</span>',
      Sindicato:
        '<span style="background:rgba(0,188,212,0.2);color:#80deea;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">Sindicato</span>',
      Rescisão:
        '<span style="background:rgba(255,82,82,0.2);color:#ff8a80;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">Rescisão</span>',
      Contador:
        '<span style="background:rgba(255,193,7,0.2);color:#ffe082;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">Contador</span>',
      Outros:
        '<span style="background:rgba(158,158,158,0.2);color:#bdbdbd;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">Outros</span>',
    };
    return badges[categoria] || badges["Outros"];
  }

  // ============================================================
  // EVENTOS DO MENU DE AÇÕES
  // ============================================================
  function configurarEventosAcoesContabil() {
    document
      .querySelectorAll("#table-contabil .btn-actions-trigger")
      .forEach((btn) => {
        btn.removeEventListener("click", handleActionTriggerContabil);
        btn.addEventListener("click", handleActionTriggerContabil);
      });
  }

  function handleActionTriggerContabil(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const menuId = btn.dataset.menuId;
    const menu = document.getElementById(menuId);
    if (!menu) return;

    document
      .querySelectorAll("#table-contabil .dropdown-actions-menu")
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
      !e.target.closest("#table-contabil .btn-actions-trigger") &&
      !e.target.closest("#table-contabil .dropdown-actions-menu")
    ) {
      document
        .querySelectorAll("#table-contabil .dropdown-actions-menu")
        .forEach((m) => {
          m.style.display = "none";
          m.classList.remove("show");
        });
    }
  });

  function setupOrdenacaoHeadersContabil() {
    document.querySelectorAll("#table-contabil th.sortable").forEach((th) => {
      th.addEventListener("click", function () {
        toggleOrdenacaoContabil(this.dataset.sort);
      });
    });
  }

  // ============================================================
  // PAGINAÇÃO E EXPORTAÇÃO
  // ============================================================
  function renderizarPaginacaoContabil() {
    const container = document.getElementById("paginacaoContabil");
    if (!container) return;
    const mostrados = Math.min(limiteAtual, totalRegistros);
    const info = `Mostrando <strong>${mostrados}</strong> de <strong>${totalRegistros}</strong> obrigações`;
    if (totalRegistros > limiteAtual) {
      container.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;"><span style="color:var(--gray); font-size:0.8rem;">${info}</span><button class="btn btn-ghost btn-sm" id="btnCarregarMaisContabil"><i class="ph ph-plus-circle"></i> Carregar mais (${totalRegistros - limiteAtual} restantes)</button></div>`;
      document
        .getElementById("btnCarregarMaisContabil")
        ?.addEventListener("click", async () => {
          limiteAtual += LIMITE_PADRAO;
          await loadContabil(false);
        });
    } else
      container.innerHTML = `<span style="color:var(--gray); font-size:0.8rem;">${info}</span>`;
  }

  function exportarCSVContabil() {
    const rows = [];
    rows.push(
      [
        "Vencimento",
        "Descrição",
        "Categoria",
        "Mês Ref.",
        "Status",
        "Comprovante",
        "Obs",
      ].join(";"),
    );
    document.querySelectorAll("#table-contabil tbody tr").forEach((tr) => {
      const cols = tr.querySelectorAll("td");
      const row = Array.from(cols).map(
        (td) => `"${td.innerText.replace(/\n/g, " ").trim()}"`,
      );
      row.pop();
      rows.push(row.join(";"));
    });
    const blob = new Blob(["\uFEFF" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "obrigacoes_contabeis.csv";
    a.click();
  }

  // ============================================================
  // FILTROS AVANÇADOS
  // ============================================================
  function setupFiltrosContabil() {
    const panelHeader = document.querySelector("#page-contabil .panel-header");
    if (!panelHeader || document.getElementById("filtros-contabil")) return;

    const categorias = [
      "FGTS",
      "INSS",
      "DAS",
      "Férias",
      "13º Salário",
      "Sindicato",
      "Rescisão",
      "Contador",
      "Outros",
    ];
    const meses = gerarOpcoesMeses();
    const filtrosHTML = `
      <div id="filtros-contabil" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:8px;">
        <select id="filtroMesReferencia" class="form-select" style="width:auto; min-width:160px;"><option value="">Todos os meses</option>${meses}</select>
        <select id="filtroCategoria" class="form-select" style="width:auto; min-width:140px;"><option value="">Todas categorias</option>${categorias.map((c) => `<option value="${c}">${c}</option>`).join("")}</select>
        <select id="filtroStatusContabil" class="form-select" style="width:auto; min-width:130px;"><option value="">Todos os status</option><option value="pendente">Pendente</option><option value="concluido">Concluído</option></select>
        <input type="date" id="filtroDataInicioContabil" class="form-input" style="width:auto;" title="Data início">
        <input type="date" id="filtroDataFimContabil" class="form-input" style="width:auto;" title="Data fim">
        <input type="text" id="filtroBuscaDescricao" class="form-input" placeholder="Buscar descrição..." style="width:160px;">
        <button id="btnLimparFiltrosContabil" class="btn btn-ghost btn-sm"><i class="ph ph-funnel-x"></i> Limpar</button>
      </div>
    `;
    panelHeader.insertAdjacentHTML("beforeend", filtrosHTML);

    document.getElementById("filtroMesReferencia").onchange = function () {
      filtrosContabil.mesReferencia = this.value;
      loadContabil();
    };
    document.getElementById("filtroCategoria").onchange = function () {
      filtrosContabil.categoria = this.value;
      loadContabil();
    };
    document.getElementById("filtroStatusContabil").onchange = function () {
      filtrosContabil.status = this.value;
      loadContabil();
    };
    document.getElementById("filtroDataInicioContabil").onchange = function () {
      filtrosContabil.dataInicio = this.value;
      loadContabil();
    };
    document.getElementById("filtroDataFimContabil").onchange = function () {
      filtrosContabil.dataFim = this.value;
      loadContabil();
    };
    document.getElementById("filtroBuscaDescricao").oninput = function () {
      filtrosContabil.buscaDescricao = this.value.trim();
      loadContabil();
    };
    document.getElementById("btnLimparFiltrosContabil").onclick = function () {
      filtrosContabil = {
        mesReferencia: "",
        categoria: "",
        status: "",
        dataInicio: "",
        dataFim: "",
        buscaDescricao: "",
      };
      [
        "filtroMesReferencia",
        "filtroCategoria",
        "filtroStatusContabil",
        "filtroDataInicioContabil",
        "filtroDataFimContabil",
        "filtroBuscaDescricao",
      ].forEach((id) => (document.getElementById(id).value = ""));
      loadContabil();
    };
  }

  function gerarOpcoesMeses() {
    const hoje = new Date();
    let opcoes = "";
    for (let i = 0; i < 24; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const rotulo = d.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      opcoes += `<option value="${valor}">${capitalizeFirst(rotulo)}</option>`;
    }
    return opcoes;
  }

  // ============================================================
  // GERAR OBRIGAÇÕES RECORRENTES (BOTÃO MÁGICO)
  // ============================================================
  async function gerarObrigacoesRecorrentes() {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

    // Busca obrigações do mês passado que podem ser recorrentes
    const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesAnteriorStr = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, "0")}`;

    const { data: obrigacoesAnteriores } = await supabase
      .from("accounting_checklist")
      .select("*")
      .eq("reference_month", mesAnteriorStr)
      .in("category", ["FGTS", "INSS", "DAS", "Sindicato", "Contador"]);

    if (!obrigacoesAnteriores || obrigacoesAnteriores.length === 0) {
      showFeedback(
        "Aviso",
        "Nenhuma obrigação recorrente encontrada no mês anterior.",
        "warning",
      );
      return;
    }

    openFormModal(
      "Gerar Obrigações Recorrentes",
      `
      <p>As seguintes obrigações do mês anterior serão copiadas para <strong>${formatarMesReferencia(mesAtual)}</strong>:</p>
      <div style="max-height:300px; overflow-y:auto; margin:12px 0;">
        <table class="table">
          <thead><tr><th>Categoria</th><th>Descrição</th><th>Vencimento Anterior</th></tr></thead>
          <tbody>
            ${obrigacoesAnteriores.map((o) => `<tr><td>${getCategoriaBadge(o.category)}</td><td>${o.description}</td><td>${formatDate(o.due_date)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p style="color:var(--gray); font-size:0.8rem;">As novas obrigações terão vencimento no mesmo dia do mês atual e status "Pendente".</p>
    `,
      async () => {
        const inserts = obrigacoesAnteriores.map((o) => {
          const dia = new Date(o.due_date + "T12:00:00").getDate();
          const novoVencimento = new Date(
            hoje.getFullYear(),
            hoje.getMonth(),
            Math.min(
              dia,
              new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate(),
            ),
          );
          return {
            description: o.description,
            category: o.category,
            due_date: novoVencimento.toISOString().split("T")[0],
            reference_month: mesAtual,
            status: "pendente",
            notes: o.notes,
          };
        });

        const { error } = await supabase
          .from("accounting_checklist")
          .insert(inserts);
        if (error)
          showFeedback("Erro", `Falha ao gerar: ${error.message}`, "error");
        else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback(
            "Sucesso",
            `${inserts.length} obrigações geradas para ${formatarMesReferencia(mesAtual)}!`,
            "success",
            () => loadContabil(),
          );
        }
      },
    );
  }

  // ============================================================
  // GRÁFICO DE OBRIGAÇÕES (ÚLTIMOS 6 MESES)
  // ============================================================
  async function renderizarGraficoObrigacoes() {
    const canvas = document.getElementById("chartObrigacoes");
    if (!canvas) return;

    if (chartObrigacoes && typeof chartObrigacoes.destroy === "function") {
      chartObrigacoes.destroy();
      chartObrigacoes = null;
    }

    const hoje = new Date();
    const labels = [];
    const concluidasData = [];
    const pendentesData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      labels.push(
        d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      );

      const { data: obrigacoesMes } = await supabase
        .from("accounting_checklist")
        .select("status")
        .eq("reference_month", mes);

      concluidasData.push(
        obrigacoesMes?.filter((o) => o.status === "concluido").length || 0,
      );
      pendentesData.push(
        obrigacoesMes?.filter((o) => o.status === "pendente").length || 0,
      );
    }

    chartObrigacoes = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Concluídas",
            data: concluidasData,
            backgroundColor: "rgba(76, 175, 80, 0.6)",
            borderColor: "#4caf50",
            borderWidth: 1,
          },
          {
            label: "Pendentes",
            data: pendentesData,
            backgroundColor: "rgba(255, 193, 7, 0.6)",
            borderColor: "#ffc107",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: "#bbbbbb", usePointStyle: true, padding: 16 },
          },
        },
        scales: {
          x: {
            ticks: { color: "#999" },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
          y: {
            ticks: { color: "#999", stepSize: 1 },
            grid: { color: "rgba(255,255,255,0.05)" },
            beginAtZero: true,
          },
        },
      },
    });

    window.chartObrigacoes = chartObrigacoes;
  }

  // ============================================================
  // CRUD
  // ============================================================
  async function novaObrigacao() {
    const mesesOpt = gerarOpcoesMeses();
    const categorias = [
      "FGTS",
      "INSS",
      "DAS",
      "Férias",
      "13º Salário",
      "Sindicato",
      "Rescisão",
      "Contador",
      "Outros",
    ];
    openFormModal(
      "Nova Obrigação Contábil",
      `
      <div class="form-group"><label class="form-label">Categoria *</label><select id="obrCat" class="form-select" required><option value="">Selecione...</option>${categorias.map((c) => `<option value="${c}">${c}</option>`).join("")}</select></div>
      <div class="form-group"><label class="form-label">Descrição *</label><input id="obrDesc" class="form-input" placeholder="Ex: FGTS competência maio" required></div>
      <div class="form-group"><label class="form-label">Data de Vencimento *</label><input id="obrVenc" type="date" class="form-input" required></div>
      <div class="form-group"><label class="form-label">Mês de Referência *</label><select id="obrMesRef" class="form-select" required><option value="">Selecione...</option>${mesesOpt}</select></div>
      <div class="form-group"><label class="form-label">Observações</label><textarea id="obrObs" class="form-input" rows="2" placeholder="Detalhes adicionais..."></textarea></div>
    `,
      async () => {
        const insert = {
          category: document.getElementById("obrCat").value,
          description: document.getElementById("obrDesc").value.trim(),
          due_date: document.getElementById("obrVenc").value,
          reference_month: document.getElementById("obrMesRef").value,
          status: "pendente",
          notes: document.getElementById("obrObs").value.trim() || null,
        };
        if (
          !insert.category ||
          !insert.description ||
          !insert.due_date ||
          !insert.reference_month
        )
          return showFeedback(
            "Erro",
            "Preencha os campos obrigatórios.",
            "error",
          );
        const { error } = await supabase
          .from("accounting_checklist")
          .insert(insert);
        if (error)
          showFeedback("Erro", `Falha ao criar: ${error.message}`, "error");
        else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback("Sucesso", "Obrigação criada!", "success", () =>
            loadContabil(),
          );
        }
      },
    );
  }

  async function verObrigacao(id) {
    const { data: o } = await supabase
      .from("accounting_checklist")
      .select("*")
      .eq("id", id)
      .single();
    if (!o) return showFeedback("Erro", "Obrigação não encontrada.", "error");
    const anexoHtml = o.attachment_url
      ? `<p><strong>Comprovante:</strong> <a href="${o.attachment_url}" target="_blank" style="color:var(--gold-light); text-decoration:underline;">📎 ${o.attachment_name || "Ver arquivo"}</a></p>`
      : "<p><strong>Comprovante:</strong> ❌ Não anexado</p>";
    openFormModal(
      "Visualizar Obrigação",
      `
      <p><strong>Categoria:</strong> ${getCategoriaBadge(o.category)}</p>
      <p><strong>Descrição:</strong> ${o.description}</p>
      <p><strong>Vencimento:</strong> ${formatDate(o.due_date)}</p>
      <p><strong>Mês Ref.:</strong> ${formatarMesReferencia(o.reference_month)}</p>
      <p><strong>Status:</strong> ${formatarStatusContabil(o.status)}</p>
      <p><strong>Obs:</strong> ${o.notes || "-"}</p>
      ${anexoHtml}
    `,
      () => {},
    );
    replaceSubmitWithCloseButton();
  }

  async function editarObrigacao(id) {
    const { data: o } = await supabase
      .from("accounting_checklist")
      .select("*")
      .eq("id", id)
      .single();
    if (!o) return showFeedback("Erro", "Obrigação não encontrada.", "error");
    const mesesOpt = gerarOpcoesMeses();
    const categorias = [
      "FGTS",
      "INSS",
      "DAS",
      "Férias",
      "13º Salário",
      "Sindicato",
      "Rescisão",
      "Contador",
      "Outros",
    ];
    openFormModal(
      "Editar Obrigação",
      `
      <div class="form-group"><label>Categoria</label><select id="editObrCat" class="form-select" required>${categorias.map((c) => `<option value="${c}" ${o.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="form-group"><label>Descrição *</label><input id="editObrDesc" class="form-input" value="${escapeHtml(o.description || "")}" required></div>
      <div class="form-group"><label>Vencimento *</label><input id="editObrVenc" type="date" class="form-input" value="${o.due_date || ""}" required></div>
      <div class="form-group"><label>Mês Ref. *</label><select id="editObrMesRef" class="form-select" required>${mesesOpt.replace(`value="${o.reference_month}"`, `value="${o.reference_month}" selected`)}</select></div>
      <div class="form-group"><label>Observações</label><textarea id="editObrObs" class="form-input" rows="2">${escapeHtml(o.notes || "")}</textarea></div>
    `,
      async () => {
        const updates = {
          category: document.getElementById("editObrCat").value,
          description: document.getElementById("editObrDesc").value.trim(),
          due_date: document.getElementById("editObrVenc").value,
          reference_month: document.getElementById("editObrMesRef").value,
          notes: document.getElementById("editObrObs").value.trim() || null,
        };
        const { error } = await supabase
          .from("accounting_checklist")
          .update(updates)
          .eq("id", id);
        if (error)
          showFeedback("Erro", `Falha ao atualizar: ${error.message}`, "error");
        else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback("Sucesso", "Atualizado!", "success", () =>
            loadContabil(),
          );
        }
      },
    );
  }

  async function concluirObrigacao(id) {
    const { error } = await supabase
      .from("accounting_checklist")
      .update({ status: "concluido" })
      .eq("id", id);
    if (error)
      showFeedback("Erro", `Falha ao concluir: ${error.message}`, "error");
    else {
      document.getElementById("modalContainer").innerHTML = "";
      showFeedback("Sucesso", "Obrigação concluída!", "success", () =>
        loadContabil(),
      );
    }
  }

  async function reabrirObrigacao(id) {
    const { error } = await supabase
      .from("accounting_checklist")
      .update({ status: "pendente" })
      .eq("id", id);
    if (error)
      showFeedback("Erro", `Falha ao reabrir: ${error.message}`, "error");
    else {
      document.getElementById("modalContainer").innerHTML = "";
      showFeedback("Sucesso", "Obrigação reaberta!", "success", () =>
        loadContabil(),
      );
    }
  }

  async function anexarComprovante(id) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf,.png,.jpg,.jpeg";
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;

      showFeedback("Enviando", "Fazendo upload do comprovante...", "info");

      const { data, error } = await supabase.storage
        .from("comprovantes")
        .upload(`${id}/${Date.now()}_${file.name}`, file);

      if (error) {
        showFeedback("Erro", `Falha no upload: ${error.message}`, "error");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("comprovantes")
        .getPublicUrl(data.path);

      await supabase
        .from("accounting_checklist")
        .update({
          attachment_url: urlData.publicUrl,
          attachment_name: file.name,
        })
        .eq("id", id);

      document.getElementById("modalContainer").innerHTML = "";
      showFeedback("Sucesso", "Comprovante anexado!", "success", () =>
        loadContabil(),
      );
    };
    fileInput.click();
  }

  async function excluirObrigacao(id) {
    openFormModal(
      "Confirmar Exclusão",
      `<p>Deseja realmente excluir esta obrigação?</p>`,
      async () => {
        const { error } = await supabase
          .from("accounting_checklist")
          .delete()
          .eq("id", id);
        if (error)
          showFeedback("Erro", `Falha ao excluir: ${error.message}`, "error");
        else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback("Sucesso", "Excluída!", "success", () => loadContabil());
        }
      },
    );
  }

  // ============================================================
  // AUXILIARES
  // ============================================================
  function formatarStatusContabil(status) {
    return status === "concluido" ? "🟢 Concluído" : "🟡 Pendente";
  }
  function formatarMesReferencia(mes) {
    if (!mes) return "-";
    const [ano, mesNum] = mes.split("-");
    return new Date(parseInt(ano), parseInt(mesNum) - 1, 1).toLocaleDateString(
      "pt-BR",
      { month: "long", year: "numeric" },
    );
  }
  function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
  }
  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function initContabil() {
    setupFiltrosContabil();
  }

  window.loadContabil = loadContabil;
  window.novaObrigacao = novaObrigacao;
  window.verObrigacao = verObrigacao;
  window.editarObrigacao = editarObrigacao;
  window.concluirObrigacao = concluirObrigacao;
  window.reabrirObrigacao = reabrirObrigacao;
  window.anexarComprovante = anexarComprovante;
  window.excluirObrigacao = excluirObrigacao;
  window.initContabil = initContabil;
  window.exportarCSVContabil = exportarCSVContabil;
  window.gerarObrigacoesRecorrentes = gerarObrigacoesRecorrentes;
})();
