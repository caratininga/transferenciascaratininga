# Sistema de Gestão de Transferências

Um sistema web robusto desenvolvido em React para o controle, auditoria e emissão de relatórios de transferências de mercadorias entre filiais (Matriz, Mucambo, Tianguá e Frecheirinha).

## 🚀 Funcionalidades Principais

* **Importação Inteligente de Planilhas:** Faça o upload de planilhas Excel para importar centenas de itens de transferência em segundos. O sistema mapeia os nomes de colunas de forma flexível (ex: `Código+Produto`, `Qtde`, `Vl. Unitário`, `UN`).
* **Análise de Anomalias Automática:** O sistema identifica automaticamente e alerta o usuário sobre divergências de preço em transferências (variações acima de 30% em relação à média ponderada histórica do produto).
* **Gestão de Unidades de Medida:** Separação rígida de produtos baseada em sua unidade de medida (KG, UN, CX, BJ30), garantindo cálculos precisos de volume e valor.
* **Relatórios e Tabelas Dinâmicas (Pivot):** 
  * Visão individual detalhada por Loja.
  * Visão tática comparativa lado a lado de todas as Lojas simultaneamente (Tabela Dinâmica), com totais agrupados por categoria.
* **Agrupamento e Ordenação:** Possibilidade de agrupar por categoria de catálogo ou listar produtos individualmente, ordenados por Maior Valor, Maior Quantidade ou Ordem Alfabética.
* **Filtros Dinâmicos:** Filtre facilmente as informações por Mês de Referência, Destino ou Unidade de Medida (KG, CX, etc).

## 🛠️ Tecnologias Utilizadas

* **React (Vite):** Frontend rápido e responsivo.
* **Firebase Firestore:** Banco de dados NoSQL em tempo real para armazenamento seguro dos históricos de transferências e catálogo de produtos.
* **Tailwind CSS:** Estilização moderna, limpa e responsiva.
* **XLSX:** Leitura e conversão de arquivos de planilha diretamente no navegador.
* **Lucide React:** Ícones vetoriais modernos.

## 📦 Como Rodar Localmente

1. Clone o repositório.
2. Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.
3. Instale as dependências executando:
   ```bash
   npm install
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. O aplicativo estará disponível em `http://localhost:5173`.

## ⚙️ Configuração do Firebase
Para o funcionamento correto, é necessário configurar as credenciais do Firebase (no arquivo `src/lib/firebase.js`). O banco de dados requer as coleções `transfers` e `catalog`.

---
*Desenvolvido para otimizar o backoffice e controle financeiro logístico.*
