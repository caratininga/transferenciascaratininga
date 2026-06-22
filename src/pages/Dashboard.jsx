import React, { useEffect, useState } from 'react';
import { Package, ArrowRightLeft, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

export default function Dashboard() {
  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, itemsInTransit: 0 });
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, transferId: null });

  useEffect(() => {
    const q = query(collection(db, 'transfers'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalItems = 0;
      let totalValue = 0;
      const destinations = new Set();
      
      const allTransfers = snapshot.docs.map(doc => {
        const data = doc.data();
        
        let trItemsCount = 0;
        let trValue = 0;
        
        if (data.items) {
          data.items.forEach(item => {
            trItemsCount += item.quantity || 0;
            trValue += (item.quantity || 0) * (item.unitValue || 0);
          });
        }
        
        totalItems += trItemsCount;
        totalValue += trValue;
        if (data.destination) destinations.add(data.destination);
        
        return {
          id: doc.id,
          ...data,
          totalValue: trValue,
          date: data.createdAt?.toDate().toLocaleDateString('pt-BR') || 'Recente'
        };
      });

      setStats({
        total: allTransfers.length,
        destinationsCount: destinations.size,
        totalItems,
        totalValue
      });
      
      // Mostrar todas na tabela
      setTransfers(allTransfers);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar dashboard:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    if (!deleteModal.transferId) return;
    
    try {
      await deleteDoc(doc(db, 'transfers', deleteModal.transferId));
      setDeleteModal({ isOpen: false, transferId: null });
    } catch (error) {
      console.error("Erro ao deletar transferência:", error);
      alert("Erro ao excluir. Tente novamente.");
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Visão geral das transferências de estoque</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Lançamentos</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{loading ? '-' : stats.total}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <ArrowRightLeft size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Unidades Atendidas</p>
              <h3 className="text-3xl font-bold text-amber-600 mt-1">{loading ? '-' : stats.destinationsCount}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total de Produtos</p>
              <h3 className="text-3xl font-bold text-purple-600 mt-1">
                {loading ? '-' : stats.totalItems.toLocaleString('pt-BR', {maximumFractionDigits: 2})}
              </h3>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
              <Package size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Valor Acumulado</p>
              <h3 className="text-3xl font-bold text-[#00a86b] mt-1">
                {loading ? '-' : `R$ ${stats.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
              </h3>
            </div>
            <div className="w-12 h-12 bg-[#00a86b]/10 rounded-full flex items-center justify-center text-[#00a86b]">
              <Clock size={24} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Todas as Transferências</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">ID</th>
                <th className="px-6 py-3 font-semibold">Data</th>
                <th className="px-6 py-3 font-semibold">Mês Ref.</th>
                <th className="px-6 py-3 font-semibold">Origem → Destino</th>
                <th className="px-6 py-3 font-semibold">Itens</th>
                <th className="px-6 py-3 font-semibold">Valor Total</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Carregando...</td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Nenhuma transferência cadastrada.</td>
                </tr>
              ) : transfers.map((tr) => {
                const totalItens = tr.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
                return (
                  <tr key={tr.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900 text-xs">...{tr.id.slice(-6)}</td>
                    <td className="px-6 py-4 text-slate-500">{tr.date}</td>
                    <td className="px-6 py-4">{tr.referenceMonth || '-'}</td>
                    <td className="px-6 py-4">
                      {tr.origin} <span className="text-slate-400">→</span> {tr.destination}
                    </td>
                    <td className="px-6 py-4">{totalItens.toLocaleString('pt-BR', {maximumFractionDigits: 2})} un</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">R$ {(tr.totalValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, transferId: tr.id })}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir Transferência"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title="Excluir Transferência"
        message="Tem certeza que deseja excluir esta transferência? Esta ação não pode ser desfeita e os dados não farão mais parte dos relatórios."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, transferId: null })}
      />
    </div>
  );
}
