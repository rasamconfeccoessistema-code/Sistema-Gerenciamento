// ============================================================
// MODALS.JS
// Gerenciamento de modais (feedback e formulários)
// Facção de Jeans - Sistema de Gestão
// ============================================================

/**
 * Exibe um modal de feedback (sucesso, erro, aviso, info)
 * @param {string} title - Título do modal
 * @param {string} message - Mensagem principal (pode conter HTML)
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {function} callback - Função executada ao fechar o modal
 */
function showFeedback(title, message, type = "success", callback = null) {
  const icons = {
    success: "✓",
    error: "✗",
    warning: "!",
    info: "i",
  };
  const colors = {
    success: "#4caf50",
    error: "#ff5252",
    warning: "#ffc107",
    info: "#64b5f6",
  };

  const html = `
    <div class="modal-overlay" id="feedbackOverlay">
      <div class="modal" style="max-width:400px; text-align:center; padding: var(--space-4); max-height: 90vh;">
        <div style="font-size:3rem; margin-bottom:12px; color:${colors[type] || colors.info};">
          ${icons[type] || icons.info}
        </div>
        <h3 style="margin-bottom:8px;">${title}</h3>
        <p style="color:#ccc; margin-bottom:20px;">${message}</p>
        <button class="btn btn-primary" id="feedbackOkBtn">OK</button>
      </div>
    </div>
  `;

  const container = document.getElementById("modalContainer");
  if (!container) {
    console.error("Elemento #modalContainer não encontrado no DOM.");
    return;
  }
  container.innerHTML = html;

  const closeModal = () => {
    container.innerHTML = "";
    if (typeof callback === "function") {
      callback();
    }
  };

  document
    .getElementById("feedbackOkBtn")
    .addEventListener("click", closeModal);

  document.getElementById("feedbackOverlay").addEventListener("click", (e) => {
    if (e.target.id === "feedbackOverlay") {
      closeModal();
    }
  });

  document.addEventListener("keydown", function escFeed(e) {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escFeed);
    }
  });
}

/**
 * Abre um modal com formulário dinâmico.
 * O modal agora usa padding reduzido e altura máxima de 90% da tela
 * para evitar barras de rolagem verticais desnecessárias.
 * @param {string} title - Título do modal
 * @param {string} formHtml - Conteúdo HTML do formulário
 * @param {function} onSubmit - Função assíncrona executada ao submeter o formulário
 */
function openFormModal(title, formHtml, onSubmit) {
  const html = `
    <div class="modal-overlay" id="formOverlay">
      <div class="modal" style="max-width:520px; padding: var(--space-4); max-height: 90vh; overflow-y: auto;">
        <div class="modal-header" style="margin-bottom: var(--space-3);">
          <h3>${title}</h3>
          <button class="modal-close" id="closeFormModal">&times;</button>
        </div>
        <form id="dynamicForm" style="display:grid; gap:8px;">
          ${formHtml}
          <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Salvar</button>
        </form>
      </div>
    </div>
  `;

  const container = document.getElementById("modalContainer");
  if (!container) {
    console.error("Elemento #modalContainer não encontrado no DOM.");
    return;
  }
  container.innerHTML = html;

  const closeModal = () => {
    container.innerHTML = "";
  };

  document
    .getElementById("closeFormModal")
    .addEventListener("click", closeModal);

  document.getElementById("formOverlay").addEventListener("click", (e) => {
    if (e.target.id === "formOverlay") {
      closeModal();
    }
  });

  document.addEventListener("keydown", function escForm(e) {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escForm);
    }
  });

  document
    .getElementById("dynamicForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      await onSubmit();
    });
}

/**
 * Substitui o botão de submit do formulário dinâmico por um botão "Fechar".
 * Útil para modais de visualização onde não há ação de salvar.
 */
function replaceSubmitWithCloseButton() {
  const form = document.getElementById("dynamicForm");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.remove();
  }

  const btnOk = document.createElement("button");
  btnOk.type = "button";
  btnOk.className = "btn btn-primary";
  btnOk.textContent = "Fechar";
  btnOk.addEventListener("click", () => {
    const container = document.getElementById("modalContainer");
    if (container) {
      container.innerHTML = "";
    }
  });

  form.appendChild(btnOk);
}

// Expor funções no escopo global
window.showFeedback = showFeedback;
window.openFormModal = openFormModal;
window.replaceSubmitWithCloseButton = replaceSubmitWithCloseButton;
