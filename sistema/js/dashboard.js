// ============================================================
// DASHBOARD.JS
// Módulo do Dashboard Principal - Visão Geral da Operação
// Facção de Jeans - Sistema de Gestão
// ============================================================

// ============================================================
// CARREGAMENTO COMPLETO DO DASHBOARD
// ============================================================
async function loadDashboard() {
  try {
    // Mostra indicador de carregamento nos KPIs
    mostrarLoadingKPIs();

    // Carrega todos os dados em paralelo para performance
    const [
      dadosOS,
      dadosFaturamento,
      dadosProducaoHoje,
      dadosProducaoSemana,
      dadosFuncionarios,
      dadosQualidade,
      dadosFinanceiro,
      dadosAlertas,
    ] = await Promise.all([
      carregarDadosOS(),
      carregarDadosFaturamento(),
      carregarDadosProducaoHoje(),
      carregarDadosProducaoSemana(),
      carregarDadosFuncionarios(),
      carregarDadosQualidade(),
      carregarDadosFinanceiro(),
      carregarAlertas(),
    ]);

    // Atualiza os cards de KPI
    atualizarKPIs(
      dadosOS,
      dadosFaturamento,
      dadosProducaoHoje,
      dadosFuncionarios,
      dadosQualidade,
      dadosFinanceiro,
    );

    // Renderiza os alertas inteligentes
    renderizarAlertas(dadosAlertas);

    // Carrega o gráfico de produção semanal
    await carregarGraficoProducao(dadosProducaoSemana);

    // Carrega a tabela de últimas OS
    await carregarUltimasOS();

    // Carrega a tabela de próximos vencimentos
    await carregarProximosVencimentos();
  } catch (e) {
    console.error("Erro ao carregar dashboard:", e);
    showFeedback(
      "Erro",
      "Falha ao carregar alguns dados do dashboard.",
      "warning",
    );
  }
}

// ============================================================
// MOSTRAR LOADING NOS KPIs
// ============================================================
function mostrarLoadingKPIs() {
  const kpis = [
    "kpi-os-producao",
    "kpi-os-total",
    "kpi-faturamento",
    "kpi-pecas-hoje",
    "kpi-funcionarios",
    "kpi-ocupacao",
    "kpi-media-diaria",
    "kpi-taxa-defeitos",
    "kpi-saldo",
    "kpi-contas-pagar",
    "kpi-contas-receber",
    "kpi-lotes-atrasados",
  ];

  kpis.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "...";
  });
}

