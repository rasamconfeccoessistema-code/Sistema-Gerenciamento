// ============================================================
// RELATORIOS.JS — VERSÃO COMPLETA E PROFISSIONAL
// Módulo de Relatórios e Indicadores
// Facção de Jeans - Sistema de Gestão
// ============================================================

// ============================================================
// CARREGAMENTO DA TELA DE RELATÓRIOS
// ============================================================
async function loadRelatorios() {
  const container = document.querySelector("#page-relatorios .panel-body");
  if (!container) return;

  container.innerHTML = `
    <div style="display: grid; gap: 24px;">

      <!-- SEÇÃO: RELATÓRIOS FINANCEIROS -->
      <div>
        <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: var(--gold-light);">
          <i class="ph ph-currency-circle-dollar" style="font-size: 1.2rem; vertical-align: middle; margin-right: 6px;"></i> Relatórios Financeiros
        </h3>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-primary" data-action="relatorio-dre-mensal">
            <i class="ph ph-chart-line"></i> DRE Mensal
          </button>
          <button class="btn btn-primary" data-action="relatorio-fluxo-caixa">
            <i class="ph ph-arrows-left-right"></i> Fluxo de Caixa
          </button>
          <button class="btn btn-ghost" data-action="relatorio-faturamento-cliente">
            <i class="ph ph-users"></i> Faturamento por Cliente
          </button>
          <button class="btn btn-ghost" data-action="relatorio-despesas-categoria">
            <i class="ph ph-tag"></i> Despesas por Categoria
          </button>
          <button class="btn btn-ghost" data-action="relatorio-comparativo-mensal">
            <i class="ph ph-calendar"></i> Comparativo Mensal
          </button>
          <button class="btn btn-ghost" data-action="relatorio-margem-contribuicao">
            <i class="ph ph-percent"></i> Margem de Contribuição
          </button>
          <button class="btn btn-ghost" data-action="relatorio-margem-cliente">
            <i class="ph ph-chart-pie"></i> Margem por Cliente
          </button>
          <button class="btn btn-ghost" data-action="relatorio-inadimplencia">
            <i class="ph ph-warning-diamond"></i> Inadimplência
          </button>
          <button class="btn btn-ghost" data-action="relatorio-projecao-caixa">
            <i class="ph ph-graph"></i> Projeção de Caixa
          </button>
        </div>
      </div>

      <!-- SEÇÃO: RELATÓRIOS OPERACIONAIS -->
      <div>
        <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: var(--gold-light);">
          <i class="ph ph-sewing-needle" style="font-size: 1.2rem; vertical-align: middle; margin-right: 6px;"></i> Relatórios Operacionais
        </h3>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-primary" data-action="relatorio-producao">
            <i class="ph ph-chart-bar"></i> Produção por Período
          </button>
          <button class="btn btn-ghost" data-action="relatorio-producao-funcionario">
            <i class="ph ph-user"></i> Produção por Funcionário
          </button>
          <button class="btn btn-ghost" data-action="relatorio-producao-cliente">
            <i class="ph ph-buildings"></i> Produção por Cliente
          </button>
          <button class="btn btn-ghost" data-action="relatorio-rentabilidade-lotes">
            <i class="ph ph-money"></i> Rentabilidade por Lote
          </button>
          <button class="btn btn-ghost" data-action="relatorio-perdas-retrabalho">
            <i class="ph ph-warning-circle"></i> Perdas e Retrabalho
          </button>
          <button class="btn btn-ghost" data-action="relatorio-os-status">
            <i class="ph ph-list-checks"></i> OS por Status
          </button>
          <button class="btn btn-ghost" data-action="relatorio-horas-producao">
            <i class="ph ph-clock"></i> Horas x Produção
          </button>
          <button class="btn btn-ghost" data-action="relatorio-custo-materiais-os">
            <i class="ph ph-package"></i> Custo Materiais por OS
          </button>
        </div>
      </div>

      <!-- SEÇÃO: RELATÓRIOS ADMINISTRATIVOS -->
      <div>
        <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: var(--gold-light);">
          <i class="ph ph-users-three" style="font-size: 1.2rem; vertical-align: middle; margin-right: 6px;"></i> Relatórios Administrativos
        </h3>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-ghost" data-action="relatorio-funcionarios-ativos">
            <i class="ph ph-identification-card"></i> Funcionários Ativos
          </button>
          <button class="btn btn-ghost" data-action="relatorio-faltas">
            <i class="ph ph-calendar-x"></i> Faltas no Período
          </button>
          <button class="btn btn-ghost" data-action="relatorio-comissoes">
            <i class="ph ph-currency-dollar"></i> Comissões a Pagar
          </button>
          <button class="btn btn-ghost" data-action="relatorio-obrigacoes">
            <i class="ph ph-check-square"></i> Obrigações Contábeis
          </button>
          <button class="btn btn-ghost" data-action="relatorio-custo-funcionario">
            <i class="ph ph-address-book"></i> Custo por Funcionário
          </button>
          <button class="btn btn-ghost" data-action="relatorio-rotatividade">
            <i class="ph ph-arrows-left-right"></i> Rotatividade
          </button>
          <button class="btn btn-ghost" data-action="relatorio-resultado-periodo">
            <i class="ph ph-sliders"></i> Resultado por Período
          </button>
        </div>
      </div>

    </div>
  `;
}

// ============================================================
// FUNÇÕES AUXILIARES GERAIS
// ============================================================
function imprimirRelatorio() {
  window.print();
}

