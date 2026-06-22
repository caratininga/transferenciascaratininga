import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { requireAuth, setupLogout, setupMobileMenu } from "./auth.js";

let catalog = [];
let filteredCatalog = [];

const els = {
  tbody: document.getElementById('catalog-tbody'),
  searchInput: document.getElementById('search-input'),
  btnAdd: document.getElementById('btn-add'),
  modal: document.getElementById('form-modal'),
  form: document.getElementById('catalog-form'),
  btnCancel: document.getElementById('btn-cancel'),
  btnSave: document.getElementById('btn-save'),
  modalTitle: document.getElementById('modal-title'),
  fId: document.getElementById('form-id'),
  fCode: document.getElementById('form-code'),
  fName: document.getElementById('form-name'),
  fGroup: document.getElementById('form-group')
};

async function init() {
  await requireAuth();
  setupLogout();
  setupMobileMenu();
  lucide.createIcons();

  setupEvents();
  await loadCatalog();
}

function setupEvents() {
  els.searchInput.addEventListener('input', () => {
    const q = els.searchInput.value.toLowerCase();
    filteredCatalog = catalog.filter(p => 
      (p.code && String(p.code).toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.group && p.group.toLowerCase().includes(q))
    );
    renderTable();
  });

  els.btnAdd.addEventListener('click', () => {
    els.form.reset();
    els.fId.value = '';
    els.modalTitle.textContent = 'Adicionar Produto';
    els.modal.classList.remove('hidden');
  });

  els.btnCancel.addEventListener('click', () => {
    els.modal.classList.add('hidden');
  });

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.btnSave.disabled = true;
    els.btnSave.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Salvando...`;
    lucide.createIcons();

    const id = els.fId.value;
    const item = {
      code: els.fCode.value.trim(),
      name: els.fName.value.trim().toUpperCase(),
      group: els.fGroup.value.trim().toUpperCase()
    };

    try {
      if (id !== '') {
        catalog[parseInt(id)] = item;
      } else {
        catalog.push(item);
      }
      await setDoc(doc(db, 'catalog', 'main'), { products: catalog });
      els.modal.classList.add('hidden');
      els.searchInput.value = '';
      filteredCatalog = [...catalog];
      renderTable();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    } finally {
      els.btnSave.disabled = false;
      els.btnSave.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Salvar`;
      lucide.createIcons();
    }
  });

  window.editItem = function(index) {
    const item = catalog[index];
    els.fId.value = index;
    els.fCode.value = item.code || '';
    els.fName.value = item.name || '';
    els.fGroup.value = item.group || '';
    els.modalTitle.textContent = 'Editar Produto';
    els.modal.classList.remove('hidden');
  };

  window.deleteItem = async function(index) {
    if (confirm('Tem certeza que deseja excluir este item do catálogo? Ele não agrupará mais nos relatórios.')) {
      catalog.splice(index, 1);
      try {
        await setDoc(doc(db, 'catalog', 'main'), { products: catalog });
        filteredCatalog = [...catalog];
        renderTable();
      } catch (err) {
        alert("Erro ao deletar.");
      }
    }
  };
}

async function loadCatalog() {
  try {
    const docSnap = await getDoc(doc(db, 'catalog', 'main'));
    if (docSnap.exists() && docSnap.data().products) {
      catalog = docSnap.data().products;
      // Ordenar por grupo e depois nome
      catalog.sort((a,b) => {
        const ga = a.group || ''; const gb = b.group || '';
        if (ga !== gb) return ga.localeCompare(gb);
        return (a.name || '').localeCompare(b.name || '');
      });
      filteredCatalog = [...catalog];
      renderTable();
    } else {
      els.tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500">Catálogo vazio. Adicione itens ou use a ferramenta de importação no código raiz.</td></tr>`;
    }
  } catch (err) {
    els.tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500">Erro ao carregar catálogo.</td></tr>`;
  }
}

function renderTable() {
  if (filteredCatalog.length === 0) {
    els.tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500">Nenhum resultado encontrado.</td></tr>`;
    return;
  }

  els.tbody.innerHTML = filteredCatalog.map((item) => {
    // Buscar o index real no array original (catalog) para edição/deleção
    const realIndex = catalog.indexOf(item);
    return `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
          <td class="px-6 py-3 font-mono text-slate-500">${item.code || '-'}</td>
          <td class="px-6 py-3 font-medium text-slate-800">${item.name}</td>
          <td class="px-6 py-3">
              <span class="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">${item.group}</span>
          </td>
          <td class="px-6 py-3 text-right">
              <button onclick="editItem(${realIndex})" class="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Editar">
                  <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button onclick="deleteItem(${realIndex})" class="p-1 text-red-500 hover:bg-red-50 rounded ml-1" title="Excluir">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
          </td>
      </tr>
    `;
  }).join('');
  
  lucide.createIcons();
}

init();