// ============================================================
// CARREGAR DADOS DAS ORDENS DE SERVIÇO
// ============================================================
async function carregarDadosOS() {
  const hoje = todayISO();

  const { count: osEmProducao } = await supabase
    .from("service_orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["em_costura", "costurado", "em_revisao"]);

  const { count: osAtivas } = await supabase
    .from("service_orders")
    .select("*", { count: "exact", head: true })
    .not("status", "in", '("cancelado","entregue")');

  const { count: lotesAtrasados } = await supabase
    .from("service_orders")
    .select("*", { count: "exact", head: true })
    .not("status", "in", '("entregue","cancelado")')
    .lt("expected_delivery", hoje);

  const { count: osRecebidasHoje } = await supabase
    .from("service_orders")
    .select("*", { count: "exact", head: true })
    .gte("received_date", hoje)
    .lte("received_date", hoje);

  const { count: osEntreguesHoje } = await supabase
    .from("service_orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "entregue")
    .gte("updated_at", hoje)
    .lte("updated_at", hoje + "T23:59:59");

  return {
    osEmProducao: osEmProducao || 0,
    osAtivas: osAtivas || 0,
    lotesAtrasados: lotesAtrasados || 0,
    osRecebidasHoje: osRecebidasHoje || 0,
    osEntreguesHoje: osEntreguesHoje || 0,
  };
}

// ============================================================
// CARREGAR DADOS DE FATURAMENTO
// ============================================================
async function carregarDadosFaturamento() {
  const now = new Date();
  const primeiroDiaMes = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const primeiroDiaMesAnterior = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  )
    .toISOString()
    .split("T")[0];
  const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .split("T")[0];

  const { data: osEntreguesMes } = await supabase
    .from("service_orders")
    .select("unit_price, total_quantity")
    .eq("status", "entregue")
    .gte("updated_at", primeiroDiaMes)
    .lte("updated_at", ultimoDiaMes);

  const { data: osEntreguesMesAnterior } = await supabase
    .from("service_orders")
    .select("unit_price, total_quantity")
    .eq("status", "entregue")
    .gte("updated_at", primeiroDiaMesAnterior)
    .lte("updated_at", ultimoDiaMesAnterior);

  const faturamentoMes = osEntreguesMes
    ? osEntreguesMes.reduce(
        (sum, os) => sum + os.unit_price * os.total_quantity,
        0,
      )
    : 0;

  const faturamentoMesAnterior = osEntreguesMesAnterior
    ? osEntreguesMesAnterior.reduce(
        (sum, os) => sum + os.unit_price * os.total_quantity,
        0,
      )
    : 0;

  const variacao =
    faturamentoMesAnterior > 0
      ? ((faturamentoMes - faturamentoMesAnterior) / faturamentoMesAnterior) *
        100
      : null;

  return {
    faturamentoMes,
    faturamentoMesAnterior,
    variacao,
    totalEntregues: osEntreguesMes ? osEntreguesMes.length : 0,
  };
}

// ============================================================
// CARREGAR DADOS DE PRODUÇÃO DE HOJE
// ============================================================
async function carregarDadosProducaoHoje() {
  const hoje = todayISO();

  const { data: recordsHoje } = await supabase
    .from("sewing_records")
    .select("pieces_sewn, defects, employee_id")
    .gte("start_time", hoje)
    .lte("start_time", hoje + "T23:59:59");

  let pecasHoje = 0;
  let defeitosHoje = 0;
  const funcsHoje = new Set();

  if (recordsHoje) {
    recordsHoje.forEach((r) => {
      pecasHoje += r.pieces_sewn;
      defeitosHoje += r.defects || 0;
      if (r.employee_id) funcsHoje.add(r.employee_id);
    });
  }

  return {
    pecasHoje,
    defeitosHoje,
    pecasLiquidasHoje: pecasHoje - defeitosHoje,
    funcionariosProduzindo: funcsHoje.size,
  };
}

// ============================================================
// CARREGAR DADOS DE PRODUÇÃO DA SEMANA (para gráfico)
// ============================================================
async function carregarDadosProducaoSemana() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const { data: records } = await supabase
    .from("sewing_records")
    .select("pieces_sewn, defects, start_time")
    .gte("start_time", start.toISOString())
    .lte("start_time", end.toISOString());

  const labels = [];
  const values = [];
  const defeitos = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split("T")[0];
    const diaSemana = d.toLocaleDateString("pt-BR", { weekday: "short" });
    labels.push(diaSemana);

    let sumPecas = 0;
    let sumDefeitos = 0;
    if (records) {
      records
        .filter((r) => r.start_time.startsWith(ds))
        .forEach((r) => {
          sumPecas += r.pieces_sewn;
          sumDefeitos += r.defects || 0;
        });
    }
    values.push(sumPecas);
    defeitos.push(sumDefeitos);
  }

  const diasComProducao = values.filter((v) => v > 0).length;
  const totalSemana = values.reduce((a, b) => a + b, 0);
  const mediaDiaria =
    diasComProducao > 0 ? Math.round(totalSemana / diasComProducao) : 0;

  return {
    labels,
    values,
    defeitos,
    mediaDiaria,
    totalSemana,
    diasComProducao,
  };
}

// ============================================================
// CARREGAR DADOS DE FUNCIONÁRIOS
// ============================================================
async function carregarDadosFuncionarios() {
  const { count: funcAtivos } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("active", true);

  const hoje = todayISO();
  const { data: pontosHoje } = await supabase
    .from("time_tracking")
    .select("employee_id")
    .gte("check_in", hoje)
    .lte("check_in", hoje + "T23:59:59");

  const presentesHoje = pontosHoje
    ? new Set(pontosHoje.map((p) => p.employee_id)).size
    : 0;

  const { data: faltasHoje } = await supabase
    .from("absences")
    .select("employee_id")
    .eq("date", hoje);

  const faltandoHoje = faltasHoje ? faltasHoje.length : 0;

  const taxaOcupacao =
    funcAtivos > 0 ? Math.round((presentesHoje / funcAtivos) * 100) : 0;

  return {
    funcAtivos: funcAtivos || 0,
    presentesHoje,
    faltandoHoje,
    taxaOcupacao,
  };
}

