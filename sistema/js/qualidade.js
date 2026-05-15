// ============================================================
// QUALIDADE.JS
// Módulo de Controle de Qualidade - Inspeção de peças
// Facção de Jeans - Sistema de Gestão
// ============================================================

// ============================================================
// CARREGAMENTO DA TELA DE QUALIDADE
// ============================================================
async function loadQualidade() {
  try {
    // Busca todas as inspeções com dados relacionados
    const { data: inspecoes, error } = await supabase
      .from("quality_inspections")
      .select(
        `
        id,
        sewing_record_id,
        inspector_id,
        inspection_date,
        total_inspected,
        defects_found,
        defect_type,
        decision,
        notes,
        created_at,
        employees:inspector_id(full_name),
        sewing_records(
          id,
          pieces_sewn,
          defects,
          employee_id,
          employees(full_name),
          service_order_items(
            service_order_id,
            service_orders(order_number, product_description)
          )
        )
      `,
      )
      .order("inspection_date", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Erro ao carregar inspeções:", error);
      showFeedback("Erro", "Falha ao carregar dados de qualidade.", "error");
      return;
    }

    // Renderiza a tabela de inspeções
    renderizarTabelaQualidade(inspecoes || []);

    // Renderiza os cards de resumo
    renderizarResumoQualidade(inspecoes || []);

    // Atualiza os botões de ação
    const btnInspecao = document.querySelector("#page-qualidade .btn-primary");
    if (btnInspecao) {
      btnInspecao.setAttribute("data-action", "nova-inspecao-qualidade");
    }
  } catch (e) {
    console.error("Erro ao carregar qualidade:", e);
    showFeedback("Erro", "Falha ao carregar dados de qualidade.", "error");
  }
}

