// ============================================================
// UTILS.JS
// Funções utilitárias e formatações compartilhadas
// Facção de Jeans - Sistema de Gestão
// ============================================================

// ATALHOS PARA SELETORES DOM
window.$ = (s) => document.querySelector(s);
window.$$ = (s) => document.querySelectorAll(s);

// ============================================================
// FORMATAÇÃO DE STATUS
// ============================================================

/**
 * Converte um status técnico (ex: "em_costura") para uma versão legível ("Em Costura")
 * @param {string} s - Status no formato snake_case
 * @returns {string} Status formatado para exibição
 */
function formatStatus(s) {
  const map = {
    recebido: "Recebido",
    em_costura: "Em Costura",
    costurado: "Costurado",
    em_revisao: "Em Revisão",
    entregue: "Entregue",
    cancelado: "Cancelado",
    parcialmente_entregue: "Parcialmente Entregue",
  };
  return map[s] || s || "-";
}

// ============================================================
// FORMATAÇÃO DE VALORES MONETÁRIOS
// ============================================================

/**
 * Formata um número para o padrão de moeda brasileira (R$)
 * @param {number} value - Valor a ser formatado
 * @returns {string} String formatada (ex: "R$ 1.500,00")
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return "R$ 0,00";
  return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

// ============================================================
// FORMATAÇÃO DE DATAS
// ============================================================

/**
 * Formata uma data ISO (YYYY-MM-DD) para o padrão brasileiro (dd/mm/aaaa)
 * @param {string} isoString - Data no formato ISO ou qualquer string parseável
 * @returns {string} Data formatada ou "-" se inválida
 */
function formatDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

/**
 * Formata uma data ISO para exibição completa (data e hora)
 * @param {string} isoString - Data no formato ISO
 * @returns {string} Data e hora formatadas (ex: "15/05/2025 14:30")
 */
function formatDateTime(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

/**
 * Retorna a data de hoje no formato ISO (YYYY-MM-DD)
 * @returns {string} Data atual em ISO
 */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ============================================================
// FORMATAÇÃO DE NÚMEROS
// ============================================================

/**
 * Formata um número para exibição, removendo decimais desnecessários.
 * Se for inteiro, mostra sem casas decimais; caso contrário, mostra até 2 casas.
 * @param {number} num - Número a ser formatado
 * @returns {string} Número formatado
 */
function formatNumero(num) {
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(2)).toString();
}

// ============================================================
// MANIPULAÇÃO DE TEXTOS
// ============================================================

/**
 * Capitaliza a primeira letra de uma string e mantém o restante em minúsculas
 * @param {string} str - String a ser capitalizada
 * @returns {string} String com a primeira letra maiúscula
 */
function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Escapa caracteres HTML especiais para evitar injeção de código
 * @param {string} str - String com possível conteúdo HTML
 * @returns {string} String segura para inserção no DOM
 */
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// GERAÇÃO DE IDENTIFICADORES
// ============================================================

/**
 * Gera um número de OS único baseado no timestamp atual
 * @returns {string} Número de OS no formato "OS-{timestamp}"
 */
function generateOrderNumber() {
  return "OS-" + Date.now();
}

// ============================================================
// FORMATAÇÕES ESPECÍFICAS DO DOMÍNIO
// ============================================================

/**
 * Converte o tipo de contratação (wage_type) para exibição
 * @param {string} tipo - Tipo de contratação (fixo, comissionado, misto)
 * @returns {string} Descrição legível
 */
function formatarTipoContratacao(tipo) {
  const map = {
    fixo: "Salário Fixo",
    comissionado: "Comissionado",
    misto: "Misto (Fixo + Comissão)",
  };
  return map[tipo] || tipo || "-";
}

/**
 * Converte o tipo de falta para exibição com ícone
 * @param {string} tipo - Tipo de falta (falta_injustificada, falta_justificada, etc.)
 * @returns {string} Descrição com ícone
 */
function formatarTipoFalta(tipo) {
  const map = {
    falta_injustificada: "❌ Injustificada",
    falta_justificada: "⚠️ Justificada",
    atestado: "🏥 Atestado",
    ferias: "🏖️ Férias",
    licenca: "📋 Licença",
  };
  return map[tipo] || tipo || "-";
}

// ============================================================
// CADASTRO RÁPIDO DE CLIENTE (Modal simples)
// ============================================================

/**
 * Abre um modal para cadastro rápido de cliente.
 * Após o cadastro bem-sucedido, chama o callback com os dados do novo cliente.
 * @param {function} callback - Função que recebe o objeto do cliente criado
 */
async function cadastrarClienteRapido(callback) {
  const formHtml = `
    <div class="form-group">
      <label class="form-label">Razão Social *</label>
      <input id="clienteRazao" class="form-input" placeholder="Nome da empresa" required>
    </div>
    <div class="form-group">
      <label class="form-label">Nome Fantasia</label>
      <input id="clienteFantasia" class="form-input" placeholder="Como aparece na lista">
    </div>
    <div class="form-group">
      <label class="form-label">CNPJ</label>
      <input id="clienteCnpj" class="form-input" placeholder="Apenas números (opcional)">
    </div>
    <div class="form-group">
      <label class="form-label">Contato</label>
      <input id="clienteContato" class="form-input" placeholder="Nome da pessoa de contato">
    </div>
    <div class="form-group">
      <label class="form-label">Telefone</label>
      <input id="clienteTelefone" class="form-input" placeholder="(11) 99999-9999">
    </div>
    <div class="form-group">
      <label class="form-label">E-mail</label>
      <input id="clienteEmail" type="email" class="form-input" placeholder="email@exemplo.com">
    </div>
  `;

  openFormModal("Cadastro Rápido de Cliente", formHtml, async () => {
    const razao = document.getElementById("clienteRazao").value.trim();
    if (!razao) {
      showFeedback("Erro", "Razão social é obrigatória.", "error");
      return;
    }

    const insert = {
      company_name: razao,
      trade_name:
        document.getElementById("clienteFantasia").value.trim() || razao,
      cnpj: document.getElementById("clienteCnpj").value.trim() || null,
      contact_name:
        document.getElementById("clienteContato").value.trim() || null,
      phone: document.getElementById("clienteTelefone").value.trim() || null,
      email: document.getElementById("clienteEmail").value.trim() || null,
      active: true,
    };

    const { data, error } = await supabase
      .from("customers")
      .insert(insert)
      .select("id, company_name, trade_name")
      .single();

    if (error) {
      showFeedback("Erro", `Falha ao cadastrar: ${error.message}`, "error");
      return;
    }

    // Fecha o modal de cadastro
    document.getElementById("modalContainer").innerHTML = "";

    // Chama o callback passando o novo cliente
    if (callback) callback(data);

    showFeedback(
      "Sucesso",
      `Cliente "${data.trade_name || data.company_name}" cadastrado!`,
      "success",
    );
  });
}

// ============================================================
// EXPORTAÇÃO GLOBAL
// ============================================================
window.formatStatus = formatStatus;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.todayISO = todayISO;
window.formatNumero = formatNumero;
window.capitalizeFirst = capitalizeFirst;
window.escapeHtml = escapeHtml;
window.generateOrderNumber = generateOrderNumber;
window.formatarTipoContratacao = formatarTipoContratacao;
window.formatarTipoFalta = formatarTipoFalta;
window.cadastrarClienteRapido = cadastrarClienteRapido;
