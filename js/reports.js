import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { requireAuth, setupLogout, setupMobileMenu } from "./auth.js";

const LOCATIONS = ['Matriz', 'Mucambo', 'Tianguá', 'Frecheirinha'];

let allTransfers = [];
let catalogMap = { code: {}, name: {} };
let activeTab = 'individual';

const els = {
  tabIndiv: document.getElementById('tab-individual'),
  tabComp: document.getElementById('tab-comparative'),
  filterLocContainer: document.getElementById('filter-location-container'),
  filterLoc: document.getElementById('filter-location'),
  filterMonth: document.getElementById('filter-month'),
  filterUnit: document.getElementById('filter-unit'),
  filterSort: document.getElementById('filter-sort'),
  filterGroup: document.getElementById('filter-group'),
  btnRefresh: document.getElementById('btn-refresh'),
  container: document.getElementById('report-view-container'),
  
  // Modal
  modal: document.getElementById('product-modal'),
  modalBg: document.getElementById('product-modal'), // The backdrop
  modalContent: document.getElementById('product-modal-content'),
  btnCloseModal: document.getElementById('close-product-modal'),
  modalTitle: document.getElementById('modal-product-name'),
  modalCode: document.getElementById('modal-product-code'),
  modalAlert: document.getElementById('modal-anomaly-alert'),
  modalTbody: document.getElementById('modal-history-tbody'),
};

async function init() {
  await requireAuth();
  setupLogout();
  setupMobileMenu();
  
  const today = new Date();
  els.filterMonth.value = localStorage.getItem('vanilla_report_month') || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  els.filterLoc.value = localStorage.getItem('vanilla_report_loc') || 'Mucambo';

  setupEvents();
  await fetchCatalog();
  await fetchReport();
}

function setupEvents() {
  els.tabIndiv.addEventListener('click', () => switchTab('individual'));
  els.tabComp.addEventListener('click', () => switchTab('comparative'));
  
  els.btnRefresh.addEventListener('click', fetchReport);
  
  [els.filterLoc, els.filterMonth, els.filterUnit, els.filterSort, els.filterGroup].forEach(el => {
    el.addEventListener('change', () => {
      localStorage.setItem('vanilla_report_month', els.filterMonth.value);
      localStorage.setItem('vanilla_report_loc', els.filterLoc.value);
      renderView();
    });
  });

  els.btnCloseModal.addEventListener('click', closeModal);
  els.modalBg.addEventListener('click', (e) => {
    if (e.target === els.modalBg) closeModal();
  });
}

function switchTab(tab) {
  activeTab = tab;
  if (tab === 'individual') {
    els.tabIndiv.classList.replace('tab-inactive', 'tab-active');
    els.tabComp.classList.replace('tab-active', 'tab-inactive');
    els.filterLocContainer.classList.remove('hidden');
  } else {
    els.tabComp.classList.replace('tab-inactive', 'tab-active');
    els.tabIndiv.classList.replace('tab-active', 'tab-inactive');
    els.filterLocContainer.classList.add('hidden');
  }
  renderView();
}

async function fetchCatalog() {
  try {
    const docSnap = await getDoc(doc(db, 'catalog', 'main'));
    if (docSnap.exists() && docSnap.data().products) {
      docSnap.data().products.forEach(p => {
        if (p.code) catalogMap.code[String(p.code)] = p.group || 'SEM GRUPO';
        if (p.name) catalogMap.name[p.name] = p.group || 'SEM GRUPO';
      });
    }
  } catch (err) {
    console.error("Erro catálogo", err);
  }
}

async function fetchReport() {
  const month = els.filterMonth.value;
  if (!month) return;
  
  els.btnRefresh.disabled = true;
  els.btnRefresh.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Atualizando...`;
  lucide.createIcons();

  try {
    const q = query(collection(db, 'transfers'), where('referenceMonth', '==', month));
    const snap = await getDocs(q);
    allTransfers = snap.docs.map(d => d.data());
    
    updateUnitFilter();
    renderView();
  } catch (err) {
    console.error("Erro busca", err);
    els.container.innerHTML = `<div class="p-12 text-center text-red-500 bg-white rounded-xl">Erro ao buscar dados.</div>`;
  } finally {
    els.btnRefresh.disabled = false;
    els.btnRefresh.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i> Atualizar Dados`;
    lucide.createIcons();
  }
}

