// ============================================================
// RH.JS
// Módulo de Recursos Humanos - Funcionários, Ponto e Faltas
// Facção de Jeans - Sistema de Gestão
// ============================================================

// ============================================================
// CARREGAMENTO DA TELA DE RH
// ============================================================
async function loadRH() {
  try {
    // Busca todos os funcionários ativos
    const { data: funcionarios, error } = await supabase
      .from("employees")
      .select(
        `
        id,
        profile_id,
        full_name,
        registration,
        role,
        wage_type,
        monthly_salary,
        daily_rate,
        commission_per_piece,
        admission_date,
        termination_date,
        active,
        notes
      `,
      )
      .eq("active", true)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Erro ao carregar funcionários:", error);
      showFeedback("Erro", "Falha ao carregar dados de funcionários.", "error");
      return;
    }

    // Busca registros de ponto de hoje
    const hoje = todayISO();
    const { data: pontosHoje } = await supabase
      .from("time_tracking")
      .select(
        `
        id,
        employee_id,
        check_in,
        check_out,
        notes
      `,
      )
      .gte("check_in", hoje)
      .lte("check_in", hoje + "T23:59:59")
      .order("check_in", { ascending: false });

    // Busca faltas recentes (últimos 30 dias)
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const { data: faltasRecentes } = await supabase
      .from("absences")
      .select(
        `
        id,
        employee_id,
        date,
        type,
        notes
      `,
      )
      .gte("date", trintaDiasAtras.toISOString().split("T")[0])
      .order("date", { ascending: false });

    // Renderiza a tabela de funcionários
    renderizarTabelaFuncionarios(
      funcionarios || [],
      pontosHoje || [],
      faltasRecentes || [],
    );

    // Renderiza a seção de ponto e faltas
    renderizarSecaoPontoFaltas(
      pontosHoje || [],
      faltasRecentes || [],
      funcionarios || [],
    );

    // Atualiza o botão "Novo Funcionário"
    const btn = document.querySelector("#page-rh .btn-primary");
    if (btn) {
      btn.setAttribute("data-action", "novo-funcionario");
    }
  } catch (e) {
    console.error("Erro ao carregar RH:", e);
    showFeedback("Erro", "Falha ao carregar dados de RH.", "error");
  }
}