// ============================================================
// RENDERIZAÇÃO DOS CARDS DE RESUMO
// ============================================================
function renderizarResumoQualidade(inspecoes) {
  const container = document.querySelector("#page-qualidade .cards-grid");
  if (!container) {
    // Cria o container se não existir
    const pageHeader = document.querySelector("#page-qualidade .page-header");
    if (pageHeader) {
      const cardsGrid = document.createElement("div");
      cardsGrid.className = "cards-grid";
      cardsGrid.id = "qualidade-cards-grid";
      pageHeader.insertAdjacentElement("afterend", cardsGrid);
    }
  }

  const cardsGrid =
    document.querySelector("#page-qualidade .cards-grid") ||
    document.getElementById("qualidade-cards-grid");

  if (!cardsGrid) return;

  // Cálculos
  const hoje = todayISO();
  const inspecoesHoje = inspecoes.filter(
    (i) => i.inspection_date && i.inspection_date.startsWith(hoje),
  );

  let totalInspecionado = 0;
  let totalDefeitos = 0;
  let totalAprovado = 0;
  let totalRetrabalhar = 0;
  let totalRefugo = 0;

  inspecoes.forEach((i) => {
    totalInspecionado += i.total_inspected || 0;
    totalDefeitos += i.defects_found || 0;

    if (i.decision === "aprovado") totalAprovado++;
    if (i.decision === "retrabalhar") totalRetrabalhar++;
    if (i.decision === "refugo") totalRefugo++;
  });

  const taxaDefeitos =
    totalInspecionado > 0
      ? ((totalDefeitos / totalInspecionado) * 100).toFixed(1)
      : "0";

  // Defeitos mais comuns
  const defeitosContagem = {};
  inspecoes.forEach((i) => {
    if (i.defect_type) {
      const tipo = i.defect_type.toLowerCase().trim();
      defeitosContagem[tipo] =
        (defeitosContagem[tipo] || 0) + (i.defects_found || 0);
    }
  });

  const defeitosOrdenados = Object.entries(defeitosContagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  cardsGrid.innerHTML = `
    <div class="card card-pink">
      <div class="card-icon"><i class="ph ph-magnifying-glass"></i></div>
      <div class="card-info">
        <span class="card-label">Inspeções Hoje</span>
        <span class="card-value">${inspecoesHoje.length}</span>
        <span class="card-detail">conferências realizadas</span>
      </div>
    </div>

    <div class="card card-gold">
      <div class="card-icon"><i class="ph ph-check-square"></i></div>
      <div class="card-info">
        <span class="card-label">Total Inspecionado</span>
        <span class="card-value">${totalInspecionado}</span>
        <span class="card-detail">peças conferidas</span>
      </div>
    </div>

    <div class="card ${parseFloat(taxaDefeitos) > 5 ? "card-pink" : "card-dark"}">
      <div class="card-icon"><i class="ph ph-warning"></i></div>
      <div class="card-info">
        <span class="card-label">Taxa de Defeitos</span>
        <span class="card-value" style="color: ${parseFloat(taxaDefeitos) > 5 ? "var(--error)" : "var(--success)"};">
          ${taxaDefeitos}%
        </span>
        <span class="card-detail">${totalDefeitos} peças com defeito</span>
      </div>
    </div>

    <div class="card card-pink-light">
      <div class="card-icon"><i class="ph ph-arrows-counter-clockwise"></i></div>
      <div class="card-info">
        <span class="card-label">Retrabalho / Refugo</span>
        <span class="card-value" style="font-size: 1rem;">
          ${totalRetrabalhar} retrabalho / ${totalRefugo} refugo
        </span>
        <span class="card-detail">
          ${
            defeitosOrdenados.length > 0
              ? `Top: ${defeitosOrdenados.map((d) => capitalizeFirst(d[0])).join(", ")}`
              : "Nenhum defeito registrado"
          }
        </span>
      </div>
    </div>
  `;
}

// ============================================================
// RENDERIZAÇÃO DA TABELA DE INSPEÇÕES
// ============================================================
function renderizarTabelaQualidade(inspecoes) {
  const tbody = $("#table-inspecoes tbody");
  if (!tbody) return;

  if (!inspecoes || inspecoes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: 40px; color: var(--gray);">
          <i class="ph ph-check-square" style="font-size: 2rem; display: block; margin-bottom: 12px;"></i>
          Nenhuma inspeção registrada.
          <br>
          <span style="font-size: 0.8rem;">Clique em "Nova Inspeção" para conferir um lote de peças.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = inspecoes
    .map((inspecao) => {
      const dataFormatada = inspecao.inspection_date
        ? formatDateTime(inspecao.inspection_date)
        : "-";
      const nomeInspetor = inspecao.employees?.full_name || "Não informado";
      const osNumber =
        inspecao.sewing_records?.service_order_items?.service_orders
          ?.order_number || "-";
      const produto =
        inspecao.sewing_records?.service_order_items?.service_orders
          ?.product_description || "-";
      const costureira = inspecao.sewing_records?.employees?.full_name || "-";
      const totalInspecionado = inspecao.total_inspected || 0;
      const defeitos = inspecao.defects_found || 0;
      const tipoDefeito = inspecao.defect_type || "-";
      const decisao = inspecao.decision || "aprovado";

      // Define cor e ícone da decisão
      let corDecisao = "";
      let iconeDecisao = "";
      let decisaoFormatada = "";

      switch (decisao) {
        case "aprovado":
          corDecisao = "var(--success)";
          iconeDecisao = "✅";
          decisaoFormatada = "Aprovado";
          break;
        case "retrabalhar":
          corDecisao = "var(--warning)";
          iconeDecisao = "⚠️";
          decisaoFormatada = "Retrabalhar";
          break;
        case "refugo":
          corDecisao = "var(--error)";
          iconeDecisao = "❌";
          decisaoFormatada = "Refugo";
          break;
        default:
          corDecisao = "var(--gray)";
          iconeDecisao = "•";
          decisaoFormatada = decisao;
      }

      // Taxa de defeitos nesta inspeção
      const taxaInspecao =
        totalInspecionado > 0
          ? ((defeitos / totalInspecionado) * 100).toFixed(1)
          : "0";

      return `
        <tr style="${decisao === "refugo" ? "border-left: 3px solid var(--error);" : ""}${decisao === "retrabalhar" ? "border-left: 3px solid var(--warning);" : ""}">
          <td>
            <span style="color: var(--gray);">${dataFormatada}</span>
          </td>
          <td>
            <strong>${nomeInspetor}</strong>
          </td>
          <td>
            <span style="color: var(--gold-light);">${osNumber}</span>
            <br><small style="color: var(--gray);">${produto}</small>
          </td>
          <td class="text-center">
            <strong>${totalInspecionado}</strong>
          </td>
          <td class="text-center">
            <span style="color: ${defeitos > 0 ? "var(--warning)" : "var(--success)"}; font-weight: 600;">
              ${defeitos}
            </span>
            ${defeitos > 0 ? `<br><small style="color: var(--gray);">${taxaInspecao}%</small>` : ""}
          </td>
          <td>
            ${
              tipoDefeito !== "-"
                ? `<span style="color: var(--warning);">${capitalizeFirst(tipoDefeito)}</span>`
                : '<span style="color: var(--gray);">-</span>'
            }
          </td>
          <td class="text-center">
            <span style="color: ${corDecisao}; font-weight: 600;">
              ${iconeDecisao} ${decisaoFormatada}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 4px; justify-content: center;">
              <button 
                class="btn btn-ghost btn-sm" 
                data-action="ver-detalhes-inspecao" 
                data-id="${inspecao.id}" 
                title="Ver detalhes da inspeção"
              >
                <i class="ph ph-eye"></i>
              </button>
              <button 
                class="btn btn-ghost btn-sm" 
                data-action="editar-inspecao" 
                data-id="${inspecao.id}" 
                title="Editar inspeção"
              >
                <i class="ph ph-pencil-simple"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ============================================================
// NOVA INSPEÇÃO DE QUALIDADE
// ============================================================
async function novaInspecaoQualidade(sewingRecordId = null) {
  // Busca apontamentos de costura recentes (para vincular a inspeção)
  let query = supabase
    .from("sewing_records")
    .select(
      `
      id,
      pieces_sewn,
      defects,
      start_time,
      employee_id,
      employees(full_name),
      service_order_items(
        service_order_id,
        service_orders(order_number, product_description)
      )
    `,
    )
    .order("start_time", { ascending: false })
    .limit(100);

  const { data: records, error } = await query;

  if (error) {
    console.error("Erro ao buscar apontamentos:", error);
    showFeedback("Erro", "Falha ao carregar dados de produção.", "error");
    return;
  }

  if (!records || records.length === 0) {
    showFeedback(
      "Aviso",
      "Nenhum apontamento de costura encontrado. Registre a produção primeiro.",
      "warning",
    );
    return;
  }

  // Se foi passado um ID específico, garante que ele esteja na lista
  let listaRecords = [...records];
  if (sewingRecordId && !listaRecords.find((r) => r.id === sewingRecordId)) {
    const { data: singleRecord } = await supabase
      .from("sewing_records")
      .select(
        `
        id,
        pieces_sewn,
        defects,
        start_time,
        employee_id,
        employees(full_name),
        service_order_items(
          service_order_id,
          service_orders(order_number, product_description)
        )
      `,
      )
      .eq("id", sewingRecordId)
      .single();

    if (singleRecord) {
      listaRecords.unshift(singleRecord);
    }
  }

  // Busca inspetores (funcionários ativos)
  const { data: inspetores } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name");

  const optsRecords = listaRecords
    .map((r) => {
      const selected = r.id === sewingRecordId ? "selected" : "";
      const osNumber =
        r.service_order_items?.service_orders?.order_number || "Sem OS";
      const costureira = r.employees?.full_name || "Desconhecido";
      return `
        <option value="${r.id}" ${selected}>
          ${osNumber} | ${costureira} | ${r.pieces_sewn} peças | ${formatDate(r.start_time)}
        </option>
      `;
    })
    .join("");

  const optsInspetores =
    inspetores && inspetores.length > 0
      ? inspetores
          .map((i) => `<option value="${i.id}">${i.full_name}</option>`)
          .join("")
      : '<option value="">Nenhum inspetor cadastrado</option>';

  const formHtml = `
    <div class="form-group">
      <label class="form-label">Apontamento de Costura *</label>
      <select id="inspRecord" class="form-select" required onchange="atualizarInfoInspecao()">
        <option value="">Selecione o apontamento...</option>
        ${optsRecords}
      </select>
      <div id="infoRecordSelecionado" style="margin-top: 8px; font-size: 0.85rem; color: var(--gray);"></div>
    </div>

    <div class="form-group">
      <label class="form-label">Inspetor (quem está conferindo) *</label>
      <select id="inspInspetor" class="form-select" required>
        <option value="">Selecione o inspetor...</option>
        ${optsInspetores}
      </select>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div class="form-group">
        <label class="form-label">Peças Inspecionadas *</label>
        <input id="inspQtd" type="number" min="1" class="form-input" placeholder="Quantas peças foram conferidas" required>
      </div>

      <div class="form-group">
        <label class="form-label">Defeitos Encontrados</label>
        <input id="inspDefeitos" type="number" min="0" value="0" class="form-input">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Tipo de Defeito</label>
      <input 
        id="inspTipoDef" 
        class="form-input" 
        list="tiposDefeitoList" 
        placeholder="Ex: costura frouxa, zíper torto, botão faltando..."
      >
      <datalist id="tiposDefeitoList">
        <option value="costura frouxa">
        <option value="costura torta">
        <option value="zíper torto">
        <option value="zíper quebrado">
        <option value="botão frouxo">
        <option value="botão faltando">
        <option value="rebite solto">
        <option value="barra desigual">
        <option value="linha errada">
        <option value="etiqueta errada">
        <option value="etiqueta faltando">
        <option value="tecido rasgado">
        <option value="medida errada">
        <option value="mancha no tecido">
      </datalist>
    </div>

    <div class="form-group">
      <label class="form-label">Decisão *</label>
      <select id="inspDecisao" class="form-select" required>
        <option value="aprovado">✅ Aprovado - Peças boas, prontas para entrega</option>
        <option value="retrabalhar">⚠️ Retrabalhar - Peças com defeito, mas que podem ser consertadas</option>
        <option value="refugo">❌ Refugo - Peças imprestáveis, perda total</option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Observações</label>
      <textarea id="inspObservacoes" class="form-input" rows="2" placeholder="Detalhes adicionais sobre a inspeção..."></textarea>
    </div>
  `;

  openFormModal("Nova Inspeção de Qualidade", formHtml, async () => {
    const recordId = $("#inspRecord").value;
    const inspetorId = $("#inspInspetor").value;
    const qtdInspecionada = parseInt($("#inspQtd").value);
    const defeitos = parseInt($("#inspDefeitos").value) || 0;
    const tipoDefeito = $("#inspTipoDef").value.trim() || null;
    const decisao = $("#inspDecisao").value;
    const observacoes = $("#inspObservacoes").value.trim() || null;

    if (!recordId || !inspetorId || !qtdInspecionada || !decisao) {
      showFeedback("Erro", "Preencha todos os campos obrigatórios.", "error");
      return;
    }

    if (defeitos > qtdInspecionada) {
      showFeedback(
        "Erro",
        "O número de defeitos não pode ser maior que o total inspecionado.",
        "error",
      );
      return;
    }

    const insert = {
      sewing_record_id: recordId,
      inspector_id: inspetorId,
      inspection_date: new Date().toISOString(),
      total_inspected: qtdInspecionada,
      defects_found: defeitos,
      defect_type: tipoDefeito,
      decision: decisao,
      notes: observacoes,
    };

    const { error: insertError } = await supabase
      .from("quality_inspections")
      .insert(insert);

    if (insertError) {
      showFeedback(
        "Erro",
        `Falha ao registrar inspeção: ${insertError.message}`,
        "error",
      );
      console.error("Erro ao inserir inspeção:", insertError);
    } else {
      $("#modalContainer").innerHTML = "";

      let tipoFeedback = "success";
      let mensagem = `Inspeção registrada com sucesso! ${qtdInspecionada} peças conferidas.`;

      if (defeitos > 0 && decisao === "refugo") {
        tipoFeedback = "warning";
        mensagem += ` ${defeitos} peças descartadas como refugo.`;
      } else if (defeitos > 0 && decisao === "retrabalhar") {
        tipoFeedback = "warning";
        mensagem += ` ${defeitos} peças enviadas para retrabalho.`;
      }

      showFeedback("Sucesso", mensagem, tipoFeedback, () => {
        loadQualidade();
      });
    }
  });

  // Função auxiliar para mostrar info do apontamento selecionado
  window.atualizarInfoInspecao = function () {
    const select = document.getElementById("inspRecord");
    const infoDiv = document.getElementById("infoRecordSelecionado");
    if (!select || !infoDiv) return;

    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const texto = selectedOption.textContent;
      infoDiv.innerHTML = `
        <div style="background: rgba(255,255,255,0.03); border-radius: 6px; padding: 8px 12px; margin-top: 4px;">
          <span style="color: var(--gold-light);">📋 ${texto}</span>
        </div>
      `;
    } else {
      infoDiv.innerHTML = "";
    }
  };
}

// ============================================================
// VER DETALHES DA INSPEÇÃO
// ============================================================
async function verDetalhesInspecao(id) {
  const { data: inspecao, error } = await supabase
    .from("quality_inspections")
    .select(
      `
      id,
      sewing_record_id,
      inspector_id,
      inspection_date,
      total_inspected,
      defects_found,
      defect_type,
      decision,
      notes,
      created_at,
      employees:inspector_id(full_name),
      sewing_records(
        id,
        pieces_sewn,
        defects,
        start_time,
        end_time,
        machine_id,
        employees(full_name),
        service_order_items(
          service_order_id,
          service_orders(order_number, product_description, customers(company_name, trade_name))
        )
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error || !inspecao) {
    showFeedback("Erro", "Inspeção não encontrada.", "error");
    return;
  }

  const nomeInspetor = inspecao.employees?.full_name || "Não informado";
  const costureira = inspecao.sewing_records?.employees?.full_name || "-";
  const osNumber =
    inspecao.sewing_records?.service_order_items?.service_orders
      ?.order_number || "-";
  const produto =
    inspecao.sewing_records?.service_order_items?.service_orders
      ?.product_description || "-";
  const cliente =
    inspecao.sewing_records?.service_order_items?.service_orders?.customers
      ?.trade_name ||
    inspecao.sewing_records?.service_order_items?.service_orders?.customers
      ?.company_name ||
    "-";
  const pecasCosturadas = inspecao.sewing_records?.pieces_sewn || 0;
  const defeitosCostura = inspecao.sewing_records?.defects || 0;
  const maquina = inspecao.sewing_records?.machine_id || "Não informada";

  // Decisão formatada
  let decisaoFormatada = "";
  let corDecisao = "";
  switch (inspecao.decision) {
    case "aprovado":
      decisaoFormatada = "✅ Aprovado";
      corDecisao = "var(--success)";
      break;
    case "retrabalhar":
      decisaoFormatada = "⚠️ Retrabalhar";
      corDecisao = "var(--warning)";
      break;
    case "refugo":
      decisaoFormatada = "❌ Refugo";
      corDecisao = "var(--error)";
      break;
    default:
      decisaoFormatada = inspecao.decision;
      corDecisao = "var(--gray)";
  }

  const taxaDefeitos =
    inspecao.total_inspected > 0
      ? ((inspecao.defects_found / inspecao.total_inspected) * 100).toFixed(1)
      : "0";

  const formHtml = `
    <div style="display: grid; gap: 16px;">
      
      <!-- Resultado da Inspeção -->
      <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px;">
        <h4 style="color: var(--gold-light); margin-bottom: 12px;">Resultado da Inspeção</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <p><strong>Data:</strong> ${formatDateTime(inspecao.inspection_date)}</p>
          <p><strong>Inspetor:</strong> ${nomeInspetor}</p>
          <p><strong>Peças Inspecionadas:</strong> ${inspecao.total_inspected}</p>
          <p><strong>Defeitos Encontrados:</strong> <span style="color: ${inspecao.defects_found > 0 ? "var(--warning)" : "var(--success)"};">${inspecao.defects_found} (${taxaDefeitos}%)</span></p>
          <p><strong>Tipo de Defeito:</strong> ${inspecao.defect_type || "Não informado"}</p>
          <p><strong>Decisão:</strong> <span style="color: ${corDecisao}; font-weight: 600;">${decisaoFormatada}</span></p>
        </div>
        ${inspecao.notes ? `<p style="margin-top: 8px; color: var(--gray);"><strong>Obs:</strong> ${inspecao.notes}</p>` : ""}
      </div>

      <!-- Dados da Costura -->
      <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px;">
        <h4 style="color: var(--gold-light); margin-bottom: 12px;">Dados do Apontamento</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <p><strong>Costureira:</strong> ${costureira}</p>
          <p><strong>Máquina:</strong> ${maquina}</p>
          <p><strong>Peças Costuradas:</strong> ${pecasCosturadas}</p>
          <p><strong>Defeitos Apontados:</strong> ${defeitosCostura}</p>
          <p><strong>Data Costura:</strong> ${formatDateTime(inspecao.sewing_records?.start_time)}</p>
        </div>
      </div>

      <!-- Dados da OS -->
      <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px;">
        <h4 style="color: var(--gold-light); margin-bottom: 12px;">Ordem de Serviço</h4>
        <p><strong>OS:</strong> ${osNumber}</p>
        <p><strong>Produto:</strong> ${produto}</p>
        <p><strong>Cliente:</strong> ${cliente}</p>
      </div>
    </div>
  `;

  openFormModal("Detalhes da Inspeção", formHtml, () => {});
  replaceSubmitWithCloseButton();
}

// ============================================================
// EDITAR INSPEÇÃO
// ============================================================
async function editarInspecao(id) {
  const { data: inspecao, error } = await supabase
    .from("quality_inspections")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !inspecao) {
    showFeedback("Erro", "Inspeção não encontrada.", "error");
    return;
  }

  const formHtml = `
    <input type="hidden" id="editInspId" value="${inspecao.id}">

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div class="form-group">
        <label class="form-label">Peças Inspecionadas *</label>
        <input id="editInspQtd" type="number" min="1" class="form-input" value="${inspecao.total_inspected}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Defeitos Encontrados</label>
        <input id="editInspDefeitos" type="number" min="0" class="form-input" value="${inspecao.defects_found || 0}">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Tipo de Defeito</label>
      <input id="editInspTipoDef" class="form-input" value="${escapeHtml(inspecao.defect_type || "")}" placeholder="Ex: costura frouxa, zíper torto...">
    </div>

    <div class="form-group">
      <label class="form-label">Decisão *</label>
      <select id="editInspDecisao" class="form-select" required>
        <option value="aprovado" ${inspecao.decision === "aprovado" ? "selected" : ""}>✅ Aprovado</option>
        <option value="retrabalhar" ${inspecao.decision === "retrabalhar" ? "selected" : ""}>⚠️ Retrabalhar</option>
        <option value="refugo" ${inspecao.decision === "refugo" ? "selected" : ""}>❌ Refugo</option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Observações</label>
      <textarea id="editInspObs" class="form-input" rows="2">${escapeHtml(inspecao.notes || "")}</textarea>
    </div>
  `;

  openFormModal("Editar Inspeção", formHtml, async () => {
    const updates = {
      total_inspected: parseInt($("#editInspQtd").value),
      defects_found: parseInt($("#editInspDefeitos").value) || 0,
      defect_type: $("#editInspTipoDef").value.trim() || null,
      decision: $("#editInspDecisao").value,
      notes: $("#editInspObs").value.trim() || null,
    };

    const { error: updateError } = await supabase
      .from("quality_inspections")
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
      showFeedback(
        "Sucesso",
        "Inspeção atualizada com sucesso!",
        "success",
        () => {
          loadQualidade();
        },
      );
    }
  });
}

// ============================================================
// DELEGAÇÃO DE EVENTOS DE QUALIDADE
// ============================================================
function setupQualidadeDelegation() {
  document.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    switch (action) {
      case "nova-inspecao-qualidade":
        e.preventDefault();
        await novaInspecaoQualidade();
        break;
      case "nova-inspecao":
        e.preventDefault();
        await novaInspecaoQualidade(id);
        break;
      case "ver-detalhes-inspecao":
        e.preventDefault();
        await verDetalhesInspecao(id);
        break;
      case "editar-inspecao":
        e.preventDefault();
        await editarInspecao(id);
        break;
    }
  });
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function initQualidade() {
  setupQualidadeDelegation();
}

// ============================================================
// EXPORTAÇÃO PARA O ESCOPO GLOBAL
// ============================================================
window.loadQualidade = loadQualidade;
window.novaInspecaoQualidade = novaInspecaoQualidade;
window.verDetalhesInspecao = verDetalhesInspecao;
window.editarInspecao = editarInspecao;
window.initQualidade = initQualidade;
