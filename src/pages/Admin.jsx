import React, { useState, useEffect } from 'react';
import { Settings, Search, Package, Download, Upload, AlertCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as xlsx from 'xlsx';
import ConfirmModal from '../components/ConfirmModal';

export default function Admin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importModal, setImportModal] = useState({ isOpen: false, file: null });

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'catalog', 'main');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().products) {
        setAllProducts(docSnap.data().products);
      } else {
        setAllProducts([]);
      }
    } catch (err) {
      console.error("Erro ao buscar catálogo:", err);
      setError("Erro ao carregar os produtos.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = allProducts.map(p => ({
      'Código': p.code,
      'Produto': p.name,
      'Grupo': p.group
    }));
    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Base");
    xlsx.writeFile(wb, "Base_Produtos.xlsx");
  };

  const handleImportClick = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Abrir o modal de confirmação e resetar o input
    setImportModal({ isOpen: true, file });
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    const file = importModal.file;
    setImportModal({ isOpen: false, file: null });
    
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = xlsx.read(data, { type: 'array' });
        
        // Pega a primeira aba, independente do nome (mas no original era "Base")
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        
        const parsedItems = jsonData
          .filter(row => row['Produto'] || row['Descrição'])
          .map(row => ({
            code: row['Código'] || '-',
            name: row['Produto'] || row['Descrição'],
            group: row['Grupo'] || 'SEM GRUPO'
          }));

        if (parsedItems.length === 0) {
          setError('Nenhum produto válido encontrado na planilha.');
          setIsImporting(false);
          return;
        }

        // Salvar no Firestore substituindo o array antigo
        await setDoc(doc(db, 'catalog', 'main'), {
          products: parsedItems,
          updatedAt: new Date().toISOString()
        });

        setAllProducts(parsedItems);
        alert(`Sucesso! Foram importados ${parsedItems.length} produtos.`);
      } catch (err) {
        console.error(err);
        setError('Erro ao ler a planilha ou salvar no banco de dados.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.code).includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ConfirmModal
        isOpen={importModal.isOpen}
        onCancel={() => setImportModal({ isOpen: false, file: null })}
        onConfirm={handleConfirmImport}
        title="Confirmar Importação"
        message="Atenção: A importação desta planilha irá substituir TODOS os produtos atuais pela nova lista. Deseja continuar?"
        confirmText="Sim, Importar e Substituir"
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-[#003d33]" size={28} />
            Administração
          </h1>
          <p className="text-slate-500">Gestão do Catálogo de Produtos da base</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            disabled={loading || isImporting || allProducts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors border border-slate-300 disabled:opacity-50"
          >
            <Download size={18} /> Exportar Base
          </button>
          
          <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors border border-slate-300">
            <Upload size={20} />
            {isImporting ? 'Importando...' : 'Importar e Substituir'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportClick} disabled={isImporting} />
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3 border border-red-200">
          <AlertCircle className="shrink-0" size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Catálogo Atual</h2>
              <p className="text-sm text-slate-500">{loading ? '...' : allProducts.length} itens registrados</p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, código ou grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 font-semibold w-24">Código</th>
                <th className="px-6 py-4 font-semibold">Produto / Descrição</th>
                <th className="px-6 py-4 font-semibold w-64">Grupo / Categoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-slate-500">Carregando catálogo...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-slate-500">Nenhum produto encontrado.</td>
                </tr>
              ) : (
                filteredProducts.map((prod, idx) => (
                  <tr key={`${prod.code}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-600">{prod.code}</td>
                    <td className="px-6 py-3 font-bold text-slate-800">{prod.name}</td>
                    <td className="px-6 py-3">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold border border-slate-200">
                        {prod.group}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-right">
          Exibindo {filteredProducts.length} resultados
        </div>
      </div>
    </div>
  );
}