// ============================================================
// RENDERIZAÇÃO DA TABELA DE FUNCIONÁRIOS
// ============================================================
function renderizarTabelaFuncionarios(
  funcionarios,
  pontosHoje,
  faltasRecentes,
) {
  const tbody = $("#table-funcionarios tbody");
  if (!tbody) return;

  if (!funcionarios || funcionarios.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="padding: 40px; color: var(--gray);">
          <i class="ph ph-users-three" style="font-size: 2rem; display: block; margin-bottom: 12px;"></i>
          Nenhum funcionário cadastrado.
          <br>
          <span style="font-size: 0.8rem;">Clique em "Novo Funcionário" para cadastrar.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = funcionarios
    .map((func) => {
      // Verifica se está presente hoje
      const pontoHoje = pontosHoje.find((p) => p.employee_id === func.id);
      const estaPresente =
        pontoHoje && pontoHoje.check_in && !pontoHoje.check_out;
      const jaSaiu = pontoHoje && pontoHoje.check_out;

      // Verifica se faltou hoje
      const hoje = todayISO();
      const faltaHoje = faltasRecentes.find(
        (f) => f.employee_id === func.id && f.date === hoje,
      );

      // Conta faltas nos últimos 30 dias
      const faltas30dias = faltasRecentes.filter(
        (f) => f.employee_id === func.id,
      ).length;

      // Define a comissão formatada
      let comissaoFormatada = "-";
      if (func.wage_type === "comissionado") {
        comissaoFormatada = `R$ ${func.commission_per_piece?.toFixed(2) || "0,00"} / peça`;
      } else if (func.wage_type === "misto") {
        comissaoFormatada = `R$ ${func.monthly_salary?.toFixed(2) || "0,00"} + R$ ${func.commission_per_piece?.toFixed(2) || "0,00"}/pç`;
      } else if (func.wage_type === "fixo") {
        comissaoFormatada = `R$ ${func.monthly_salary?.toFixed(2) || "0,00"} (fixo)`;
      }

      // Define status de presença
      let statusPresenca = "";
      if (faltaHoje) {
        statusPresenca = `<span style="color: var(--error); font-size: 0.75rem;">❌ ${formatarTipoFalta(faltaHoje.type)}</span>`;
      } else if (estaPresente) {
        statusPresenca = `<span style="color: var(--success); font-size: 0.75rem;">🟢 Presente</span>`;
      } else if (jaSaiu) {
        statusPresenca = `<span style="color: var(--gray); font-size: 0.75rem;">✅ Saiu</span>`;
      } else {
        statusPresenca = `<span style="color: var(--gray); font-size: 0.75rem;">⚪ Sem registro</span>`;
      }

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 36px; height: 36px; background: linear-gradient(135deg, var(--pink-dark), var(--gold-dark)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: var(--white); flex-shrink: 0;">
                ${func.full_name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <strong>${func.full_name}</strong>
                ${func.registration ? `<br><small style="color: var(--gray);">Mat: ${func.registration}</small>` : ""}
              </div>
            </div>
          </td>
          <td>
            <span style="color: var(--gold-light);">${func.role}</span>
            <br><small style="color: var(--gray);">${formatarTipoContratacao(func.wage_type)}</small>
          </td>
          <td>
            <span>${comissaoFormatada}</span>
          </td>
          <td>
            ${formatDate(func.admission_date)}
          </td>
          <td class="text-center">
            ${statusPresenca}
          </td>
          <td class="text-center">
            ${
              faltas30dias > 0
                ? `<span style="color: ${faltas30dias > 3 ? "var(--error)" : "var(--warning)"};">${faltas30dias} falta(s)</span>`
                : '<span style="color: var(--success);">0</span>'
            }
            <br><small style="color: var(--gray);">últimos 30 dias</small>
          </td>
          <td>
            <div style="display: flex; gap: 4px; justify-content: center;">
              <button 
                class="btn btn-ghost btn-sm" 
                data-action="ver-ficha-funcionario" 
                data-id="${func.id}" 
                title="Ver ficha completa"
              >
                <i class="ph ph-eye"></i>
              </button>
              <button 
                class="btn btn-ghost btn-sm" 
                data-action="editar-funcionario" 
                data-id="${func.id}" 
                title="Editar funcionário"
              >
                <i class="ph ph-pencil-simple"></i>
              </button>
              <button 
                class="btn btn-ghost btn-sm" 
                data-action="desligar-funcionario" 
                data-id="${func.id}" 
                title="Desligar funcionário"
                style="color: var(--error);"
              >
                <i class="ph ph-user-minus"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ============================================================
// RENDERIZAÇÃO DA SEÇÃO DE PONTO E FALTAS
// ============================================================
function renderizarSecaoPontoFaltas(pontosHoje, faltasRecentes, funcionarios) {
  const container = document.querySelector("#page-rh .panel-body");
  if (!container) return;

  // Remove seção anterior se existir
  const secaoAnterior = document.getElementById("secao-ponto-faltas");
  if (secaoAnterior) secaoAnterior.remove();

  // Cria a nova seção
  const secaoHTML = document.createElement("div");
  secaoHTML.id = "secao-ponto-faltas";
  secaoHTML.innerHTML = `
    <hr style="border-color: rgba(255,255,255,0.05); margin: 20px 0;">
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      
      <!-- PONTO DE HOJE -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-weight: 600;">Ponto de Hoje</h4>
          <button class="btn btn-ghost btn-sm" data-action="registrar-ponto">
            <i class="ph ph-clock"></i> Registrar Ponto
          </button>
        </div>
        <div style="overflow-x: auto;">
          <table class="table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                pontosHoje && pontosHoje.length > 0
                  ? pontosHoje
                      .map((p) => {
                        const func = funcionarios.find(
                          (f) => f.id === p.employee_id,
                        );
                        const nomeFunc = func ? func.full_name : "Desconhecido";
                        const entrada = p.check_in
                          ? new Date(p.check_in).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-";
                        const saida = p.check_out
                          ? new Date(p.check_out).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-";
                        const status = p.check_out ? "✅" : "🟢";

                        return `
                      <tr>
                        <td>${nomeFunc}</td>
                        <td>${entrada}</td>
                        <td>${saida}</td>
                        <td>${status} ${p.check_out ? "Concluído" : "Em andamento"}</td>
                      </tr>
                    `;
                      })
                      .join("")
                  : `<tr><td colspan="4" class="text-center" style="color: var(--gray); padding: 20px;">Nenhum registro de ponto hoje</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- FALTAS RECENTES -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-weight: 600;">Faltas Recentes (30 dias)</h4>
          <button class="btn btn-ghost btn-sm" data-action="registrar-falta" style="color: var(--error);">
            <i class="ph ph-x-circle"></i> Registrar Falta
          </button>
        </div>
        <div style="overflow-x: auto;">
          <table class="table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Data</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              ${
                faltasRecentes && faltasRecentes.length > 0
                  ? faltasRecentes
                      .map((f) => {
                        const func = funcionarios.find(
                          (fn) => fn.id === f.employee_id,
                        );
                        const nomeFunc = func ? func.full_name : "Desconhecido";
                        const tipoFormatado = formatarTipoFalta(f.type);

                        return `
                      <tr>
                        <td>${nomeFunc}</td>
                        <td>${formatDate(f.date)}</td>
                        <td>${tipoFormatado}</td>
                      </tr>
                    `;
                      })
                      .join("")
                  : `<tr><td colspan="3" class="text-center" style="color: var(--gray); padding: 20px;">Nenhuma falta registrada</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  container.appendChild(secaoHTML);
}

// ============================================================
// NOVO FUNCIONÁRIO
// ============================================================
async function novoFuncionario() {
  const formHtml = `
    <div class="form-group">
      <label class="form-label">Nome Completo *</label>
      <input id="funcNome" class="form-input" placeholder="Nome completo do funcionário" required>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div class="form-group">
        <label class="form-label">Função/Cargo *</label>
        <input id="funcFuncao" class="form-input" placeholder="Ex: Costureira, Ajudante, Supervisor..." required>
      </div>
      <div class="form-group">
        <label class="form-label">Matrícula</label>
        <input id="funcMatricula" class="form-input" placeholder="Número de matrícula (opcional)">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Tipo de Contratação *</label>
      <select id="funcTipo" class="form-select" onchange="atualizarCamposSalario()">
        <option value="comissionado">Comissionado (ganha por peça)</option>
        <option value="fixo">Salário Fixo</option>
        <option value="misto">Misto (fixo + comissão)</option>
      </select>
    </div>

    <div id="camposSalario" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
    </div>

    <div class="form-group">
      <label class="form-label">Data de Admissão *</label>
      <input id="funcAdmissao" type="date" class="form-input" value="${todayISO()}" required>
    </div>

    <div class="form-group">
      <label class="form-label">Observações</label>
      <textarea id="funcObservacoes" class="form-input" rows="2" placeholder="Informações adicionais..."></textarea>
    </div>
  `;

  openFormModal("Novo Funcionário", formHtml, async () => {
    const nome = $("#funcNome").value.trim();
    const funcao = $("#funcFuncao").value.trim();
    const matricula = $("#funcMatricula").value.trim() || null;
    const tipo = $("#funcTipo").value;
    const admissao = $("#funcAdmissao").value;
    const observacoes = $("#funcObservacoes").value.trim() || null;

    if (!nome || !funcao || !admissao) {
      showFeedback("Erro", "Preencha todos os campos obrigatórios.", "error");
      return;
    }

    let salarioMensal = 0;
    let comissaoPeca = 0;
    let diaria = 0;

    if (tipo === "fixo" || tipo === "misto") {
      salarioMensal = parseFloat($("#funcSalarioMensal")?.value) || 0;
    }
    if (tipo === "comissionado" || tipo === "misto") {
      comissaoPeca = parseFloat($("#funcComissaoPeca")?.value) || 0;
    }
    if (tipo === "fixo") {
      diaria = parseFloat($("#funcDiaria")?.value) || 0;
    }

    const insert = {
      full_name: nome,
      registration: matricula,
      role: funcao,
      wage_type: tipo,
      monthly_salary: salarioMensal,
      daily_rate: diaria,
      commission_per_piece: comissaoPeca,
      admission_date: admissao,
      active: true,
      notes: observacoes,
    };

    const { error } = await supabase.from("employees").insert(insert);

    if (error) {
      showFeedback("Erro", `Falha ao cadastrar: ${error.message}`, "error");
    } else {
      $("#modalContainer").innerHTML = "";
      showFeedback(
        "Sucesso",
        "Funcionário cadastrado com sucesso!",
        "success",
        () => {
          loadRH();
        },
      );
    }
  });

  // Inicializa os campos de salário
  atualizarCamposSalario();
}

// ============================================================
// ATUALIZAR CAMPOS DE SALÁRIO CONFORME TIPO
// ============================================================
function atualizarCamposSalario() {
  const container = document.getElementById("camposSalario");
  if (!container) return;

  const tipo = document.getElementById("funcTipo")?.value || "comissionado";

  switch (tipo) {
    case "comissionado":
      container.innerHTML = `
        <div class="form-group">
          <label class="form-label">Comissão por Peça (R$) *</label>
          <input id="funcComissaoPeca" type="number" step="0.01" min="0" class="form-input" placeholder="Ex: 2,50" required>
          <small style="color: var(--gray);">Valor pago por cada peça costurada</small>
        </div>
      `;
      break;
    case "fixo":
      container.innerHTML = `
        <div class="form-group">
          <label class="form-label">Salário Mensal (R$)</label>
          <input id="funcSalarioMensal" type="number" step="0.01" min="0" class="form-input" placeholder="Ex: 2000,00">
        </div>
        <div class="form-group">
          <label class="form-label">Diária (R$)</label>
          <input id="funcDiaria" type="number" step="0.01" min="0" class="form-input" placeholder="Ex: 80,00">
          <small style="color: var(--gray);">Valor pago por dia trabalhado</small>
        </div>
      `;
      break;
    case "misto":
      container.innerHTML = `
        <div class="form-group">
          <label class="form-label">Salário Mensal (R$)</label>
          <input id="funcSalarioMensal" type="number" step="0.01" min="0" class="form-input" placeholder="Ex: 1500,00">
        </div>
        <div class="form-group">
          <label class="form-label">Comissão por Peça (R$)</label>
          <input id="funcComissaoPeca" type="number" step="0.01" min="0" class="form-input" placeholder="Ex: 1,50">
          <small style="color: var(--gray);">Valor adicional por peça costurada</small>
        </div>
      `;
      break;
  }
}

// ============================================================
// VER FICHA COMPLETA DO FUNCIONÁRIO
// ============================================================
async function verFichaFuncionario(id) {
  const { data: func, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !func) {
    showFeedback("Erro", "Funcionário não encontrado.", "error");
    return;
  }

  // Busca últimos pontos (7 dias)
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const { data: pontos } = await supabase
    .from("time_tracking")
    .select("*")
    .eq("employee_id", id)
    .gte("check_in", seteDiasAtras.toISOString())
    .order("check_in", { ascending: false });

  // Busca faltas (últimos 90 dias)
  const noventaDiasAtras = new Date();
  noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);

  const { data: faltas } = await supabase
    .from("absences")
    .select("*")
    .eq("employee_id", id)
    .gte("date", noventaDiasAtras.toISOString().split("T")[0])
    .order("date", { ascending: false });

  // Busca produção recente (7 dias)
  const { data: producao } = await supabase
    .from("sewing_records")
    .select(
      `
      id,
      pieces_sewn,
      defects,
      start_time,
      service_order_items(service_order_id)
    `,
    )
    .eq("employee_id", id)
    .gte("start_time", seteDiasAtras.toISOString())
    .order("start_time", { ascending: false });

  const tipoFormatado = formatarTipoContratacao(func.wage_type);
  const statusFunc = func.active ? "Ativo" : "Desligado";

  // Soma produção da semana
  const totalPecasSemana = producao
    ? producao.reduce((sum, p) => sum + p.pieces_sewn, 0)
    : 0;
  const totalDefeitosSemana = producao
    ? producao.reduce((sum, p) => sum + (p.defects || 0), 0)
    : 0;

  const formHtml = `
    <div style="display: grid; gap: 16px;">
      
      <!-- Dados Pessoais -->
      <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px;">
        <h4 style="color: var(--gold-light); margin-bottom: 12px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, var(--pink-dark), var(--gold-dark)); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; margin-right: 8px; vertical-align: middle;">
            ${func.full_name.substring(0, 2).toUpperCase()}
          </div>
          ${func.full_name}
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <p><strong>Função:</strong> ${func.role}</p>
          <p><strong>Matrícula:</strong> ${func.registration || "-"}</p>
          <p><strong>Tipo:</strong> ${tipoFormatado}</p>
          <p><strong>Status:</strong> <span style="color: ${func.active ? "var(--success)" : "var(--error)"};">${statusFunc}</span></p>
          <p><strong>Admissão:</strong> ${formatDate(func.admission_date)}</p>
          ${func.termination_date ? `<p><strong>Desligamento:</strong> ${formatDate(func.termination_date)}</p>` : ""}
          ${func.wage_type === "comissionado" ? `<p><strong>Comissão:</strong> R$ ${func.commission_per_piece?.toFixed(2) || "0,00"} / peça</p>` : ""}
          ${func.wage_type === "fixo" ? `<p><strong>Salário:</strong> R$ ${func.monthly_salary?.toFixed(2) || "0,00"} / mês</p>` : ""}
          ${
            func.wage_type === "misto"
              ? `
            <p><strong>Salário Base:</strong> R$ ${func.monthly_salary?.toFixed(2) || "0,00"}</p>
            <p><strong>Comissão:</strong> R$ ${func.commission_per_piece?.toFixed(2) || "0,00"} / peça</p>
          `
              : ""
          }
        </div>
        ${func.notes ? `<p style="margin-top: 8px; color: var(--gray);"><strong>Obs:</strong> ${func.notes}</p>` : ""}
      </div>

      <!-- Resumo da Semana -->
      <div style="display: flex; gap: 12px;">
        <div style="flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 0.7rem; color: var(--gray);">Peças (7 dias)</div>
          <div style="font-size: 1.3rem; font-weight: 700;">${totalPecasSemana}</div>
        </div>
        <div style="flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 0.7rem; color: var(--gray);">Defeitos (7 dias)</div>
          <div style="font-size: 1.3rem; font-weight: 700; color: ${totalDefeitosSemana > 0 ? "var(--error)" : "var(--success)"};">${totalDefeitosSemana}</div>
        </div>
        <div style="flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 0.7rem; color: var(--gray);">Faltas (90 dias)</div>
          <div style="font-size: 1.3rem; font-weight: 700; color: ${faltas && faltas.length > 3 ? "var(--error)" : "var(--white)"};">${faltas ? faltas.length : 0}</div>
        </div>
      </div>

      <!-- Últimos Pontos -->
      <div>
        <h4 style="margin-bottom: 8px;">Últimos Registros de Ponto (7 dias)</h4>
        <div style="overflow-x: auto;">
          <table class="table">
            <thead>
              <tr><th>Data</th><th>Entrada</th><th>Saída</th></tr>
            </thead>
            <tbody>
              ${
                pontos && pontos.length > 0
                  ? pontos
                      .map(
                        (p) => `
                    <tr>
                      <td>${formatDate(p.check_in)}</td>
                      <td>${new Date(p.check_in).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>${p.check_out ? new Date(p.check_out).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : '<span style="color: var(--gray);">-</span>'}</td>
                    </tr>
                  `,
                      )
                      .join("")
                  : '<tr><td colspan="3" style="color: var(--gray);">Nenhum registro</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Faltas Recentes -->
      <div>
        <h4 style="margin-bottom: 8px;">Faltas Recentes (90 dias)</h4>
        <div style="overflow-x: auto;">
          <table class="table">
            <thead>
              <tr><th>Data</th><th>Tipo</th></tr>
            </thead>
            <tbody>
              ${
                faltas && faltas.length > 0
                  ? faltas
                      .map(
                        (f) => `
                    <tr>
                      <td>${formatDate(f.date)}</td>
                      <td>${formatarTipoFalta(f.type)}</td>
                    </tr>
                  `,
                      )
                      .join("")
                  : '<tr><td colspan="2" style="color: var(--gray);">Nenhuma falta</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  openFormModal(`Ficha: ${func.full_name}`, formHtml, () => {});
  replaceSubmitWithCloseButton();
}

// ============================================================
// EDITAR FUNCIONÁRIO
// ============================================================
async function editarFuncionario(id) {
  const { data: func, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !func) {
    showFeedback("Erro", "Funcionário não encontrado.", "error");
    return;
  }

  const formHtml = `
    <input type="hidden" id="editFuncId" value="${func.id}">

    <div class="form-group">
      <label class="form-label">Nome Completo *</label>
      <input id="editFuncNome" class="form-input" value="${escapeHtml(func.full_name)}" required>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div class="form-group">
        <label class="form-label">Função/Cargo *</label>
        <input id="editFuncFuncao" class="form-input" value="${escapeHtml(func.role)}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Matrícula</label>
        <input id="editFuncMatricula" class="form-input" value="${func.registration || ""}">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Tipo de Contratação *</label>
      <select id="editFuncTipo" class="form-select">
        <option value="comissionado" ${func.wage_type === "comissionado" ? "selected" : ""}>Comissionado</option>
        <option value="fixo" ${func.wage_type === "fixo" ? "selected" : ""}>Salário Fixo</option>
        <option value="misto" ${func.wage_type === "misto" ? "selected" : ""}>Misto</option>
      </select>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div class="form-group">
        <label class="form-label">Salário Mensal (R$)</label>
        <input id="editFuncSalario" type="number" step="0.01" min="0" class="form-input" value="${func.monthly_salary || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Comissão por Peça (R$)</label>
        <input id="editFuncComissao" type="number" step="0.01" min="0" class="form-input" value="${func.commission_per_piece || 0}">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Data de Admissão</label>
      <input id="editFuncAdmissao" type="date" class="form-input" value="${func.admission_date || ""}">
    </div>

    <div class="form-group">
      <label class="form-label">Observações</label>
      <textarea id="editFuncObs" class="form-input" rows="2">${escapeHtml(func.notes || "")}</textarea>
    </div>
  `;

  openFormModal("Editar Funcionário", formHtml, async () => {
    const updates = {
      full_name: $("#editFuncNome").value.trim(),
      role: $("#editFuncFuncao").value.trim(),
      registration: $("#editFuncMatricula").value.trim() || null,
      wage_type: $("#editFuncTipo").value,
      monthly_salary: parseFloat($("#editFuncSalario").value) || 0,
      commission_per_piece: parseFloat($("#editFuncComissao").value) || 0,
      admission_date: $("#editFuncAdmissao").value,
      notes: $("#editFuncObs").value.trim() || null,
    };

    const { error: updateError } = await supabase
      .from("employees")
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
        "Funcionário atualizado com sucesso!",
        "success",
        () => {
          loadRH();
        },
      );
    }
  });
}

// ============================================================
// DESLIGAR FUNCIONÁRIO
// ============================================================
async function desligarFuncionario(id) {
  const { data: func } = await supabase
    .from("employees")
    .select("full_name")
    .eq("id", id)
    .single();

  if (!func) {
    showFeedback("Erro", "Funcionário não encontrado.", "error");
    return;
  }

  openFormModal(
    "Desligar Funcionário",
    `
      <p>Deseja realmente desligar <strong>${func.full_name}</strong>?</p>
      <p style="color: var(--gray);">O funcionário será marcado como inativo e a data de desligamento será registrada.</p>
      <p style="color: var(--warning);">⚠️ Esta ação pode ser revertida depois, se necessário.</p>
      <div class="form-group">
        <label class="form-label">Data de Desligamento</label>
        <input id="desligamentoData" type="date" class="form-input" value="${todayISO()}" required>
      </div>
    `,
    async () => {
      const dataDesligamento = $("#desligamentoData")?.value || todayISO();

      const { error } = await supabase
        .from("employees")
        .update({
          active: false,
          termination_date: dataDesligamento,
        })
        .eq("id", id);

      if (error) {
        showFeedback("Erro", `Falha ao desligar: ${error.message}`, "error");
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          `${func.full_name} foi desligado(a).`,
          "success",
          () => {
            loadRH();
          },
        );
      }
    },
  );
}

// ============================================================
// REGISTRAR PONTO
// ============================================================
async function registrarPonto() {
  const { data: funcs } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name");

  const fOpts =
    funcs && funcs.length > 0
      ? funcs
          .map((f) => `<option value="${f.id}">${f.full_name}</option>`)
          .join("")
      : '<option value="">Nenhum funcionário ativo</option>';

  const formHtml = `
    <div class="form-group">
      <label class="form-label">Funcionário *</label>
      <select id="pontoFunc" class="form-select" required>
        <option value="">Selecione...</option>
        ${fOpts}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Tipo de Registro *</label>
      <div style="display: flex; gap: 12px; margin-top: 4px;">
        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <input type="radio" name="tipoPonto" value="in" checked>
          <i class="ph ph-arrow-circle-up" style="color: var(--success);"></i> Entrada
        </label>
        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <input type="radio" name="tipoPonto" value="out">
          <i class="ph ph-arrow-circle-down" style="color: var(--error);"></i> Saída
        </label>
      </div>
    </div>
  `;

  openFormModal("Registrar Ponto", formHtml, async () => {
    const empId = $("#pontoFunc").value;
    const tipo = document.querySelector(
      'input[name="tipoPonto"]:checked',
    )?.value;
    const now = new Date().toISOString();

    if (!empId) {
      showFeedback("Erro", "Selecione um funcionário.", "error");
      return;
    }

    if (tipo === "in") {
      const { error } = await supabase.from("time_tracking").insert({
        employee_id: empId,
        check_in: now,
      });

      if (error) {
        showFeedback("Erro", `Falha ao registrar: ${error.message}`, "error");
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          "Entrada registrada com sucesso!",
          "success",
          () => loadRH(),
        );
      }
    } else {
      // Busca o último ponto sem saída
      const { data: last, error: lastError } = await supabase
        .from("time_tracking")
        .select("id")
        .eq("employee_id", empId)
        .is("check_out", null)
        .order("check_in", { ascending: false })
        .limit(1)
        .single();

      if (lastError || !last) {
        showFeedback(
          "Erro",
          "Nenhum ponto de entrada em aberto encontrado. Registre a entrada primeiro.",
          "error",
        );
        return;
      }

      const { error: updateError } = await supabase
        .from("time_tracking")
        .update({ check_out: now })
        .eq("id", last.id);

      if (updateError) {
        showFeedback(
          "Erro",
          `Falha ao registrar: ${updateError.message}`,
          "error",
        );
      } else {
        $("#modalContainer").innerHTML = "";
        showFeedback(
          "Sucesso",
          "Saída registrada com sucesso!",
          "success",
          () => loadRH(),
        );
      }
    }
  });
}

// ============================================================
// REGISTRAR FALTA
// ============================================================
async function registrarFalta() {
  const { data: funcs } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name");

  const fOpts =
    funcs && funcs.length > 0
      ? funcs
          .map((f) => `<option value="${f.id}">${f.full_name}</option>`)
          .join("")
      : '<option value="">Nenhum funcionário ativo</option>';

  const formHtml = `
    <div class="form-group">
      <label class="form-label">Funcionário *</label>
      <select id="faltaFunc" class="form-select" required>
        <option value="">Selecione...</option>
        ${fOpts}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Data da Falta *</label>
      <input id="faltaData" type="date" class="form-input" value="${todayISO()}" required>
    </div>

    <div class="form-group">
      <label class="form-label">Tipo de Falta *</label>
      <select id="faltaTipo" class="form-select" required>
        <option value="falta_injustificada">Falta Injustificada</option>
        <option value="falta_justificada">Falta Justificada</option>
        <option value="atestado">Atestado Médico</option>
        <option value="ferias">Férias</option>
        <option value="licenca">Licença</option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Observações</label>
      <textarea id="faltaObs" class="form-input" rows="2" placeholder="Detalhes sobre a falta..."></textarea>
    </div>
  `;

  openFormModal("Registrar Falta", formHtml, async () => {
    const empId = $("#faltaFunc").value;
    const data = $("#faltaData").value;
    const tipo = $("#faltaTipo").value;
    const obs = $("#faltaObs").value.trim() || null;

    if (!empId || !data || !tipo) {
      showFeedback("Erro", "Preencha todos os campos obrigatórios.", "error");
      return;
    }

    const { error } = await supabase.from("absences").insert({
      employee_id: empId,
      date: data,
      type: tipo,
      notes: obs,
    });

    if (error) {
      showFeedback("Erro", `Falha ao registrar: ${error.message}`, "error");
    } else {
      $("#modalContainer").innerHTML = "";
      showFeedback("Sucesso", "Falta registrada com sucesso.", "success", () =>
        loadRH(),
      );
    }
  });
}

// ============================================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO
// ============================================================
function formatarTipoContratacao(tipo) {
  const map = {
    fixo: "Salário Fixo",
    comissionado: "Comissionado",
    misto: "Misto (Fixo + Comissão)",
  };
  return map[tipo] || tipo;
}

function formatarTipoFalta(tipo) {
  const map = {
    falta_injustificada: "❌ Injustificada",
    falta_justificada: "⚠️ Justificada",
    atestado: "🏥 Atestado",
    ferias: "🏖️ Férias",
    licenca: "📋 Licença",
  };
  return map[tipo] || tipo;
}

// ============================================================
// DELEGAÇÃO DE EVENTOS DO RH
// ============================================================
function setupRHDelegation() {
  document.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    switch (action) {
      case "novo-funcionario":
        e.preventDefault();
        await novoFuncionario();
        break;
      case "ver-ficha-funcionario":
        e.preventDefault();
        await verFichaFuncionario(id);
        break;
      case "editar-funcionario":
        e.preventDefault();
        await editarFuncionario(id);
        break;
      case "desligar-funcionario":
        e.preventDefault();
        await desligarFuncionario(id);
        break;
      case "registrar-ponto":
        e.preventDefault();
        await registrarPonto();
        break;
      case "registrar-falta":
        e.preventDefault();
        await registrarFalta();
        break;
    }
  });
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function initRH() {
  setupRHDelegation();
}

// ============================================================
// EXPORTAÇÃO PARA O ESCOPO GLOBAL
// ============================================================
window.loadRH = loadRH;
window.novoFuncionario = novoFuncionario;
window.verFichaFuncionario = verFichaFuncionario;
window.editarFuncionario = editarFuncionario;
window.desligarFuncionario = desligarFuncionario;
window.registrarPonto = registrarPonto;
window.registrarFalta = registrarFalta;
window.formatarTipoContratacao = formatarTipoContratacao;
window.formatarTipoFalta = formatarTipoFalta;
window.atualizarCamposSalario = atualizarCamposSalario;
window.initRH = initRH;