// ============================================================
// CARREGAR DADOS DE QUALIDADE
// ============================================================
async function carregarDadosQualidade() {
  const hoje = todayISO();

  const { data: inspecoesHoje } = await supabase
    .from("quality_inspections")
    .select("total_inspected, defects_found")
    .gte("inspection_date", hoje)
    .lte("inspection_date", hoje + "T23:59:59");

  let totalInspecionadoHoje = 0;
  let totalDefeitosHoje = 0;

  if (inspecoesHoje) {
    inspecoesHoje.forEach((i) => {
      totalInspecionadoHoje += i.total_inspected || 0;
      totalDefeitosHoje += i.defects_found || 0;
    });
  }

  const taxaDefeitosHoje =
    totalInspecionadoHoje > 0
      ? ((totalDefeitosHoje / totalInspecionadoHoje) * 100).toFixed(1)
      : 0;

  const primeiroDiaMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];
  const { data: inspecoesMes } = await supabase
    .from("quality_inspections")
    .select("total_inspected, defects_found")
    .gte("inspection_date", primeiroDiaMes);

  let totalInspecionadoMes = 0;
  let totalDefeitosMes = 0;

  if (inspecoesMes) {
    inspecoesMes.forEach((i) => {
      totalInspecionadoMes += i.total_inspected || 0;
      totalDefeitosMes += i.defects_found || 0;
    });
  }

  const taxaDefeitosMes =
    totalInspecionadoMes > 0
      ? ((totalDefeitosMes / totalInspecionadoMes) * 100).toFixed(1)
      : 0;

  return {
    taxaDefeitosHoje,
    taxaDefeitosMes,
    totalInspecionadoMes,
    totalDefeitosMes,
  };
}

// ============================================================
// CARREGAR DADOS FINANCEIROS
// ============================================================
async function carregarDadosFinanceiro() {
  const hoje = todayISO();
  const primeiroDiaMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];
  const ultimoDiaMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  )
    .toISOString()
    .split("T")[0];

  const { data: transacoes } = await supabase
    .from("financial_transactions")
    .select("amount")
    .gte("date", primeiroDiaMes)
    .lte("date", ultimoDiaMes);

  let entradasMes = 0;
  let saidasMes = 0;

  if (transacoes) {
    transacoes.forEach((t) => {
      const valor = parseFloat(t.amount);
      if (valor > 0) {
        entradasMes += valor;
      } else {
        saidasMes += Math.abs(valor);
      }
    });
  }

  const saldoMes = entradasMes - saidasMes;

  const { count: contasPagar } = await supabase
    .from("financial_transactions")
    .select("*", { count: "exact", head: true })
    .lt("amount", 0)
    .gte("date", primeiroDiaMes)
    .lte("date", ultimoDiaMes);

  const { count: contasReceber } = await supabase
    .from("financial_transactions")
    .select("*", { count: "exact", head: true })
    .gt("amount", 0)
    .gte("date", primeiroDiaMes)
    .lte("date", ultimoDiaMes);

  return {
    entradasMes,
    saidasMes,
    saldoMes,
    contasPagar: contasPagar || 0,
    contasReceber: contasReceber || 0,
  };
}