function updateUnitFilter() {
  const units = new Set();
  allTransfers.forEach(tr => {
    tr.items?.forEach(item => units.add((item.unit || 'UN').toUpperCase()));
  });
  
  const currentVal = els.filterUnit.value;
  const unitArr = ['TODAS', ...Array.from(units).sort()];
  
  els.filterUnit.innerHTML = unitArr.map(u => `<option value="${u}">${u === 'TODAS' ? 'Todas' : u}</option>`).join('');
  
  if (unitArr.includes(currentVal)) {
    els.filterUnit.value = currentVal;
  }
}

// Processing Logic
function processIndividual() {
  const loc = els.filterLoc.value;
  const unitFilter = els.filterUnit.value;
  const isGrouped = els.filterGroup.checked;
  const sortBy = els.filterSort.value;

  const summary = {};
  const groupTotals = {};
  const groupQtys = {};
  let totalGeral = 0;

  const filtered = allTransfers.filter(t => t.destination === loc);

  filtered.forEach(tr => {
    tr.items?.forEach(item => {
      const unit = (item.unit || 'UN').toUpperCase();
      if (unitFilter !== 'TODAS' && unit !== unitFilter) return;

      const codeStr = item.code ? String(item.code) : '';
      const actualGroup = (codeStr && catalogMap.code[codeStr]) || catalogMap.name[item.product] || 'SEM GRUPO';
      const group = isGrouped ? actualGroup : 'LISTA GERAL DE PRODUTOS';
      const key = codeStr ? `${codeStr}-${item.product}-${unit}` : `${item.product}-${unit}`;

      if (!summary[group]) summary[group] = {};
      if (!summary[group][key]) {
        summary[group][key] = {
          codigo: codeStr, nome: item.product, unidadeMedida: unit,
          quantidade: 0, valorUnitario: item.unitValue || 0, valorTotal: 0, historico: []
        };
      }

      const qtd = item.quantity || 0;
      const vUnit = item.unitValue || 0;
      const vTot = item.totalValue !== undefined ? item.totalValue : (qtd * vUnit);

      summary[group][key].quantidade += qtd;
      summary[group][key].valorTotal += vTot;
      if (summary[group][key].quantidade > 0) {
        summary[group][key].valorUnitario = summary[group][key].valorTotal / summary[group][key].quantidade;
      }

      summary[group][key].historico.push({
        data: tr.createdAt?.toDate().toLocaleDateString('pt-BR') || 'Recente',
        origem: tr.origin || 'Desconhecida',
        unidadeMedida: unit,
        quantidade: qtd,
        valorUnitario: vUnit,
        valorTotal: vTot
      });
    });
  });

  Object.keys(summary).forEach(g => {
    let tVal = 0, tQty = 0;
    Object.values(summary[g]).forEach(item => {
      tVal += item.valorTotal;
      tQty += item.quantidade;
      totalGeral += item.valorTotal;

      item.hasAnomaly = false;
      if (item.historico.length > 1) {
        const mean = item.valorUnitario;
        for (const h of item.historico) {
          if (h.valorUnitario > mean * 1.3 || h.valorUnitario < mean * 0.7) {
            item.hasAnomaly = true; break;
          }
        }
      }
    });
    groupTotals[g] = tVal;
    groupQtys[g] = tQty;
  });

  return { summary, groupTotals, groupQtys, totalGeral, sortBy, isGrouped };
}

