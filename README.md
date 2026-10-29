# FinControl

Aplicação web pessoal para controle financeiro: dashboards, contas a pagar e receber, orçamentos, previsão de saldo e metas.
Roda 100% no navegador — os dados ficam salvos no `localStorage`, sem servidor.

## Rodando localmente

Requisitos: Node.js 20+.

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Na primeira tela, escolha **Começar do zero** ou **Explorar com dados de exemplo**.

Outros comandos:

- `npm run build` — gera a versão de produção em `dist/`
- `npm run preview` — serve o build localmente
- `npm run typecheck` — checagem de tipos

## Funcionalidades

- **Visão geral**: saldo, receitas, despesas e resultado do mês; "quanto posso gastar por dia"; fluxo de caixa de 6 meses; gastos por categoria; ritmo de gastos x mês anterior; próximas contas; alertas automáticos; evolução e projeção do saldo; orçamentos; regra 50/30/20.
- **Lançamentos**: receitas, despesas e transferências, com filtros, busca, compras parceladas e exportação CSV. Atalho `N` abre um novo lançamento.
- **Contas a pagar/receber**: vencidas, de hoje, próximos 7 dias e futuras, com calendário e baixa em um clique.
- **Fixas e recorrentes**: salário, aluguel, assinaturas… geram lançamentos automaticamente (mensal, semanal ou anual), com opção de débito automático.
- **Orçamentos**: limite mensal por categoria, ritmo do mês e sugestão automática baseada na média dos últimos 3 meses.
- **Previsão**: saldo projetado para 6, 12 ou 24 meses, com simulador (cortar gastos variáveis, renda extra, investimento mensal).
- **Metas**: objetivos com prazo, aportes e quanto guardar por mês.
- **Relatórios**: mapa de calor categoria x mês, evolução por categoria e maiores despesas.
- **Carteiras e categorias**: contas bancárias, cartões, dinheiro; categorias com cor, ícone e grupo (essencial / estilo de vida / futuro).
- **Configurações**: tema claro/escuro, ocultar valores, meta de poupança, backup/restauração em JSON.

> Importante: como os dados ficam no navegador, use **Configurações → Exportar backup** regularmente.
> Limpar os dados do navegador ou trocar de navegador/dispositivo não leva os dados junto.

### Cartão de crédito

Cadastre o cartão como uma conta do tipo *Cartão de crédito* e lance as compras nele. Ao pagar a fatura, registre uma
**transferência** da conta corrente para o cartão — assim os gastos não são contados duas vezes.

## Publicando no GitHub Pages

O projeto já está pronto para o Pages (`base: './'` e rotas com hash):

1. Faça merge na branch `main`.
2. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` publica a cada push na `main` (ou rode manualmente em *Actions*).

## Stack

React 19 + TypeScript, Vite, Tailwind CSS, Recharts, Zustand, date-fns, lucide-react.