function exportarRelatorioExcel(tabelaId) {
  const tabela = document.querySelector(`#${tabelaId}`);
  if (!tabela) return;
  const rows = [];
  const headers = Array.from(tabela.querySelectorAll("thead th")).map((th) =>
    th.innerText.trim(),
  );
  rows.push(headers.join(";"));
  tabela.querySelectorAll("tbody tr").forEach((tr) => {
    const cols = Array.from(tr.querySelectorAll("td")).map(
      (td) => `"${td.innerText.replace(/\n/g, " ").trim()}"`,
    );
    rows.push(cols.join(";"));
  });
  const blob = new Blob(["\uFEFF" + rows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "relatorio.csv";
  a.click();
}

function adicionarBotoesExportacao(modalId, tabelaId) {
  const form = document.querySelector(`#${modalId} form, #dynamicForm`);
  if (!form) return;
  const btnBar = document.createElement("div");
  btnBar.style.cssText =
    "display:flex; gap:8px; margin-top:16px; justify-content:flex-end; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;";
  btnBar.innerHTML = `
    <button type="button" class="btn btn-ghost btn-sm" onclick="exportarRelatorioExcel('${tabelaId}')"><i class="ph ph-download-simple"></i> CSV</button>
    <button type="button" class="btn btn-ghost btn-sm" onclick="imprimirRelatorio()"><i class="ph ph-printer"></i> Imprimir</button>
  `;
  form.appendChild(btnBar);
}

function badgeValor(valor, tipo) {
  const cor =
    tipo === "positivo"
      ? "var(--success)"
      : tipo === "negativo"
        ? "var(--error)"
        : "var(--warning)";
  const icone = tipo === "positivo" ? "📈" : tipo === "negativo" ? "📉" : "⚡";
  return `<span style="color:${cor}; font-weight:600;">${icone} ${valor}</span>`;
}

function cardResumo(titulo, valor, cor, icone, subtitulo) {
  return `
    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px; text-align:center; flex:1; min-width:120px;">
      <div style="font-size:1.5rem; margin-bottom:4px; color:${cor};"><i class="ph ${icone}"></i></div>
      <div style="font-size:0.7rem; text-transform:uppercase; color:var(--gray); margin-bottom:4px;">${titulo}</div>
      <div style="font-size:1.3rem; font-weight:700; color:var(--white);">${valor}</div>
      ${subtitulo ? `<div style="font-size:0.65rem; color:var(--gray); margin-top:2px;">${subtitulo}</div>` : ""}
    </div>
  `;
}

function secaoTitulo(icone, titulo, cor) {
  return `<h4 style="color:${cor}; margin:16px 0 8px 0; display:flex; align-items:center; gap:8px; font-size:0.9rem;"><i class="ph ${icone}" style="font-size:1.2rem;"></i> ${titulo}</h4>`;
}

// ============================================================
// RELATÓRIO: DRE MENSAL
// ============================================================
async function relatorioDREMensal() {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const primeiroDia = `${mesAtual}-01`;
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: transacoes } = await supabase
    .from("financial_transactions")
    .select(`amount, description, date, chart_of_accounts(code, name, type)`)
    .gte("date", primeiroDia)
    .lte("date", ultimoDia)
    .order("date", { ascending: true });

  const totais = {
    receita: 0,
    despesa: 0,
    custo_direto: 0,
    custo_indireto: 0,
    imposto: 0,
    investimento: 0,
  };
  const detalhes = {
    receita: [],
    despesa: [],
    custo_direto: [],
    custo_indireto: [],
    imposto: [],
    investimento: [],
  };

  if (transacoes) {
    transacoes.forEach((t) => {
      const tipo = t.chart_of_accounts?.type || "despesa";
      const valor = parseFloat(t.amount);
      totais[tipo] = (totais[tipo] || 0) + Math.abs(valor);
      if (detalhes[tipo])
        detalhes[tipo].push({
          descricao: t.description || "-",
          valor: Math.abs(valor),
          data: t.date,
          conta: t.chart_of_accounts?.name || "-",
        });
    });
  }

  const receitaTotal = totais.receita || 0;
  const despesasTotal = (totais.despesa || 0) + (totais.imposto || 0);
  const custosDiretos = totais.custo_direto || 0;
  const custosIndiretos = totais.custo_indireto || 0;
  const resultado =
    receitaTotal - custosDiretos - custosIndiretos - despesasTotal;
  const margemContribuicao = receitaTotal - custosDiretos;
  const pctMargem =
    receitaTotal > 0
      ? ((margemContribuicao / receitaTotal) * 100).toFixed(1)
      : "0";
  const nomeMes = capitalizeFirst(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleDateString(
      "pt-BR",
      { month: "long", year: "numeric" },
    ),
  );

  const renderizarLinhas = (itens) => {
    if (!itens || itens.length === 0)
      return '<tr><td colspan="3" style="color:var(--gray); padding:12px;">Nenhum lançamento</td></tr>';
    return itens
      .map(
        (item) =>
          `<tr><td>${formatDate(item.data)}</td><td>${item.descricao}</td><td class="text-right" style="font-weight:500;">${formatCurrency(item.valor)}</td></tr>`,
      )
      .join("");
  };

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(212,160,23,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(212,160,23,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--gold-light);"><i class="ph ph-chart-line"></i></div>
        <div><h3 style="margin:0; color:var(--gold-light);">DRE • ${nomeMes}</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Demonstração do Resultado do Exercício</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Receita Bruta", formatCurrency(receitaTotal), "var(--success)", "ph-trend-up", `${detalhes.receita.length} lançamentos`)}
        ${cardResumo("Custos Diretos", formatCurrency(custosDiretos), "var(--error)", "ph-scissors", "variáveis")}
        ${cardResumo("Desp. + Custos Fixos", formatCurrency(custosIndiretos + despesasTotal), "var(--error)", "ph-buildings", "fixos")}
      </div>

      ${secaoTitulo("ph-arrow-circle-up", "Receitas", "var(--success)")}
      <div style="overflow-x:auto;"><table class="table" id="tabela-dre-receitas"><thead><tr><th>Data</th><th>Descrição</th><th style="text-align:right;">Valor</th></tr></thead><tbody>${renderizarLinhas(detalhes.receita)}</tbody><tfoot><tr style="font-weight:700; background:rgba(76,175,80,0.08);"><td colspan="2">Total Receitas</td><td class="text-right" style="color:var(--success);">${formatCurrency(receitaTotal)}</td></tr></tfoot></table></div>

      ${secaoTitulo("ph-arrow-circle-down", "Custos e Despesas", "var(--error)")}
      <div style="overflow-x:auto;"><table class="table" id="tabela-dre-custos"><thead><tr><th>Data</th><th>Descrição</th><th style="text-align:right;">Valor</th></tr></thead><tbody>${renderizarLinhas([...detalhes.custo_direto, ...detalhes.custo_indireto, ...detalhes.despesa, ...detalhes.imposto])}</tbody><tfoot><tr style="font-weight:700; background:rgba(255,82,82,0.08);"><td colspan="2">Total Custos + Despesas</td><td class="text-right" style="color:var(--error);">${formatCurrency(custosDiretos + custosIndiretos + despesasTotal)}</td></tr></tfoot></table></div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="background:${margemContribuicao >= 0 ? "rgba(76,175,80,0.06)" : "rgba(255,82,82,0.06)"}; border:1px solid ${margemContribuicao >= 0 ? "rgba(76,175,80,0.2)" : "rgba(255,82,82,0.2)"}; border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:0.7rem; color:var(--gray); text-transform:uppercase;">Margem de Contribuição</div>
          <div style="font-size:1.3rem; font-weight:700; color:${margemContribuicao >= 0 ? "var(--success)" : "var(--error)"};">${formatCurrency(margemContribuicao)}</div>
          <div style="font-size:0.7rem; color:var(--gray);">${pctMargem}%</div>
        </div>
        <div style="background:${resultado >= 0 ? "rgba(76,175,80,0.08)" : "rgba(255,82,82,0.08)"}; border:1px solid ${resultado >= 0 ? "rgba(76,175,80,0.3)" : "rgba(255,82,82,0.3)"}; border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:0.7rem; color:var(--gray); text-transform:uppercase;">Resultado Líquido</div>
          <div style="font-size:1.5rem; font-weight:700; color:${resultado >= 0 ? "var(--success)" : "var(--error)"};">${resultado >= 0 ? "" : "-"}${formatCurrency(Math.abs(resultado))}</div>
          <div style="font-size:0.7rem; color:var(--gray);">${resultado >= 0 ? "📈 Lucro" : "📉 Prejuízo"}</div>
        </div>
      </div>
    </div>
  `;

  openFormModalCustom(`📊 DRE • ${nomeMes}`, html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-dre-receitas");
}

// ============================================================
// RELATÓRIO: FLUXO DE CAIXA
// ============================================================
async function relatorioFluxoCaixa() {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const primeiroDia = `${mesAtual}-01`;
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: transacoes } = await supabase
    .from("financial_transactions")
    .select("date, description, amount, payment_method")
    .gte("date", primeiroDia)
    .lte("date", ultimoDia)
    .order("date", { ascending: true });

  let saldoAcumulado = 0;
  const linhas =
    transacoes && transacoes.length > 0
      ? transacoes
          .map((t) => {
            const valor = parseFloat(t.amount);
            saldoAcumulado += valor;
            const isEntrada = valor >= 0;
            return `<tr>
          <td>${formatDate(t.date)}</td>
          <td>${t.description || "-"}</td>
          <td style="color:${isEntrada ? "var(--success)" : "var(--error)"}; font-weight:500;">${isEntrada ? "+" : "-"}${formatCurrency(Math.abs(valor))}</td>
          <td>${t.payment_method || "-"}</td>
          <td style="color:${saldoAcumulado >= 0 ? "var(--success)" : "var(--error)"}; font-weight:600;">${formatCurrency(saldoAcumulado)}</td>
        </tr>`;
          })
          .join("")
      : '<tr><td colspan="5" style="color:var(--gray); padding:20px; text-align:center;">Nenhum lançamento no mês</td></tr>';

  const nomeMes = capitalizeFirst(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleDateString(
      "pt-BR",
      { month: "long", year: "numeric" },
    ),
  );

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(33,150,243,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(33,150,243,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#64b5f6;"><i class="ph ph-arrows-left-right"></i></div>
        <div><h3 style="margin:0; color:#64b5f6;">Fluxo de Caixa • ${nomeMes}</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Movimentação diária com saldo acumulado</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Saldo Final", formatCurrency(saldoAcumulado), saldoAcumulado >= 0 ? "var(--success)" : "var(--error)", "ph-wallet", "no fim do mês")}
        ${cardResumo("Transações", transacoes?.length || 0, "#64b5f6", "ph-list-numbers", "no período")}
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-fluxo"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Forma</th><th>Saldo</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr style="font-weight:700; background:rgba(255,255,255,0.03);"><td colspan="4">Saldo Final do Mês</td><td style="color:${saldoAcumulado >= 0 ? "var(--success)" : "var(--error)"};">${formatCurrency(saldoAcumulado)}</td></tr></tfoot></table>
      </div>
    </div>
  `;

  openFormModalCustom("💵 Fluxo de Caixa", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-fluxo");
}

// ============================================================
// RELATÓRIO: FATURAMENTO POR CLIENTE
// ============================================================
async function relatorioFaturamentoCliente() {
  const hoje = new Date();
  const primeiroDia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: osEntregues } = await supabase
    .from("service_orders")
    .select(
      `id, order_number, total_quantity, unit_price, customers(company_name, trade_name)`,
    )
    .eq("status", "entregue")
    .gte("updated_at", primeiroDia)
    .lte("updated_at", ultimoDia);

  const faturamentoPorCliente = {};
  if (osEntregues) {
    osEntregues.forEach((os) => {
      const cliente =
        os.customers?.trade_name || os.customers?.company_name || "Sem cliente";
      const valor = os.total_quantity * os.unit_price;
      if (!faturamentoPorCliente[cliente])
        faturamentoPorCliente[cliente] = { valor: 0, lotes: 0, pecas: 0 };
      faturamentoPorCliente[cliente].valor += valor;
      faturamentoPorCliente[cliente].lotes += 1;
      faturamentoPorCliente[cliente].pecas += os.total_quantity;
    });
  }

  const ordenado = Object.entries(faturamentoPorCliente).sort(
    (a, b) => b[1].valor - a[1].valor,
  );
  const totalGeral = ordenado.reduce((sum, [, dados]) => sum + dados.valor, 0);

  const linhas =
    ordenado.length > 0
      ? ordenado
          .map(
            ([cliente, dados], index) => `<tr>
        <td><span style="display:inline-flex; align-items:center; gap:8px;"><span style="width:24px; height:24px; background:rgba(212,160,23,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:0.7rem; color:var(--gold-light);">${index + 1}</span> <strong>${cliente}</strong></span></td>
        <td class="text-center">${dados.lotes}</td>
        <td class="text-center">${dados.pecas}</td>
        <td class="text-right" style="font-weight:500;">${formatCurrency(dados.valor)}</td>
        <td class="text-right">${totalGeral > 0 ? ((dados.valor / totalGeral) * 100).toFixed(1) : "0"}%</td>
      </tr>`,
          )
          .join("")
      : '<tr><td colspan="5" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma OS entregue no mês</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(212,160,23,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(212,160,23,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--gold-light);"><i class="ph ph-users"></i></div>
        <div><h3 style="margin:0; color:var(--gold-light);">Faturamento por Cliente</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Mês atual</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Total Faturado", formatCurrency(totalGeral), "var(--success)", "ph-currency-circle-dollar", `${ordenado.length} clientes`)}
        ${cardResumo("Lotes Entregues", osEntregues?.length || 0, "var(--gold-light)", "ph-package", "no mês")}
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-fat-cliente"><thead><tr><th>Cliente</th><th style="text-align:center;">Lotes</th><th style="text-align:center;">Peças</th><th style="text-align:right;">Valor</th><th style="text-align:right;">%</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr style="font-weight:700; background:rgba(255,255,255,0.03);"><td colspan="3">Total</td><td style="text-align:right;">${formatCurrency(totalGeral)}</td><td style="text-align:right;">100%</td></tr></tfoot></table>
      </div>
    </div>
  `;

  openFormModalCustom("🏢 Faturamento por Cliente", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-fat-cliente");
}

// ============================================================
// RELATÓRIO: PRODUÇÃO POR PERÍODO
// ============================================================
async function relatorioProducao() {
  const hoje = new Date();
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const { data: records } = await supabase
    .from("sewing_records")
    .select(
      `pieces_sewn, defects, start_time, employees(full_name), service_order_items(service_orders(order_number, product_description, customers(company_name, trade_name)))`,
    )
    .gte("start_time", seteDiasAtras.toISOString())
    .lte("start_time", hoje.toISOString())
    .order("start_time", { ascending: false });

  let totalPecas = 0,
    totalDefeitos = 0;
  const porDia = {};
  if (records) {
    records.forEach((r) => {
      const dia = r.start_time.split("T")[0];
      if (!porDia[dia]) porDia[dia] = { pecas: 0, defeitos: 0 };
      porDia[dia].pecas += r.pieces_sewn;
      porDia[dia].defeitos += r.defects || 0;
      totalPecas += r.pieces_sewn;
      totalDefeitos += r.defects || 0;
    });
  }

  const linhas =
    Object.entries(porDia).length > 0
      ? Object.entries(porDia)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(
            ([dia, dados]) =>
              `<tr><td>${formatDate(dia)}</td><td class="text-center" style="font-weight:500;">${dados.pecas}</td><td class="text-center" style="color:${dados.defeitos > 0 ? "var(--warning)" : "var(--gray)"};">${dados.defeitos}</td><td class="text-center">${dados.pecas > 0 ? ((dados.defeitos / dados.pecas) * 100).toFixed(1) : "0"}%</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="4" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma produção no período</td></tr>';

  const mediaDiaria =
    Object.keys(porDia).length > 0
      ? Math.round(totalPecas / Object.keys(porDia).length)
      : 0;
  const taxaDefeitos =
    totalPecas > 0 ? ((totalDefeitos / totalPecas) * 100).toFixed(1) : "0";

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(233,30,99,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(233,30,99,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--pink-light);"><i class="ph ph-chart-bar"></i></div>
        <div><h3 style="margin:0; color:var(--pink-light);">Produção • Últimos 7 dias</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Resumo diário de peças costuradas</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Total Peças", totalPecas, "var(--gold-light)", "ph-sewing-needle", "costuradas")}
        ${cardResumo("Total Defeitos", totalDefeitos, totalDefeitos > 0 ? "var(--error)" : "var(--success)", "ph-warning-circle", "encontrados")}
        ${cardResumo("Taxa de Defeitos", `${taxaDefeitos}%`, parseFloat(taxaDefeitos) > 5 ? "var(--error)" : "var(--success)", "ph-percent", "sobre o total")}
        ${cardResumo("Média Diária", mediaDiaria, "var(--gold-light)", "ph-trend-up", "peças/dia")}
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-producao"><thead><tr><th>Dia</th><th style="text-align:center;">Peças</th><th style="text-align:center;">Defeitos</th><th style="text-align:center;">Taxa</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("🧵 Produção por Período", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-producao");
}

// ============================================================
// RELATÓRIO: PRODUÇÃO POR FUNCIONÁRIO
// ============================================================
async function relatorioProducaoFuncionario() {
  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const { data: records } = await supabase
    .from("sewing_records")
    .select(`pieces_sewn, defects, employee_id, employees(full_name)`)
    .gte("start_time", trintaDiasAtras.toISOString())
    .lte("start_time", hoje.toISOString());

  const porFuncionario = {};
  if (records) {
    records.forEach((r) => {
      const nome = r.employees?.full_name || "Desconhecido";
      if (!porFuncionario[nome])
        porFuncionario[nome] = { pecas: 0, defeitos: 0 };
      porFuncionario[nome].pecas += r.pieces_sewn;
      porFuncionario[nome].defeitos += r.defects || 0;
    });
  }

  const ordenado = Object.entries(porFuncionario).sort(
    (a, b) => b[1].pecas - a[1].pecas,
  );
  const linhas =
    ordenado.length > 0
      ? ordenado
          .map(([nome, dados], index) => {
            const taxa =
              dados.pecas > 0
                ? ((dados.defeitos / dados.pecas) * 100).toFixed(1)
                : "0";
            const medalha =
              index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
            const corTaxa =
              parseFloat(taxa) > 5 ? "var(--error)" : "var(--success)";
            return `<tr>
          <td>${medalha} <strong>${nome}</strong></td>
          <td class="text-center" style="font-weight:500;">${dados.pecas}</td>
          <td class="text-center">${dados.defeitos}</td>
          <td class="text-center" style="color:${corTaxa}; font-weight:500;">${taxa}%</td>
        </tr>`;
          })
          .join("")
      : '<tr><td colspan="4" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma produção no período</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(233,30,99,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(233,30,99,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--pink-light);"><i class="ph ph-user"></i></div>
        <div><h3 style="margin:0; color:var(--pink-light);">Produção por Funcionário</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Últimos 30 dias</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Total Funcionários", ordenado.length, "var(--gold-light)", "ph-users-three", "com produção")}
        ${cardResumo("Maior Produtor", ordenado[0]?.[0] || "-", "var(--success)", "ph-trophy", ordenado[0] ? `${ordenado[0][1].pecas} peças` : "")}
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-prod-func"><thead><tr><th>Funcionário</th><th style="text-align:center;">Peças</th><th style="text-align:center;">Defeitos</th><th style="text-align:center;">Taxa</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("👥 Produção por Funcionário", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-prod-func");
}

// ============================================================
// RELATÓRIO: OS POR STATUS
// ============================================================
async function relatorioOSStatus() {
  const { data: ordens } = await supabase
    .from("service_orders")
    .select(
      "status, order_number, product_description, expected_delivery, customers(company_name, trade_name)",
    )
    .order("expected_delivery", { ascending: true });

  const porStatus = {};
  if (ordens)
    ordens.forEach((os) => {
      if (!porStatus[os.status]) porStatus[os.status] = [];
      porStatus[os.status].push(os);
    });

  const coresStatus = {
    recebido: "rgba(255,255,255,0.1)",
    em_costura: "rgba(33,150,243,0.1)",
    costurado: "rgba(76,175,80,0.1)",
    em_revisao: "rgba(255,193,7,0.1)",
    entregue: "rgba(212,160,23,0.1)",
    cancelado: "rgba(255,82,82,0.1)",
    parcialmente_entregue: "rgba(156,39,176,0.1)",
  };

  let html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(212,160,23,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(212,160,23,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--gold-light);"><i class="ph ph-list-checks"></i></div>
        <div><h3 style="margin:0; color:var(--gold-light);">Ordens de Serviço por Status</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Visão geral do pipeline de produção</p></div>
      </div>
  `;

  for (const [status, lista] of Object.entries(porStatus)) {
    html += `
      <div style="background:${coresStatus[status] || "rgba(255,255,255,0.02)"}; border-radius:12px; padding:16px; border-left:3px solid var(--gold-light);">
        <h4 style="margin:0 0 8px 0; display:flex; align-items:center; gap:8px;">
          <span class="status-badge status-${status}">${formatStatus(status)}</span>
          <span style="font-size:0.8rem; color:var(--gray);">(${lista.length} OS)</span>
        </h4>
        <div style="overflow-x:auto;">
          <table class="table"><thead><tr><th>OS</th><th>Cliente</th><th>Produto</th><th>Prazo</th></tr></thead><tbody>
            ${lista.map((os) => `<tr><td><strong style="color:var(--gold-light);">${os.order_number}</strong></td><td>${os.customers?.trade_name || os.customers?.company_name || "-"}</td><td>${os.product_description || "-"}</td><td>${formatDate(os.expected_delivery)}</td></tr>`).join("")}
          </tbody></table>
        </div>
      </div>
    `;
  }

  html += `</div>`;

  openFormModalCustom("📋 OS por Status", html, () => {}, "90%");
}

// ============================================================
// RELATÓRIO: DESPESAS POR CATEGORIA
// ============================================================
async function relatorioDespesasCategoria() {
  const hoje = new Date();
  const primeiroDia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: transacoes } = await supabase
    .from("financial_transactions")
    .select("amount, chart_of_accounts(name, type)")
    .gte("date", primeiroDia)
    .lte("date", ultimoDia)
    .lt("amount", 0);

  const porCategoria = {};
  let totalDespesas = 0;
  if (transacoes) {
    transacoes.forEach((t) => {
      const categoria = t.chart_of_accounts?.name || "Sem categoria";
      const valor = Math.abs(parseFloat(t.amount));
      if (!porCategoria[categoria]) porCategoria[categoria] = 0;
      porCategoria[categoria] += valor;
      totalDespesas += valor;
    });
  }

  const ordenado = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  const linhas =
    ordenado.length > 0
      ? ordenado
          .map(([categoria, valor]) => {
            const pct =
              totalDespesas > 0
                ? ((valor / totalDespesas) * 100).toFixed(1)
                : "0";
            return `<tr>
          <td><strong>${categoria}</strong></td>
          <td class="text-right" style="font-weight:500;">${formatCurrency(valor)}</td>
          <td class="text-right">${pct}%</td>
          <td>
            <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; max-width:100px;">
              <div style="height:100%; width:${pct}%; background:var(--error); border-radius:3px;"></div>
            </div>
          </td>
        </tr>`;
          })
          .join("")
      : '<tr><td colspan="4" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma despesa no mês</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(255,82,82,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(255,82,82,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#ff8a80;"><i class="ph ph-tag"></i></div>
        <div><h3 style="margin:0; color:#ff8a80;">Despesas por Categoria</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Mês atual</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Total Despesas", formatCurrency(totalDespesas), "var(--error)", "ph-arrow-circle-down", `${ordenado.length} categorias`)}
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-desp-cat"><thead><tr><th>Categoria</th><th style="text-align:right;">Valor</th><th style="text-align:right;">%</th><th>Barra</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr style="font-weight:700; background:rgba(255,255,255,0.03);"><td>Total</td><td style="text-align:right;">${formatCurrency(totalDespesas)}</td><td style="text-align:right;">100%</td><td></td></tr></tfoot></table>
      </div>
    </div>
  `;

  openFormModalCustom("🏷️ Despesas por Categoria", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-desp-cat");
}

// ============================================================
// RELATÓRIO: COMPARATIVO MENSAL
// ============================================================
async function relatorioComparativoMensal() {
  const hoje = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push(
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  const dadosMensais = [];
  for (const mes of meses) {
    const primeiroDia = `${mes}-01`;
    const [ano, mesNum] = mes.split("-");
    const ultimoDia = new Date(parseInt(ano), parseInt(mesNum), 0)
      .toISOString()
      .split("T")[0];

    const { data: transacoes } = await supabase
      .from("financial_transactions")
      .select("amount, chart_of_accounts(type)")
      .gte("date", primeiroDia)
      .lte("date", ultimoDia);

    let receitas = 0,
      despesas = 0;
    if (transacoes) {
      transacoes.forEach((t) => {
        const tipo = t.chart_of_accounts?.type || "despesa";
        const valor = parseFloat(t.amount);
        if (tipo === "receita") receitas += Math.abs(valor);
        else despesas += Math.abs(valor);
      });
    }
    dadosMensais.push({
      mes: new Date(parseInt(ano), parseInt(mesNum) - 1, 1).toLocaleDateString(
        "pt-BR",
        { month: "short", year: "numeric" },
      ),
      receitas,
      despesas,
      resultado: receitas - despesas,
    });
  }

  const linhas = dadosMensais
    .map(
      (d) => `<tr>
    <td><strong>${capitalizeFirst(d.mes)}</strong></td>
    <td style="color:var(--success); font-weight:500;">${formatCurrency(d.receitas)}</td>
    <td style="color:var(--error); font-weight:500;">${formatCurrency(d.despesas)}</td>
    <td style="color:${d.resultado >= 0 ? "var(--success)" : "var(--error)"}; font-weight:600;">${d.resultado >= 0 ? "" : "-"}${formatCurrency(Math.abs(d.resultado))}</td>
  </tr>`,
    )
    .join("");

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(33,150,243,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(33,150,243,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#64b5f6;"><i class="ph ph-calendar"></i></div>
        <div><h3 style="margin:0; color:#64b5f6;">Comparativo Mensal</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Últimos 6 meses</p></div>
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-comparativo"><thead><tr><th>Mês</th><th style="text-align:right;">Receitas</th><th style="text-align:right;">Despesas</th><th style="text-align:right;">Resultado</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("📅 Comparativo Mensal", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-comparativo");
}

// ============================================================
// RELATÓRIO: FUNCIONÁRIOS ATIVOS
// ============================================================
async function relatorioFuncionariosAtivos() {
  const { data: funcionarios } = await supabase
    .from("employees")
    .select("*")
    .eq("active", true)
    .order("full_name");
  const linhas =
    funcionarios && funcionarios.length > 0
      ? funcionarios
          .map((f) => {
            const remuneracao =
              f.wage_type === "comissionado"
                ? `R$ ${f.commission_per_piece?.toFixed(2) || "0,00"} / peça`
                : f.wage_type === "misto"
                  ? `R$ ${f.monthly_salary?.toFixed(2) || "0,00"} + R$ ${f.commission_per_piece?.toFixed(2) || "0,00"} / pç`
                  : `R$ ${f.monthly_salary?.toFixed(2) || "0,00"}`;
            return `<tr><td><strong>${f.full_name}</strong></td><td>${f.role}</td><td>${formatarTipoContratacao(f.wage_type)}</td><td>${remuneracao}</td><td>${formatDate(f.admission_date)}</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="5" style="color:var(--gray); padding:20px; text-align:center;">Nenhum funcionário ativo</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(76,175,80,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(76,175,80,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#a5d6a7;"><i class="ph ph-identification-card"></i></div>
        <div><h3 style="margin:0; color:#a5d6a7;">Funcionários Ativos</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Total: ${funcionarios?.length || 0}</p></div>
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-func-ativos"><thead><tr><th>Nome</th><th>Função</th><th>Tipo</th><th>Remuneração</th><th>Admissão</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("🪪 Funcionários Ativos", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-func-ativos");
}

// ============================================================
// RELATÓRIO: FALTAS NO PERÍODO
// ============================================================
async function relatorioFaltas() {
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const { data: faltas } = await supabase
    .from("absences")
    .select(`date, type, notes, employees(full_name)`)
    .gte("date", trintaDiasAtras.toISOString().split("T")[0])
    .order("date", { ascending: false });

  const linhas =
    faltas && faltas.length > 0
      ? faltas
          .map(
            (f) =>
              `<tr><td><strong>${f.employees?.full_name || "-"}</strong></td><td>${formatDate(f.date)}</td><td>${formatarTipoFalta(f.type)}</td><td>${f.notes || "-"}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="4" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma falta no período</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(255,82,82,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(255,82,82,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#ff8a80;"><i class="ph ph-calendar-x"></i></div>
        <div><h3 style="margin:0; color:#ff8a80;">Faltas • Últimos 30 dias</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Total: ${faltas?.length || 0} faltas</p></div>
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-faltas"><thead><tr><th>Funcionário</th><th>Data</th><th>Tipo</th><th>Obs</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("❌ Faltas no Período", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-faltas");
}

// ============================================================
// RELATÓRIO: COMISSÕES A PAGAR
// ============================================================
async function relatorioComissoes() {
  const hoje = new Date();
  const primeiroDia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: records } = await supabase
    .from("sewing_records")
    .select(
      `pieces_sewn, employee_id, employees(full_name, commission_per_piece, wage_type)`,
    )
    .gte("start_time", primeiroDia)
    .lte("start_time", ultimoDia);

  const porFuncionario = {};
  if (records) {
    records.forEach((r) => {
      const nome = r.employees?.full_name || "Desconhecido";
      const comissao = parseFloat(r.employees?.commission_per_piece) || 0;
      const tipo = r.employees?.wage_type || "fixo";
      if (!porFuncionario[nome])
        porFuncionario[nome] = { pecas: 0, comissao, tipo, valorComissao: 0 };
      porFuncionario[nome].pecas += r.pieces_sewn;
    });
  }

  for (const [, dados] of Object.entries(porFuncionario)) {
    if (dados.tipo === "comissionado" || dados.tipo === "misto")
      dados.valorComissao = dados.pecas * dados.comissao;
  }

  const ordenado = Object.entries(porFuncionario).sort(
    ([, a], [, b]) => b.valorComissao - a.valorComissao,
  );
  const linhas =
    ordenado.length > 0
      ? ordenado
          .map(
            ([nome, dados]) =>
              `<tr><td><strong>${nome}</strong></td><td class="text-center">${dados.pecas}</td><td class="text-center">${formatCurrency(dados.comissao)}</td><td class="text-right" style="font-weight:600; color:var(--gold-light);">${formatCurrency(dados.valorComissao)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="4" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma produção no mês</td></tr>';

  const totalComissoes = Object.values(porFuncionario).reduce(
    (sum, d) => sum + d.valorComissao,
    0,
  );

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(212,160,23,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(212,160,23,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--gold-light);"><i class="ph ph-currency-dollar"></i></div>
        <div><h3 style="margin:0; color:var(--gold-light);">Comissões a Pagar</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Mês atual</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Total Comissões", formatCurrency(totalComissoes), "var(--warning)", "ph-money", `${ordenado.length} funcionários`)}
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-comissoes"><thead><tr><th>Funcionário</th><th style="text-align:center;">Peças</th><th style="text-align:center;">Comissão/Pç</th><th style="text-align:right;">Total a Pagar</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr style="font-weight:700; background:rgba(255,255,255,0.03);"><td colspan="3">Total de Comissões</td><td style="text-align:right;">${formatCurrency(totalComissoes)}</td></tr></tfoot></table>
      </div>
    </div>
  `;

  openFormModalCustom("💰 Comissões a Pagar", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-comissoes");
}

// ============================================================
// RELATÓRIO: OBRIGAÇÕES CONTÁBEIS
// ============================================================
async function relatorioObrigacoes() {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const { data: obrigacoes } = await supabase
    .from("accounting_checklist")
    .select("*")
    .eq("reference_month", mesAtual)
    .order("due_date", { ascending: true });

  const linhas =
    obrigacoes && obrigacoes.length > 0
      ? obrigacoes
          .map((o) => {
            const hojeDate = new Date();
            const vencimento = new Date(o.due_date + "T23:59:59");
            const atrasada = vencimento < hojeDate && o.status !== "concluido";
            return `<tr style="${atrasada ? "border-left:3px solid var(--error);" : ""}">
          <td><strong>${o.description}</strong> ${o.category ? `<br><span style="font-size:0.7rem; color:var(--gray);">${o.category}</span>` : ""}</td>
          <td>${formatDate(o.due_date)}</td>
          <td style="color:${o.status === "concluido" ? "var(--success)" : atrasada ? "var(--error)" : "var(--warning)"}; font-weight:600;">${o.status === "concluido" ? "✅ Concluído" : atrasada ? "🔴 Atrasado" : "🟡 Pendente"}</td>
          <td>${o.attachment_url ? '<span style="color:var(--success);">✅</span>' : '<span style="color:var(--gray);">❌</span>'}</td>
        </tr>`;
          })
          .join("")
      : '<tr><td colspan="4" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma obrigação cadastrada</td></tr>';

  const concluidas = obrigacoes
    ? obrigacoes.filter((o) => o.status === "concluido").length
    : 0;
  const total = obrigacoes ? obrigacoes.length : 0;
  const pctConcluido = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(156,39,176,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(156,39,176,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#ce93d8;"><i class="ph ph-check-square"></i></div>
        <div><h3 style="margin:0; color:#ce93d8;">Obrigações Contábeis</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Mês atual</p></div>
      </div>

      <div style="background:rgba(255,255,255,0.02); border-radius:12px; padding:16px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <span style="font-size:0.8rem; color:var(--gray);">Progresso:</span>
          <div style="flex:1; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
            <div style="height:100%; width:${pctConcluido}%; background:var(--success); border-radius:4px; transition:width 0.3s;"></div>
          </div>
          <span style="font-size:0.8rem; color:var(--gray);">${concluidas}/${total} (${pctConcluido}%)</span>
        </div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Total", total, "#ce93d8", "ph-calculator", "obrigações")}
        ${cardResumo("Concluídas", concluidas, "var(--success)", "ph-check-circle", "")}
        ${cardResumo("Pendentes", total - concluidas, "var(--warning)", "ph-hourglass", "")}
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-obrigacoes"><thead><tr><th>Obrigação</th><th>Vencimento</th><th>Status</th><th>Comprovante</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("📋 Obrigações Contábeis", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-obrigacoes");
}

// ============================================================
// RELATÓRIO: PERDAS E RETRABALHO
// ============================================================
async function relatorioPerdasRetrabalho() {
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const { data: inspecoes } = await supabase
    .from("quality_inspections")
    .select(
      `total_inspected, defects_found, defect_type, decision, inspection_date, sewing_records(service_order_items(service_orders(order_number, unit_price)))`,
    )
    .gte("inspection_date", trintaDiasAtras.toISOString())
    .order("inspection_date", { ascending: false });

  let totalInspecionado = 0,
    totalDefeitos = 0,
    totalRefugo = 0,
    totalRetrabalho = 0,
    prejuizoRefugo = 0;
  const defeitosPorTipo = {};
  if (inspecoes) {
    inspecoes.forEach((i) => {
      totalInspecionado += i.total_inspected || 0;
      totalDefeitos += i.defects_found || 0;
      if (i.decision === "refugo") {
        totalRefugo += i.defects_found || 0;
        const preco =
          i.sewing_records?.service_order_items?.service_orders?.unit_price ||
          0;
        prejuizoRefugo += (i.defects_found || 0) * preco;
      }
      if (i.decision === "retrabalhar") totalRetrabalho += i.defects_found || 0;
      if (i.defect_type) {
        const tipo = i.defect_type.toLowerCase().trim();
        if (!defeitosPorTipo[tipo]) defeitosPorTipo[tipo] = 0;
        defeitosPorTipo[tipo] += i.defects_found || 0;
      }
    });
  }
  const defeitosOrdenados = Object.entries(defeitosPorTipo).sort(
    (a, b) => b[1] - a[1],
  );

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(255,82,82,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(255,82,82,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#ff8a80;"><i class="ph ph-warning-circle"></i></div>
        <div><h3 style="margin:0; color:#ff8a80;">Perdas e Retrabalho</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Últimos 30 dias</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Total Inspecionado", totalInspecionado, "var(--gold-light)", "ph-magnifying-glass", "")}
        ${cardResumo("Defeitos", totalDefeitos, totalDefeitos > 0 ? "var(--warning)" : "var(--success)", "ph-warning", `${totalInspecionado > 0 ? ((totalDefeitos / totalInspecionado) * 100).toFixed(1) : "0"}%`)}
        ${cardResumo("Retrabalho", `${totalRetrabalho} peças`, "var(--warning)", "ph-arrows-counter-clockwise", "")}
        ${cardResumo("Refugo / Prejuízo", `${totalRefugo} pçs / ${formatCurrency(prejuizoRefugo)}`, "var(--error)", "ph-x-circle", "")}
      </div>

      <h4 style="font-size:0.9rem; margin:0;">Defeitos por Tipo</h4>
      <div style="overflow-x:auto;"><table class="table"><thead><tr><th>Tipo de Defeito</th><th style="text-align:center;">Ocorrências</th></tr></thead><tbody>${defeitosOrdenados.length > 0 ? defeitosOrdenados.map(([tipo, qtd]) => `<tr><td>${capitalizeFirst(tipo)}</td><td class="text-center" style="font-weight:500;">${qtd}</td></tr>`).join("") : '<tr><td colspan="2" style="color:var(--gray);">Nenhum defeito registrado</td></tr>'}</tbody></table></div>
    </div>
  `;

  openFormModalCustom("⚠️ Perdas e Retrabalho", html, () => {}, "90%");
}

// ============================================================
// RELATÓRIO: PRODUÇÃO POR CLIENTE
// ============================================================
async function relatorioProducaoCliente() {
  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const { data: records } = await supabase
    .from("sewing_records")
    .select(
      `pieces_sewn, service_order_items(service_orders(customers(company_name, trade_name)))`,
    )
    .gte("start_time", trintaDiasAtras.toISOString())
    .lte("start_time", hoje.toISOString());

  const porCliente = {};
  if (records) {
    records.forEach((r) => {
      const cliente =
        r.service_order_items?.service_orders?.customers?.trade_name ||
        r.service_order_items?.service_orders?.customers?.company_name ||
        "Desconhecido";
      if (!porCliente[cliente]) porCliente[cliente] = 0;
      porCliente[cliente] += r.pieces_sewn;
    });
  }

  const ordenado = Object.entries(porCliente).sort((a, b) => b[1] - a[1]);
  const totalPecas = ordenado.reduce((sum, [, pecas]) => sum + pecas, 0);
  const linhas =
    ordenado.length > 0
      ? ordenado
          .map(
            ([cliente, pecas]) =>
              `<tr><td><strong>${cliente}</strong></td><td class="text-center" style="font-weight:500;">${pecas}</td><td class="text-center">${totalPecas > 0 ? ((pecas / totalPecas) * 100).toFixed(1) : "0"}%</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="3" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma produção no período</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(233,30,99,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(233,30,99,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--pink-light);"><i class="ph ph-buildings"></i></div>
        <div><h3 style="margin:0; color:var(--pink-light);">Produção por Cliente</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Últimos 30 dias • Total: ${totalPecas} peças</p></div>
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-prod-cliente"><thead><tr><th>Cliente</th><th style="text-align:center;">Peças Costuradas</th><th style="text-align:center;">%</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr style="font-weight:700; background:rgba(255,255,255,0.03);"><td>Total</td><td style="text-align:center;">${totalPecas}</td><td style="text-align:center;">100%</td></tr></tfoot></table>
      </div>
    </div>
  `;

  openFormModalCustom("🏭 Produção por Cliente", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-prod-cliente");
}

// ============================================================
// RELATÓRIO: RENTABILIDADE POR LOTE
// ============================================================
async function relatorioRentabilidadeLotes() {
  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const { data: ordens } = await supabase
    .from("service_orders")
    .select(
      `order_number, product_description, total_quantity, unit_price, status, customers(company_name, trade_name)`,
    )
    .gte("created_at", trintaDiasAtras.toISOString())
    .order("created_at", { ascending: false });

  const linhas =
    ordens && ordens.length > 0
      ? ordens
          .map((os) => {
            const valorTotal = os.total_quantity * os.unit_price;
            return `<tr><td><strong style="color:var(--gold-light);">${os.order_number}</strong></td><td>${os.customers?.trade_name || os.customers?.company_name || "-"}</td><td>${os.product_description || "-"}</td><td class="text-center">${os.total_quantity}</td><td class="text-right">${formatCurrency(os.unit_price)}</td><td class="text-right" style="font-weight:600;">${formatCurrency(valorTotal)}</td><td class="text-center"><span class="status-badge status-${os.status}">${formatStatus(os.status)}</span></td></tr>`;
          })
          .join("")
      : '<tr><td colspan="7" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma OS no período</td></tr>';

  const totalFaturamento = ordens
    ? ordens.reduce((sum, os) => sum + os.total_quantity * os.unit_price, 0)
    : 0;

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(212,160,23,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(212,160,23,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--gold-light);"><i class="ph ph-money"></i></div>
        <div><h3 style="margin:0; color:var(--gold-light);">Rentabilidade por Lote</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Últimos 30 dias • Total: ${formatCurrency(totalFaturamento)}</p></div>
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-rentabilidade"><thead><tr><th>OS</th><th>Cliente</th><th>Produto</th><th style="text-align:center;">Peças</th><th style="text-align:right;">Preço Un.</th><th style="text-align:right;">Valor Total</th><th style="text-align:center;">Status</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr style="font-weight:700; background:rgba(255,255,255,0.03);"><td colspan="5">Faturamento Total no Período</td><td style="text-align:right;">${formatCurrency(totalFaturamento)}</td><td></td></tr></tfoot></table>
      </div>
    </div>
  `;

  openFormModalCustom("💵 Rentabilidade por Lote", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-rentabilidade");
}

// ============================================================
// NOVOS RELATÓRIOS: MARGEM DE CONTRIBUIÇÃO, MARGEM POR CLIENTE,
// INADIMPLÊNCIA, PROJEÇÃO DE CAIXA, HORAS X PRODUÇÃO,
// CUSTO MATERIAIS POR OS, CUSTO POR FUNCIONÁRIO, ROTATIVIDADE,
// RESULTADO POR PERÍODO CUSTOMIZÁVEL
// ============================================================
async function relatorioMargemContribuicao() {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const primeiroDia = `${mesAtual}-01`;
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: transacoes } = await supabase
    .from("financial_transactions")
    .select("amount, chart_of_accounts(type, name)")
    .gte("date", primeiroDia)
    .lte("date", ultimoDia);

  let receita = 0,
    custosVariaveis = 0,
    custosFixos = 0;
  if (transacoes) {
    transacoes.forEach((t) => {
      const tipo = t.chart_of_accounts?.type || "despesa";
      const valor = Math.abs(parseFloat(t.amount));
      if (tipo === "receita") receita += valor;
      else if (tipo === "custo_direto") custosVariaveis += valor;
      else custosFixos += valor;
    });
  }

  const margemContribuicao = receita - custosVariaveis;
  const resultadoLiquido = margemContribuicao - custosFixos;
  const pctMargem =
    receita > 0 ? ((margemContribuicao / receita) * 100).toFixed(1) : "0";
  const nomeMes = capitalizeFirst(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleDateString(
      "pt-BR",
      { month: "long", year: "numeric" },
    ),
  );

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(76,175,80,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(76,175,80,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#a5d6a7;"><i class="ph ph-percent"></i></div>
        <div><h3 style="margin:0; color:#a5d6a7;">Margem de Contribuição • ${nomeMes}</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Análise de rentabilidade operacional</p></div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:20px; text-align:center;">
          <div style="font-size:0.7rem; color:var(--gray); text-transform:uppercase;">Receita Total</div>
          <div style="font-size:1.5rem; font-weight:700; color:var(--gold-light); margin:4px 0;">${formatCurrency(receita)}</div>
        </div>
        <div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:20px; text-align:center;">
          <div style="font-size:0.7rem; color:var(--gray); text-transform:uppercase;">Margem de Contribuição</div>
          <div style="font-size:1.5rem; font-weight:700; color:${margemContribuicao >= 0 ? "var(--success)" : "var(--error)"}; margin:4px 0;">${formatCurrency(margemContribuicao)}</div>
          <div style="font-size:0.7rem; color:var(--gray);">${pctMargem}%</div>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="background:rgba(255,82,82,0.05); border-radius:8px; padding:16px; text-align:center;">
          <div style="font-size:0.7rem; color:var(--gray);">(-) Custos Variáveis</div>
          <div style="font-size:1.2rem; font-weight:700; color:var(--error);">${formatCurrency(custosVariaveis)}</div>
        </div>
        <div style="background:rgba(255,82,82,0.05); border-radius:8px; padding:16px; text-align:center;">
          <div style="font-size:0.7rem; color:var(--gray);">(-) Custos Fixos</div>
          <div style="font-size:1.2rem; font-weight:700; color:var(--error);">${formatCurrency(custosFixos)}</div>
        </div>
      </div>
      <div style="background:${resultadoLiquido >= 0 ? "rgba(76,175,80,0.08)" : "rgba(255,82,82,0.08)"}; border-radius:12px; padding:20px; text-align:center;">
        <div style="font-size:0.7rem; color:var(--gray); text-transform:uppercase;">(=) Resultado Líquido</div>
        <div style="font-size:1.5rem; font-weight:700; color:${resultadoLiquido >= 0 ? "var(--success)" : "var(--error)"}; margin:4px 0;">${formatCurrency(resultadoLiquido)}</div>
        <div style="font-size:0.7rem; color:var(--gray);">${resultadoLiquido >= 0 ? "📈 Lucro" : "📉 Prejuízo"}</div>
      </div>
    </div>
  `;

  openFormModalCustom("📊 Margem de Contribuição", html, () => {}, "90%");
}

async function relatorioMargemCliente() {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const primeiroDia = `${mesAtual}-01`;
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: osEntregues } = await supabase
    .from("service_orders")
    .select(
      `id, order_number, total_quantity, unit_price, customers(company_name, trade_name)`,
    )
    .eq("status", "entregue")
    .gte("updated_at", primeiroDia)
    .lte("updated_at", ultimoDia);

  const { data: transacoes } = await supabase
    .from("financial_transactions")
    .select("amount, chart_of_accounts(type)")
    .gte("date", primeiroDia)
    .lte("date", ultimoDia);

  let custoDiretoTotal = 0;
  if (transacoes)
    transacoes.forEach((t) => {
      if (t.chart_of_accounts?.type === "custo_direto")
        custoDiretoTotal += Math.abs(parseFloat(t.amount));
    });

  const totalPecas = osEntregues
    ? osEntregues.reduce((s, o) => s + o.total_quantity, 0)
    : 0;
  const custoPorPeca = totalPecas > 0 ? custoDiretoTotal / totalPecas : 0;

  const margemPorCliente = {};
  if (osEntregues) {
    osEntregues.forEach((os) => {
      const cliente =
        os.customers?.trade_name || os.customers?.company_name || "Sem cliente";
      const receita = os.total_quantity * os.unit_price;
      const custoEstimado = os.total_quantity * custoPorPeca;
      if (!margemPorCliente[cliente])
        margemPorCliente[cliente] = { receita: 0, custo: 0, lotes: 0 };
      margemPorCliente[cliente].receita += receita;
      margemPorCliente[cliente].custo += custoEstimado;
      margemPorCliente[cliente].lotes += 1;
    });
  }

  const ordenado = Object.entries(margemPorCliente).sort(
    (a, b) => b[1].receita - b[1].custo - (a[1].receita - a[1].custo),
  );
  const linhas =
    ordenado.length > 0
      ? ordenado
          .map(([cliente, dados]) => {
            const margem = dados.receita - dados.custo;
            const pct =
              dados.receita > 0
                ? ((margem / dados.receita) * 100).toFixed(1)
                : "0";
            return `<tr><td><strong>${cliente}</strong></td><td class="text-center">${dados.lotes}</td><td class="text-right">${formatCurrency(dados.receita)}</td><td class="text-right">${formatCurrency(dados.custo)}</td><td class="text-right" style="color:${margem >= 0 ? "var(--success)" : "var(--error)"}; font-weight:600;">${formatCurrency(margem)}</td><td class="text-right">${pct}%</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="6" style="color:var(--gray); padding:20px; text-align:center;">Nenhum dado no período</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(212,160,23,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(212,160,23,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--gold-light);"><i class="ph ph-chart-pie"></i></div>
        <div><h3 style="margin:0; color:var(--gold-light);">Margem Estimada por Cliente</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Custo por peça: ${formatCurrency(custoPorPeca)}</p></div>
      </div>
      <div style="overflow-x:auto;">
        <table class="table" id="tabela-margem-cliente"><thead><tr><th>Cliente</th><th style="text-align:center;">Lotes</th><th style="text-align:right;">Receita</th><th style="text-align:right;">Custo Est.</th><th style="text-align:right;">Margem</th><th style="text-align:right;">%</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("🥧 Margem por Cliente", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-margem-cliente");
}

async function relatorioInadimplencia() {
  const hoje = todayISO();
  const { data: transacoes } = await supabase
    .from("financial_transactions")
    .select("description, amount, due_date, payment_method")
    .eq("type", "receber")
    .eq("status", "pendente")
    .lt("due_date", hoje)
    .order("due_date", { ascending: true });

  const linhas =
    transacoes && transacoes.length > 0
      ? transacoes
          .map((t) => {
            const diasAtraso = Math.ceil(
              (new Date() - new Date(t.due_date)) / (1000 * 60 * 60 * 24),
            );
            return `<tr><td>${t.description || "-"}</td><td>${formatDate(t.due_date)}</td><td style="color:var(--error); font-weight:600;">${diasAtraso} dias</td><td class="text-right" style="font-weight:600;">${formatCurrency(Math.abs(t.amount))}</td><td>${t.payment_method || "-"}</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="5" style="color:var(--gray); padding:20px; text-align:center;">🎉 Nenhuma conta em atraso!</td></tr>';

  const totalInadimplencia = transacoes
    ? transacoes.reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0)
    : 0;

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(255,82,82,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(255,82,82,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#ff8a80;"><i class="ph ph-warning-diamond"></i></div>
        <div><h3 style="margin:0; color:#ff8a80;">Inadimplência</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Contas a receber vencidas</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Total Inadimplente", formatCurrency(totalInadimplencia), "var(--error)", "ph-currency-circle-dollar", `${transacoes?.length || 0} contas`)}
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-inadimplencia"><thead><tr><th>Descrição</th><th>Vencimento</th><th>Atraso</th><th style="text-align:right;">Valor</th><th>Forma</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("🚨 Inadimplência", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-inadimplencia");
}

async function relatorioProjecaoCaixa() {
  const hoje = todayISO();
  const futuro30 = new Date();
  futuro30.setDate(futuro30.getDate() + 30);
  const futuro30ISO = futuro30.toISOString().split("T")[0];

  const { data: contas } = await supabase
    .from("financial_transactions")
    .select("description, amount, due_date, type")
    .eq("status", "pendente")
    .lte("due_date", futuro30ISO)
    .order("due_date", { ascending: true });

  let saldoProjetado = 0;
  const linhas =
    contas && contas.length > 0
      ? contas
          .map((c) => {
            const valor = parseFloat(c.amount);
            saldoProjetado +=
              c.type === "receber" ? Math.abs(valor) : -Math.abs(valor);
            return `<tr><td>${formatDate(c.due_date)}</td><td>${c.description || "-"}</td><td style="color:${c.type === "receber" ? "var(--success)" : "var(--error)"}; font-weight:500;">${c.type === "receber" ? "+" : "-"}${formatCurrency(Math.abs(valor))}</td><td style="color:${saldoProjetado >= 0 ? "var(--success)" : "var(--error)"}; font-weight:600;">${formatCurrency(saldoProjetado)}</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="4" style="color:var(--gray); padding:20px; text-align:center;">Nenhuma conta pendente no período</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(33,150,243,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(33,150,243,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#64b5f6;"><i class="ph ph-graph"></i></div>
        <div><h3 style="margin:0; color:#64b5f6;">Projeção de Caixa • Próximos 30 dias</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Baseado nas contas pendentes</p></div>
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-projecao"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Valor</th><th>Saldo Projetado</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("📈 Projeção de Caixa", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-projecao");
}

async function relatorioHorasProducao() {
  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const { data: records } = await supabase
    .from("sewing_records")
    .select(
      `pieces_sewn, start_time, end_time, employee_id, employees(full_name)`,
    )
    .gte("start_time", trintaDiasAtras.toISOString())
    .lte("start_time", hoje.toISOString());

  const porFuncionario = {};
  if (records) {
    records.forEach((r) => {
      const nome = r.employees?.full_name || "Desconhecido";
      if (!porFuncionario[nome])
        porFuncionario[nome] = { pecas: 0, minutos: 0 };
      porFuncionario[nome].pecas += r.pieces_sewn;
      if (r.start_time && r.end_time) {
        const inicio = new Date(r.start_time),
          fim = new Date(r.end_time);
        porFuncionario[nome].minutos += (fim - inicio) / 60000;
      }
    });
  }

  const ordenado = Object.entries(porFuncionario).sort(
    (a, b) => b[1].pecas - a[1].pecas,
  );
  const linhas =
    ordenado.length > 0
      ? ordenado
          .map(([nome, dados]) => {
            const horas =
              dados.minutos > 0 ? (dados.minutos / 60).toFixed(1) : "N/A";
            const eficiencia =
              dados.minutos > 0
                ? (dados.pecas / (dados.minutos / 60)).toFixed(1)
                : "N/A";
            return `<tr><td><strong>${nome}</strong></td><td class="text-center" style="font-weight:500;">${dados.pecas}</td><td class="text-center">${horas}h</td><td class="text-center" style="font-weight:600;">${eficiencia} pç/h</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="4" style="color:var(--gray); padding:20px; text-align:center;">Nenhum registro no período</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(33,150,243,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(33,150,243,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#64b5f6;"><i class="ph ph-clock"></i></div>
        <div><h3 style="margin:0; color:#64b5f6;">Horas Trabalhadas x Produção</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Últimos 30 dias</p></div>
      </div>
      <div style="overflow-x:auto;">
        <table class="table" id="tabela-horas-prod"><thead><tr><th>Funcionário</th><th style="text-align:center;">Peças</th><th style="text-align:center;">Horas Totais</th><th style="text-align:center;">Peças/Hora</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("⏱️ Horas x Produção", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-horas-prod");
}

async function relatorioCustoMateriaisOS() {
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const { data: consumos } = await supabase
    .from("material_consumption")
    .select(
      `quantity_used, consumption_date, material_receipt_id, service_orders(order_number, product_description)`,
    )
    .gte("consumption_date", trintaDiasAtras.toISOString())
    .order("consumption_date", { ascending: false });

  const porOS = {};
  if (consumos) {
    consumos.forEach((c) => {
      const osNumber = c.service_orders?.order_number || "Sem OS";
      if (!porOS[osNumber])
        porOS[osNumber] = {
          pecas: 0,
          descricao: c.service_orders?.product_description || "-",
        };
      porOS[osNumber].pecas += parseFloat(c.quantity_used) || 0;
    });
  }

  const ordenado = Object.entries(porOS).sort(
    (a, b) => b[1].pecas - a[1].pecas,
  );
  const linhas =
    ordenado.length > 0
      ? ordenado
          .map(
            ([os, dados]) =>
              `<tr><td><strong style="color:var(--gold-light);">${os}</strong></td><td>${dados.descricao}</td><td class="text-center" style="font-weight:500;">${formatNumero(dados.pecas)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="3" style="color:var(--gray); padding:20px; text-align:center;">Nenhum consumo registrado</td></tr>';

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(212,160,23,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(212,160,23,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--gold-light);"><i class="ph ph-package"></i></div>
        <div><h3 style="margin:0; color:var(--gold-light);">Custo de Materiais por OS</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Últimos 30 dias</p></div>
      </div>
      <div style="overflow-x:auto;">
        <table class="table" id="tabela-custo-mat-os"><thead><tr><th>OS</th><th>Produto</th><th style="text-align:center;">Unidades Consumidas</th></tr></thead><tbody>${linhas}</tbody></table>
      </div>
    </div>
  `;

  openFormModalCustom("📦 Custo Materiais por OS", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-custo-mat-os");
}

async function relatorioCustoFuncionario() {
  const { data: funcionarios } = await supabase
    .from("employees")
    .select("*")
    .eq("active", true)
    .order("full_name");
  if (!funcionarios || funcionarios.length === 0) {
    openFormModal(
      "Custo por Funcionário",
      "<p style='padding:20px; text-align:center; color:var(--gray);'>Nenhum funcionário ativo.</p>",
      () => {},
    );
    replaceSubmitWithCloseButton();
    return;
  }

  const linhas = funcionarios
    .map((f) => {
      const salario = f.monthly_salary || 0;
      const comissaoEstimada =
        f.wage_type === "comissionado" || f.wage_type === "misto"
          ? (f.commission_per_piece || 0) * 500
          : 0;
      const fgts = (salario + comissaoEstimada) * 0.08;
      const inss = (salario + comissaoEstimada) * 0.2;
      const ferias13 = (salario + comissaoEstimada) * (2 / 12);
      const custoTotal = salario + comissaoEstimada + fgts + inss + ferias13;
      return `<tr><td><strong>${f.full_name}</strong></td><td>${f.role}</td><td class="text-right">${formatCurrency(salario)}</td><td class="text-right">${formatCurrency(comissaoEstimada)}</td><td class="text-right">${formatCurrency(fgts)}</td><td class="text-right">${formatCurrency(inss)}</td><td class="text-right">${formatCurrency(ferias13)}</td><td class="text-right" style="font-weight:700; color:var(--error);">${formatCurrency(custoTotal)}</td></tr>`;
    })
    .join("");

  const totalGeral = funcionarios.reduce((s, f) => {
    const salario = f.monthly_salary || 0;
    const comissao =
      f.wage_type === "comissionado" || f.wage_type === "misto"
        ? (f.commission_per_piece || 0) * 500
        : 0;
    return (
      s +
      salario +
      comissao +
      (salario + comissao) * 0.28 +
      (salario + comissao) * (2 / 12)
    );
  }, 0);

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(255,82,82,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(255,82,82,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#ff8a80;"><i class="ph ph-address-book"></i></div>
        <div><h3 style="margin:0; color:#ff8a80;">Custo por Funcionário</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Estimativa mensal com encargos</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Custo Total Folha", formatCurrency(totalGeral), "var(--error)", "ph-currency-circle-dollar", `${funcionarios.length} funcionários`)}
      </div>

      <div style="overflow-x:auto;">
        <table class="table" id="tabela-custo-func"><thead><tr><th>Nome</th><th>Função</th><th style="text-align:right;">Salário</th><th style="text-align:right;">Comissão Est.</th><th style="text-align:right;">FGTS</th><th style="text-align:right;">INSS Patr.</th><th style="text-align:right;">Férias+13º</th><th style="text-align:right;">Custo Total</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr style="font-weight:700; background:rgba(255,255,255,0.03);"><td colspan="7">Custo Total da Folha</td><td style="text-align:right; color:var(--error);">${formatCurrency(totalGeral)}</td></tr></tfoot></table>
      </div>
    </div>
  `;

  openFormModalCustom("👥 Custo por Funcionário", html, () => {}, "90%");
  adicionarBotoesExportacao("dynamicForm", "tabela-custo-func");
}

async function relatorioRotatividade() {
  const hoje = new Date();
  const dozeMesesAtras = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1);

  const { data: ativos } = await supabase
    .from("employees")
    .select("id")
    .eq("active", true);
  const { data: admitidos } = await supabase
    .from("employees")
    .select("id")
    .gte("admission_date", dozeMesesAtras.toISOString().split("T")[0]);
  const { data: desligados } = await supabase
    .from("employees")
    .select("id")
    .gte("termination_date", dozeMesesAtras.toISOString().split("T")[0])
    .not("termination_date", "is", null);

  const totalAtivos = ativos?.length || 0;
  const totalAdmitidos = admitidos?.length || 0;
  const totalDesligados = desligados?.length || 0;
  const mediaFuncionarios = totalAtivos + totalDesligados;
  const turnover =
    mediaFuncionarios > 0
      ? ((totalDesligados / mediaFuncionarios) * 100).toFixed(1)
      : "0";

  const html = `
    <div style="display:grid; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; background:rgba(33,150,243,0.06); border-radius:12px; padding:16px;">
        <div style="width:48px; height:48px; background:rgba(33,150,243,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#64b5f6;"><i class="ph ph-arrows-left-right"></i></div>
        <div><h3 style="margin:0; color:#64b5f6;">Rotatividade</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">Últimos 12 meses</p></div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        ${cardResumo("Ativos Hoje", totalAtivos, "var(--success)", "ph-users-three", "")}
        ${cardResumo("Admitidos", totalAdmitidos, "var(--gold-light)", "ph-user-plus", "")}
        ${cardResumo("Desligados", totalDesligados, "var(--error)", "ph-user-minus", "")}
        ${cardResumo("Taxa de Turnover", `${turnover}%`, parseFloat(turnover) > 10 ? "var(--error)" : "var(--success)", "ph-percent", "")}
      </div>
    </div>
  `;

  openFormModalCustom("🔄 Rotatividade", html, () => {}, "90%");
}

async function relatorioResultadoPeriodo() {
  const formHtml = `
    <div class="form-group"><label class="form-label">Data Início</label><input id="relDataInicio" type="date" class="form-input" required></div>
    <div class="form-group"><label class="form-label">Data Fim</label><input id="relDataFim" type="date" class="form-input" required></div>
  `;

  openFormModal("Resultado por Período Customizável", formHtml, async () => {
    const dataInicio = document.getElementById("relDataInicio").value;
    const dataFim = document.getElementById("relDataFim").value;
    if (!dataInicio || !dataFim) {
      showFeedback("Erro", "Selecione as datas.", "error");
      return;
    }

    const { data: transacoes } = await supabase
      .from("financial_transactions")
      .select("amount, type, chart_of_accounts(name)")
      .gte("date", dataInicio)
      .lte("date", dataFim);

    let receitas = 0,
      despesas = 0;
    if (transacoes)
      transacoes.forEach((t) => {
        if (t.type === "receber") receitas += Math.abs(parseFloat(t.amount));
        else despesas += Math.abs(parseFloat(t.amount));
      });

    const resultado = receitas - despesas;
    document.getElementById("modalContainer").innerHTML = "";
    const html = `
      <div style="display:grid; gap:16px;">
        <div style="display:flex; align-items:center; gap:12px; background:rgba(33,150,243,0.06); border-radius:12px; padding:16px;">
          <div style="width:48px; height:48px; background:rgba(33,150,243,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#64b5f6;"><i class="ph ph-sliders"></i></div>
          <div><h3 style="margin:0; color:#64b5f6;">Resultado</h3><p style="margin:4px 0 0; font-size:0.8rem; color:var(--gray);">${formatDate(dataInicio)} a ${formatDate(dataFim)}</p></div>
        </div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          ${cardResumo("Receitas", formatCurrency(receitas), "var(--success)", "ph-arrow-circle-up", "")}
          ${cardResumo("Despesas", formatCurrency(despesas), "var(--error)", "ph-arrow-circle-down", "")}
          ${cardResumo("Resultado", formatCurrency(resultado), resultado >= 0 ? "var(--success)" : "var(--error)", "ph-equals", resultado >= 0 ? "Lucro" : "Prejuízo")}
        </div>
      </div>
    `;
    openFormModalCustom("🎚️ Resultado por Período", html, () => {}, "90%");
  });
}

// ============================================================
// DELEGAÇÃO DE EVENTOS DOS RELATÓRIOS
// ============================================================
function setupRelatoriosDelegation() {
  document.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    e.preventDefault();
    switch (action) {
      case "relatorio-dre-mensal":
        await relatorioDREMensal();
        break;
      case "relatorio-fluxo-caixa":
        await relatorioFluxoCaixa();
        break;
      case "relatorio-faturamento-cliente":
        await relatorioFaturamentoCliente();
        break;
      case "relatorio-despesas-categoria":
        await relatorioDespesasCategoria();
        break;
      case "relatorio-comparativo-mensal":
        await relatorioComparativoMensal();
        break;
      case "relatorio-producao":
        await relatorioProducao();
        break;
      case "relatorio-producao-funcionario":
        await relatorioProducaoFuncionario();
        break;
      case "relatorio-producao-cliente":
        await relatorioProducaoCliente();
        break;
      case "relatorio-rentabilidade-lotes":
        await relatorioRentabilidadeLotes();
        break;
      case "relatorio-perdas-retrabalho":
        await relatorioPerdasRetrabalho();
        break;
      case "relatorio-os-status":
        await relatorioOSStatus();
        break;
      case "relatorio-funcionarios-ativos":
        await relatorioFuncionariosAtivos();
        break;
      case "relatorio-faltas":
        await relatorioFaltas();
        break;
      case "relatorio-comissoes":
        await relatorioComissoes();
        break;
      case "relatorio-obrigacoes":
        await relatorioObrigacoes();
        break;
      case "relatorio-margem-contribuicao":
        await relatorioMargemContribuicao();
        break;
      case "relatorio-margem-cliente":
        await relatorioMargemCliente();
        break;
      case "relatorio-inadimplencia":
        await relatorioInadimplencia();
        break;
      case "relatorio-projecao-caixa":
        await relatorioProjecaoCaixa();
        break;
      case "relatorio-horas-producao":
        await relatorioHorasProducao();
        break;
      case "relatorio-custo-materiais-os":
        await relatorioCustoMateriaisOS();
        break;
      case "relatorio-custo-funcionario":
        await relatorioCustoFuncionario();
        break;
      case "relatorio-rotatividade":
        await relatorioRotatividade();
        break;
      case "relatorio-resultado-periodo":
        await relatorioResultadoPeriodo();
        break;
    }
  });
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function initRelatorios() {
  setupRelatoriosDelegation();
}

// ============================================================
// EXPORTAÇÃO PARA O ESCOPO GLOBAL
// ============================================================
window.loadRelatorios = loadRelatorios;
window.relatorioDREMensal = relatorioDREMensal;
window.relatorioFluxoCaixa = relatorioFluxoCaixa;
window.relatorioFaturamentoCliente = relatorioFaturamentoCliente;
window.relatorioDespesasCategoria = relatorioDespesasCategoria;
window.relatorioComparativoMensal = relatorioComparativoMensal;
window.relatorioProducao = relatorioProducao;
window.relatorioProducaoFuncionario = relatorioProducaoFuncionario;
window.relatorioProducaoCliente = relatorioProducaoCliente;
window.relatorioRentabilidadeLotes = relatorioRentabilidadeLotes;
window.relatorioPerdasRetrabalho = relatorioPerdasRetrabalho;
window.relatorioOSStatus = relatorioOSStatus;
window.relatorioFuncionariosAtivos = relatorioFuncionariosAtivos;
window.relatorioFaltas = relatorioFaltas;
window.relatorioComissoes = relatorioComissoes;
window.relatorioObrigacoes = relatorioObrigacoes;
window.relatorioMargemContribuicao = relatorioMargemContribuicao;
window.relatorioMargemCliente = relatorioMargemCliente;
window.relatorioInadimplencia = relatorioInadimplencia;
window.relatorioProjecaoCaixa = relatorioProjecaoCaixa;
window.relatorioHorasProducao = relatorioHorasProducao;
window.relatorioCustoMateriaisOS = relatorioCustoMateriaisOS;
window.relatorioCustoFuncionario = relatorioCustoFuncionario;
window.relatorioRotatividade = relatorioRotatividade;
window.relatorioResultadoPeriodo = relatorioResultadoPeriodo;
window.initRelatorios = initRelatorios;
window.exportarRelatorioExcel = exportarRelatorioExcel;
window.imprimirRelatorio = imprimirRelatorio;
