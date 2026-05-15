// ============================================================
// APP.JS - Orquestrador Principal do Sistema
// Facção de Jeans - Sistema de Gestão
// ============================================================

(async function () {
  // ============================================================
  // CONFIGURAÇÃO INICIAL
  // ============================================================
  // Usa a instância global do Supabase já inicializada no sistema.html
  const supabase = window.supabase;

  if (!supabase) {
    console.error("Supabase não inicializado!");
    return;
  }

  // ============================================================
  // VERIFICAÇÃO DE SESSÃO
  // ============================================================
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "../index.html";
    return;
  }

  // ============================================================
  // ESTADO GLOBAL DA APLICAÇÃO
  // ============================================================
  window.supabase = supabase;

  window.AppState = {
    currentUser: session.user,
    currentPage: "dashboard",
    chartProducao: null,
  };

  // ============================================================
  // ATALHOS PARA SELETORES DOM
  // ============================================================
  window.$ = (s) => document.querySelector(s);
  window.$$ = (s) => document.querySelectorAll(s);

  // ============================================================
  // INICIALIZAÇÃO DA INTERFACE
  // ============================================================
  async function init() {
    try {
      // Inicializa dados do usuário na interface
      inicializarInterfaceUsuario();

      // Configura a navegação
      if (typeof initNavigation === "function") {
        initNavigation();
      } else {
        setupNavigationFallback();
      }

      // Configura a delegação global de eventos
      setupGlobalDelegation();

      // Configura o menu do usuário
      setupUserMenu();

      // Configura notificações
      setupNotifications();

      // Configura logout
      setupLogout();

      // Carrega a página inicial (dashboard)
      await loadPage(AppState.currentPage);

      console.log("✅ Sistema inicializado com sucesso!");
    } catch (e) {
      console.error("Erro na inicialização:", e);
      showFeedback(
        "Erro",
        "Falha ao inicializar o sistema. Recarregue a página.",
        "error",
      );
    }
  }

  // ============================================================
  // INICIALIZAR INTERFACE DO USUÁRIO
  // ============================================================
  function inicializarInterfaceUsuario() {
    const user = AppState.currentUser;
    const initials = user.email
      ? user.email.substring(0, 2).toUpperCase()
      : "US";

    // Avatar no topbar
    const avatar = document.getElementById("avatar");
    if (avatar) avatar.textContent = initials;

    // Avatar no sidebar
    const avatarSm = document.getElementById("avatarSm");
    if (avatarSm) avatarSm.textContent = initials;

    // Nome do usuário no topbar
    const name = user.user_metadata?.full_name || user.email;
    const userNameDisplay = document.getElementById("userNameDisplay");
    if (userNameDisplay) userNameDisplay.textContent = name;

    // Nome do usuário no sidebar
    const userNameSm = document.getElementById("userNameSm");
    if (userNameSm) userNameSm.textContent = name;
  }

  // ============================================================
  // SETUP DE NAVEGAÇÃO (FALLBACK)
  // ============================================================
  function setupNavigationFallback() {
    // Links da sidebar
    $$("[data-page]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const page = el.dataset.page;
        if (page) navigateTo(page);
      });
    });

    // Links dentro do conteúdo (ex: "Ver todas" no dashboard)
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-page]");
      if (link && link.dataset.page) {
        e.preventDefault();
        navigateTo(link.dataset.page);
      }
    });

    // Burger button (mobile)
    const burgerBtn = document.getElementById("burgerBtn");
    if (burgerBtn) {
      burgerBtn.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.add("open");
      });
    }

    // Botão fechar sidebar (mobile)
    const sidebarToggle = document.getElementById("sidebarToggle");
    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.remove("open");
      });
    }

    // Fecha sidebar ao clicar em um link (mobile)
    $$(".nav-link[data-page]").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          const sidebar = document.getElementById("sidebar");
          if (sidebar) sidebar.classList.remove("open");
        }
      });
    });
  }

  // ============================================================
  // MENU DO USUÁRIO
  // ============================================================
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
        if (userMenu && !userMenu.contains(e.target)) {
          userDropdown.classList.remove("show");
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          userDropdown.classList.remove("show");
        }
      });
    }
  }

  // ============================================================
  // NOTIFICAÇÕES
  // ============================================================
  function setupNotifications() {
    const notificationBtn = document.getElementById("notificationBtn");
    if (!notificationBtn) return;

    notificationBtn.addEventListener("click", async () => {
      try {
        const hoje = todayISO();

        // Lotes atrasados
        const { data: lotesAtrasados } = await supabase
          .from("service_orders")
          .select("order_number, expected_delivery, customers(company_name)")
          .not("status", "in", '("entregue","cancelado")')
          .lt("expected_delivery", hoje)
          .limit(5);

        // Obrigações vencidas
        const { data: obrigacoesVencidas } = await supabase
          .from("accounting_checklist")
          .select("description, due_date")
          .neq("status", "concluido")
          .lt("due_date", hoje)
          .limit(5);

        // Contas financeiras vencidas
        const { data: contasVencidas } = await supabase
          .from("financial_transactions")
          .select("description, due_date")
          .eq("status", "pendente")
          .lt("due_date", hoje)
          .limit(5);

        const totalNotificacoes =
          (lotesAtrasados?.length || 0) +
          (obrigacoesVencidas?.length || 0) +
          (contasVencidas?.length || 0);

        if (totalNotificacoes === 0) {
          showFeedback(
            "Notificações",
            "Nenhuma notificação no momento. Tudo em dia! ✅",
            "info",
          );
          return;
        }

        let mensagem = "";
        if (lotesAtrasados && lotesAtrasados.length > 0) {
          mensagem += `<strong>📦 Lotes Atrasados:</strong><br>`;
          lotesAtrasados.forEach((l) => {
            const diasAtraso = Math.ceil(
              (new Date() - new Date(l.expected_delivery)) /
                (1000 * 60 * 60 * 24),
            );
            mensagem += `• ${l.order_number} (${l.customers?.company_name || "Cliente"}) - ${diasAtraso} dias<br>`;
          });
          mensagem += "<br>";
        }
        if (obrigacoesVencidas && obrigacoesVencidas.length > 0) {
          mensagem += `<strong>📋 Obrigações Vencidas:</strong><br>`;
          obrigacoesVencidas.forEach((o) => {
            const diasAtraso = Math.ceil(
              (new Date() - new Date(o.due_date)) / (1000 * 60 * 60 * 24),
            );
            mensagem += `• ${o.description} - ${diasAtraso} dias<br>`;
          });
          mensagem += "<br>";
        }
        if (contasVencidas && contasVencidas.length > 0) {
          mensagem += `<strong>💰 Contas Vencidas:</strong><br>`;
          contasVencidas.forEach((c) => {
            const diasAtraso = Math.ceil(
              (new Date() - new Date(c.due_date)) / (1000 * 60 * 60 * 24),
            );
            mensagem += `• ${c.description} - ${diasAtraso} dias<br>`;
          });
        }

        showFeedback(
          `Notificações (${totalNotificacoes})`,
          mensagem,
          totalNotificacoes > 3 ? "warning" : "info",
        );

        atualizarBadgeNotificacoes();
      } catch (e) {
        console.error("Erro ao buscar notificações:", e);
        showFeedback("Notificações", "Erro ao carregar notificações.", "error");
      }
    });

    // Atualiza badge ao iniciar
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

      const { count: contasVencidas } = await supabase
        .from("financial_transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente")
        .lt("due_date", hoje);

      const total =
        (lotesAtrasados || 0) +
        (obrigacoesVencidas || 0) +
        (contasVencidas || 0);
      const badge = document.getElementById("notificationBadge");
      if (badge) {
        badge.textContent = total > 99 ? "99+" : total;
        badge.style.display = total > 0 ? "flex" : "none";
      }
    } catch (e) {
      // Silencioso
    }
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const confirmed = confirm("Deseja realmente sair do sistema?");
      if (!confirmed) return;

      try {
        // Destroi os gráficos se existirem
        if (
          AppState.chartProducao &&
          typeof AppState.chartProducao.destroy === "function"
        ) {
          AppState.chartProducao.destroy();
          AppState.chartProducao = null;
        }
        if (
          window.chartEnviosDiarios &&
          typeof window.chartEnviosDiarios.destroy === "function"
        ) {
          window.chartEnviosDiarios.destroy();
          window.chartEnviosDiarios = null;
        }
        if (
          window.chartObrigacoes &&
          typeof window.chartObrigacoes.destroy === "function"
        ) {
          window.chartObrigacoes.destroy();
          window.chartObrigacoes = null;
        }

        await supabase.auth.signOut();
        window.location.href = "../index.html";
      } catch (e) {
        console.error("Erro ao fazer logout:", e);
        showFeedback("Erro", "Falha ao sair. Tente novamente.", "error");
      }
    });
  }

  // ============================================================
  // NAVEGAÇÃO ENTRE PÁGINAS
  // ============================================================
  function navigateTo(page) {
    if (page === AppState.currentPage) return;

    // Destruir gráficos ao sair das páginas
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

    // Atualiza links ativos no menu lateral
    $$(".nav-link[data-page]").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === page);
    });

    // Esconde todas as páginas
    $$(".page").forEach((p) => p.classList.remove("active"));

    // Mostra a página selecionada
    const target = document.getElementById(`page-${page}`);
    if (target) {
      target.classList.add("active");
    }

    // Atualiza o estado global
    AppState.currentPage = page;

    // Carrega os dados da página
    loadPage(page);

    // Atualiza o título da página no navegador
    atualizarTituloPagina(page);

    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function atualizarTituloPagina(page) {
    const titulos = {
      dashboard: "Rasam Confecções - Dashboard",
      "ordens-servico": "Rasam Confecções - Ordens de Serviço",
      producao: "Rasam Confecções - Produção",
      materiais: "Rasam Confecções - Materiais",
      expedicao: "Rasam Confecções - Expedição",
      financeiro: "Rasam Confecções - Financeiro",
      contabil: "Rasam Confecções - Contábil",
      rh: "Rasam Confecções - RH",
      qualidade: "Rasam Confecções - Qualidade",
      relatorios: "Rasam Confecções - Relatórios",
      configuracoes: "Rasam Confecções - Configurações",
    };
    document.title = titulos[page] || `Rasam Confecções`;
  }

  // ============================================================
  // CARREGAR PÁGINA
  // ============================================================
  async function loadPage(page) {
    switch (page) {
      case "dashboard":
        if (typeof loadDashboard === "function") {
          await loadDashboard();
        }
        break;
      case "ordens-servico":
        if (typeof loadOrdensServico === "function") {
          await loadOrdensServico();
        }
        break;
      case "producao":
        if (typeof loadProducao === "function") {
          await loadProducao();
        }
        if (typeof initProducao === "function") {
          initProducao();
        }
        break;
      case "materiais":
        if (typeof loadMateriais === "function") {
          await loadMateriais();
        }
        if (typeof initMateriais === "function") {
          initMateriais();
        }
        break;
      case "expedicao":
        if (typeof loadExpedicao === "function") {
          await loadExpedicao();
        }
        if (typeof initExpedicao === "function") {
          initExpedicao();
        }
        break;
      case "financeiro":
        if (typeof loadFinanceiro === "function") {
          await loadFinanceiro();
        }
        if (typeof initFinanceiro === "function") {
          initFinanceiro();
        }
        break;
      case "contabil":
        if (typeof loadContabil === "function") {
          await loadContabil();
        }
        if (typeof initContabil === "function") {
          initContabil();
        }
        break;
      case "rh":
        if (typeof loadRH === "function") {
          await loadRH();
        }
        if (typeof initRH === "function") {
          initRH();
        }
        break;
      case "qualidade":
        if (typeof loadQualidade === "function") {
          await loadQualidade();
        }
        if (typeof initQualidade === "function") {
          initQualidade();
        }
        break;
      case "relatorios":
        if (typeof loadRelatorios === "function") {
          await loadRelatorios();
        }
        if (typeof initRelatorios === "function") {
          initRelatorios();
        }
        break;
      case "configuracoes":
        if (typeof loadConfiguracoes === "function") {
          await loadConfiguracoes();
        }
        if (typeof initConfiguracoes === "function") {
          initConfiguracoes();
        }
        break;
    }
  }

  // ============================================================
  // DELEGAÇÃO GLOBAL DE EVENTOS
  // ============================================================
  function setupGlobalDelegation() {
    document.addEventListener("click", async (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;

      e.preventDefault();
      const action = target.dataset.action;
      const id = target.dataset.id;
      const tabela = target.dataset.tabela;
      const stateKey = target.dataset.state;

      switch (action) {
        // Ordens de Serviço
        case "view-os":
          if (typeof viewOS === "function") await viewOS(id);
          break;
        case "edit-os":
          if (typeof editOS === "function") await editOS(id);
          break;
        case "delete-os":
          if (typeof deleteOS === "function") await deleteOS(id);
          break;
        case "nova-os":
          if (typeof novaOS === "function") await novaOS();
          break;
        case "duplicate-os":
          if (typeof duplicateOS === "function") await duplicateOS(id);
          break;

        // Produção
        case "novo-apontamento":
          if (typeof novoApontamento === "function") await novoApontamento();
          break;
        case "iniciar-costura":
          if (typeof iniciarCostura === "function") await iniciarCostura(id);
          break;
        case "concluir-costura":
          if (typeof concluirCostura === "function") await concluirCostura(id);
          break;
        case "marcar-revisao":
          if (typeof marcarRevisao === "function") await marcarRevisao(id);
          break;
        case "marcar-entregue":
          if (typeof marcarEntregue === "function") await marcarEntregue(id);
          break;
        case "voltar-costura":
          if (typeof voltarCostura === "function") await voltarCostura(id);
          break;
        case "cancelar-lote":
          if (typeof cancelarLote === "function") await cancelarLote(id);
          break;

        // Materiais
        case "nova-entrada-material":
          if (typeof novaEntradaMaterial === "function")
            await novaEntradaMaterial();
          break;
        case "consumir-material":
          if (typeof consumirMaterial === "function")
            await consumirMaterial(id);
          break;
        case "ver-historico-material":
          if (typeof verHistoricoMaterial === "function")
            await verHistoricoMaterial(id);
          break;
        case "estornar-material":
          if (typeof estornarConsumoMaterial === "function")
            await estornarConsumoMaterial(id);
          break;
        case "visualizar-material":
          if (typeof visualizarMaterial === "function")
            await visualizarMaterial(id);
          break;
        case "editar-material":
          if (typeof editarMaterial === "function") await editarMaterial(id);
          break;
        case "excluir-material":
          if (typeof excluirMaterial === "function") await excluirMaterial(id);
          break;
        case "devolver-material":
          if (typeof devolverMaterial === "function")
            await devolverMaterial(id);
          break;

        // Expedição
        case "novo-envio":
          if (typeof novoEnvio === "function") await novoEnvio();
          break;
        case "ver-detalhes-envio":
          if (typeof verDetalhesEnvio === "function")
            await verDetalhesEnvio(id);
          break;
        case "editar-envio":
          if (typeof editarEnvio === "function") await editarEnvio(id);
          break;
        case "excluir-envio":
          if (typeof excluirEnvio === "function") await excluirEnvio(id);
          break;

        // Financeiro
        case "novo-lancamento":
          if (typeof novoLancamento === "function") await novoLancamento();
          break;
        case "ver-lancamento":
          if (typeof verLancamento === "function") await verLancamento(id);
          break;
        case "editar-lancamento":
          if (typeof editarLancamento === "function")
            await editarLancamento(id);
          break;
        case "baixar-lancamento":
          if (typeof baixarLancamento === "function")
            await baixarLancamento(id);
          break;
        case "estornar-lancamento":
          if (typeof estornarLancamento === "function")
            await estornarLancamento(id);
          break;
        case "excluir-lancamento":
          if (typeof excluirLancamento === "function")
            await excluirLancamento(id);
          break;

        // Contábil
        case "nova-obrigacao":
          if (typeof novaObrigacao === "function") await novaObrigacao();
          break;
        case "ver-obrigacao":
          if (typeof verObrigacao === "function") await verObrigacao(id);
          break;
        case "editar-obrigacao":
          if (typeof editarObrigacao === "function") await editarObrigacao(id);
          break;
        case "concluir-obrigacao":
          if (typeof concluirObrigacao === "function")
            await concluirObrigacao(id);
          break;
        case "reabrir-obrigacao":
          if (typeof reabrirObrigacao === "function")
            await reabrirObrigacao(id);
          break;
        case "anexar-comprovante":
          if (typeof anexarComprovante === "function")
            await anexarComprovante(id);
          break;
        case "excluir-obrigacao":
          if (typeof excluirObrigacao === "function")
            await excluirObrigacao(id);
          break;

        // RH
        case "novo-funcionario":
          if (typeof novoFuncionario === "function") await novoFuncionario();
          break;
        case "ver-ficha-funcionario":
          if (typeof verFichaFuncionario === "function")
            await verFichaFuncionario(id);
          break;
        case "editar-funcionario":
          if (typeof editarFuncionario === "function")
            await editarFuncionario(id);
          break;
        case "desligar-funcionario":
          if (typeof desligarFuncionario === "function")
            await desligarFuncionario(id);
          break;
        case "registrar-ponto":
          if (typeof registrarPonto === "function") await registrarPonto();
          break;
        case "registrar-falta":
          if (typeof registrarFalta === "function") await registrarFalta();
          break;

        // Qualidade
        case "nova-inspecao":
          if (typeof novaInspecaoQualidade === "function")
            await novaInspecaoQualidade(id);
          break;
        case "nova-inspecao-qualidade":
          if (typeof novaInspecaoQualidade === "function")
            await novaInspecaoQualidade();
          break;
        case "ver-detalhes-inspecao":
          if (typeof verDetalhesInspecao === "function")
            await verDetalhesInspecao(id);
          break;
        case "editar-inspecao":
          if (typeof editarInspecao === "function") await editarInspecao(id);
          break;

        // Relatórios
        case "relatorio-dre-mensal":
          if (typeof relatorioDREMensal === "function")
            await relatorioDREMensal();
          break;
        case "relatorio-fluxo-caixa":
          if (typeof relatorioFluxoCaixa === "function")
            await relatorioFluxoCaixa();
          break;
        case "relatorio-faturamento-cliente":
          if (typeof relatorioFaturamentoCliente === "function")
            await relatorioFaturamentoCliente();
          break;
        case "relatorio-despesas-categoria":
          if (typeof relatorioDespesasCategoria === "function")
            await relatorioDespesasCategoria();
          break;
        case "relatorio-comparativo-mensal":
          if (typeof relatorioComparativoMensal === "function")
            await relatorioComparativoMensal();
          break;
        case "relatorio-producao":
          if (typeof relatorioProducao === "function")
            await relatorioProducao();
          break;
        case "relatorio-producao-funcionario":
          if (typeof relatorioProducaoFuncionario === "function")
            await relatorioProducaoFuncionario();
          break;
        case "relatorio-producao-cliente":
          if (typeof relatorioProducaoCliente === "function")
            await relatorioProducaoCliente();
          break;
        case "relatorio-rentabilidade-lotes":
          if (typeof relatorioRentabilidadeLotes === "function")
            await relatorioRentabilidadeLotes();
          break;
        case "relatorio-perdas-retrabalho":
          if (typeof relatorioPerdasRetrabalho === "function")
            await relatorioPerdasRetrabalho();
          break;
        case "relatorio-os-status":
          if (typeof relatorioOSStatus === "function")
            await relatorioOSStatus();
          break;
        case "relatorio-funcionarios-ativos":
          if (typeof relatorioFuncionariosAtivos === "function")
            await relatorioFuncionariosAtivos();
          break;
        case "relatorio-faltas":
          if (typeof relatorioFaltas === "function") await relatorioFaltas();
          break;
        case "relatorio-comissoes":
          if (typeof relatorioComissoes === "function")
            await relatorioComissoes();
          break;
        case "relatorio-obrigacoes":
          if (typeof relatorioObrigacoes === "function")
            await relatorioObrigacoes();
          break;
        case "relatorio-margem-contribuicao":
          if (typeof relatorioMargemContribuicao === "function")
            await relatorioMargemContribuicao();
          break;
        case "relatorio-margem-cliente":
          if (typeof relatorioMargemCliente === "function")
            await relatorioMargemCliente();
          break;
        case "relatorio-inadimplencia":
          if (typeof relatorioInadimplencia === "function")
            await relatorioInadimplencia();
          break;
        case "relatorio-projecao-caixa":
          if (typeof relatorioProjecaoCaixa === "function")
            await relatorioProjecaoCaixa();
          break;
        case "relatorio-horas-producao":
          if (typeof relatorioHorasProducao === "function")
            await relatorioHorasProducao();
          break;
        case "relatorio-custo-materiais-os":
          if (typeof relatorioCustoMateriaisOS === "function")
            await relatorioCustoMateriaisOS();
          break;
        case "relatorio-custo-funcionario":
          if (typeof relatorioCustoFuncionario === "function")
            await relatorioCustoFuncionario();
          break;
        case "relatorio-rotatividade":
          if (typeof relatorioRotatividade === "function")
            await relatorioRotatividade();
          break;
        case "relatorio-resultado-periodo":
          if (typeof relatorioResultadoPeriodo === "function")
            await relatorioResultadoPeriodo();
          break;

        // Configurações (genéricos)
        case "ver-registro":
        case "editar-registro":
        case "excluir-registro":
          // Essas ações são tratadas diretamente pelo listener em configuracoes.js,
          // que usa os datasets tabela, id e state.
          break;

        // Configurações / Perfil
        case "profile":
          showFeedback(
            "Meu Perfil",
            "Funcionalidade em desenvolvimento.",
            "info",
          );
          break;
        case "settings":
          navigateTo("configuracoes");
          break;
      }
    });
  }

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================
  await init();
})();