// ============================================================
// CARREGAR ALERTAS INTELIGENTES
// ============================================================
async function carregarAlertas() {
  const alertas = [];
  const hoje = todayISO();

  try {
    // 1. Lotes atrasados
    const { data: lotesAtrasados } = await supabase
      .from("service_orders")
      .select("order_number, expected_delivery, customers(company_name)")
      .not("status", "in", '("entregue","cancelado")')
      .lt("expected_delivery", hoje)
      .limit(10);

    if (lotesAtrasados && lotesAtrasados.length > 0) {
      lotesAtrasados.forEach((lote) => {
        const diasAtraso = Math.ceil(
          (new Date() - new Date(lote.expected_delivery)) /
            (1000 * 60 * 60 * 24),
        );
        alertas.push({
          tipo: "atraso",
          prioridade: "alta",
          mensagem: `Lote ${lote.order_number} (${lote.customers?.company_name || "Cliente"}) atrasado há ${diasAtraso} dias`,
          icone: "ph-warning-circle",
          cor: "var(--error)",
        });
      });
    }

    // 2. OS paradas (recebido há mais de 5 dias)
    const cincoDiasAtras = new Date();
    cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);

    const { data: osParadas } = await supabase
      .from("service_orders")
      .select("order_number, received_date, customers(company_name)")
      .eq("status", "recebido")
      .lt("received_date", cincoDiasAtras.toISOString().split("T")[0])
      .limit(10);

    if (osParadas && osParadas.length > 0) {
      osParadas.forEach((os) => {
        const diasParada = Math.ceil(
          (new Date() - new Date(os.received_date)) / (1000 * 60 * 60 * 24),
        );
        alertas.push({
          tipo: "parado",
          prioridade: "media",
          mensagem: `OS ${os.order_number} parada há ${diasParada} dias sem iniciar costura`,
          icone: "ph-hourglass",
          cor: "var(--warning)",
        });
      });
    }

    // 3. Material com estoque baixo (menos de 10% do recebido)
    const { data: materiais } = await supabase
      .from("material_receipts")
      .select("id, material_type, description, quantity_received")
      .limit(50);

    if (materiais && materiais.length > 0) {
      const ids = materiais.map((m) => m.id);
      const { data: consumos } = await supabase
        .from("material_consumption")
        .select("material_receipt_id, quantity_used")
        .in("material_receipt_id", ids);

      const consumoMap = {};
      if (consumos) {
        consumos.forEach((c) => {
          consumoMap[c.material_receipt_id] =
            (consumoMap[c.material_receipt_id] || 0) +
            parseFloat(c.quantity_used);
        });
      }

      materiais.forEach((m) => {
        const recebido = parseFloat(m.quantity_received);
        const consumido = consumoMap[m.id] || 0;
        const saldo = recebido - consumido;

        if (saldo > 0 && saldo < recebido * 0.1) {
          alertas.push({
            tipo: "estoque",
            prioridade: "media",
            mensagem: `${m.material_type} - ${m.description || ""} com estoque baixo`,
            icone: "ph-package",
            cor: "var(--warning)",
          });
        }
      });
    }

    // 4. Obrigações contábeis vencidas ou vencendo
    const { data: obrigacoes } = await supabase
      .from("accounting_checklist")
      .select("description, due_date, status")
      .neq("status", "concluido")
      .lte(
        "due_date",
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      )
      .limit(10);

    if (obrigacoes && obrigacoes.length > 0) {
      obrigacoes.forEach((o) => {
        const vencimento = new Date(o.due_date);
        const hojeDate = new Date();
        const atrasada = vencimento < hojeDate;

        alertas.push({
          tipo: "contabil",
          prioridade: atrasada ? "alta" : "media",
          mensagem: `${o.description} ${atrasada ? "VENCIDA" : "vence em breve"}`,
          icone: atrasada ? "ph-warning" : "ph-calendar-check",
          cor: atrasada ? "var(--error)" : "var(--warning)",
        });
      });
    }

    // 5. Funcionários sem ponto hoje
    const { data: funcsAtivos } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("active", true);

    if (funcsAtivos && funcsAtivos.length > 0) {
      const { data: pontosHoje } = await supabase
        .from("time_tracking")
        .select("employee_id")
        .gte("check_in", hoje)
        .lte("check_in", hoje + "T23:59:59");

      const idsComPonto = new Set(
        pontosHoje ? pontosHoje.map((p) => p.employee_id) : [],
      );

      funcsAtivos.forEach((f) => {
        if (!idsComPonto.has(f.id)) {
          alertas.push({
            tipo: "ponto",
            prioridade: "baixa",
            mensagem: `${f.full_name} não registrou ponto hoje`,
            icone: "ph-user-circle",
            cor: "var(--gray-light)",
          });
        }
      });
    }

    // 6. Contas financeiras vencidas (novo)
    const { data: contasVencidas } = await supabase
      .from("financial_transactions")
      .select("description, due_date, amount, type")
      .eq("status", "pendente")
      .lt("due_date", hoje)
      .limit(10);

    if (contasVencidas && contasVencidas.length > 0) {
      contasVencidas.forEach((conta) => {
        const diasAtraso = Math.ceil(
          (new Date() - new Date(conta.due_date)) / (1000 * 60 * 60 * 24),
        );
        alertas.push({
          tipo: "financeiro",
          prioridade: "alta",
          mensagem: `${conta.description || "Conta"} (${formatCurrency(Math.abs(conta.amount))}) vencida há ${diasAtraso} dias`,
          icone: "ph-currency-circle-dollar",
          cor: "var(--error)",
        });
      });
    }

    // 7. Contas a vencer nos próximos 7 dias (novo)
    const seteDiasFrente = new Date();
    seteDiasFrente.setDate(seteDiasFrente.getDate() + 7);

    const { data: contasAVencer } = await supabase
      .from("financial_transactions")
      .select("description, due_date, amount, type")
      .eq("status", "pendente")
      .gte("due_date", hoje)
      .lte("due_date", seteDiasFrente.toISOString().split("T")[0])
      .limit(10);

    if (contasAVencer && contasAVencer.length > 0) {
      contasAVencer.forEach((conta) => {
        const diasFalta = Math.ceil(
          (new Date(conta.due_date) - new Date()) / (1000 * 60 * 60 * 24),
        );
        alertas.push({
          tipo: "financeiro",
          prioridade: "media",
          mensagem: `${conta.description || "Conta"} (${formatCurrency(Math.abs(conta.amount))}) vence em ${diasFalta} dias`,
          icone: "ph-calendar-check",
          cor: "var(--warning)",
        });
      });
    }
  } catch (e) {
    console.error("Erro ao carregar alertas:", e);
  }

  // Ordena por prioridade
  const ordemPrioridade = { alta: 0, media: 1, baixa: 2 };
  alertas.sort(
    (a, b) => ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade],
  );

  return alertas;
}

