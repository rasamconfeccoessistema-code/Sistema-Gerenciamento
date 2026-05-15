// ============================================================
// FINANCEIRO.JS
// Módulo de gestão financeira – Contas a Pagar/Receber
// Facção de Jeans - Sistema de Gestão
// ============================================================

(function () {
  let filtrosFinanceiro = {
    tipo: "",
    categoriaId: "",
    status: "",
    dataInicio: "",
    dataFim: "",
    formaPagamento: "",
  };

  const LIMITE_PADRAO = 20;
  let limiteAtual = LIMITE_PADRAO;
  let totalRegistros = 0;

  let ordenacao = {
    coluna: "date",
    ascendente: false,
  };

  // ============================================================
  // CARREGAMENTO DA TELA DE FINANCEIRO
  // ============================================================
  async function loadFinanceiro(resetLimite = true) {
    if (resetLimite) limiteAtual = LIMITE_PADRAO;

    try {
      const btn = document.querySelector("#page-financeiro .btn-primary");
      if (btn) btn.setAttribute("data-action", "novo-lancamento");

      setupFiltrosFinanceiro();

      const termoBusca = ($("#searchInput")?.value || "").trim().toLowerCase();

      let query = supabase.from("financial_transactions").select(
        `id, description, amount, date, due_date, status, type, payment_method, payment_date, 
           interest, discount, installments, total_installments, recurring_id, notes, created_at,
           chart_of_accounts(id, code, name, type)`,
        { count: "exact" },
      );

      if (filtrosFinanceiro.tipo)
        query = query.eq("type", filtrosFinanceiro.tipo);
      if (filtrosFinanceiro.categoriaId)
        query = query.eq("chart_of_accounts.id", filtrosFinanceiro.categoriaId);
      if (filtrosFinanceiro.status)
        query = query.eq("status", filtrosFinanceiro.status);
      if (filtrosFinanceiro.dataInicio)
        query = query.gte("date", filtrosFinanceiro.dataInicio);
      if (filtrosFinanceiro.dataFim)
        query = query.lte("date", filtrosFinanceiro.dataFim);

      if (termoBusca && AppState.currentPage === "financeiro") {
        query = query.or(
          `description.ilike.%${termoBusca}%,chart_of_accounts.name.ilike.%${termoBusca}%`,
        );
      }

      query = query.order("date", { ascending: false });
      query = query.limit(limiteAtual);

      const { data: transacoes, error, count } = await query;
      if (error) {
        console.error(error);
        showFeedback("Erro", "Falha ao carregar dados financeiros.", "error");
        return;
      }

      totalRegistros = count || 0;
      let dados = transacoes || [];
      dados = ordenarFinanceiro(dados);

      await renderizarCardsResumoFinanceiro();
      renderizarTabelaFinanceiro(dados);
      renderizarPaginacaoFinanceiro();
    } catch (e) {
      console.error(e);
      showFeedback("Erro", "Falha ao carregar financeiro.", "error");
    }
  }

  // ============================================================
  // ORDENAÇÃO
  // ============================================================
  function ordenarFinanceiro(dados) {
    if (!dados || !dados.length) return dados;
    const col = ordenacao.coluna;
    const asc = ordenacao.ascendente;

    return [...dados].sort((a, b) => {
      let valA, valB;
      switch (col) {
        case "date":
          valA = a.date || "";
          valB = b.date || "";
          break;
        case "amount":
          valA = parseFloat(a.amount) || 0;
          valB = parseFloat(b.amount) || 0;
          break;
        case "description":
          valA = (a.description || "").toLowerCase();
          valB = (b.description || "").toLowerCase();
          break;
        case "category":
          valA = (a.chart_of_accounts?.name || "").toLowerCase();
          valB = (b.chart_of_accounts?.name || "").toLowerCase();
          break;
        case "status":
          valA = a.status || "";
          valB = b.status || "";
          break;
        default:
          return 0;
      }
      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  }

  function toggleOrdenacaoFinanceiro(coluna) {
    if (ordenacao.coluna === coluna)
      ordenacao.ascendente = !ordenacao.ascendente;
    else {
      ordenacao.coluna = coluna;
      ordenacao.ascendente = true;
    }
    loadFinanceiro(false);
  }

  // ============================================================
  // CARDS DE RESUMO
  // ============================================================
  async function renderizarCardsResumoFinanceiro() {
    let cardsContainer = document.querySelector("#page-financeiro .cards-grid");
    if (!cardsContainer) {
      cardsContainer = document.createElement("div");
      cardsContainer.className = "cards-grid";
      const pageHeader = document.querySelector(
        "#page-financeiro .page-header",
      );
      if (pageHeader)
        pageHeader.insertAdjacentElement("afterend", cardsContainer);
      else {
        const page = document.getElementById("page-financeiro");
        if (page) page.prepend(cardsContainer);
        else return;
      }
    }

    const hoje = todayISO();
    const mesAtual = hoje.substring(0, 7);
    const { data: todas } = await supabase
      .from("financial_transactions")
      .select("amount, type, status, date")
      .gte("date", `${mesAtual}-01`)
      .lte("date", `${mesAtual}-31`);

    let totalReceber = 0,
      totalPagar = 0,
      contasVencidas = 0,
      saldo = 0;
    if (todas) {
      todas.forEach((t) => {
        const valor = parseFloat(t.amount) || 0;
        if (t.type === "receber") totalReceber += valor;
        else totalPagar += Math.abs(valor);
        saldo += t.type === "receber" ? valor : -Math.abs(valor);
        if (t.status !== "pago" && t.status !== "cancelado" && t.date < hoje)
          contasVencidas++;
      });
    }

    cardsContainer.innerHTML = `
      <div class="card card-pink"><div class="card-icon"><i class="ph ph-wallet"></i></div><div class="card-info"><span class="card-label">Saldo Atual</span><span class="card-value" style="color:${saldo >= 0 ? "var(--success)" : "var(--error)"};">${formatCurrency(saldo)}</span><span class="card-detail">no mês atual</span></div></div>
      <div class="card card-gold"><div class="card-icon"><i class="ph ph-arrow-circle-up"></i></div><div class="card-info"><span class="card-label">A Receber</span><span class="card-value">${formatCurrency(totalReceber)}</span><span class="card-detail">total de entradas</span></div></div>
      <div class="card card-dark"><div class="card-icon"><i class="ph ph-arrow-circle-down"></i></div><div class="card-info"><span class="card-label">A Pagar</span><span class="card-value">${formatCurrency(totalPagar)}</span><span class="card-detail">total de saídas</span></div></div>
      <div class="card card-pink-light"><div class="card-icon"><i class="ph ph-warning-circle"></i></div><div class="card-info"><span class="card-label">Vencidas</span><span class="card-value" style="color:${contasVencidas > 0 ? "var(--error)" : "var(--white)"};">${contasVencidas}</span><span class="card-detail">contas em atraso</span></div></div>
    `;
  }

  // ============================================================
  // RENDERIZAÇÃO DA TABELA
  // ============================================================
  function renderizarTabelaFinanceiro(transacoes) {
    const tbody = document.querySelector("#table-financeiro tbody");
    if (!tbody) return;

    const theadRow = document.querySelector("#table-financeiro thead tr");
    if (theadRow) {
      theadRow.innerHTML = `
        <th class="sortable" data-sort="date" style="cursor:pointer;">Data ${ordenacao.coluna === "date" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
        <th class="sortable" data-sort="description" style="cursor:pointer;">Descrição ${ordenacao.coluna === "description" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
        <th class="sortable" data-sort="category" style="cursor:pointer;">Categoria ${ordenacao.coluna === "category" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
        <th class="sortable text-center" data-sort="amount" style="cursor:pointer;">Valor ${ordenacao.coluna === "amount" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
        <th class="text-center">Tipo</th>
        <th class="sortable text-center" data-sort="status" style="cursor:pointer;">Status ${ordenacao.coluna === "status" ? (ordenacao.ascendente ? "↑" : "↓") : ""}</th>
        <th class="text-center" style="width:70px;"><button class="btn btn-ghost btn-sm" id="btnExportarCSVFinanceiro" title="Exportar CSV"><i class="ph ph-download-simple"></i></button></th>
      `;
    }

    if (!transacoes || transacoes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">Nenhum lançamento encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = transacoes
      .map((t) => {
        const valor = parseFloat(t.amount) || 0;
        const tipo = t.type === "receber" ? "Receber" : "Pagar";
        const corValor =
          t.type === "receber" ? "var(--success)" : "var(--error)";
        const sinal = t.type === "receber" ? "+" : "-";
        const categoria = t.chart_of_accounts?.name || "-";
        const menuId = `menu-fin-${t.id}`;

        return `<tr>
        <td>${formatDate(t.date)}</td>
        <td>${t.description || "-"}</td>
        <td>${categoria}</td>
        <td class="text-center" style="color:${corValor};">${sinal}${formatCurrency(Math.abs(valor))}</td>
        <td class="text-center">${tipo}</td>
        <td class="text-center">${formatarStatusFinanceiro(t.status)}</td>
        <td class="text-center">
          <button class="btn-actions-trigger" data-menu-id="${menuId}" title="Ações"><i class="ph ph-gear-six"></i></button>
          <div id="${menuId}" class="dropdown-actions-menu" style="display:none;">
            <a href="#" class="action-item action-view" data-action="ver-lancamento" data-id="${t.id}" data-menu="${menuId}"><i class="ph ph-eye"></i> Visualizar</a>
            <a href="#" class="action-item action-edit" data-action="editar-lancamento" data-id="${t.id}" data-menu="${menuId}"><i class="ph ph-pencil-simple"></i> Editar</a>
            ${t.status !== "pago" && t.status !== "cancelado" ? `<a href="#" class="action-item action-finish" data-action="baixar-lancamento" data-id="${t.id}" data-menu="${menuId}"><i class="ph ph-check-circle"></i> Baixar</a>` : ""}
            ${t.status === "pago" ? `<a href="#" class="action-item action-review" data-action="estornar-lancamento" data-id="${t.id}" data-menu="${menuId}"><i class="ph ph-arrow-counter-clockwise"></i> Estornar</a>` : ""}
            <div class="dropdown-divider" style="margin:4px 0;"></div>
            <a href="#" class="action-item action-delete" data-action="excluir-lancamento" data-id="${t.id}" data-menu="${menuId}"><i class="ph ph-trash"></i> Excluir</a>
          </div>
        </td>
      </tr>`;
      })
      .join("");

    configurarEventosAcoesFinanceiro();
    setupOrdenacaoHeadersFinanceiro();
    document
      .getElementById("btnExportarCSVFinanceiro")
      ?.addEventListener("click", exportarCSVFinanceiro);
  }

  // ============================================================
  // MENU DE AÇÕES
  // ============================================================
  function configurarEventosAcoesFinanceiro() {
    document
      .querySelectorAll("#table-financeiro .btn-actions-trigger")
      .forEach((btn) => {
        btn.removeEventListener("click", handleActionTriggerFinanceiro);
        btn.addEventListener("click", handleActionTriggerFinanceiro);
      });
  }

  function handleActionTriggerFinanceiro(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const menuId = btn.dataset.menuId;
    const menu = document.getElementById(menuId);
    if (!menu) return;
    document
      .querySelectorAll("#table-financeiro .dropdown-actions-menu")
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
      !e.target.closest("#table-financeiro .btn-actions-trigger") &&
      !e.target.closest("#table-financeiro .dropdown-actions-menu")
    ) {
      document
        .querySelectorAll("#table-financeiro .dropdown-actions-menu")
        .forEach((m) => {
          m.style.display = "none";
          m.classList.remove("show");
        });
    }
  });

  function setupOrdenacaoHeadersFinanceiro() {
    document.querySelectorAll("#table-financeiro th.sortable").forEach((th) => {
      th.addEventListener("click", function () {
        toggleOrdenacaoFinanceiro(this.dataset.sort);
      });
    });
  }

  function renderizarPaginacaoFinanceiro() {
    const container = document.getElementById("paginacaoFinanceiro");
    if (!container) return;
    const mostrados = Math.min(limiteAtual, totalRegistros);
    const info = `Mostrando <strong>${mostrados}</strong> de <strong>${totalRegistros}</strong> lançamentos`;
    if (totalRegistros > limiteAtual) {
      container.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;"><span style="color:var(--gray); font-size:0.8rem;">${info}</span><button class="btn btn-ghost btn-sm" id="btnCarregarMaisFinanceiro"><i class="ph ph-plus-circle"></i> Carregar mais (${totalRegistros - limiteAtual} restantes)</button></div>`;
      document
        .getElementById("btnCarregarMaisFinanceiro")
        ?.addEventListener("click", async () => {
          limiteAtual += LIMITE_PADRAO;
          await loadFinanceiro(false);
        });
    } else
      container.innerHTML = `<span style="color:var(--gray); font-size:0.8rem;">${info}</span>`;
  }

  function exportarCSVFinanceiro() {
    const rows = [];
    rows.push(
      ["Data", "Descrição", "Categoria", "Valor", "Tipo", "Status"].join(";"),
    );
    document.querySelectorAll("#table-financeiro tbody tr").forEach((tr) => {
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
    a.download = "financeiro.csv";
    a.click();
  }

  // ============================================================
  // FILTROS
  // ============================================================
  function setupFiltrosFinanceiro() {
    const panelHeader = document.querySelector(
      "#page-financeiro .panel-header",
    );
    if (!panelHeader || document.getElementById("filtros-financeiro")) return;

    panelHeader.insertAdjacentHTML(
      "beforeend",
      `
      <div id="filtros-financeiro" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:8px;">
        <select id="filtroTipo" class="form-select" style="width:auto; min-width:120px;"><option value="">Todos os tipos</option><option value="pagar">A Pagar</option><option value="receber">A Receber</option></select>
        <select id="filtroCategoria" class="form-select" style="width:auto; min-width:160px;"><option value="">Todas categorias</option></select>
        <select id="filtroStatus" class="form-select" style="width:auto; min-width:130px;"><option value="">Todos os status</option><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="atrasado">Atrasado</option></select>
        <input type="date" id="filtroDataInicioFinanceiro" class="form-input" style="width:auto;" title="Data início">
        <input type="date" id="filtroDataFimFinanceiro" class="form-input" style="width:auto;" title="Data fim">
        <button id="btnLimparFiltrosFinanceiro" class="btn btn-ghost btn-sm"><i class="ph ph-funnel-x"></i> Limpar</button>
        <button id="btnContasRecorrentes" class="btn btn-ghost btn-sm"><i class="ph ph-arrows-clockwise"></i> Recorrentes</button>
      </div>
    `,
    );

    carregarCategoriasSelect();
    document.getElementById("filtroTipo").onchange = function () {
      filtrosFinanceiro.tipo = this.value;
      loadFinanceiro();
    };
    document.getElementById("filtroCategoria").onchange = function () {
      filtrosFinanceiro.categoriaId = this.value;
      loadFinanceiro();
    };
    document.getElementById("filtroStatus").onchange = function () {
      filtrosFinanceiro.status = this.value;
      loadFinanceiro();
    };
    document.getElementById("filtroDataInicioFinanceiro").onchange =
      function () {
        filtrosFinanceiro.dataInicio = this.value;
        loadFinanceiro();
      };
    document.getElementById("filtroDataFimFinanceiro").onchange = function () {
      filtrosFinanceiro.dataFim = this.value;
      loadFinanceiro();
    };
    document.getElementById("btnLimparFiltrosFinanceiro").onclick =
      function () {
        filtrosFinanceiro = {
          tipo: "",
          categoriaId: "",
          status: "",
          dataInicio: "",
          dataFim: "",
        };
        [
          "filtroTipo",
          "filtroCategoria",
          "filtroStatus",
          "filtroDataInicioFinanceiro",
          "filtroDataFimFinanceiro",
        ].forEach((id) => (document.getElementById(id).value = ""));
        loadFinanceiro();
      };
    document.getElementById("btnContasRecorrentes").onclick =
      gerenciarContasRecorrentes;
  }

  async function carregarCategoriasSelect() {
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, name")
      .order("name");
    const select = document.getElementById("filtroCategoria");
    if (!select || !data) return;
    select.innerHTML =
      '<option value="">Todas categorias</option>' +
      data.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  }

  // ============================================================
  // CRUD
  // ============================================================
  async function novoLancamento() {
    const { data: categorias } = await supabase
      .from("chart_of_accounts")
      .select("id, name, type")
      .order("name");
    const optsCat = categorias?.length
      ? categorias
          .map((c) => `<option value="${c.id}">${c.name} (${c.type})</option>`)
          .join("")
      : '<option value="">Nenhuma categoria</option>';

    openFormModal(
      "Novo Lançamento",
      `
      <div class="form-group"><label class="form-label">Tipo *</label><select id="finTipo" class="form-select" required><option value="pagar">A Pagar</option><option value="receber">A Receber</option></select></div>
      <div class="form-group"><label class="form-label">Categoria *</label><select id="finCategoria" class="form-select" required>${optsCat}</select></div>
      <div class="form-group"><label class="form-label">Descrição *</label><input id="finDesc" class="form-input" placeholder="Ex: Aluguel..." required></div>
      <div class="form-group"><label class="form-label">Valor *</label><input id="finValor" type="number" step="0.01" min="0.01" class="form-input" required></div>
      <div class="form-group"><label><input type="checkbox" id="finParcelado"> Parcelado</label></div>
      <div id="parcelaFields" style="display:none; grid-template-columns:1fr 1fr; gap:8px;"><div><label>Nº Parcelas</label><input id="finNumParcelas" type="number" min="2" max="120" class="form-input" value="2"></div><div><label>1º Vencimento</label><input id="finPrimeiroVenc" type="date" class="form-input"></div></div>
      <div id="vencimentoSimples" class="form-group"><label class="form-label">Vencimento *</label><input id="finVencimento" type="date" class="form-input" required></div>
      <div class="form-group"><label class="form-label">Forma de Pagamento</label><input id="finFormaPag" class="form-input" list="formasPagList" placeholder="PIX, Boleto..."><datalist id="formasPagList"><option value="PIX"><option value="Boleto"><option value="Dinheiro"><option value="Transferência"><option value="Cartão"></datalist></div>
      <div class="form-group"><label class="form-label">Observações</label><textarea id="finObs" class="form-input" rows="2"></textarea></div>
      <div class="form-group"><label><input type="checkbox" id="finRecorrente"> Conta recorrente (todo mês)</label></div>
    `,
      async () => {
        const tipo = document.getElementById("finTipo").value;
        const categoriaId = document.getElementById("finCategoria").value;
        const descricao = document.getElementById("finDesc").value.trim();
        const valor = parseFloat(document.getElementById("finValor").value);
        const parcelado = document.getElementById("finParcelado").checked;
        const recorrente = document.getElementById("finRecorrente").checked;
        const formaPag =
          document.getElementById("finFormaPag").value.trim() || null;
        const obs = document.getElementById("finObs").value.trim() || null;
        if (!descricao || !valor || !categoriaId)
          return showFeedback(
            "Erro",
            "Preencha os campos obrigatórios.",
            "error",
          );

        let vencimento = document.getElementById(
          parcelado ? "finPrimeiroVenc" : "finVencimento",
        ).value;
        if (!vencimento)
          return showFeedback("Erro", "Informe o vencimento.", "error");
        const numParcelas = parcelado
          ? parseInt(document.getElementById("finNumParcelas").value) || 2
          : 1;

        const insert = {
          type: tipo,
          category_id: categoriaId,
          description: descricao,
          amount: tipo === "pagar" ? -Math.abs(valor) : Math.abs(valor),
          date: vencimento,
          due_date: vencimento,
          status: "pendente",
          payment_method: formaPag,
          notes: obs,
          installments: parcelado,
          total_installments: numParcelas,
        };

        if (recorrente) {
          const dia = new Date(vencimento + "T12:00:00").getDate();
          const { data: rec } = await supabase
            .from("recurring_transactions")
            .insert({
              description: descricao,
              amount: Math.abs(valor),
              category_id: categoriaId,
              due_day: dia,
              type: tipo,
              active: true,
            })
            .select("id")
            .single();
          if (rec) insert.recurring_id = rec.id;
        }

        const { data: novo, error: insertError } = await supabase
          .from("financial_transactions")
          .insert(insert)
          .select("id")
          .single();
        if (insertError)
          return showFeedback(
            "Erro",
            `Falha ao criar: ${insertError.message}`,
            "error",
          );

        if (parcelado && novo) {
          const parcelas = [];
          for (let i = 0; i < numParcelas; i++) {
            const d = new Date(vencimento + "T12:00:00");
            d.setMonth(d.getMonth() + i);
            parcelas.push({
              transaction_id: novo.id,
              numero_parcela: i + 1,
              valor: Math.abs(valor) / numParcelas,
              vencimento: d.toISOString().split("T")[0],
              status: "pendente",
            });
          }
          await supabase.from("financial_installments").insert(parcelas);
        }

        document.getElementById("modalContainer").innerHTML = "";
        showFeedback("Sucesso", "Lançamento criado!", "success", () =>
          loadFinanceiro(),
        );
      },
    );

    document.getElementById("finParcelado").onchange = function () {
      document.getElementById("parcelaFields").style.display = this.checked
        ? "grid"
        : "none";
      document.getElementById("vencimentoSimples").style.display = this.checked
        ? "none"
        : "block";
    };
  }

  async function verLancamento(id) {
    const { data: t } = await supabase
      .from("financial_transactions")
      .select(`*, chart_of_accounts(name, type)`)
      .eq("id", id)
      .single();
    if (!t) return showFeedback("Erro", "Lançamento não encontrado.", "error");
    let parcelasHtml = "";
    if (t.installments) {
      const { data: p } = await supabase
        .from("financial_installments")
        .select("*")
        .eq("transaction_id", id);
      if (p?.length)
        parcelasHtml = `<h4>Parcelas</h4><table class="table"><thead><tr><th>#</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>${p.map((pp) => `<tr><td>${pp.numero_parcela}</td><td>${formatDate(pp.vencimento)}</td><td>${formatCurrency(pp.valor)}</td><td>${formatarStatusFinanceiro(pp.status)}</td></tr>`).join("")}</tbody></table>`;
    }
    openFormModal(
      "Visualizar",
      `<p><strong>Descrição:</strong> ${t.description}</p><p><strong>Tipo:</strong> ${t.type === "receber" ? "A Receber" : "A Pagar"}</p><p><strong>Categoria:</strong> ${t.chart_of_accounts?.name || "-"}</p><p><strong>Valor:</strong> ${formatCurrency(Math.abs(t.amount))}</p><p><strong>Vencimento:</strong> ${formatDate(t.due_date || t.date)}</p><p><strong>Status:</strong> ${formatarStatusFinanceiro(t.status)}</p>${t.payment_date ? `<p><strong>Pago em:</strong> ${formatDate(t.payment_date)}</p>` : ""}<p><strong>Forma:</strong> ${t.payment_method || "-"}</p><p><strong>Obs:</strong> ${t.notes || "-"}</p>${parcelasHtml}`,
      () => {},
    );
    replaceSubmitWithCloseButton();
  }

  async function editarLancamento(id) {
    const { data: t } = await supabase
      .from("financial_transactions")
      .select("*")
      .eq("id", id)
      .single();
    if (!t) return showFeedback("Erro", "Lançamento não encontrado.", "error");
    const { data: categorias } = await supabase
      .from("chart_of_accounts")
      .select("id, name, type")
      .order("name");
    const optsCat =
      categorias
        ?.map(
          (c) =>
            `<option value="${c.id}" ${c.id === t.category_id ? "selected" : ""}>${c.name} (${c.type})</option>`,
        )
        .join("") || "";
    openFormModal(
      "Editar",
      `
      <div class="form-group"><label>Descrição</label><input id="editFinDesc" class="form-input" value="${escapeHtml(t.description || "")}"></div>
      <div class="form-group"><label>Categoria</label><select id="editFinCat" class="form-select">${optsCat}</select></div>
      <div class="form-group"><label>Valor</label><input id="editFinValor" type="number" step="0.01" class="form-input" value="${Math.abs(t.amount)}"></div>
      <div class="form-group"><label>Vencimento</label><input id="editFinVenc" type="date" class="form-input" value="${t.due_date || t.date || ""}"></div>
      <div class="form-group"><label>Forma de Pagamento</label><input id="editFinForma" class="form-input" value="${escapeHtml(t.payment_method || "")}"></div>
      <div class="form-group"><label>Observações</label><textarea id="editFinObs" class="form-input" rows="2">${escapeHtml(t.notes || "")}</textarea></div>
    `,
      async () => {
        const updates = {
          description: document.getElementById("editFinDesc").value.trim(),
          category_id: document.getElementById("editFinCat").value,
          amount:
            t.type === "pagar"
              ? -Math.abs(
                  parseFloat(document.getElementById("editFinValor").value),
                )
              : Math.abs(
                  parseFloat(document.getElementById("editFinValor").value),
                ),
          due_date: document.getElementById("editFinVenc").value,
          date: document.getElementById("editFinVenc").value,
          payment_method:
            document.getElementById("editFinForma").value.trim() || null,
          notes: document.getElementById("editFinObs").value.trim() || null,
        };
        const { error } = await supabase
          .from("financial_transactions")
          .update(updates)
          .eq("id", id);
        if (error)
          showFeedback("Erro", `Falha ao atualizar: ${error.message}`, "error");
        else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback("Sucesso", "Atualizado!", "success", () =>
            loadFinanceiro(),
          );
        }
      },
    );
  }

  async function baixarLancamento(id) {
    openFormModal(
      "Baixar",
      `
      <div class="form-group"><label>Data do Pagamento *</label><input id="baixaData" type="date" class="form-input" value="${todayISO()}" required></div>
      <div class="form-group"><label>Juros (R$)</label><input id="baixaJuros" type="number" step="0.01" class="form-input" value="0"></div>
      <div class="form-group"><label>Multa (R$)</label><input id="baixaMulta" type="number" step="0.01" class="form-input" value="0"></div>
      <div class="form-group"><label>Desconto (R$)</label><input id="baixaDesconto" type="number" step="0.01" class="form-input" value="0"></div>
    `,
      async () => {
        const { error } = await supabase
          .from("financial_transactions")
          .update({
            status: "pago",
            payment_date: document.getElementById("baixaData").value,
            interest:
              parseFloat(document.getElementById("baixaJuros").value) || 0,
            discount:
              parseFloat(document.getElementById("baixaDesconto").value) || 0,
          })
          .eq("id", id);
        if (error)
          showFeedback("Erro", `Falha ao baixar: ${error.message}`, "error");
        else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback("Sucesso", "Baixado!", "success", () =>
            loadFinanceiro(),
          );
        }
      },
    );
  }

  async function estornarLancamento(id) {
    const { error } = await supabase
      .from("financial_transactions")
      .update({
        status: "pendente",
        payment_date: null,
        interest: 0,
        discount: 0,
      })
      .eq("id", id);
    if (error)
      showFeedback("Erro", `Falha ao estornar: ${error.message}`, "error");
    else {
      document.getElementById("modalContainer").innerHTML = "";
      showFeedback("Sucesso", "Estornado!", "success", () => loadFinanceiro());
    }
  }

  async function excluirLancamento(id) {
    openFormModal(
      "Confirmar Exclusão",
      `<p>Deseja realmente excluir este lançamento?</p>`,
      async () => {
        const { error } = await supabase
          .from("financial_transactions")
          .delete()
          .eq("id", id);
        if (error)
          showFeedback("Erro", `Falha ao excluir: ${error.message}`, "error");
        else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback("Sucesso", "Excluído!", "success", () =>
            loadFinanceiro(),
          );
        }
      },
    );
  }

  // ============================================================
  // CONTAS RECORRENTES
  // ============================================================
  async function gerenciarContasRecorrentes() {
    const { data: recorrentes } = await supabase
      .from("recurring_transactions")
      .select("*, chart_of_accounts(name)")
      .order("due_day");
    const lista = recorrentes?.length
      ? recorrentes
          .map(
            (r) =>
              `<tr><td>${r.description}</td><td>${r.chart_of_accounts?.name || "-"}</td><td>${formatCurrency(r.amount)}</td><td>Dia ${r.due_day}</td><td>${r.type === "pagar" ? "A Pagar" : "A Receber"}</td><td><button class="btn btn-ghost btn-sm" data-action="excluir-recorrente" data-id="${r.id}" style="color:var(--error);"><i class="ph ph-trash"></i></button></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="text-center">Nenhuma conta recorrente.</td></tr>';
    openFormModal(
      "Gerenciar Contas Recorrentes",
      `<h4>Contas Recorrentes</h4><div style="overflow-x:auto;"><table class="table"><thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Vencimento</th><th>Tipo</th><th></th></tr></thead><tbody>${lista}</tbody></table></div><button class="btn btn-primary btn-sm" id="btnNovaRecorrente" style="margin-top:12px;"><i class="ph ph-plus-circle"></i> Nova Recorrente</button>`,
      () => {},
    );
    document.getElementById("btnNovaRecorrente").onclick = novaContaRecorrente;
    document.querySelectorAll("[data-action='excluir-recorrente']").forEach(
      (b) =>
        (b.onclick = async () => {
          await supabase
            .from("recurring_transactions")
            .delete()
            .eq("id", b.dataset.id);
          document.getElementById("modalContainer").innerHTML = "";
          gerenciarContasRecorrentes();
        }),
    );
  }

  async function novaContaRecorrente() {
    const { data: categorias } = await supabase
      .from("chart_of_accounts")
      .select("id, name, type")
      .order("name");
    const optsCat = categorias?.length
      ? categorias
          .map((c) => `<option value="${c.id}">${c.name} (${c.type})</option>`)
          .join("")
      : '<option value="">Nenhuma categoria</option>';
    openFormModal(
      "Nova Conta Recorrente",
      `
      <div class="form-group"><label>Descrição *</label><input id="recDesc" class="form-input" required></div>
      <div class="form-group"><label>Categoria *</label><select id="recCat" class="form-select" required>${optsCat}</select></div>
      <div class="form-group"><label>Valor *</label><input id="recValor" type="number" step="0.01" class="form-input" required></div>
      <div class="form-group"><label>Dia do Vencimento *</label><input id="recDia" type="number" min="1" max="31" class="form-input" required></div>
      <div class="form-group"><label>Tipo *</label><select id="recTipo" class="form-select"><option value="pagar">A Pagar</option><option value="receber">A Receber</option></select></div>
    `,
      async () => {
        const { error } = await supabase.from("recurring_transactions").insert({
          description: document.getElementById("recDesc").value.trim(),
          category_id: document.getElementById("recCat").value,
          amount: parseFloat(document.getElementById("recValor").value),
          due_day: parseInt(document.getElementById("recDia").value),
          type: document.getElementById("recTipo").value,
          active: true,
        });
        if (error)
          showFeedback("Erro", `Falha ao criar: ${error.message}`, "error");
        else {
          document.getElementById("modalContainer").innerHTML = "";
          gerenciarContasRecorrentes();
        }
      },
    );
  }

  // ============================================================
  // AUXILIARES
  // ============================================================
  function formatarStatusFinanceiro(status) {
    const map = {
      pendente: "🟡 Pendente",
      pago: "🟢 Pago",
      atrasado: "🔴 Atrasado",
      cancelado: "⚫ Cancelado",
    };
    return map[status] || status || "-";
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

  function initFinanceiro() {
    setupFiltrosFinanceiro();
  }

  window.loadFinanceiro = loadFinanceiro;
  window.novoLancamento = novoLancamento;
  window.verLancamento = verLancamento;
  window.editarLancamento = editarLancamento;
  window.baixarLancamento = baixarLancamento;
  window.estornarLancamento = estornarLancamento;
  window.excluirLancamento = excluirLancamento;
  window.initFinanceiro = initFinanceiro;
  window.exportarCSVFinanceiro = exportarCSVFinanceiro;
})();
