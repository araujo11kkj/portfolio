const STORAGE_KEYS = { transactions: "meuBolso.transactions.v1", goals: "meuBolso.goals.v1" };
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
};
const monthISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
const readStorage = (key) => {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
};
let transactions = readStorage(STORAGE_KEYS.transactions);
let goals = readStorage(STORAGE_KEYS.goals);
let toastTimeout;
const icons = { "Alimentação":"☕", "Transporte":"⌁", "Lazer":"♫", "Estudos":"▤", "Contas":"⌂", "Salário / mesada":"↙", "Economia":"◎", "Outros":"✦" };

function persist() {
  try {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
  } catch {
    showToast("Não foi possível salvar neste navegador. Verifique o espaço disponível.");
  }
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
}
function currentMonthTransactions() {
  const selected = $("#historyMonth").value || monthISO();
  return transactions.filter(item => item.date.slice(0,7) === selected);
}
function sum(items, type) {
  return items.filter(item => item.type === type).reduce((total, item) => total + Number(item.amount), 0);
}
function renderSummary() {
  const thisMonth = transactions.filter(item => item.date.slice(0,7) === monthISO());
  $("#balanceValue").textContent = money(sum(transactions,"income") - sum(transactions,"expense"));
  $("#incomeValue").textContent = money(sum(thisMonth,"income"));
  $("#expenseValue").textContent = money(sum(thisMonth,"expense"));
  renderHistory();
}
function formatDate(iso) {
  if (!iso) return "";
  const [year,month,day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short"}).format(new Date(year,month-1,day)).replace(".","");
}
function renderTransactions() {
  const query = $("#searchTransactions").value.trim().toLocaleLowerCase("pt-BR");
  const type = $("#typeFilter").value;
  const filtered = [...transactions].filter(item => {
    const matchesText = `${item.description} ${item.category}`.toLocaleLowerCase("pt-BR").includes(query);
    return matchesText && (type === "all" || item.type === type);
  }).sort((a,b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const list = $("#transactionList");
  if (!filtered.length) {
    const isSearching = query || type !== "all";
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">${isSearching ? "⌕" : "↕"}</span><strong>${isSearching ? "Nenhum resultado encontrado" : "Nenhuma transação ainda"}</strong><p>${isSearching ? "Tente mudar a busca ou o filtro." : "Adicione sua primeira entrada ou saída para começar."}</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(item => `
    <div class="transaction-row">
      <div class="transaction-symbol ${item.type}">${icons[item.category] || "✦"}</div>
      <div><div class="transaction-name">${escapeHTML(item.description)}</div><div class="transaction-meta">${escapeHTML(item.category)} · ${formatDate(item.date)}</div></div>
      <div class="transaction-amount ${item.type}">${item.type === "income" ? "+" : "−"} ${money(item.amount)}</div>
      <button class="delete-transaction" data-delete-transaction="${item.id}" aria-label="Excluir ${escapeHTML(item.description)}" title="Excluir transação">×</button>
    </div>`).join("");
}
function renderGoals() {
  const container = $("#goalList");
  if (!goals.length) {
    container.innerHTML = `<div class="empty-state compact"><span class="empty-icon">◎</span><strong>Suas metas começam aqui</strong><p>Crie uma meta e acompanhe seu progresso.</p></div>`;
    return;
  }
  container.innerHTML = goals.map(goal => {
    const target = Math.max(0.01, Number(goal.target));
    const saved = Math.max(0, Number(goal.saved));
    const percent = Math.min(100, Math.round(saved / target * 100));
    return `<div class="goal-item">
      <div class="goal-title-row"><span class="goal-title">${escapeHTML(goal.name)}</span><span class="goal-percent">${percent}%</span></div>
      <div class="goal-values"><span><strong>${money(saved)}</strong> guardados</span><span>de ${money(target)}</span></div>
      <div class="progress-track" role="progressbar" aria-label="Progresso de ${escapeHTML(goal.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="progress-fill" style="width:${percent}%"></div></div>
      <div class="goal-actions"><button class="goal-action" data-add-savings="${goal.id}">＋ Guardar dinheiro</button><button class="goal-action delete" data-delete-goal="${goal.id}">Excluir</button></div>
    </div>`;
  }).join("");
}
function renderHistory() {
  const selected = $("#historyMonth").value || monthISO();
  const items = transactions.filter(item => item.date.slice(0,7) === selected);
  const income = sum(items,"income"), expense = sum(items,"expense"), result = income-expense;
  $("#historyIncome").textContent = money(income);
  $("#historyExpense").textContent = money(expense);
  $("#historyResult").textContent = money(result);
  $("#historyResult").style.color = result < 0 ? "#c55e63" : "var(--green)";
  const bars = $("#historyBars");
  if (!items.length) {
    bars.innerHTML = `<div class="history-empty">Não há transações neste mês. Escolha outro período ou adicione registros.</div>`;
    return;
  }
  const selectedDate = new Date(Number(selected.slice(0,4)), Number(selected.slice(5,7))-1, 1);
  const monthNames = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const monthly = [];
  for (let offset=5; offset>=0; offset--) {
    const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth()-offset, 1);
    const key = monthISO(d);
    const monthItems = transactions.filter(item => item.date.slice(0,7) === key);
    monthly.push({ label: monthNames[d.getMonth()], income: sum(monthItems,"income"), expense: sum(monthItems,"expense") });
  }
  const max = Math.max(1, ...monthly.flatMap(m => [m.income,m.expense]));
  bars.innerHTML = monthly.map(m => `<div class="month-bar" title="${m.label}: entradas ${money(m.income)}; saídas ${money(m.expense)}"><div class="bar-pair"><div class="bar income" style="height:${Math.max(m.income ? 4 : 0,m.income/max*46)}px"></div><div class="bar expense" style="height:${Math.max(m.expense ? 4 : 0,m.expense/max*46)}px"></div></div><span class="bar-label">${m.label}</span></div>`).join("");
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]));
}
function refresh() { persist(); renderSummary(); renderTransactions(); renderGoals(); }

$("#historyMonth").value = monthISO();
$("#transactionForm").elements.date.value = todayISO();
$("#openTransaction").addEventListener("click", () => {
  $("#transactionForm").reset();
  $("#transactionForm").elements.date.value = todayISO();
  $("#transactionDialog").showModal();
});
$("#addGoal").addEventListener("click", () => $("#goalDialog").showModal());
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => $("#" + button.dataset.close).close()));
$("#transactionForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const amount = Number(data.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) { showToast("Digite um valor maior que zero."); return; }
  transactions.push({
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random())),
    type: data.get("transactionType"),
    description: String(data.get("description")).trim(),
    amount,
    date: data.get("date"),
    category: data.get("category"),
    createdAt: Date.now()
  });
  $("#transactionDialog").close();
  refresh();
  showToast("Transação salva com sucesso!");
});
$("#goalForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const target = Number(data.get("goalTarget")), saved = Number(data.get("goalSaved"));
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0) { showToast("Confira os valores da sua meta."); return; }
  goals.push({ id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random())), name: String(data.get("goalName")).trim(), target, saved });
  $("#goalDialog").close();
  event.currentTarget.reset();
  refresh();
  showToast("Meta criada! Bora chegar lá.");
});
$("#transactionList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-transaction]");
  if (!button) return;
  transactions = transactions.filter(item => item.id !== button.dataset.deleteTransaction);
  refresh();
  showToast("Transação excluída.");
});
$("#goalList").addEventListener("click", event => {
  const addButton = event.target.closest("[data-add-savings]");
  const deleteButton = event.target.closest("[data-delete-goal]");
  if (deleteButton) {
    goals = goals.filter(goal => goal.id !== deleteButton.dataset.deleteGoal);
    refresh();
    showToast("Meta excluída.");
  }
  if (addButton) {
    const goal = goals.find(item => item.id === addButton.dataset.addSavings);
    if (!goal) return;
    const raw = prompt(`Quanto você quer adicionar à meta "${goal.name}"? (R$)`, "");
    if (raw === null) return;
    const amount = Number(raw.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) { showToast("Digite um valor válido maior que zero."); return; }
    goal.saved = Number(goal.saved) + amount;
    refresh();
    showToast(Number(goal.saved) >= Number(goal.target) ? "Meta alcançada! Parabéns! 🎉" : "Progresso atualizado!");
  }
});
$("#searchTransactions").addEventListener("input", renderTransactions);
$("#typeFilter").addEventListener("change", renderTransactions);
$("#historyMonth").addEventListener("change", renderHistory);
$("#viewAll").addEventListener("click", () => {
  $("#searchTransactions").value = "";
  $("#typeFilter").value = "all";
  renderTransactions();
  $("#transacoes").scrollIntoView({ behavior:"smooth", block:"start" });
});
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
  link.classList.add("active");
}));
refresh();
