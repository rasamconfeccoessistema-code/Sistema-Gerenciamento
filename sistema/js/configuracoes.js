// ============================================================
// CONFIGURACOES.JS
// Módulo de Configurações do Sistema
// Facção de Jeans - Sistema de Gestão
// ============================================================

(function () {
  // Estado global das seções
  const secoes = {
    clientes: {
      limite: 20,
      pagina: 0,
      total: 0,
      filtros: {},
      ordenacao: { coluna: "company_name", asc: true },
    },
    fornecedores: {
      limite: 20,
      pagina: 0,
      total: 0,
      filtros: {},
      ordenacao: { coluna: "company_name", asc: true },
    },
    planoContas: {
      limite: 20,
      pagina: 0,
      total: 0,
      filtros: {},
      ordenacao: { coluna: "code", asc: true },
    },
    tiposMaterial: {
      limite: 20,
      pagina: 0,
      total: 0,
      filtros: {},
      ordenacao: { coluna: "name", asc: true },
    },
    unidadesMedida: {
      limite: 20,
      pagina: 0,
      total: 0,
      filtros: {},
      ordenacao: { coluna: "name", asc: true },
    },
    transportadoras: {
      limite: 20,
      pagina: 0,
      total: 0,
      filtros: {},
      ordenacao: { coluna: "name", asc: true },
    },
    formasPagamento: {
      limite: 20,
      pagina: 0,
      total: 0,
      filtros: {},
      ordenacao: { coluna: "name", asc: true },
    },
    maquinas: {
      limite: 20,
      pagina: 0,
      total: 0,
      filtros: {},
      ordenacao: { coluna: "code", asc: true },
    },
  };

  // ============================================================
  // CARREGAMENTO INICIAL DA PÁGINA DE CONFIGURAÇÕES
  // ============================================================
  async function loadConfiguracoes() {
    const container = document.getElementById("configuracoes-container");
    if (!container) return;

    container.innerHTML = `
      <div class="config-accordion">
        ${gerarSanfona("empresa", "🏢 Dados da Empresa", "ph-buildings", "empresa-content")}
        ${gerarSanfona("clientes", "👥 Clientes", "ph-users", "clientes-content")}
        ${gerarSanfona("fornecedores", "🚚 Fornecedores", "ph-truck", "fornecedores-content")}
        ${gerarSanfona("plano-contas", "📊 Plano de Contas", "ph-chart-bar", "plano-contas-content")}
        ${gerarSanfona("tipos-material", "🧵 Tipos de Material", "ph-package", "tipos-material-content")}
        ${gerarSanfona("unidades-medida", "📏 Unidades de Medida", "ph-ruler", "unidades-medida-content")}
        ${gerarSanfona("transportadoras", "🚛 Transportadoras", "ph-car", "transportadoras-content")}
        ${gerarSanfona("formas-pagamento", "💳 Formas de Pagamento", "ph-credit-card", "formas-pagamento-content")}
        ${gerarSanfona("preferencias", "⚙️ Preferências Gerais", "ph-gear-six", "preferencias-content")}
        ${gerarSanfona("maquinas", "🏭 Máquinas", "ph-cpu", "maquinas-content")}
      </div>
    `;

    // Abre a primeira sanfona automaticamente
    setTimeout(() => {
      document
        .querySelector('.config-section-header[data-section="empresa"]')
        ?.click();
    }, 100);

    configurarSanfonas();
  }

  function gerarSanfona(id, titulo, icone, contentId) {
    return `
      <div class="config-section" data-section="${id}">
        <div class="config-section-header" data-section="${id}">
          <div style="display:flex; align-items:center; gap:12px;">
            <i class="ph ${icone}" style="font-size:1.3rem; color:var(--gold-light);"></i>
            <span>${titulo}</span>
          </div>
          <i class="ph ph-caret-down config-section-arrow" id="${id}-arrow"></i>
        </div>
        <div class="config-section-body" id="${contentId}" style="display:none;"></div>
      </div>
    `;
  }

  function configurarSanfonas() {
    document.querySelectorAll(".config-section-header").forEach((header) => {
      header.addEventListener("click", function () {
        const section = this.dataset.section;
        const body = document.getElementById(`${section}-content`);
        const arrow = document.getElementById(`${section}-arrow`);
        if (!body) return;

        const isOpen = body.style.display === "block";
        if (isOpen) {
          body.style.display = "none";
          arrow.style.transform = "rotate(0deg)";
        } else {
          body.style.display = "block";
          arrow.style.transform = "rotate(180deg)";
          // Carrega o conteúdo da seção conforme necessário
          switch (section) {
            case "empresa":
              carregarSecaoEmpresa();
              break;
            case "clientes":
              carregarSecaoClientes();
              break;
            case "fornecedores":
              carregarSecaoFornecedores();
              break;
            case "plano-contas":
              carregarSecaoPlanoContas();
              break;
            case "tipos-material":
              carregarSecaoTiposMaterial();
              break;
            case "unidades-medida":
              carregarSecaoUnidadesMedida();
              break;
            case "transportadoras":
              carregarSecaoTransportadoras();
              break;
            case "formas-pagamento":
              carregarSecaoFormasPagamento();
              break;
            case "preferencias":
              carregarSecaoPreferencias();
              break;
            case "maquinas":
              carregarSecaoMaquinas();
              break;
          }
        }
      });
    });
  }

  // ============================================================
  // SEÇÃO: DADOS DA EMPRESA
  // ============================================================
  async function carregarSecaoEmpresa() {
    const container = document.getElementById("empresa-content");
    if (!container || container.innerHTML) return; // já carregado

    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value");
    const valores = {};
    if (settings) settings.forEach((s) => (valores[s.key] = s.value || ""));

    container.innerHTML = `
      <div style="display:grid; gap:16px; padding:16px;">
        <div class="form-group">
          <label class="form-label">Razão Social</label>
          <input id="emp-company_name" class="form-input" value="${escapeHtml(valores.company_name || "")}">
        </div>
        <div class="form-group">
          <label class="form-label">Nome Fantasia</label>
          <input id="emp-trade_name" class="form-input" value="${escapeHtml(valores.trade_name || "")}">
        </div>
        <div class="form-group">
          <label class="form-label">CNPJ</label>
          <input id="emp-cnpj" class="form-input" value="${escapeHtml(valores.cnpj || "")}">
        </div>
        <div class="form-group">
          <label class="form-label">Endereço</label>
          <input id="emp-address" class="form-input" value="${escapeHtml(valores.address || "")}">
        </div>
        <div class="form-group">
          <label class="form-label">Telefone</label>
          <input id="emp-phone" class="form-input" value="${escapeHtml(valores.phone || "")}">
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input id="emp-email" class="form-input" value="${escapeHtml(valores.email || "")}">
        </div>
        <div class="form-group">
          <label class="form-label">Regime Tributário</label>
          <input id="emp-tax_regime" class="form-input" value="${escapeHtml(valores.tax_regime || "")}">
        </div>
        <div class="form-group">
          <label class="form-label">Pró-labore Padrão (R$)</label>
          <input id="emp-pro_labore_default" type="number" step="0.01" class="form-input" value="${escapeHtml(valores.pro_labore_default || "")}">
        </div>
        <button class="btn btn-primary" id="btnSalvarEmpresa"><i class="ph ph-floppy-disk"></i> Salvar</button>
      </div>
    `;

    document
      .getElementById("btnSalvarEmpresa")
      .addEventListener("click", async () => {
        const campos = [
          "company_name",
          "trade_name",
          "cnpj",
          "address",
          "phone",
          "email",
          "tax_regime",
          "pro_labore_default",
        ];
        const updates = campos.map((c) => ({
          key: c,
          value: document.getElementById(`emp-${c}`).value,
        }));
        for (const u of updates) {
          await supabase
            .from("system_settings")
            .upsert(u, { onConflict: "key" });
        }
        showFeedback("Sucesso", "Dados da empresa salvos!", "success");
      });
  }

  // ============================================================
  // SEÇÃO: CLIENTES
  // ============================================================
  async function carregarSecaoClientes() {
    const container = document.getElementById("clientes-content");
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";

    await carregarSecaoGenerica({
      container,
      tabela: "customers",
      stateKey: "clientes",
      titulo: "Clientes",
      colunas: [
        { attr: "trade_name", label: "Nome Fantasia", sortable: true },
        { attr: "company_name", label: "Razão Social", sortable: true },
        { attr: "cnpj", label: "CNPJ", sortable: false },
        { attr: "contact_name", label: "Contato", sortable: false },
        { attr: "phone", label: "Telefone", sortable: false },
        {
          attr: "active",
          label: "Ativo",
          sortable: false,
          format: (v) => (v ? "✅" : "❌"),
        },
      ],
      formFields: (registro) => `
        <div class="form-group"><label class="form-label">Nome Fantasia</label><input id="form-trade_name" class="form-input" value="${escapeHtml(registro?.trade_name || "")}"></div>
        <div class="form-group"><label class="form-label">Razão Social *</label><input id="form-company_name" class="form-input" value="${escapeHtml(registro?.company_name || "")}" required></div>
        <div class="form-group"><label class="form-label">CNPJ</label><input id="form-cnpj" class="form-input" value="${escapeHtml(registro?.cnpj || "")}"></div>
        <div class="form-group"><label class="form-label">Contato</label><input id="form-contact_name" class="form-input" value="${escapeHtml(registro?.contact_name || "")}"></div>
        <div class="form-group"><label class="form-label">Telefone</label><input id="form-phone" class="form-input" value="${escapeHtml(registro?.phone || "")}"></div>
        <div class="form-group"><label class="form-label">E-mail</label><input id="form-email" class="form-input" value="${escapeHtml(registro?.email || "")}"></div>
        <div class="form-group"><label class="form-label">Ativo</label><select id="form-active" class="form-select"><option value="true" ${registro?.active !== false ? "selected" : ""}>Sim</option><option value="false" ${registro?.active === false ? "selected" : ""}>Não</option></select></div>
      `,
      onSave: async (registro) => {
        const dados = {
          trade_name: document.getElementById("form-trade_name").value,
          company_name: document.getElementById("form-company_name").value,
          cnpj: document.getElementById("form-cnpj").value || null,
          contact_name:
            document.getElementById("form-contact_name").value || null,
          phone: document.getElementById("form-phone").value || null,
          email: document.getElementById("form-email").value || null,
          active: document.getElementById("form-active").value === "true",
        };
        if (!dados.company_name) throw new Error("Razão Social é obrigatória.");
        return dados;
      },
      onNew: () => ({
        trade_name: "",
        company_name: "",
        cnpj: "",
        contact_name: "",
        phone: "",
        email: "",
        active: true,
      }),
      nomeRegistro: "cliente",
    });
  }

  // ============================================================
  // SEÇÃO: FORNECEDORES
  // ============================================================
  async function carregarSecaoFornecedores() {
    const container = document.getElementById("fornecedores-content");
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";

    await carregarSecaoGenerica({
      container,
      tabela: "suppliers",
      stateKey: "fornecedores",
      titulo: "Fornecedores",
      colunas: [
        { attr: "company_name", label: "Razão Social", sortable: true },
        { attr: "cnpj", label: "CNPJ", sortable: false },
        { attr: "contact_name", label: "Contato", sortable: false },
        { attr: "phone", label: "Telefone", sortable: false },
        { attr: "email", label: "E-mail", sortable: false },
        {
          attr: "active",
          label: "Ativo",
          sortable: false,
          format: (v) => (v ? "✅" : "❌"),
        },
      ],
      formFields: (registro) => `
        <div class="form-group"><label class="form-label">Razão Social *</label><input id="form-company_name" class="form-input" value="${escapeHtml(registro?.company_name || "")}" required></div>
        <div class="form-group"><label class="form-label">CNPJ</label><input id="form-cnpj" class="form-input" value="${escapeHtml(registro?.cnpj || "")}"></div>
        <div class="form-group"><label class="form-label">Contato</label><input id="form-contact_name" class="form-input" value="${escapeHtml(registro?.contact_name || "")}"></div>
        <div class="form-group"><label class="form-label">Telefone</label><input id="form-phone" class="form-input" value="${escapeHtml(registro?.phone || "")}"></div>
        <div class="form-group"><label class="form-label">E-mail</label><input id="form-email" class="form-input" value="${escapeHtml(registro?.email || "")}"></div>
        <div class="form-group"><label class="form-label">Ativo</label><select id="form-active" class="form-select"><option value="true" ${registro?.active !== false ? "selected" : ""}>Sim</option><option value="false" ${registro?.active === false ? "selected" : ""}>Não</option></select></div>
      `,
      onSave: async (registro) => {
        const dados = {
          company_name: document.getElementById("form-company_name").value,
          cnpj: document.getElementById("form-cnpj").value || null,
          contact_name:
            document.getElementById("form-contact_name").value || null,
          phone: document.getElementById("form-phone").value || null,
          email: document.getElementById("form-email").value || null,
          active: document.getElementById("form-active").value === "true",
        };
        if (!dados.company_name) throw new Error("Razão Social é obrigatória.");
        return dados;
      },
      onNew: () => ({
        company_name: "",
        cnpj: "",
        contact_name: "",
        phone: "",
        email: "",
        active: true,
      }),
      nomeRegistro: "fornecedor",
    });
  }

  // ============================================================
  // SEÇÃO: PLANO DE CONTAS
  // ============================================================
  async function carregarSecaoPlanoContas() {
    const container = document.getElementById("plano-contas-content");
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";

    await carregarSecaoGenerica({
      container,
      tabela: "chart_of_accounts",
      stateKey: "planoContas",
      titulo: "Plano de Contas",
      colunas: [
        { attr: "code", label: "Código", sortable: true },
        { attr: "name", label: "Nome", sortable: true },
        {
          attr: "type",
          label: "Tipo",
          sortable: true,
          format: (v) => formatarTipoConta(v),
        },
      ],
      formFields: (registro) => `
        <div class="form-group"><label class="form-label">Código *</label><input id="form-code" class="form-input" value="${escapeHtml(registro?.code || "")}" required></div>
        <div class="form-group"><label class="form-label">Nome *</label><input id="form-name" class="form-input" value="${escapeHtml(registro?.name || "")}" required></div>
        <div class="form-group"><label class="form-label">Tipo *</label>
          <select id="form-type" class="form-select" required>
            ${["receita", "custo_direto", "custo_indireto", "despesa", "imposto", "investimento"].map((t) => `<option value="${t}" ${registro?.type === t ? "selected" : ""}>${formatarTipoConta(t)}</option>`).join("")}
          </select>
        </div>
      `,
      onSave: async (registro) => {
        const dados = {
          code: document.getElementById("form-code").value,
          name: document.getElementById("form-name").value,
          type: document.getElementById("form-type").value,
        };
        if (!dados.code || !dados.name)
          throw new Error("Código e Nome são obrigatórios.");
        return dados;
      },
      onNew: () => ({ code: "", name: "", type: "despesa" }),
      nomeRegistro: "conta",
    });
  }

  // ============================================================
  // SEÇÕES SIMPLES (tiposMaterial, unidadesMedida, transportadoras, formasPagamento, maquinas)
  // ============================================================
  async function carregarSecaoTiposMaterial() {
    await carregarSecaoSimples(
      "tipos-material-content",
      "material_types",
      "tiposMaterial",
      "Tipos de Material",
      "name",
    );
  }
  async function carregarSecaoUnidadesMedida() {
    await carregarSecaoSimples(
      "unidades-medida-content",
      "measurement_units",
      "unidadesMedida",
      "Unidades de Medida",
      "name",
    );
  }
  async function carregarSecaoTransportadoras() {
    await carregarSecaoSimples(
      "transportadoras-content",
      "carriers",
      "transportadoras",
      "Transportadoras",
      "name",
    );
  }
  async function carregarSecaoFormasPagamento() {
    await carregarSecaoSimples(
      "formas-pagamento-content",
      "payment_methods",
      "formasPagamento",
      "Formas de Pagamento",
      "name",
    );
  }
  async function carregarSecaoMaquinas() {
    const container = document.getElementById("maquinas-content");
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";

    await carregarSecaoGenerica({
      container,
      tabela: "machines",
      stateKey: "maquinas",
      titulo: "Máquinas",
      colunas: [
        { attr: "code", label: "Código", sortable: true },
        { attr: "type", label: "Tipo", sortable: true },
        { attr: "brand", label: "Marca", sortable: true },
        { attr: "model", label: "Modelo", sortable: false },
        {
          attr: "status",
          label: "Status",
          sortable: false,
          format: (v) =>
            v === "operacional"
              ? "🟢 Operacional"
              : v === "manutencao"
                ? "🟡 Manutenção"
                : "🔴 Inativa",
        },
      ],
      formFields: (registro) => `
        <div class="form-group"><label class="form-label">Código *</label><input id="form-code" class="form-input" value="${escapeHtml(registro?.code || "")}" required></div>
        <div class="form-group"><label class="form-label">Tipo</label><input id="form-type" class="form-input" value="${escapeHtml(registro?.type || "")}"></div>
        <div class="form-group"><label class="form-label">Marca</label><input id="form-brand" class="form-input" value="${escapeHtml(registro?.brand || "")}"></div>
        <div class="form-group"><label class="form-label">Modelo</label><input id="form-model" class="form-input" value="${escapeHtml(registro?.model || "")}"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="form-status" class="form-select">
            <option value="operacional" ${registro?.status === "operacional" ? "selected" : ""}>Operacional</option>
            <option value="manutencao" ${registro?.status === "manutencao" ? "selected" : ""}>Manutenção</option>
            <option value="inativa" ${registro?.status === "inativa" ? "selected" : ""}>Inativa</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Observações</label><textarea id="form-notes" class="form-input" rows="2">${escapeHtml(registro?.notes || "")}</textarea></div>
      `,
      onSave: async (registro) => {
        const dados = {
          code: document.getElementById("form-code").value,
          type: document.getElementById("form-type").value || null,
          brand: document.getElementById("form-brand").value || null,
          model: document.getElementById("form-model").value || null,
          status: document.getElementById("form-status").value,
          notes: document.getElementById("form-notes").value || null,
        };
        if (!dados.code) throw new Error("Código é obrigatório.");
        return dados;
      },
      onNew: () => ({
        code: "",
        type: "",
        brand: "",
        model: "",
        status: "operacional",
        notes: "",
      }),
      nomeRegistro: "máquina",
    });
  }

  async function carregarSecaoSimples(
    contentId,
    tabela,
    stateKey,
    titulo,
    campoNome,
  ) {
    const container = document.getElementById(contentId);
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";

    await carregarSecaoGenerica({
      container,
      tabela,
      stateKey,
      titulo,
      colunas: [
        { attr: campoNome, label: "Nome", sortable: true },
        {
          attr: "active",
          label: "Ativo",
          sortable: false,
          format: (v) => (v ? "✅" : "❌"),
        },
      ],
      formFields: (registro) => `
        <div class="form-group"><label class="form-label">Nome *</label><input id="form-name" class="form-input" value="${escapeHtml(registro?.name || "")}" required></div>
        <div class="form-group"><label class="form-label">Ativo</label><select id="form-active" class="form-select"><option value="true" ${registro?.active !== false ? "selected" : ""}>Sim</option><option value="false" ${registro?.active === false ? "selected" : ""}>Não</option></select></div>
      `,
      onSave: async (registro) => {
        const dados = {
          name: document.getElementById("form-name").value,
          active: document.getElementById("form-active").value === "true",
        };
        if (!dados.name) throw new Error("Nome é obrigatório.");
        return dados;
      },
      onNew: () => ({ name: "", active: true }),
      nomeRegistro: titulo.toLowerCase(),
    });
  }

  // ============================================================
  // SEÇÃO: PREFERÊNCIAS GERAIS
  // ============================================================
  async function carregarSecaoPreferencias() {
    const container = document.getElementById("preferencias-content");
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";

    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value");
    const valores = {};
    if (settings) settings.forEach((s) => (valores[s.key] = s.value || ""));

    container.innerHTML = `
      <div style="display:grid; gap:16px; padding:16px;">
        <div class="form-group">
          <label class="form-label">Registros por página</label>
          <input id="pref-records_per_page" type="number" min="5" max="100" class="form-input" value="${escapeHtml(valores.records_per_page || "20")}">
        </div>
        <div class="form-group">
          <label class="form-label">Formato de Data</label>
          <input id="pref-date_format" class="form-input" value="${escapeHtml(valores.date_format || "dd/mm/yyyy")}">
        </div>
        <button class="btn btn-primary" id="btnSalvarPreferencias"><i class="ph ph-floppy-disk"></i> Salvar</button>
      </div>
    `;

    document
      .getElementById("btnSalvarPreferencias")
      .addEventListener("click", async () => {
        const campos = ["records_per_page", "date_format"];
        for (const c of campos) {
          await supabase
            .from("system_settings")
            .upsert(
              { key: c, value: document.getElementById(`pref-${c}`).value },
              { onConflict: "key" },
            );
        }
        showFeedback("Sucesso", "Preferências salvas!", "success");
      });
  }

  // ============================================================
  // FUNÇÃO GENÉRICA PARA SEÇÕES COM TABELA E CRUD
  // ============================================================
  async function carregarSecaoGenerica(config) {
    const {
      container,
      tabela,
      stateKey,
      titulo,
      colunas,
      formFields,
      onSave,
      onNew,
      nomeRegistro,
    } = config;
    const state = secoes[stateKey];

    // Busca dados com paginação e ordenação
    let query = supabase.from(tabela).select("*", { count: "exact" });
    if (state.ordenacao) {
      query = query.order(state.ordenacao.coluna, {
        ascending: state.ordenacao.asc,
      });
    }
    query = query.range(
      state.pagina * state.limite,
      (state.pagina + 1) * state.limite - 1,
    );

    const { data, error, count } = await query;
    if (error) {
      container.innerHTML = `<p style="color:var(--error);">Erro ao carregar ${titulo}: ${error.message}</p>`;
      return;
    }
    state.total = count || 0;
    const registros = data || [];

    // Renderiza a tabela e controles
    const theadHtml = colunas
      .map(
        (c) =>
          `<th${c.sortable ? ` class="sortable" data-sort="${c.attr}" style="cursor:pointer;"` : ""}>${c.label} ${c.sortable && state.ordenacao.coluna === c.attr ? (state.ordenacao.asc ? "↑" : "↓") : ""}</th>`,
      )
      .join("");
    const tbodyHtml = registros
      .map((r) => {
        const vals = colunas.map((c) => {
          const val = r[c.attr];
          return c.format ? c.format(val) : val || "-";
        });
        const menuId = `menu-${stateKey}-${r.id}`;
        return `<tr>
        ${vals.map((v) => `<td>${v}</td>`).join("")}
        <td class="text-center" style="width:70px;">
          <button class="btn-actions-trigger" data-menu-id="${menuId}" title="Ações"><i class="ph ph-gear-six"></i></button>
          <div id="${menuId}" class="dropdown-actions-menu" style="display:none;">
            <a href="#" class="action-item action-view" data-action="ver-registro" data-tabela="${tabela}" data-id="${r.id}" data-state="${stateKey}"><i class="ph ph-eye"></i> Visualizar</a>
            <a href="#" class="action-item action-edit" data-action="editar-registro" data-tabela="${tabela}" data-id="${r.id}" data-state="${stateKey}"><i class="ph ph-pencil-simple"></i> Editar</a>
            <div class="dropdown-divider"></div>
            <a href="#" class="action-item action-delete" data-action="excluir-registro" data-tabela="${tabela}" data-id="${r.id}" data-state="${stateKey}"><i class="ph ph-trash"></i> Excluir</a>
          </div>
        </td>
      </tr>`;
      })
      .join("");

    const paginacaoHtml =
      state.total > state.limite
        ? `
      <div style="display:flex; justify-content:space-between; margin-top:12px;">
        <span style="color:var(--gray);">Mostrando ${Math.min((state.pagina + 1) * state.limite, state.total)} de ${state.total}</span>
        <button class="btn btn-ghost btn-sm" onclick="window.carregarMais('${stateKey}')">Carregar mais</button>
      </div>`
        : "";

    container.innerHTML = `
      <div style="padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="color:var(--gray);">${state.total} ${nomeRegistro}(s)</span>
          <button class="btn btn-primary btn-sm" id="btnNovo-${stateKey}"><i class="ph ph-plus-circle"></i> Novo</button>
        </div>
        <div class="table-responsive">
          <table class="table" id="tabela-${stateKey}">
            <thead><tr>${theadHtml}<th style="width:70px;"></th></tr></thead>
            <tbody>${tbodyHtml || `<tr><td colspan="${colunas.length + 1}" class="text-center">Nenhum registro encontrado.</td></tr>`}</tbody>
          </table>
        </div>
        ${paginacaoHtml}
        <button class="btn btn-ghost btn-sm" id="btnExportar-${stateKey}" style="margin-top:8px;"><i class="ph ph-download-simple"></i> CSV</button>
      </div>
    `;

    // Eventos
    document
      .getElementById(`btnNovo-${stateKey}`)
      .addEventListener("click", () =>
        abrirModalRegistro({
          tabela,
          stateKey,
          formFields,
          onSave,
          onNew,
          nomeRegistro,
          registro: null,
        }),
      );
    document
      .getElementById(`btnExportar-${stateKey}`)
      .addEventListener("click", () => exportarCSV(`${stateKey}`, colunas));
    configurarOrdenacao(stateKey, tabela);
    configurarAcoesDropdown();
  }

  window.carregarMais = async function (stateKey) {
    const state = secoes[stateKey];
    state.pagina++;
    // Recarregar a seção apropriada
    switch (stateKey) {
      case "clientes":
        carregarSecaoClientes();
        break;
      case "fornecedores":
        carregarSecaoFornecedores();
        break;
      case "planoContas":
        carregarSecaoPlanoContas();
        break;
      case "tiposMaterial":
        carregarSecaoTiposMaterial();
        break;
      case "unidadesMedida":
        carregarSecaoUnidadesMedida();
        break;
      case "transportadoras":
        carregarSecaoTransportadoras();
        break;
      case "formasPagamento":
        carregarSecaoFormasPagamento();
        break;
      case "maquinas":
        carregarSecaoMaquinas();
        break;
    }
  };

  function configurarOrdenacao(stateKey, tabela) {
    const table = document.getElementById(`tabela-${stateKey}`);
    if (!table) return;
    table.querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", async () => {
        const col = th.dataset.sort;
        const state = secoes[stateKey];
        if (state.ordenacao.coluna === col) {
          state.ordenacao.asc = !state.ordenacao.asc;
        } else {
          state.ordenacao.coluna = col;
          state.ordenacao.asc = true;
        }
        state.pagina = 0;
        // Recarregar seção
        switch (stateKey) {
          case "clientes":
            carregarSecaoClientes();
            break;
          case "fornecedores":
            carregarSecaoFornecedores();
            break;
          case "planoContas":
            carregarSecaoPlanoContas();
            break;
          case "tiposMaterial":
            carregarSecaoTiposMaterial();
            break;
          case "unidadesMedida":
            carregarSecaoUnidadesMedida();
            break;
          case "transportadoras":
            carregarSecaoTransportadoras();
            break;
          case "formasPagamento":
            carregarSecaoFormasPagamento();
            break;
          case "maquinas":
            carregarSecaoMaquinas();
            break;
        }
      });
    });
  }

  function configurarAcoesDropdown() {
    document.querySelectorAll(".btn-actions-trigger").forEach((btn) => {
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
    document.querySelectorAll(".dropdown-actions-menu").forEach((m) => {
      if (m !== menu) {
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
      !e.target.closest(".btn-actions-trigger") &&
      !e.target.closest(".dropdown-actions-menu")
    ) {
      document.querySelectorAll(".dropdown-actions-menu").forEach((m) => {
        m.style.display = "none";
        m.classList.remove("show");
      });
    }
  });

  // ============================================================
  // MODAL GENÉRICO PARA CRUD
  // ============================================================
  async function abrirModalRegistro(config) {
    const {
      tabela,
      stateKey,
      formFields,
      onSave,
      onNew,
      nomeRegistro,
      registro,
    } = config;
    const isNew = !registro;
    const tituloModal = isNew
      ? `Novo ${nomeRegistro}`
      : `Editar ${nomeRegistro}`;

    const formHtml = formFields(registro || onNew());

    openFormModal(tituloModal, formHtml, async () => {
      try {
        const dados = await onSave(registro);
        if (isNew) {
          const { error } = await supabase.from(tabela).insert(dados);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase
            .from(tabela)
            .update(dados)
            .eq("id", registro.id);
          if (error) throw new Error(error.message);
        }
        document.getElementById("modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          `${nomeRegistro} ${isNew ? "criado" : "atualizado"} com sucesso!`,
          "success",
        );
        // Recarregar seção
        recarregarSecao(stateKey);
      } catch (err) {
        showFeedback("Erro", err.message, "error");
      }
    });
  }

  async function visualizarRegistro(tabela, id, stateKey) {
    const { data, error } = await supabase
      .from(tabela)
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      showFeedback("Erro", "Registro não encontrado.", "error");
      return;
    }
    const html = Object.entries(data)
      .map(([k, v]) => `<p><strong>${k}:</strong> ${v || "-"}</p>`)
      .join("");
    openFormModal("Visualizar", html, () => {});
    replaceSubmitWithCloseButton();
  }

  async function excluirRegistro(tabela, id, stateKey) {
    openFormModal(
      "Confirmar Exclusão",
      `<p>Deseja realmente excluir este registro?</p>`,
      async () => {
        const { error } = await supabase.from(tabela).delete().eq("id", id);
        if (error) {
          showFeedback("Erro", `Falha ao excluir: ${error.message}`, "error");
        } else {
          document.getElementById("modalContainer").innerHTML = "";
          showFeedback("Sucesso", "Registro excluído!", "success");
          recarregarSecao(stateKey);
        }
      },
    );
  }

  function recarregarSecao(stateKey) {
    switch (stateKey) {
      case "clientes":
        document.getElementById("clientes-content").dataset.loaded = "";
        carregarSecaoClientes();
        break;
      case "fornecedores":
        document.getElementById("fornecedores-content").dataset.loaded = "";
        carregarSecaoFornecedores();
        break;
      case "planoContas":
        document.getElementById("plano-contas-content").dataset.loaded = "";
        carregarSecaoPlanoContas();
        break;
      case "tiposMaterial":
        document.getElementById("tipos-material-content").dataset.loaded = "";
        carregarSecaoTiposMaterial();
        break;
      case "unidadesMedida":
        document.getElementById("unidades-medida-content").dataset.loaded = "";
        carregarSecaoUnidadesMedida();
        break;
      case "transportadoras":
        document.getElementById("transportadoras-content").dataset.loaded = "";
        carregarSecaoTransportadoras();
        break;
      case "formasPagamento":
        document.getElementById("formas-pagamento-content").dataset.loaded = "";
        carregarSecaoFormasPagamento();
        break;
      case "maquinas":
        document.getElementById("maquinas-content").dataset.loaded = "";
        carregarSecaoMaquinas();
        break;
    }
  }

  // ============================================================
  // DELEGAÇÃO DE EVENTOS GLOBAL PARA AS AÇÕES DO CONFIGURAÇÕES
  // ============================================================
  document.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const tabela = target.dataset.tabela;
    const id = target.dataset.id;
    const stateKey = target.dataset.state;

    if (action === "ver-registro") {
      e.preventDefault();
      await visualizarRegistro(tabela, id, stateKey);
    } else if (action === "editar-registro") {
      e.preventDefault();
      const { data } = await supabase
        .from(tabela)
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        let config;
        switch (stateKey) {
          case "clientes":
            config = getConfigClientes();
            break;
          case "fornecedores":
            config = getConfigFornecedores();
            break;
          case "planoContas":
            config = getConfigPlanoContas();
            break;
          case "tiposMaterial":
            config = getConfigSimples(
              "material_types",
              "tiposMaterial",
              "Tipos de Material",
              "name",
            );
            break;
          case "unidadesMedida":
            config = getConfigSimples(
              "measurement_units",
              "unidadesMedida",
              "Unidades de Medida",
              "name",
            );
            break;
          case "transportadoras":
            config = getConfigSimples(
              "carriers",
              "transportadoras",
              "Transportadoras",
              "name",
            );
            break;
          case "formasPagamento":
            config = getConfigSimples(
              "payment_methods",
              "formasPagamento",
              "Formas de Pagamento",
              "name",
            );
            break;
          case "maquinas":
            config = getConfigMaquinas();
            break;
        }
        if (config) {
          config.registro = data;
          abrirModalRegistro(config);
        }
      }
    } else if (action === "excluir-registro") {
      e.preventDefault();
      await excluirRegistro(tabela, id, stateKey);
    }
  });

  // Funções auxiliares para configuração dos modais de edição
  function getConfigClientes() {
    return {
      tabela: "customers",
      stateKey: "clientes",
      formFields: (r) => `
        <div class="form-group"><label class="form-label">Nome Fantasia</label><input id="form-trade_name" class="form-input" value="${escapeHtml(r?.trade_name || "")}"></div>
        <div class="form-group"><label class="form-label">Razão Social *</label><input id="form-company_name" class="form-input" value="${escapeHtml(r?.company_name || "")}" required></div>
        <div class="form-group"><label class="form-label">CNPJ</label><input id="form-cnpj" class="form-input" value="${escapeHtml(r?.cnpj || "")}"></div>
        <div class="form-group"><label class="form-label">Contato</label><input id="form-contact_name" class="form-input" value="${escapeHtml(r?.contact_name || "")}"></div>
        <div class="form-group"><label class="form-label">Telefone</label><input id="form-phone" class="form-input" value="${escapeHtml(r?.phone || "")}"></div>
        <div class="form-group"><label class="form-label">E-mail</label><input id="form-email" class="form-input" value="${escapeHtml(r?.email || "")}"></div>
        <div class="form-group"><label class="form-label">Ativo</label><select id="form-active" class="form-select"><option value="true" ${r?.active !== false ? "selected" : ""}>Sim</option><option value="false" ${r?.active === false ? "selected" : ""}>Não</option></select></div>
      `,
      onSave: async (registro) => {
        const dados = {
          trade_name: document.getElementById("form-trade_name").value,
          company_name: document.getElementById("form-company_name").value,
          cnpj: document.getElementById("form-cnpj").value || null,
          contact_name:
            document.getElementById("form-contact_name").value || null,
          phone: document.getElementById("form-phone").value || null,
          email: document.getElementById("form-email").value || null,
          active: document.getElementById("form-active").value === "true",
        };
        if (!dados.company_name) throw new Error("Razão Social é obrigatória.");
        return dados;
      },
      onNew: () => ({
        trade_name: "",
        company_name: "",
        cnpj: "",
        contact_name: "",
        phone: "",
        email: "",
        active: true,
      }),
      nomeRegistro: "cliente",
    };
  }
  function getConfigFornecedores() {
    return {
      tabela: "suppliers",
      stateKey: "fornecedores",
      formFields: (r) => `
        <div class="form-group"><label class="form-label">Razão Social *</label><input id="form-company_name" class="form-input" value="${escapeHtml(r?.company_name || "")}" required></div>
        <div class="form-group"><label class="form-label">CNPJ</label><input id="form-cnpj" class="form-input" value="${escapeHtml(r?.cnpj || "")}"></div>
        <div class="form-group"><label class="form-label">Contato</label><input id="form-contact_name" class="form-input" value="${escapeHtml(r?.contact_name || "")}"></div>
        <div class="form-group"><label class="form-label">Telefone</label><input id="form-phone" class="form-input" value="${escapeHtml(r?.phone || "")}"></div>
        <div class="form-group"><label class="form-label">E-mail</label><input id="form-email" class="form-input" value="${escapeHtml(r?.email || "")}"></div>
        <div class="form-group"><label class="form-label">Ativo</label><select id="form-active" class="form-select"><option value="true" ${r?.active !== false ? "selected" : ""}>Sim</option><option value="false" ${r?.active === false ? "selected" : ""}>Não</option></select></div>
      `,
      onSave: async (registro) => {
        const dados = {
          company_name: document.getElementById("form-company_name").value,
          cnpj: document.getElementById("form-cnpj").value || null,
          contact_name:
            document.getElementById("form-contact_name").value || null,
          phone: document.getElementById("form-phone").value || null,
          email: document.getElementById("form-email").value || null,
          active: document.getElementById("form-active").value === "true",
        };
        if (!dados.company_name) throw new Error("Razão Social é obrigatória.");
        return dados;
      },
      onNew: () => ({
        company_name: "",
        cnpj: "",
        contact_name: "",
        phone: "",
        email: "",
        active: true,
      }),
      nomeRegistro: "fornecedor",
    };
  }
  function getConfigPlanoContas() {
    return {
      tabela: "chart_of_accounts",
      stateKey: "planoContas",
      formFields: (r) => `
        <div class="form-group"><label class="form-label">Código *</label><input id="form-code" class="form-input" value="${escapeHtml(r?.code || "")}" required></div>
        <div class="form-group"><label class="form-label">Nome *</label><input id="form-name" class="form-input" value="${escapeHtml(r?.name || "")}" required></div>
        <div class="form-group"><label class="form-label">Tipo *</label>
          <select id="form-type" class="form-select" required>
            ${["receita", "custo_direto", "custo_indireto", "despesa", "imposto", "investimento"].map((t) => `<option value="${t}" ${r?.type === t ? "selected" : ""}>${formatarTipoConta(t)}</option>`).join("")}
          </select>
        </div>
      `,
      onSave: async (registro) => {
        const dados = {
          code: document.getElementById("form-code").value,
          name: document.getElementById("form-name").value,
          type: document.getElementById("form-type").value,
        };
        if (!dados.code || !dados.name)
          throw new Error("Código e Nome são obrigatórios.");
        return dados;
      },
      onNew: () => ({ code: "", name: "", type: "despesa" }),
      nomeRegistro: "conta",
    };
  }
  function getConfigSimples(tabela, stateKey, titulo, campoNome) {
    return {
      tabela,
      stateKey,
      formFields: (r) => `
        <div class="form-group"><label class="form-label">Nome *</label><input id="form-name" class="form-input" value="${escapeHtml(r?.name || "")}" required></div>
        <div class="form-group"><label class="form-label">Ativo</label><select id="form-active" class="form-select"><option value="true" ${r?.active !== false ? "selected" : ""}>Sim</option><option value="false" ${r?.active === false ? "selected" : ""}>Não</option></select></div>
      `,
      onSave: async (registro) => {
        const dados = {
          name: document.getElementById("form-name").value,
          active: document.getElementById("form-active").value === "true",
        };
        if (!dados.name) throw new Error("Nome é obrigatório.");
        return dados;
      },
      onNew: () => ({ name: "", active: true }),
      nomeRegistro: titulo.toLowerCase(),
    };
  }
  function getConfigMaquinas() {
    return {
      tabela: "machines",
      stateKey: "maquinas",
      formFields: (r) => `
        <div class="form-group"><label class="form-label">Código *</label><input id="form-code" class="form-input" value="${escapeHtml(r?.code || "")}" required></div>
        <div class="form-group"><label class="form-label">Tipo</label><input id="form-type" class="form-input" value="${escapeHtml(r?.type || "")}"></div>
        <div class="form-group"><label class="form-label">Marca</label><input id="form-brand" class="form-input" value="${escapeHtml(r?.brand || "")}"></div>
        <div class="form-group"><label class="form-label">Modelo</label><input id="form-model" class="form-input" value="${escapeHtml(r?.model || "")}"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="form-status" class="form-select">
            <option value="operacional" ${r?.status === "operacional" ? "selected" : ""}>Operacional</option>
            <option value="manutencao" ${r?.status === "manutencao" ? "selected" : ""}>Manutenção</option>
            <option value="inativa" ${r?.status === "inativa" ? "selected" : ""}>Inativa</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Observações</label><textarea id="form-notes" class="form-input" rows="2">${escapeHtml(r?.notes || "")}</textarea></div>
      `,
      onSave: async (registro) => {
        const dados = {
          code: document.getElementById("form-code").value,
          type: document.getElementById("form-type").value || null,
          brand: document.getElementById("form-brand").value || null,
          model: document.getElementById("form-model").value || null,
          status: document.getElementById("form-status").value,
          notes: document.getElementById("form-notes").value || null,
        };
        if (!dados.code) throw new Error("Código é obrigatório.");
        return dados;
      },
      onNew: () => ({
        code: "",
        type: "",
        brand: "",
        model: "",
        status: "operacional",
        notes: "",
      }),
      nomeRegistro: "máquina",
    };
  }

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================
  function formatarTipoConta(tipo) {
    const mapa = {
      receita: "Receita",
      custo_direto: "Custo Direto",
      custo_indireto: "Custo Indireto",
      despesa: "Despesa",
      imposto: "Imposto",
      investimento: "Investimento",
    };
    return mapa[tipo] || tipo;
  }

  function exportarCSV(stateKey, colunas) {
    const rows = [];
    rows.push(colunas.map((c) => c.label).join(";"));
    document.querySelectorAll(`#tabela-${stateKey} tbody tr`).forEach((tr) => {
      const cols = tr.querySelectorAll("td");
      const row = Array.from(cols).map(
        (td) => `"${td.innerText.replace(/\n/g, " ").trim()}"`,
      );
      row.pop(); // remove coluna de ações
      rows.push(row.join(";"));
    });
    const blob = new Blob(["\uFEFF" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${stateKey}.csv`;
    a.click();
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Inicialização
  function initConfiguracoes() {}

  window.loadConfiguracoes = loadConfiguracoes;
  window.initConfiguracoes = initConfiguracoes;
})();