function processComparative() {
  const unitFilter = els.filterUnit.value;
  const isGrouped = els.filterGroup.checked;
  const sortBy = els.filterSort.value;

  const summary = {};
  const locTotals = {};
  const groupTotals = {};
  const groupQtys = {};
  let grandTotalVal = 0;

  LOCATIONS.forEach(l => locTotals[l] = { qty:0, val:0 });

  allTransfers.forEach(tr => {
    const loc = tr.destination;
    if (!LOCATIONS.includes(loc)) return;

    tr.items?.forEach(item => {
      const unit = (item.unit || 'UN').toUpperCase();
      if (unitFilter !== 'TODAS' && unit !== unitFilter) return;

      const codeStr = item.code ? String(item.code) : '';
      const actualGroup = (codeStr && catalogMap.code[codeStr]) || catalogMap.name[item.product] || 'SEM GRUPO';
      const group = isGrouped ? actualGroup : 'LISTA GERAL DE PRODUTOS';
      const key = codeStr ? `${codeStr}-${item.product}-${unit}` : `${item.product}-${unit}`;

      if (!summary[group]) summary[group] = {};
      if (!summary[group][key]) {
        summary[group][key] = { codigo: codeStr, nome: item.product, unidadeMedida: unit, locations: {}, totalQty: 0, totalVal: 0 };
        LOCATIONS.forEach(l => summary[group][key].locations[l] = { qty:0, val:0 });
      }

      const qtd = item.quantity || 0;
      const vUnit = item.unitValue || 0;
      const vTot = item.totalValue !== undefined ? item.totalValue : (qtd * vUnit);

      summary[group][key].locations[loc].qty += qtd;
      summary[group][key].locations[loc].val += vTot;
      summary[group][key].totalQty += qtd;
      summary[group][key].totalVal += vTot;

      locTotals[loc].qty += qtd;
      locTotals[loc].val += vTot;
      groupTotals[group] = (groupTotals[group] || 0) + vTot;
      groupQtys[group] = (groupQtys[group] || 0) + qtd;
      grandTotalVal += vTot;
    });
  });

  return { summary, locTotals, groupTotals, groupQtys, grandTotalVal, sortBy, isGrouped };
}

// Rendering Logic
window.openDetails = function(group, key) {
  const data = processIndividual();
  const product = data.summary[group][key];
  if (!product) return;

  els.modalTitle.textContent = product.nome;
  els.modalCode.textContent = `Código: ${product.codigo || 'N/A'} | Unidade: ${product.unidadeMedida}`;
  
  if (product.hasAnomaly) {
    els.modalAlert.classList.remove('hidden');
  } else {
    els.modalAlert.classList.add('hidden');
  }

  els.modalTbody.innerHTML = product.historico.map(h => `
    <tr>
      <td class="px-4 py-3 border-b border-slate-100">${h.data}</td>
      <td class="px-4 py-3 border-b border-slate-100">${h.origem}</td>
      <td class="px-4 py-3 border-b border-slate-100 text-right">${h.quantidade.toLocaleString('pt-BR', {maximumFractionDigits:2})}</td>
      <td class="px-4 py-3 border-b border-slate-100 text-right">R$ ${h.valorUnitario.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
      <td class="px-4 py-3 border-b border-slate-100 text-right font-bold">R$ ${h.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
    </tr>
  `).join('');

  els.modal.classList.remove('hidden');
};

function closeModal() {
  els.modal.classList.add('hidden');
}

function renderView() {
  if (activeTab === 'individual') {
    renderIndividual();
  } else {
    renderComparative();
  }
  lucide.createIcons();
}

