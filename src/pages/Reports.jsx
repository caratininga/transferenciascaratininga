import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FileSpreadsheet, Filter, Calendar, AlertTriangle, BarChart2, ArrowDownUp, Package } from 'lucide-react';
import ProductDetailsModal from '../components/ProductDetailsModal';

const LOCATIONS = ['Matriz', 'Mucambo', 'Tianguá', 'Frecheirinha'];

export default function Reports() {
  const getCurrentMonth = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };

  const [activeTab, setActiveTab] = useState('individual'); // 'individual' | 'comparative'
  const [sortBy, setSortBy] = useState('valor'); // 'valor' | 'quantidade' | 'alfabetica'
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [unitFilter, setUnitFilter] = useState('TODAS');

  const [location, setLocation] = useState(() => {
    return localStorage.getItem('reports_location') || 'Mucambo';
  });
  const [referenceMonth, setReferenceMonth] = useState(() => {
    return localStorage.getItem('reports_referenceMonth') || getCurrentMonth();
  });
  const [allTransfers, setAllTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catalogMap, setCatalogMap] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const docRef = doc(db, 'catalog', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().products) {
          const mapByCode = {};
          const mapByName = {};
          docSnap.data().products.forEach(p => {
             if (p.code) mapByCode[String(p.code)] = p.group || 'SEM GRUPO';
             if (p.name) mapByName[p.name] = p.group || 'SEM GRUPO';
          });
          setCatalogMap({ code: mapByCode, name: mapByName });
        }
      } catch (err) {
        console.error("Erro ao buscar catálogo para mapa", err);
      }
    };
    fetchCatalog();
  }, []);

  useEffect(() => {
    localStorage.setItem('reports_location', location);
  }, [location]);

  useEffect(() => {
    localStorage.setItem('reports_referenceMonth', referenceMonth);
  }, [referenceMonth]);

  useEffect(() => {
    fetchReport();
  }, [referenceMonth]);

  const fetchReport = async () => {
    if (!referenceMonth) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'transfers'), 
        where('referenceMonth', '==', referenceMonth)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => doc.data());
      setAllTransfers(data);
    } catch (err) {
      console.error("Erro ao buscar relatório", err);
    } finally {
      setLoading(false);
    }
  };

  const availableUnits = useMemo(() => {
    const units = new Set();
    allTransfers.forEach(tr => {
      tr.items?.forEach(item => units.add((item.unit || 'UN').toUpperCase()));
    });
    return ['TODAS', ...Array.from(units).sort()];
  }, [allTransfers]);

  useEffect(() => {
    if (unitFilter !== 'TODAS' && !availableUnits.includes(unitFilter)) {
      setUnitFilter('TODAS');
    }
  }, [availableUnits, unitFilter]);

  const groupedData = useMemo(() => {
    const summary = {};
    const groupTotals = {};
    const groupQtys = {};
    let totalGeral = 0;

    const transfersFiltered = allTransfers.filter(tr => tr.destination === location);

    transfersFiltered.forEach(tr => {
      if (tr.items) {
        tr.items.forEach(item => {
          const unit = (item.unit || 'UN').toUpperCase();
          if (unitFilter !== 'TODAS' && unit !== unitFilter) return;

          const itemCodeStr = item.code ? String(item.code) : '';
          const actualGroup = (itemCodeStr && catalogMap.code?.[itemCodeStr]) 
                        || catalogMap.name?.[item.product] 
                        || 'SEM GRUPO';
          
          const group = groupByCategory ? actualGroup : 'LISTA GERAL DE PRODUTOS';
          const key = itemCodeStr ? `${itemCodeStr}-${item.product}-${unit}` : `${item.product}-${unit}`;

          if (!summary[group]) summary[group] = {};
          
          if (!summary[group][key]) {
            summary[group][key] = {
              codigo: itemCodeStr,
              nome: item.product,
              unidadeMedida: unit,
              quantidade: 0,
              valorUnitario: item.unitValue || 0,
              valorTotal: 0,
              historico: []
            };
          }
          
          const qtd = item.quantity || 0;
          const vlrUnit = item.unitValue || 0;
          const vlrTotItem = item.totalValue !== undefined ? item.totalValue : (qtd * vlrUnit);

          summary[group][key].quantidade += qtd;
          summary[group][key].valorTotal += vlrTotItem;
          
          if (summary[group][key].quantidade > 0) {
            summary[group][key].valorUnitario = summary[group][key].valorTotal / summary[group][key].quantidade;
          }

          summary[group][key].historico.push({
            data: tr.createdAt?.toDate().toLocaleDateString('pt-BR') || 'Recente',
            origem: tr.origin || 'Desconhecida',
            unidadeMedida: unit,
            quantidade: qtd,
            valorUnitario: vlrUnit,
            valorTotal: vlrTotItem
          });
        });
      }
    });

    Object.keys(summary).forEach(group => {
      let totalDoGrupo = 0;
      let qtyDoGrupo = 0;
      Object.keys(summary[group]).forEach(prod => {
        const item = summary[group][prod];
        totalDoGrupo += item.valorTotal;
        qtyDoGrupo += item.quantidade;
        totalGeral += item.valorTotal;

        item.hasAnomaly = false;
        if (item.historico && item.historico.length > 1) {
          const mean = item.valorUnitario;
          for (const hist of item.historico) {
            if (hist.valorUnitario > mean * 1.3 || hist.valorUnitario < mean * 0.7) {
              item.hasAnomaly = true;
              break;
            }
          }
        }
      });
      groupTotals[group] = totalDoGrupo;
      groupQtys[group] = qtyDoGrupo;
    });

    return { summary, groupTotals, groupQtys, totalGeral };
  }, [allTransfers, location, catalogMap, groupByCategory, unitFilter]);

  const comparativeData = useMemo(() => {
    const summary = {};
    const locTotals = {};
    const groupTotals = {};
    const groupQtys = {};
    LOCATIONS.forEach(l => locTotals[l] = { qty: 0, val: 0 });
    let grandTotalVal = 0;

    allTransfers.forEach(tr => {
      const loc = tr.destination;
      if (!LOCATIONS.includes(loc)) return;

      if (tr.items) {
        tr.items.forEach(item => {
          const unit = (item.unit || 'UN').toUpperCase();
          if (unitFilter !== 'TODAS' && unit !== unitFilter) return;

          const itemCodeStr = item.code ? String(item.code) : '';
          const actualGroup = (itemCodeStr && catalogMap.code?.[itemCodeStr]) 
                        || catalogMap.name?.[item.product] 
                        || 'SEM GRUPO';
          const group = groupByCategory ? actualGroup : 'LISTA GERAL DE PRODUTOS';
          const key = itemCodeStr ? `${itemCodeStr}-${item.product}-${unit}` : `${item.product}-${unit}`;

          if (!summary[group]) summary[group] = {};

          if (!summary[group][key]) {
            summary[group][key] = {
              codigo: itemCodeStr,
              nome: item.product,
              unidadeMedida: unit,
              locations: {},
              totalQty: 0,
              totalVal: 0
            };
            LOCATIONS.forEach(l => summary[group][key].locations[l] = { qty: 0, val: 0 });
          }

          const qtd = item.quantity || 0;
          const vlrUnit = item.unitValue || 0;
          const vlrTotItem = item.totalValue !== undefined ? item.totalValue : (qtd * vlrUnit);

          summary[group][key].locations[loc].qty += qtd;
          summary[group][key].locations[loc].val += vlrTotItem;
          summary[group][key].totalQty += qtd;
          summary[group][key].totalVal += vlrTotItem;

          locTotals[loc].qty += qtd;
          locTotals[loc].val += vlrTotItem;
          groupTotals[group] = (groupTotals[group] || 0) + vlrTotItem;
          groupQtys[group] = (groupQtys[group] || 0) + qtd;
          grandTotalVal += vlrTotItem;
        });
      }
    });

    return { summary, locTotals, groupTotals, groupQtys, grandTotalVal };
  }, [allTransfers, catalogMap, groupByCategory, unitFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Relatório de Transferências</h1>
        <p className="text-slate-500">Agrupamento consolidado baseado na Planilha BackOffice</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'individual' 
                ? 'border-[#00a86b] text-[#00a86b] bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter size={18} />
            Visão por Loja
          </button>
          <button
            onClick={() => setActiveTab('comparative')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'comparative' 
                ? 'border-[#00a86b] text-[#00a86b] bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart2 size={18} />
            Análise Geral (Todas Lojas)
          </button>
        </div>

        <div className="p-6 bg-slate-50 flex flex-wrap gap-4 items-end border-b border-slate-200">
          {activeTab === 'individual' && (
            <div className="w-full sm:w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Filter size={16} /> Loja Destino
              </label>
              <select 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none"
              >
                {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
          )}
          
          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Calendar size={16} /> Mês de Ref.
            </label>
            <input 
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none"
            />
          </div>

          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Package size={16} /> Filtrar Unidade
            </label>
            <select 
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none"
            >
              {availableUnits.map(u => <option key={u} value={u}>{u === 'TODAS' ? 'Todas' : u}</option>)}
            </select>
          </div>

          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <ArrowDownUp size={16} /> Ordenar por
            </label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00a86b] outline-none"
            >
              <option value="valor">Maior Valor (R$)</option>
              <option value="quantidade">Maior Quantidade</option>
              <option value="alfabetica">Ordem Alfabética</option>
            </select>
          </div>

          <div className="w-full sm:w-auto flex items-center pb-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors">
              <input 
                type="checkbox" 
                checked={groupByCategory} 
                onChange={(e) => setGroupByCategory(e.target.checked)}
                className="w-4 h-4 text-[#00a86b] rounded border-slate-300 focus:ring-[#00a86b]"
              />
              Agrupar por Categoria
            </label>
          </div>
          
          <button 
            onClick={fetchReport}
            className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-6 rounded-lg transition-colors border border-slate-300 shadow-sm ml-auto w-full sm:w-auto"
          >
            Atualizar Dados
          </button>
        </div>
      </div>

      {activeTab === 'individual' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-[#003d33] flex justify-between items-center text-white">
            <h2 className="font-bold flex items-center gap-2">
              <FileSpreadsheet size={20} />
              Visão Agrupada - {location}
            </h2>
            <div className="text-sm bg-black/20 px-3 py-1 rounded-full font-bold">
              Total Geral: R$ {groupedData.totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Gerando relatório...</div>
          ) : Object.keys(groupedData.summary).length === 0 ? (
            <div className="p-12 text-center text-slate-500">Nenhuma transferência encontrada para o filtro.</div>
          ) : (
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm text-left relative">
                <thead className="text-xs text-white uppercase bg-slate-800 sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="px-6 py-3 font-semibold w-24">Código</th>
                    <th className="px-6 py-3 font-semibold">Produto</th>
                    <th className="px-6 py-3 font-semibold text-center">Quantidade</th>
                    <th className="px-6 py-3 font-semibold text-right">Valor Unitário</th>
                    <th className="px-6 py-3 font-semibold text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(groupedData.summary)
                    .sort(([grupoA], [grupoB]) => {
                      if (sortBy === 'valor') return groupedData.groupTotals[grupoB] - groupedData.groupTotals[grupoA];
                      if (sortBy === 'quantidade') return groupedData.groupQtys[grupoB] - groupedData.groupQtys[grupoA];
                      return grupoA.localeCompare(grupoB);
                    })
                    .map(([grupo, produtos]) => (
                    <React.Fragment key={grupo}>
                      {groupByCategory && (
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <td colSpan="5" className="p-0">
                            <div className="px-6 py-2 font-bold text-slate-700 uppercase text-xs tracking-wider flex justify-between items-center w-full">
                              <span>{grupo}</span>
                              <span className="text-[#00a86b]">Total: R$ {groupedData.groupTotals[grupo].toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {Object.entries(produtos)
                        .sort(([keyA, dadosA], [keyB, dadosB]) => {
                          if (sortBy === 'valor') return dadosB.valorTotal - dadosA.valorTotal;
                          if (sortBy === 'quantidade') return dadosB.quantidade - dadosA.quantidade;
                          return dadosA.nome.localeCompare(dadosB.nome);
                        })
                        .map(([key, dados]) => (
                        <tr 
                          key={key} 
                          className={`cursor-pointer transition-colors group ${dados.hasAnomaly ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-blue-50'}`}
                          onClick={() => setSelectedProduct(dados)}
                          title={dados.hasAnomaly ? "Divergência de preço detectada! Clique para detalhes." : "Clique para ver detalhes das remessas"}
                        >
                          <td className={`px-6 py-3 font-medium ${dados.hasAnomaly ? 'text-amber-700' : 'text-slate-500 group-hover:text-blue-600'}`}>{dados.codigo || '-'}</td>
                          <td className={`px-6 py-3 font-medium ${dados.hasAnomaly ? 'text-amber-900' : 'text-slate-800 group-hover:text-blue-700'}`}>{dados.nome}</td>
                          <td className={`px-6 py-3 text-center font-bold ${dados.hasAnomaly ? 'text-amber-700' : 'text-[#00a86b] group-hover:text-blue-600'}`}>
                            {dados.quantidade.toLocaleString('pt-BR', {maximumFractionDigits: 2})} <span className="text-xs font-normal text-slate-500 ml-0.5">{dados.unidadeMedida}</span>
                          </td>
                          <td className={`px-6 py-3 text-right ${dados.hasAnomaly ? 'text-red-600 font-bold' : 'text-slate-500 group-hover:text-blue-500'}`}>
                            <div className="flex items-center justify-end gap-1">
                              {dados.hasAnomaly && <AlertTriangle size={14} className="text-red-500" />}
                              R$ {dados.valorUnitario.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </div>
                          </td>
                          <td className={`px-6 py-3 text-right font-bold ${dados.hasAnomaly ? 'text-amber-800' : 'text-slate-700 group-hover:text-blue-700'}`}>
                            R$ {dados.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comparative' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-800 flex justify-between items-center text-white">
            <h2 className="font-bold flex items-center gap-2">
              <BarChart2 size={20} />
              Análise Geral das Lojas - {referenceMonth}
            </h2>
            <div className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold">
              Total Geral: R$ {comparativeData.grandTotalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Gerando relatório comparativo...</div>
          ) : Object.keys(comparativeData.summary).length === 0 ? (
            <div className="p-12 text-center text-slate-500">Nenhuma transferência encontrada para o mês.</div>
          ) : (
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm text-left relative">
                <thead className="text-xs text-white uppercase bg-slate-700 sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="px-4 py-3 font-semibold bg-slate-700 z-20">Produto</th>
                    {LOCATIONS.map(loc => (
                      <th key={loc} className="px-4 py-3 font-semibold text-center border-l border-slate-600 bg-slate-700 z-20">{loc}</th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-right border-l border-slate-600 bg-slate-800 z-20">Total Produto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(comparativeData.summary)
                    .sort(([grupoA], [grupoB]) => {
                      if (sortBy === 'valor') return comparativeData.groupTotals[grupoB] - comparativeData.groupTotals[grupoA];
                      if (sortBy === 'quantidade') return comparativeData.groupQtys[grupoB] - comparativeData.groupQtys[grupoA];
                      return grupoA.localeCompare(grupoB);
                    })
                    .map(([grupo, produtos]) => (
                    <React.Fragment key={grupo}>
                      {groupByCategory && (
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <td colSpan={LOCATIONS.length + 2} className="p-0">
                            <div className="px-4 py-2 font-bold text-slate-700 uppercase text-xs tracking-wider flex justify-between items-center w-full">
                              <span>{grupo}</span>
                              <span className="text-[#00a86b]">Total: R$ {comparativeData.groupTotals[grupo].toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {Object.entries(produtos)
                        .sort(([keyA, dadosA], [keyB, dadosB]) => {
                          if (sortBy === 'valor') return dadosB.totalVal - dadosA.totalVal;
                          if (sortBy === 'quantidade') return dadosB.totalQty - dadosA.totalQty;
                          return dadosA.nome.localeCompare(dadosB.nome);
                        })
                        .map(([key, dados]) => (
                        <tr key={key} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-medium text-slate-800">{dados.nome}</div>
                            {dados.codigo && <div className="text-xs text-slate-400 mt-0.5">{dados.codigo}</div>}
                          </td>
                          
                          {LOCATIONS.map(loc => {
                            const locData = dados.locations[loc];
                            return (
                              <td key={loc} className={`px-4 py-2 text-center border-r border-slate-100 ${locData.qty > 0 ? 'bg-blue-50/30' : ''}`}>
                                {locData.qty > 0 ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="font-bold text-[#00a86b]">
                                      {locData.qty.toLocaleString('pt-BR', {maximumFractionDigits: 2})} <span className="text-[10px] font-normal text-slate-500">{dados.unidadeMedida}</span>
                                    </div>
                                    <div className="text-xs font-medium text-slate-600 mt-0.5">
                                      R$ {locData.val.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          
                          <td className="px-4 py-3 text-right bg-slate-50 border-l border-slate-200">
                            <div className="font-bold text-slate-800">
                              {dados.totalQty.toLocaleString('pt-BR', {maximumFractionDigits: 2})} <span className="text-[10px] font-normal text-slate-500">{dados.unidadeMedida}</span>
                            </div>
                            <div className="text-xs font-bold text-[#00a86b] mt-0.5">
                              R$ {dados.totalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  {/* LINHA DE TOTAIS GERAIS */}
                  <tr className="bg-slate-800 text-white font-bold">
                    <td className="px-4 py-4 text-right uppercase text-xs tracking-wider">
                      TOTAL GERAL DO MÊS
                    </td>
                    {LOCATIONS.map(loc => (
                      <td key={loc} className="px-4 py-4 text-center border-l border-slate-600">
                        <div className="text-xs text-slate-300 mb-1">R$</div>
                        <div className="text-[#a3e8ce] text-base">
                          {comparativeData.locTotals[loc].val.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-4 text-right border-l border-slate-600 bg-slate-900">
                      <div className="text-xs text-slate-400 mb-1">R$</div>
                      <div className="text-[#00a86b] text-lg">
                        {comparativeData.grandTotalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ProductDetailsModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        productData={selectedProduct} 
      />
    </div>
  );
}
