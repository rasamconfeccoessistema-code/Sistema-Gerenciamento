// ============================================================
// NAVIGATION.JS
// Módulo de navegação entre páginas do sistema
// Facção de Jeans - Sistema de Gestão
// ============================================================

(function () {
  const iconesPaginas = {
    dashboard: "ph-squares-four",
    "ordens-servico": "ph-files",
    producao: "ph-sewing-needle",
    materiais: "ph-package",
    expedicao: "ph-truck",
    financeiro: "ph-currency-circle-dollar",
    contabil: "ph-calculator",
    rh: "ph-users-three",
    qualidade: "ph-check-square",
    relatorios: "ph-chart-bar",
    configuracoes: "ph-gear-six",
  };

  function setupNavigation() {
    $$("[data-page]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const page = el.dataset.page;
        if (page) navigateTo(page);
      });
    });

    const burgerBtn = document.getElementById("burgerBtn");
    if (burgerBtn) {
      burgerBtn.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.add("open");
      });
    }

    const sidebarToggle = document.getElementById("sidebarToggle");
    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.remove("open");
      });
    }

    $$(".nav-link[data-page]").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          const sidebar = document.getElementById("sidebar");
          if (sidebar) sidebar.classList.remove("open");
        }
      });
    });

    setupUserMenu();
    setupSearchBox();
    setupNotifications();
    setupLogout();
  }

  function navigateTo(page) {
    if (page === AppState.currentPage) return;

    if (
      AppState.currentPage === "dashboard" &&
      AppState.chartProducao &&
      typeof AppState.chartProducao.destroy === "function"
    ) {
      AppState.chartProducao.destroy();
      AppState.chartProducao = null;
    }

    if (
      AppState.currentPage === "expedicao" &&
      window.chartEnviosDiarios &&
      typeof window.chartEnviosDiarios.destroy === "function"
    ) {
      window.chartEnviosDiarios.destroy();
      window.chartEnviosDiarios = null;
    }

    if (
      AppState.currentPage === "contabil" &&
      window.chartObrigacoes &&
      typeof window.chartObrigacoes.destroy === "function"
    ) {
      window.chartObrigacoes.destroy();
      window.chartObrigacoes = null;
    }

    $$(".nav-link[data-page]").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === page);
    });

    $$(".page").forEach((p) => p.classList.remove("active"));

    const target = document.getElementById(`page-${page}`);
    if (target) {
      target.classList.add("active");
    } else {
      console.warn(`Página "${page}" não encontrada no DOM.`);
      criarPaginaDinamica(page);
    }

    AppState.currentPage = page;
    loadPage(page);
    atualizarTituloPagina(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function criarPaginaDinamica(page) {
    const mainContent = document.querySelector(".main-content");
    if (!mainContent) return;
    if (document.getElementById(`page-${page}`)) return;

    const titulos = {
      qualidade: "Controle de Qualidade",
      dashboard: "Dashboard",
      "ordens-servico": "Ordens de Serviço",
      producao: "Produção",
      materiais: "Materiais",
      expedicao: "Expedição",
      financeiro: "Financeiro",
      contabil: "Contábil",
      rh: "Recursos Humanos",
      relatorios: "Relatórios",
      configuracoes: "Configurações",
    };

    const titulo =
      titulos[page] ||
      page.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase());
    const icone = iconesPaginas[page] || "ph-file";

    let conteudoHTML = "";

    switch (page) {
      case "qualidade":
        conteudoHTML = `
          <div class="page-header">
            <div><h2>${titulo}</h2><p class="text-muted">Inspeção e controle de qualidade das peças</p></div>
            <button class="btn btn-primary" data-action="nova-inspecao-qualidade"><i class="ph ph-check-square"></i> Nova Inspeção</button>
          </div>
          <div class="cards-grid"></div>
          <div class="panel"><div class="panel-header"><h3>Histórico de Inspeções</h3></div><div class="panel-body"><div class="table-responsive"><table class="table" id="table-inspecoes"><thead><tr><th>Data/Hora</th><th>Inspetor</th><th>OS</th><th>Inspecionado</th><th>Defeitos</th><th>Tipo de Defeito</th><th>Decisão</th><th>Ações</th></tr></thead><tbody></tbody></table></div></div></div>
        `;
        break;

      case "configuracoes":
        conteudoHTML = `<div class="page-header"><h2>${titulo}</h2></div><div class="panel"><div class="panel-body"><p style="color: var(--gray);">Configurações do sistema e perfil da empresa.</p><p style="color: var(--gray); margin-top: 8px;">Em breve: cadastro de categorias, clientes, fornecedores, usuários e permissões.</p></div></div>`;
        break;

      default:
        conteudoHTML = `<div class="page-header"><h2>${titulo}</h2></div><div class="panel"><div class="panel-body"><p style="color: var(--gray);">Carregando...</p></div></div>`;
        break;
    }

    const pageElement = document.createElement("section");
    pageElement.className = "page";
    pageElement.id = `page-${page}`;
    pageElement.innerHTML = conteudoHTML;
    mainContent.appendChild(pageElement);
  }

  async function loadPage(page) {
    const titulos = {
      dashboard: "Dashboard",
      "ordens-servico": "Ordens de Serviço",
      producao: "Produção",
      materiais: "Materiais Consignados",
      expedicao: "Expedição",
      financeiro: "Financeiro",
      contabil: "Contábil",
      rh: "Recursos Humanos",
      qualidade: "Controle de Qualidade",
      relatorios: "Relatórios",
      configuracoes: "Configurações",
    };

    const pageTitleEl = document.getElementById("pageTitleTopbar");
    if (pageTitleEl) pageTitleEl.textContent = titulos[page] || page;

    switch (page) {
      case "dashboard":
        if (typeof loadDashboard === "function") await loadDashboard();
        break;
      case "ordens-servico":
        if (typeof loadOrdensServico === "function") await loadOrdensServico();
        break;
      case "producao":
        if (typeof loadProducao === "function") await loadProducao();
        if (typeof initProducao === "function") initProducao();
        break;
      case "materiais":
        if (typeof loadMateriais === "function") await loadMateriais();
        if (typeof initMateriais === "function") initMateriais();
        break;
      case "expedicao":
        if (typeof loadExpedicao === "function") await loadExpedicao();
        if (typeof initExpedicao === "function") initExpedicao();
        break;
      case "financeiro":
        if (typeof loadFinanceiro === "function") await loadFinanceiro();
        if (typeof initFinanceiro === "function") initFinanceiro();
        break;
      case "contabil":
        if (typeof loadContabil === "function") await loadContabil();
        if (typeof initContabil === "function") initContabil();
        break;
      case "rh":
        if (typeof loadRH === "function") await loadRH();
        if (typeof initRH === "function") initRH();
        break;
      case "qualidade":
        if (typeof loadQualidade === "function") await loadQualidade();
        if (typeof initQualidade === "function") initQualidade();
        break;
      case "relatorios":
        if (typeof loadRelatorios === "function") await loadRelatorios();
        if (typeof initRelatorios === "function") initRelatorios();
        break;
      case "configuracoes":
        break;
      default:
        console.warn(`Loader não encontrado para a página: ${page}`);
        break;
    }
  }

  function atualizarTituloPagina(page) {
    const titulos = {
      dashboard: "Dashboard • Facção de Jeans",
      "ordens-servico": "Ordens de Serviço • Facção de Jeans",
      producao: "Produção • Facção de Jeans",
      materiais: "Materiais • Facção de Jeans",
      expedicao: "Expedição • Facção de Jeans",
      financeiro: "Financeiro • Facção de Jeans",
      contabil: "Contábil • Facção de Jeans",
      rh: "RH • Facção de Jeans",
      qualidade: "Qualidade • Facção de Jeans",
      relatorios: "Relatórios • Facção de Jeans",
      configuracoes: "Configurações • Facção de Jeans",
    };
    document.title = titulos[page] || `Facção de Jeans • Sistema`;
  }

  function setupUserMenu() {
    const avatarBtn = document.getElementById("avatarBtn");
    const userDropdown = document.getElementById("userDropdown");
    if (avatarBtn && userDropdown) {
      avatarBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("show");
      });
      document.addEventListener("click", (e) => {
        const userMenu = document.getElementById("userMenu");
        if (userMenu && !userMenu.contains(e.target))
          userDropdown.classList.remove("show");
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") userDropdown.classList.remove("show");
      });
    }
  }

  function setupSearchBox() {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;

    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const term = searchInput.value.trim();
        if (term) {
          const currentPage = AppState.currentPage;
          const paginasComBusca = [
            "ordens-servico",
            "materiais",
            "expedicao",
            "financeiro",
            "contabil",
          ];
          if (!paginasComBusca.includes(currentPage)) {
            navigateTo("ordens-servico");
            setTimeout(() => {
              if (typeof loadOrdensServico === "function") loadOrdensServico();
            }, 300);
          } else {
            if (
              currentPage === "ordens-servico" &&
              typeof loadOrdensServico === "function"
            )
              loadOrdensServico();
            else if (
              currentPage === "materiais" &&
              typeof loadMateriais === "function"
            )
              loadMateriais();
            else if (
              currentPage === "expedicao" &&
              typeof loadExpedicao === "function"
            )
              loadExpedicao();
            else if (
              currentPage === "financeiro" &&
              typeof loadFinanceiro === "function"
            )
              loadFinanceiro();
            else if (
              currentPage === "contabil" &&
              typeof loadContabil === "function"
            )
              loadContabil();
          }
        }
      }
    });

    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const term = searchInput.value.trim();
        if (term) {
          const currentPage = AppState.currentPage;
          if (
            currentPage === "ordens-servico" &&
            typeof loadOrdensServico === "function"
          )
            loadOrdensServico();
          else if (
            currentPage === "materiais" &&
            typeof loadMateriais === "function"
          )
            loadMateriais();
          else if (
            currentPage === "expedicao" &&
            typeof loadExpedicao === "function"
          )
            loadExpedicao();
          else if (
            currentPage === "financeiro" &&
            typeof loadFinanceiro === "function"
          )
            loadFinanceiro();
          else if (
            currentPage === "contabil" &&
            typeof loadContabil === "function"
          )
            loadContabil();
        }
      }, 500);
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        searchInput.blur();
        const currentPage = AppState.currentPage;
        if (
          currentPage === "ordens-servico" &&
          typeof loadOrdensServico === "function"
        )
          loadOrdensServico();
        else if (
          currentPage === "materiais" &&
          typeof loadMateriais === "function"
        )
          loadMateriais();
        else if (
          currentPage === "expedicao" &&
          typeof loadExpedicao === "function"
        )
          loadExpedicao();
        else if (
          currentPage === "financeiro" &&
          typeof loadFinanceiro === "function"
        )
          loadFinanceiro();
        else if (
          currentPage === "contabil" &&
          typeof loadContabil === "function"
        )
          loadContabil();
      }
    });
  }

  function setupNotifications() {
    const notificationBtn = document.getElementById("notificationBtn");
    if (!notificationBtn) return;

    notificationBtn.addEventListener("click", async () => {
      try {
        const hoje = todayISO();
        const { data: lotesAtrasados } = await supabase
          .from("service_orders")
          .select("order_number")
          .not("status", "in", '("entregue","cancelado")')
          .lt("expected_delivery", hoje)
          .limit(5);
        const { data: obrigacoesVencidas } = await supabase
          .from("accounting_checklist")
          .select("description")
          .neq("status", "concluido")
          .lt("due_date", hoje)
          .limit(5);
        const total =
          (lotesAtrasados?.length || 0) + (obrigacoesVencidas?.length || 0);
        if (total === 0) {
          showFeedback(
            "Notificações",
            "Nenhuma notificação no momento. Tudo em dia! ✅",
            "info",
          );
          return;
        }
        let mensagem = "";
        if (lotesAtrasados && lotesAtrasados.length > 0) {
          mensagem +=
            `<strong>📦 Lotes Atrasados:</strong><br>` +
            lotesAtrasados.map((l) => `• ${l.order_number}<br>`).join("") +
            "<br>";
        }
        if (obrigacoesVencidas && obrigacoesVencidas.length > 0) {
          mensagem +=
            `<strong>📋 Obrigações Vencidas:</strong><br>` +
            obrigacoesVencidas.map((o) => `• ${o.description}<br>`).join("");
        }
        showFeedback(
          `Notificações (${total})`,
          mensagem,
          total > 3 ? "warning" : "info",
        );
        const badge = document.getElementById("notificationBadge");
        if (badge) {
          badge.textContent = total;
          badge.style.display = total > 0 ? "flex" : "none";
        }
      } catch (e) {
        console.error("Erro ao buscar notificações:", e);
        showFeedback("Notificações", "Erro ao carregar notificações.", "error");
      }
    });
    atualizarBadgeNotificacoes();
  }

  async function atualizarBadgeNotificacoes() {
    try {
      const hoje = todayISO();
      const { count: lotesAtrasados } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("entregue","cancelado")')
        .lt("expected_delivery", hoje);
      const { count: obrigacoesVencidas } = await supabase
        .from("accounting_checklist")
        .select("*", { count: "exact", head: true })
        .neq("status", "concluido")
        .lt("due_date", hoje);
      const total = (lotesAtrasados || 0) + (obrigacoesVencidas || 0);
      const badge = document.getElementById("notificationBadge");
      if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? "flex" : "none";
      }
    } catch (e) {
      /* silencioso */
    }
  }

  function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!confirm("Deseja realmente sair do sistema?")) return;
      try {
        await supabase.auth.signOut();
        window.location.href = "../index.html";
      } catch (e) {
        console.error("Erro ao fazer logout:", e);
        showFeedback("Erro", "Falha ao sair. Tente novamente.", "error");
      }
    });
  }

  window.setupNavigation = setupNavigation;
  window.navigateTo = navigateTo;
  window.loadPage = loadPage;
  window.initNavigation = function () {
    setupNavigation();
  };
  window.atualizarBadgeNotificacoes = atualizarBadgeNotificacoes;
})();
