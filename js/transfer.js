import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { requireAuth, setupLogout, setupMobileMenu } from "./auth.js";

let parsedData = [];
let currentUser = null;

async function init() {
  currentUser = await requireAuth();
  setupLogout();
  setupMobileMenu();
  lucide.createIcons();

  const today = new Date();
  document.getElementById('refMonth').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  setupDragAndDrop();
  setupForm();
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-upload');

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('border-[#00a86b]', 'bg-slate-50'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('border-[#00a86b]', 'bg-slate-50'), false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) handleFile(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
}

function handleFile(file) {
  document.getElementById('file-name').textContent = `Arquivo: ${file.name}`;
  document.getElementById('file-name').classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      processExcelData(json);
    } catch (err) {
      alert("Erro ao ler o arquivo Excel. Verifique se o formato está correto.");
      console.error(err);
    }
  };
  reader.readAsBinaryString(file);
}

function processExcelData(json) {
  parsedData = [];
  
  if (!json || json.length === 0) {
    alert("A planilha está vazia.");
    return;
  }

  const columns = Object.keys(json[0]);
  
  const colCodeProd = columns.find(c => c.toLowerCase().includes('código') || c.toLowerCase().includes('produto') || c.toLowerCase() === 'descricao');
  const colQty = columns.find(c => c.toLowerCase().includes('qtd') || c.toLowerCase().includes('quantidade') || c.toLowerCase().includes('qtde'));
  const colValUnit = columns.find(c => c.toLowerCase().includes('unit') || c.toLowerCase().includes('vl. un'));
  const colValTot = columns.find(c => c.toLowerCase().includes('tot') || c.toLowerCase().includes('vl. tot'));
  const colUnit = columns.find(c => c.toLowerCase() === 'un' || c.toLowerCase() === 'unid' || c.toLowerCase().includes('medida'));

  json.forEach(row => {
    let rawCodeProd = row[colCodeProd] || '';
    if (!rawCodeProd) return;
    rawCodeProd = String(rawCodeProd).trim();

    let code = '';
    let product = rawCodeProd;

    const codeMatch = rawCodeProd.match(/^(\d+)[\s-]+(.+)$/);
    if (codeMatch) {
      code = codeMatch[1];
      product = codeMatch[2].trim();
    }

    let qtyStr = String(row[colQty] || '0').replace(/\./g, '').replace(',', '.');
    let vlrUStr = String(row[colValUnit] || '0').replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.');
    let vlrTStr = String(row[colValTot] || '0').replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.');

    const quantity = parseFloat(qtyStr);
    const unitValue = parseFloat(vlrUStr);
    let totalValue = parseFloat(vlrTStr);

    if (quantity > 0) {
      if (!totalValue && unitValue) totalValue = quantity * unitValue;
      
      parsedData.push({
        code,
        product,
        quantity,
        unitValue,
        totalValue,
        unit: row[colUnit] ? String(row[colUnit]).trim().toUpperCase() : 'UN'
      });
    }
  });

  renderPreview();
}

function renderPreview() {
  const tbody = document.getElementById('preview-tbody');
  const previewSection = document.getElementById('preview-section');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveBtn = document.getElementById('save-btn');
  const countBadge = document.getElementById('preview-count');

  if (parsedData.length === 0) {
    previewSection.classList.add('hidden');
    saveBtn.disabled = true;
    cancelBtn.classList.add('hidden');
    return;
  }

  countBadge.textContent = `${parsedData.length} itens encontrados`;
  
  tbody.innerHTML = parsedData.slice(0, 100).map(item => `
    <tr class="hover:bg-slate-50">
        <td class="px-4 py-2 font-medium text-slate-500">${item.code || '-'}</td>
        <td class="px-4 py-2 font-medium text-slate-800">${item.product}</td>
        <td class="px-4 py-2 text-right font-bold text-[#00a86b]">
            ${item.quantity.toLocaleString('pt-BR')} <span class="text-[10px] text-slate-400 font-normal ml-0.5">${item.unit}</span>
        </td>
        <td class="px-4 py-2 text-right text-slate-500">R$ ${item.unitValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        <td class="px-4 py-2 text-right font-bold text-slate-700">R$ ${item.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
    </tr>
  `).join('');

  if (parsedData.length > 100) {
    tbody.innerHTML += `<tr><td colspan="5" class="text-center py-4 text-xs text-slate-400 font-bold bg-slate-50 border-t border-slate-200">Exibindo os primeiros 100 itens de ${parsedData.length}</td></tr>`;
  }

  previewSection.classList.remove('hidden');
  saveBtn.disabled = false;
  cancelBtn.classList.remove('hidden');
}

function setupForm() {
  const form = document.getElementById('transfer-form');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveBtn = document.getElementById('save-btn');
  const modal = document.getElementById('success-modal');
  
  cancelBtn.addEventListener('click', () => {
    parsedData = [];
    document.getElementById('file-upload').value = '';
    document.getElementById('file-name').classList.add('hidden');
    renderPreview();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (parsedData.length === 0) return;

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Salvando...`;
    lucide.createIcons();

    try {
      const refMonth = document.getElementById('refMonth').value;
      const destination = document.getElementById('destination').value;

      await addDoc(collection(db, 'transfers'), {
        referenceMonth: refMonth,
        origin: 'Matriz',
        destination: destination,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        userEmail: currentUser.email,
        items: parsedData
      });

      modal.classList.remove('hidden');
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar transferência.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i data-lucide="save" class="w-5 h-5"></i> Registrar Transferência`;
      lucide.createIcons();
    }
  });

  document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
    cancelBtn.click(); // resets form
  });
}

init();
