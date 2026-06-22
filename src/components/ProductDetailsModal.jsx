import React from 'react';
import { X, Calendar, Package, ArrowRight, DollarSign, AlertTriangle } from 'lucide-react';

export default function ProductDetailsModal({ isOpen, onClose, productData }) {
  if (!isOpen || !productData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-[#00a86b] text-white rounded-t-xl">
          <div>
            <div className="text-[#a3e8ce] text-xs font-bold uppercase tracking-wider mb-1">
              Detalhes do Produto
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package size={20} />
              {productData.nome}
            </h2>
            {productData.codigo && (
              <div className="mt-1 text-[#e0f7ef] text-sm">
                Código: <span className="font-mono font-bold bg-black/10 px-2 py-0.5 rounded">{productData.codigo}</span>
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase">Lançamentos</p>
            <p className="text-2xl font-bold text-slate-800">{productData.historico.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase">Qtd Acumulada</p>
            <p className="text-2xl font-bold text-[#00a86b]">
              {productData.quantidade.toLocaleString('pt-BR', {maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase">Preço Médio</p>
            <p className="text-2xl font-bold text-slate-800">
              R$ {productData.valorUnitario.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase">Valor Total</p>
            <p className="text-2xl font-bold text-[#00a86b]">
              R$ {productData.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
        </div>

        {/* TABLE LIST */}
        <div className="overflow-y-auto p-6 flex-1">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Calendar size={18} /> Histórico de Remessas
          </h3>
          
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3 text-center">Unid.</th>
                  <th className="px-4 py-3 text-center">Qtd</th>
                  <th className="px-4 py-3 text-right">R$ Unit.</th>
                  <th className="px-4 py-3 text-right">R$ Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...productData.historico]
                  .sort((a, b) => b.valorTotal - a.valorTotal)
                  .map((row, idx) => {
                    const isAnomaly = productData.valorUnitario > 0 && 
                      (row.valorUnitario > productData.valorUnitario * 1.3 || row.valorUnitario < productData.valorUnitario * 0.7);

                    return (
                      <tr key={idx} className={`hover:bg-slate-50 ${isAnomaly ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 text-slate-500">{row.data}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{row.origem}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{row.unidadeMedida || 'UN'}</td>
                        <td className={`px-4 py-3 text-center font-bold ${isAnomaly ? 'text-red-600' : 'text-[#00a86b]'}`}>
                          {row.quantidade.toLocaleString('pt-BR', {maximumFractionDigits: 2})}
                        </td>
                        <td className={`px-4 py-3 text-right ${isAnomaly ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {isAnomaly && <AlertTriangle size={14} className="text-red-500" title="Divergência de preço!" />}
                            R$ {row.valorUnitario.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          R$ {row.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}