// ============================================================
// ATUALIZAR CARDS DE KPI
// ============================================================
function atualizarKPIs(
  dadosOS,
  dadosFaturamento,
  dadosProducao,
  dadosFunc,
  dadosQualidade,
  dadosFinanceiro,
) {
  // OS em Produção
  atualizarKPI("kpi-os-producao", dadosOS.osEmProducao, "lotes em andamento");
  atualizarKPI("kpi-os-total", dadosOS.osAtivas, "ativos no total");

  // Faturamento
  const fatEl = document.getElementById("kpi-faturamento");
  if (fatEl) {
    fatEl.textContent = formatCurrency(dadosFaturamento.faturamentoMes);
  }
  const variacaoEl = document.getElementById("faturamento-variacao");
  if (variacaoEl && dadosFaturamento.variacao !== null) {
    const sinal = dadosFaturamento.variacao >= 0 ? "+" : "";
    variacaoEl.textContent = `${sinal}${dadosFaturamento.variacao.toFixed(1)}% vs mês anterior`;
    variacaoEl.style.color =
      dadosFaturamento.variacao >= 0 ? "var(--success)" : "var(--error)";
  }

  // Peças hoje
  atualizarKPI(
    "kpi-pecas-hoje",
    dadosProducao.pecasLiquidasHoje,
    `${dadosProducao.defeitosHoje} defeitos`,
  );
  atualizarKPI(
    "kpi-media-diaria",
    dadosProducao.mediaDiaria || "0",
    "média da semana",
  );

  // Funcionários
  atualizarKPI("kpi-funcionarios", dadosFunc.funcAtivos, "cadastrados");
  const ocupacaoEl = document.getElementById("kpi-ocupacao");
  if (ocupacaoEl) {
    ocupacaoEl.textContent = dadosFunc.taxaOcupacao + "%";
    ocupacaoEl.style.color =
      dadosFunc.taxaOcupacao >= 70
        ? "var(--success)"
        : dadosFunc.taxaOcupacao >= 40
          ? "var(--warning)"
          : "var(--error)";
  }

  // Qualidade
  const taxaDefEl = document.getElementById("kpi-taxa-defeitos");
  if (taxaDefEl) {
    taxaDefEl.textContent = dadosQualidade.taxaDefeitosMes + "%";
    taxaDefEl.style.color =
      parseFloat(dadosQualidade.taxaDefeitosMes) <= 5
        ? "var(--success)"
        : "var(--error)";
  }

  // Financeiro
  atualizarKPI(
    "kpi-saldo",
    formatCurrency(dadosFinanceiro.saldoMes),
    "saldo do mês",
  );
  atualizarKPI("kpi-contas-pagar", dadosFinanceiro.contasPagar, "lançamentos");
  atualizarKPI(
    "kpi-contas-receber",
    dadosFinanceiro.contasReceber,
    "lançamentos",
  );
  atualizarKPI(
    "kpi-lotes-atrasados",
    dadosOS.lotesAtrasados,
    dadosOS.lotesAtrasados > 0 ? "atenção!" : "tudo em dia",
  );

  const lotesAtrasadosEl = document.getElementById("kpi-lotes-atrasados");
  if (lotesAtrasadosEl && dadosOS.lotesAtrasados > 0) {
    lotesAtrasadosEl.style.color = "var(--error)";
  }
}

