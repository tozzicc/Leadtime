# Lead Time App

Este é um aplicativo para visualização de Lead Time utilizando um Gráfico de Gantt.

## Tecnologias Utilizadas
- **Backend**: Node.js, Express, MSSQL (SQL Server)
- **Frontend**: React, TypeScript, Vite, Chart.js, Lucide React, Framer Motion

## Configuração do Banco de Dados
O aplicativo está configurado para conectar ao servidor SQL Server:
- **IP**: 10.211.0.4
- **Banco**: PROTHEUS_PRODUCAO
- **Usuário**: consulta

## Como Executar

### Pré-requisitos
- Node.js instalado

### Passos
1. Instale as dependências na raiz do projeto:
   ```bash
   npm run install-all
   ```

2. Inicie o backend e o frontend simultaneamente:
   ```bash
   npm run dev
   ```

O frontend estará disponível em `http://localhost:5173` e o backend em `http://localhost:3001`.

## Funcionalidades
- Dashboard premium com design moderno.
- Visualização de Lead Time por produto através de barras empilhadas (Gantt).
- Atualização em tempo real dos dados do Protheus.