function renderIndividual() {
  const data = processIndividual();

  if (Object.keys(data.summary).length === 0) {
    els.container.innerHTML = `<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">Nenhuma transferência encontrada.</div>`;
    return;
  }

  let html = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-4 border-b border-slate-100 bg-[#003d33] flex justify-between items-center text-white">
          <h2 class="font-bold flex items-center gap-2">
              <i data-lucide="file-spreadsheet" class="w-5 h-5"></i>
              Visão Agrupada - ${els.filterLoc.value}
          </h2>
          <div class="text-sm bg-black/20 px-3 py-1 rounded-full font-bold">
              Total Geral: R$ ${data.totalGeral.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
          </div>
      </div>
      <div class="overflow-auto max-h-[70vh]">
          <table class="w-full text-sm text-left relative">
              <thead class="text-xs text-white uppercase bg-slate-800 sticky top-0 z-10 shadow-md">
                  <tr>
                      <th class="px-6 py-3 font-semibold w-24">Código</th>
                      <th class="px-6 py-3 font-semibold">Produto</th>
                      <th class="px-6 py-3 font-semibold text-center">Quantidade</th>
                      <th class="px-6 py-3 font-semibold text-right">Valor Unitário</th>
                      <th class="px-6 py-3 font-semibold text-right">Valor Total</th>
                  </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
  `;

  const groups = Object.keys(data.summary).sort((a,b) => {
    if (data.sortBy === 'valor') return data.groupTotals[b] - data.groupTotals[a];
    if (data.sortBy === 'quantidade') return data.groupQtys[b] - data.groupQtys[a];
    return a.localeCompare(b);
  });

  groups.forEach(g => {
    if (data.isGrouped) {
      html += `
        <tr class="bg-slate-100 border-b border-slate-200">
            <td colspan="5" class="p-0">
                <div class="px-6 py-2 font-bold text-slate-700 uppercase text-xs tracking-wider flex justify-between items-center w-full">
                    <span>${g}</span>
                    <span class="text-[#00a86b]">Total: R$ ${data.groupTotals[g].toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                </div>
            </td>
        </tr>
      `;
    }

    const products = Object.entries(data.summary[g]).sort(([, a], [, b]) => {
      if (data.sortBy === 'valor') return b.valorTotal - a.valorTotal;
      if (data.sortBy === 'quantidade') return b.quantidade - a.quantidade;
      return a.nome.localeCompare(b.nome);
    });

    products.forEach(([key, prod]) => {
      html += `
        <tr class="cursor-pointer transition-colors group ${prod.hasAnomaly ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-blue-50'}" onclick="openDetails('${g}', '${key}')">
            <td class="px-6 py-3 font-medium ${prod.hasAnomaly ? 'text-amber-700' : 'text-slate-500 group-hover:text-blue-600'}">${prod.codigo || '-'}</td>
            <td class="px-6 py-3 font-medium ${prod.hasAnomaly ? 'text-amber-900' : 'text-slate-800 group-hover:text-blue-700'}">${prod.nome}</td>
            <td class="px-6 py-3 text-center font-bold ${prod.hasAnomaly ? 'text-amber-700' : 'text-[#00a86b] group-hover:text-blue-600'}">
                ${prod.quantidade.toLocaleString('pt-BR', {maximumFractionDigits:2})} <span class="text-xs font-normal text-slate-500 ml-0.5">${prod.unidadeMedida}</span>
            </td>
            <td class="px-6 py-3 text-right ${prod.hasAnomaly ? 'text-red-600 font-bold' : 'text-slate-500 group-hover:text-blue-500'}">
                <div class="flex items-center justify-end gap-1">
                    ${prod.hasAnomaly ? `<i data-lucide="alert-triangle" class="w-3 h-3 text-red-500"></i>` : ''}
                    R$ ${prod.valorUnitario.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
                </div>
            </td>
            <td class="px-6 py-3 text-right font-bold ${prod.hasAnomaly ? 'text-amber-800' : 'text-slate-700 group-hover:text-blue-700'}">
                R$ ${prod.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
            </td>
        </tr>
      `;
    });
  });

  html += `</tbody></table></div></div>`;
  els.container.innerHTML = html;
}

function renderComparative() {
  const data = processComparative();

  if (Object.keys(data.summary).length === 0) {
    els.container.innerHTML = `<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">Nenhuma transferência encontrada.</div>`;
    return;
  }

  let html = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-4 border-b border-slate-100 bg-slate-800 flex justify-between items-center text-white">
            <h2 class="font-bold flex items-center gap-2">
                <i data-lucide="bar-chart-2" class="w-5 h-5"></i>
                Análise Geral das Lojas - ${els.filterMonth.value}
            </h2>
            <div class="text-sm bg-white/20 px-3 py-1 rounded-full font-bold">
                Total Geral: R$ ${data.grandTotalVal.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
            </div>
        </div>
        <div class="overflow-auto max-h-[70vh]">
            <table class="w-full text-sm text-left relative">
                <thead class="text-xs text-white uppercase bg-slate-700 sticky top-0 z-10 shadow-md">
                    <tr>
                        <th class="px-4 py-3 font-semibold bg-slate-700 z-20">Produto</th>
                        ${LOCATIONS.map(l => `<th class="px-4 py-3 font-semibold text-center border-l border-slate-600 bg-slate-700 z-20">${l}</th>`).join('')}
                        <th class="px-4 py-3 font-semibold text-right border-l border-slate-600 bg-slate-800 z-20">Total Produto</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
  `;

  const groups = Object.keys(data.summary).sort((a,b) => {
    if (data.sortBy === 'valor') return data.groupTotals[b] - data.groupTotals[a];
    if (data.sortBy === 'quantidade') return data.groupQtys[b] - data.groupQtys[a];
    return a.localeCompare(b);
  });

  groups.forEach(g => {
    if (data.isGrouped) {
      html += `
        <tr class="bg-slate-100 border-b border-slate-200">
            <td colspan="${LOCATIONS.length + 2}" class="p-0">
                <div class="px-4 py-2 font-bold text-slate-700 uppercase text-xs tracking-wider flex justify-between items-center w-full">
                    <span>${g}</span>
                    <span class="text-[#00a86b]">Total: R$ ${data.groupTotals[g].toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                </div>
            </td>
        </tr>
      `;
    }

    const products = Object.entries(data.summary[g]).sort(([, a], [, b]) => {
      if (data.sortBy === 'valor') return b.totalVal - a.totalVal;
      if (data.sortBy === 'quantidade') return b.totalQty - a.totalQty;
      return a.nome.localeCompare(b.nome);
    });

    products.forEach(([key, prod]) => {
      html += `<tr class="hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3 border-r border-slate-100">
            <div class="font-medium text-slate-800">${prod.nome}</div>
            ${prod.codigo ? `<div class="text-xs text-slate-400 mt-0.5">${prod.codigo}</div>` : ''}
        </td>`;
        
      LOCATIONS.forEach(loc => {
        const lData = prod.locations[loc];
        if (lData.qty > 0) {
          html += `
            <td class="px-4 py-2 text-center border-r border-slate-100 bg-blue-50/30">
                <div class="flex flex-col items-center justify-center">
                    <div class="font-bold text-[#00a86b]">
                        ${lData.qty.toLocaleString('pt-BR', {maximumFractionDigits:2})} <span class="text-[10px] font-normal text-slate-500">${prod.unidadeMedida}</span>
                    </div>
                    <div class="text-xs font-medium text-slate-600 mt-0.5">
                        R$ ${lData.val.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </div>
                </div>
            </td>`;
        } else {
          html += `<td class="px-4 py-2 text-center border-r border-slate-100"><span class="text-slate-300">-</span></td>`;
        }
      });

      html += `
        <td class="px-4 py-3 text-right bg-slate-50 border-l border-slate-200">
            <div class="font-bold text-slate-800">
                ${prod.totalQty.toLocaleString('pt-BR', {maximumFractionDigits:2})} <span class="text-[10px] font-normal text-slate-500">${prod.unidadeMedida}</span>
            </div>
            <div class="text-xs font-bold text-[#00a86b] mt-0.5">
                R$ ${prod.totalVal.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
            </div>
        </td>
      </tr>`;
    });
  });

  html += `
    <tr class="bg-slate-800 text-white font-bold">
        <td class="px-4 py-4 text-right uppercase text-xs tracking-wider">TOTAL GERAL</td>
        ${LOCATIONS.map(l => `
            <td class="px-4 py-4 text-center border-l border-slate-600">
                <div class="text-xs text-slate-300 mb-1">R$</div>
                <div class="text-[#a3e8ce] text-base">${data.locTotals[l].val.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </td>
        `).join('')}
        <td class="px-4 py-4 text-right border-l border-slate-600 bg-slate-900">
            <div class="text-xs text-slate-400 mb-1">R$</div>
            <div class="text-[#00a86b] text-lg">${data.grandTotalVal.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </td>
    </tr>
  </tbody></table></div></div>`;
  
  els.container.innerHTML = html;
}

init();
