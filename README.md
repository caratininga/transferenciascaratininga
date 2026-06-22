# Sistema de Gestão de Transferências

Um sistema web desenvolvido em Vanilla HTML/JS/CSS para o controle, auditoria e emissão de relatórios de transferências de mercadorias entre filiais (Matriz, Mucambo, Tianguá e Frecheirinha).

## 🚀 Funcionalidades

- **Importação de XLSX**: Carregue planilhas do Excel do sistema ERP. O aplicativo extrairá automaticamente produtos, quantidades, valores e unidades de medida.
- **Relatórios**:
  - **Visão por Loja**: Analise as transferências agrupadas por categoria. Identifique anomalias de preço (destacadas em vermelho/laranja) comparando o valor unitário com o histórico de transferências do mesmo mês.
  - **Análise Geral (Todas as Lojas)**: Uma tabela dinâmica interativa cruzando dados de todas as filiais.
- **Administração de Catálogo**: Controle qual produto pertence a qual grupo/categoria. Os relatórios se atualizarão automaticamente baseados no catálogo.

## 🛠️ Tecnologias Utilizadas

- **HTML5 e JavaScript Puro (Vanilla JS)**: Sem compiladores ou bundlers, fácil de editar.
- **Tailwind CSS**: Estilização via CDN.
- **Firebase Firestore & Auth**: Banco de dados em tempo real e autenticação, via CDN.
- **SheetJS (xlsx)**: Processamento no lado do cliente de planilhas Excel (sem envio para servidor), via CDN.
- **Lucide Icons**: Ícones modernos via CDN.

## 📦 Como Usar

Não é necessário instalar nada!
1. Faça o upload de todos os arquivos (`.html` e a pasta `js`) para o seu servidor ou GitHub Pages.
2. Acesse a URL.
3. Se quiser alterar o layout, basta editar os arquivos HTML diretamente e atualizar o navegador.