// ============================================================
// ATUALIZAR UM KPI INDIVIDUAL
// ============================================================
function atualizarKPI(id, valor, detalhe) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = valor;
    if (detalhe) {
      el.title = detalhe;
    }
  }
}

// ============================================================
// RENDERIZAR ALERTAS NO DASHBOARD
// ============================================================
function renderizarAlertas(alertas) {
  const container = document.getElementById("alertas-container");
  if (!container) return;

  if (!alertas || alertas.length === 0) {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header"><h3><i class="ph ph-bell"></i> Alertas</h3></div>
        <div class="panel-body" style="text-align: center; padding: 30px; color: var(--gray);">
          <i class="ph ph-check-circle" style="font-size: 2rem; color: var(--success); display: block; margin-bottom: 8px;"></i>
          Tudo em dia! Nenhum alerta no momento.
        </div>
      </div>
    `;
    return;
  }

  const alertasHTML = alertas
    .slice(0, 8)
    .map(
      (alerta) => `
      <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border-left: 3px solid ${alerta.cor}; margin-bottom: 6px;">
        <i class="ph ${alerta.icone}" style="color: ${alerta.cor}; font-size: 1.2rem; flex-shrink: 0;"></i>
        <span style="font-size: 0.85rem;">${alerta.mensagem}</span>
        ${alerta.prioridade === "alta" ? '<span style="font-size: 0.65rem; background: var(--error); color: white; padding: 2px 8px; border-radius: 10px; margin-left: auto;">URGENTE</span>' : ""}
      </div>
    `,
    )
    .join("");

  container.innerHTML = `
    <div class="panel" style="border: 1px solid rgba(255,255,255,0.08);">
      <div class="panel-header">
        <h3><i class="ph ph-bell"></i> Alertas</h3>
        <span style="font-size: 0.75rem; color: var(--gray);">${alertas.length} alerta(s)</span>
      </div>
      <div class="panel-body" style="max-height: 350px; overflow-y: auto;">
        ${alertasHTML}
      </div>
    </div>
  `;
}

// ============================================================
// CARREGAR GRÁFICO DE PRODUÇÃO SEMANAL
// ============================================================
async function carregarGraficoProducao(dadosProducaoSemana) {
  const ctx = document.getElementById("chartProducao")?.getContext("2d");
  if (!ctx) return;

  if (
    window.AppState?.chartProducao &&
    typeof window.AppState.chartProducao.destroy === "function"
  ) {
    window.AppState.chartProducao.destroy();
    window.AppState.chartProducao = null;
  }

  const chartProducao = new Chart(ctx, {
    type: "line",
    data: {
      labels: dadosProducaoSemana.labels,
      datasets: [
        {
          label: "Peças Costuradas",
          data: dadosProducaoSemana.values,
          borderColor: "#e91e63",
          backgroundColor: "rgba(233, 30, 99, 0.1)",
          fill: true,
          tension: 0.3,
          pointBackgroundColor: "#f0c75e",
          pointBorderColor: "#d4a017",
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: "y",
        },
        {
          label: "Defeitos",
          data: dadosProducaoSemana.defeitos,
          borderColor: "#ff5252",
          backgroundColor: "rgba(255, 82, 82, 0.1)",
          fill: true,
          tension: 0.3,
          pointBackgroundColor: "#ff8a80",
          pointBorderColor: "#ff5252",
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: "y",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          labels: { color: "#bbbbbb", usePointStyle: true, padding: 20 },
        },
        tooltip: {
          backgroundColor: "rgba(28, 28, 28, 0.95)",
          titleColor: "#f0c75e",
          bodyColor: "#f5f5f5",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: "#999" },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        y: {
          ticks: { color: "#999" },
          grid: { color: "rgba(255,255,255,0.05)" },
          beginAtZero: true,
        },
      },
    },
  });

  if (window.AppState) {
    window.AppState.chartProducao = chartProducao;
  }
}

// ============================================================
// CARREGAR ÚLTIMAS ORDENS DE SERVIÇO
// ============================================================
async function carregarUltimasOS() {
  const { data } = await supabase
    .from("service_orders")
    .select(
      `id, order_number, total_quantity, status, expected_delivery, customers(company_name, trade_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(5);

  const tbody = document.querySelector("#table-ultimas-os tbody");
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center" style="color: var(--gray);">Nenhuma OS cadastrada</td></tr>';
    return;
  }

  const hoje = new Date();

  tbody.innerHTML = data
    .map((os) => {
      const nomeCliente =
        os.customers?.trade_name || os.customers?.company_name || "-";
      const prazo = new Date(os.expected_delivery);
      const atrasado =
        prazo < hoje && !["entregue", "cancelado"].includes(os.status);

      return `
        <tr style="${atrasado ? "border-left: 2px solid var(--error);" : ""}" onclick="navigateTo('ordens-servico')" style="cursor: pointer;">
          <td>
            <strong style="color: var(--gold-light);">${os.order_number}</strong>
            ${atrasado ? '<br><span style="color: var(--error); font-size: 0.65rem;">⚠️ Atrasada</span>' : ""}
          </td>
          <td>${nomeCliente}</td>
          <td class="text-center">${os.total_quantity}</td>
          <td class="text-center">
            <span class="status-badge status-${os.status}">${formatStatus(os.status)}</span>
          </td>
          <td class="text-center">
            <span style="${atrasado ? "color: var(--error); font-weight: 600;" : ""}">
              ${formatDate(os.expected_delivery)}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ============================================================
// CARREGAR PRÓXIMOS VENCIMENTOS (CONTAS)
// ============================================================
async function carregarProximosVencimentos() {
  const hoje = todayISO();
  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 7);
  const futuroISO = futuro.toISOString().split("T")[0];

  // Busca transações financeiras próximas do vencimento
  const { data: transacoes } = await supabase
    .from("financial_transactions")
    .select(
      `description, amount, date, payment_method, chart_of_accounts(name)`,
    )
    .lt("amount", 0)
    .gte("date", hoje)
    .lte("date", futuroISO)
    .order("date", { ascending: true })
    .limit(5);

  // Busca obrigações contábeis próximas
  const { data: obrigacoes } = await supabase
    .from("accounting_checklist")
    .select("description, due_date, status")
    .neq("status", "concluido")
    .gte("due_date", hoje)
    .lte("due_date", futuroISO)
    .order("due_date", { ascending: true })
    .limit(5);

  const tbody = document.querySelector("#table-proximos-vencimentos tbody");
  if (!tbody) return;

  let html = "";

  const vencimentos = [];

  if (transacoes) {
    transacoes.forEach((t) => {
      vencimentos.push({
        data: t.date,
        descricao: t.description || t.chart_of_accounts?.name || "-",
        valor: formatCurrency(Math.abs(parseFloat(t.amount))),
        tipo: "conta",
      });
    });
  }

  if (obrigacoes) {
    obrigacoes.forEach((o) => {
      vencimentos.push({
        data: o.due_date,
        descricao: o.description,
        valor: "-",
        tipo: "obrigacao",
      });
    });
  }

  vencimentos.sort((a, b) => a.data.localeCompare(b.data));

  if (vencimentos.length === 0) {
    html =
      '<tr><td colspan="4" class="text-center" style="color: var(--gray);">Nenhum vencimento próximo</td></tr>';
  } else {
    html = vencimentos
      .slice(0, 5)
      .map((v) => {
        const dataVenc = new Date(v.data);
        const hojeDate = new Date();
        const diffDays = Math.ceil(
          (dataVenc - hojeDate) / (1000 * 60 * 60 * 24),
        );

        let corData = "var(--white)";
        if (diffDays === 0) corData = "var(--warning)";
        else if (diffDays < 0) corData = "var(--error)";
        else if (diffDays <= 2) corData = "var(--warning)";

        return `
        <tr>
          <td><span style="color: ${corData};">${formatDate(v.data)}</span></td>
          <td>${v.descricao}</td>
          <td class="text-right">${v.valor}</td>
          <td>${v.tipo === "obrigacao" ? "📋 Obrigação" : "💰 Conta"}</td>
        </tr>
      `;
      })
      .join("");
  }

  tbody.innerHTML = html;
}

// ============================================================
// EXPORTAÇÃO PARA O ESCOPO GLOBAL
// ============================================================
window.loadDashboard = loadDashboard;
