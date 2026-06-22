import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Save, Plus, Trash2, ArrowRight, Upload, FileDown, AlertCircle, CheckCircle, List, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as xlsx from 'xlsx';

const LOCATIONS = ['Matriz', 'Mucambo', 'Tianguá', 'Frecheirinha'];

export default function NewTransfer() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'import'
  
  // Shared state
  const getCurrentMonth = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };
  
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Manual Tab State
  const [items, setItems] = useState([{ product: '', quantity: 1, unit: 'UN', unitValue: 0 }]);
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Import Tab State
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const docRef = doc(db, 'catalog', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().products) {
          const sorted = docSnap.data().products.sort((a, b) => a.name.localeCompare(b.name));
          setCatalog(sorted);
        }
      } catch (err) {
        console.error("Erro ao buscar catálogo", err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  // --- MANUAL METHODS ---
  const handleAddItem = () => {
    setItems([...items, { product: '', quantity: 1, unit: 'UN', unitValue: 0 }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // --- IMPORT METHODS ---
  const handleDownloadTemplate = () => {
    const templateData = [
      { "Código+Produto": "1001 - COCA-COLA 2L", "UN": "UN", "Qtde": 10, "Vl. Unitário": 8.50 },
      { "Código+Produto": "1002 - HEINEKEN 600ML", "UN": "CX", "Qtde": 24, "Vl. Unitário": 12.00 }
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Transferencia");
    xlsx.writeFile(wb, "Modelo_Transferencia.xlsx");
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = xlsx.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        
        const parsedItems = jsonData.map(row => {
          let rawProduct = String(row['Código+Produto'] || row['Produto'] || row['Descrição'] || '');
          let code = '';
          let product = rawProduct;
          
          const match = rawProduct.match(/^\s*(\d+)\s*[-_]\s*(.+)$/);
          if (match) {
            code = match[1];
            product = match[2];
          }

          const quantity = parseFloat(row['Quantidade'] || row['Qtde']) || 0;
          const unitValue = parseFloat(row['Valor Unitário'] || row['Vl. Unitário']) || 0;
          const totalValue = parseFloat(row['Valor Total'] || row['Total']) || (quantity * unitValue);

          return {
            code: code,
            product: product.trim().toUpperCase(),
            quantity: quantity,
            unit: String(row['Unidade'] || row['UN'] || row['Un'] || 'UN').toUpperCase().trim(),
            unitValue: unitValue,
            totalValue: totalValue
          };
        }).filter(item => item.product && item.quantity > 0);

        if (parsedItems.length === 0) {
          setError('A planilha parece estar vazia ou fora do formato. Baixe o modelo e tente novamente.');
          setPreviewData([]);
        } else {
          setPreviewData(parsedItems);
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao ler o arquivo. Certifique-se de que é um Excel (.xlsx) válido.');
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleImportItemChange = (index, field, value) => {
    const newData = [...previewData];
    newData[index][field] = value;
    setPreviewData(newData);
  };

  // --- SUBMIT SHARED METHOD ---
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!origin || !destination || !referenceMonth) {
      setError('Selecione origem, destino e o mês de referência no topo da página.');
      return;
    }
    if (origin === destination) {
      setError('Origem e destino não podem ser iguais.');
      return;
    }

    const dataToSave = activeTab === 'manual' 
      ? items.map(item => ({...item, totalValue: (item.quantity * item.unitValue)}))
      : previewData;
      
    const validItems = dataToSave.filter(item => item.product && item.quantity > 0);
    
    if (validItems.length === 0) {
      setError(activeTab === 'manual' 
        ? 'Adicione pelo menos um produto com quantidade válida.' 
        : 'Nenhum item válido para importar da planilha.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'transfers'), {
        origin,
        destination,
        referenceMonth,
        items: validItems,
        createdAt: serverTimestamp(),
        imported: activeTab === 'import'
      });
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000); // Redireciona para o Dashboard (raiz)
    } catch (err) {
      console.error('Erro ao salvar transferência:', err);
      setError('Erro ao salvar a transferência. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nova Transferência</h1>
        <p className="text-slate-500">Registre o envio de produtos manualmente ou enviando uma planilha</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* CABEÇALHO COMPARTILHADO: ORIGEM E DESTINO */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm border border-emerald-200 flex items-center gap-2 font-medium">
              <CheckCircle size={16} className="shrink-0" />
              Transferência salva com sucesso! Redirecionando...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr,1fr] gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidade de Origem</label>
              <select 
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                disabled={loading || success}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] focus:border-[#00a86b] outline-none"
              >
                <option value="">Selecione...</option>
                {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div className="hidden md:flex pb-3 text-slate-400 justify-center">
              <ArrowRight size={20} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidade de Destino</label>
              <select 
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                disabled={loading || success}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] focus:border-[#00a86b] outline-none"
              >
                <option value="">Selecione...</option>
                {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mês de Referência</label>
              <input 
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
                required
                disabled={loading || success}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] focus:border-[#00a86b] outline-none text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'manual' 
                ? 'border-[#00a86b] text-[#00a86b] bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <List size={18} />
            Lançamento Manual
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'import' 
                ? 'border-[#00a86b] text-[#00a86b] bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet size={18} />
            Importar Planilha
          </button>
        </div>

        {/* CONTEÚDO DA ABA MANUAL */}
        {activeTab === 'manual' && (
          <form id="manualForm" onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Produtos a Transferir</h3>
                <button 
                  type="button"
                  onClick={handleAddItem}
                  disabled={loading || success}
                  className="text-sm font-medium text-[#00a86b] hover:text-[#008f5a] flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus size={16} /> Adicionar Linha
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start flex-wrap md:flex-nowrap">
                    <div className="flex-1 min-w-[200px]">
                      <select
                        value={item.product}
                        onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                        required
                        disabled={loadingCatalog || loading || success}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] focus:border-[#00a86b] outline-none text-sm disabled:bg-slate-100"
                      >
                        <option value="">{loadingCatalog ? 'Carregando catálogo...' : 'Pesquisar ou Selecionar Produto...'}</option>
                        {catalog.map(prod => (
                          <option key={prod.code + prod.name} value={prod.name}>
                            {prod.code && prod.code !== '-' ? `[${prod.code}] ` : ''}{prod.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                        disabled={loading || success}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none text-sm"
                        placeholder="Qtd"
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value.toUpperCase())}
                        disabled={loading || success}
                        className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none text-sm text-center uppercase"
                        placeholder="UN"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitValue}
                        onChange={(e) => handleItemChange(index, 'unitValue', parseFloat(e.target.value) || 0)}
                        disabled={loading || success}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none text-sm"
                        placeholder="Valor Unit (R$)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      disabled={items.length === 1 || loading || success}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 flex justify-end border-t border-slate-100">
              <button
                type="submit"
                disabled={loading || loadingCatalog || success}
                className="bg-[#00a86b] hover:bg-[#008f5a] text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'Salvando...' : 'Registrar Transferência Manual'}
              </button>
            </div>
          </form>
        )}

        {/* CONTEÚDO DA ABA IMPORTAR */}
        {activeTab === 'import' && (
          <div>
            <div className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-700">Importação em Lote</h3>
                <p className="text-sm text-slate-500">Faça o upload do seu Excel contendo: Produto, Quantidade e Valor Unitário</p>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto">
                <button 
                  onClick={handleDownloadTemplate}
                  type="button"
                  className="text-[#00a86b] font-semibold text-sm flex items-center gap-2 hover:underline justify-center md:justify-end"
                >
                  <FileDown size={18} /> Baixar Modelo Padrão
                </button>
                <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors border border-dashed border-slate-300">
                  <Upload size={20} />
                  {file ? file.name : "Selecionar Planilha"}
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={loading || success} />
                </label>
              </div>
            </div>

            {previewData.length > 0 && !success && (
              <>
                <div className="p-6 border-t border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-4">Pré-visualização e Edição ({previewData.length} itens encontrados)</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {previewData.map((item, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="w-20">
                          <input
                            type="text"
                            value={item.code || ''}
                            onChange={(e) => handleImportItemChange(index, 'code', e.target.value)}
                            disabled={loading}
                            className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none text-sm text-center"
                            placeholder="Cód."
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.product}
                            onChange={(e) => handleImportItemChange(index, 'product', e.target.value)}
                            disabled={loading}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none text-sm"
                            placeholder="Nome do Produto"
                          />
                        </div>
                        <div className="w-20">
                          <input
                            type="text"
                            value={item.unit || ''}
                            onChange={(e) => handleImportItemChange(index, 'unit', e.target.value.toUpperCase())}
                            disabled={loading}
                            className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none text-sm text-center uppercase"
                            placeholder="UN"
                          />
                        </div>
                        <div className="w-24">
                          <input 
                            type="number"
                            min="0.001"
                            step="any"
                            value={item.quantity || ''}
                            onChange={(e) => handleImportItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={loading}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none text-sm"
                            placeholder="0.000"
                            required
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitValue}
                            onChange={(e) => handleImportItemChange(index, 'unitValue', parseFloat(e.target.value) || 0)}
                            disabled={loading}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none text-sm"
                            placeholder="R$ Unit"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-6 flex justify-end bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="bg-[#00a86b] hover:bg-[#008f5a] text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Save size={20} />
                    {loading ? 'Salvando Lote...' : 'Confirmar e Salvar Lote'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
