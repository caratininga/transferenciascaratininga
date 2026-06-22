import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { requireAuth, setupLogout, setupMobileMenu } from "./auth.js";

async function init() {
  await requireAuth();
  setupLogout();
  setupMobileMenu();
  lucide.createIcons();
  
  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const q = query(collection(db, 'transfers'), orderBy('createdAt', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    const transfers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const statsGrid = document.getElementById('stats-grid');
    const recentTable = document.getElementById('recent-transfers-table');

    if (transfers.length === 0) {
      statsGrid.innerHTML = `<div class="col-span-4 text-center py-12 text-slate-500">Nenhuma transferência registrada ainda.</div>`;
      recentTable.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">Nenhuma transferência recente</td></tr>`;
      return;
    }

    // Calcular stats
    let totalItems = 0;
    let totalValue = 0;
    const destCount = {};

    transfers.forEach(tr => {
      tr.items?.forEach(item => {
        totalItems += (item.quantity || 0);
        totalValue += (item.totalValue || (item.quantity * item.unitValue) || 0);
      });
      destCount[tr.destination] = (destCount[tr.destination] || 0) + 1;
    });

    const topDest = Object.entries(destCount).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

    statsGrid.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div class="flex items-center gap-3 text-slate-500 mb-2">
            <i data-lucide="arrow-right-left" class="w-5 h-5 text-blue-500"></i>
            <h3 class="font-medium">Total de Transferências</h3>
        </div>
        <p class="text-3xl font-bold text-slate-800">${transfers.length}</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div class="flex items-center gap-3 text-slate-500 mb-2">
            <i data-lucide="package" class="w-5 h-5 text-amber-500"></i>
            <h3 class="font-medium">Volume Total (Qtd)</h3>
        </div>
        <p class="text-3xl font-bold text-slate-800">${totalItems.toLocaleString('pt-BR')}</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div class="flex items-center gap-3 text-slate-500 mb-2">
            <i data-lucide="trending-up" class="w-5 h-5 text-emerald-500"></i>
            <h3 class="font-medium">Valor Movimentado</h3>
        </div>
        <p class="text-3xl font-bold text-emerald-600">R$ ${totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div class="flex items-center gap-3 text-slate-500 mb-2">
            <i data-lucide="store" class="w-5 h-5 text-purple-500"></i>
            <h3 class="font-medium">Destino Principal</h3>
        </div>
        <p class="text-3xl font-bold text-slate-800">${topDest}</p>
      </div>
    `;

    // Render table
    recentTable.innerHTML = transfers.slice(0, 10).map(tr => {
      const date = tr.createdAt ? tr.createdAt.toDate().toLocaleString('pt-BR') : 'N/A';
      return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-3 font-medium text-slate-800">${date}</td>
            <td class="px-6 py-3 text-slate-500">${tr.userEmail || 'Sistema'}</td>
            <td class="px-6 py-3">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">${tr.origin || 'Matriz'}</span>
                    <i data-lucide="arrow-right" class="w-3 h-3 text-slate-400"></i>
                    <span class="px-2 py-1 bg-[#00a86b]/10 text-[#00a86b] rounded text-xs font-bold">${tr.destination}</span>
                </div>
            </td>
            <td class="px-6 py-3 text-right font-bold text-slate-700">${tr.items?.length || 0} resumos</td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();

  } catch (error) {
    console.error("Erro dashboard:", error);
    document.getElementById('stats-grid').innerHTML = `<div class="col-span-4 text-center py-12 text-red-500">Erro ao carregar dados.</div>`;
  }
}

init();
