/*
 * Miva — Controle de Vendas (semijoias)
 * Arquivo único auto-contido. React + hooks.
 *
 * Arquitetura pensada para migração futura:
 *  - Camada Storage  (sect. 2)  → troque por Supabase mantendo a mesma interface
 *  - Camada Calc     (sect. 3)  → regras de negócio puras (taxas, lucro), sem depender de storage
 *  - Componentes     (sect. 6+) → consomem state, chamam ações
 */

const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ============================================================
   1. ESTILO — paleta de joalheria, tipografia, animações
   ============================================================ */
const CSS = `
:root {
  --bg:        #FBF7F0;       /* off-white quente */
  --bg-deep:   #F3ECDF;       /* fundo de seções */
  --surface:   #FFFFFF;
  --surface-2: #FDFAF4;
  --ink:       #2B1F18;       /* café profundo, texto principal */
  --ink-2:     #6B5848;       /* texto secundário */
  --ink-3:     #9A8676;       /* texto fraco */
  --line:      #E8DECB;       /* borda padrão */
  --line-2:    #D9CCB3;       /* borda mais marcada */

  --gold:      #B8924B;       /* dourado champanhe */
  --gold-2:    #8B6F38;       /* dourado escuro p/ texto */
  --gold-soft: #EFE4CC;       /* tinta de fundo dourada */
  --emerald:   #2F6A55;       /* verde esmeralda — lucro / sucesso */
  --emerald-soft:#DCEAE3;
  --rose:      #B47574;       /* rosé — destaques suaves */
  --rose-soft: #F2E1DF;

  --danger:    #9C3B3B;
  --danger-soft:#F2DCDC;
  --warn:      #B07A2C;
  --warn-soft: #F6E8CE;

  --r-sm: 6px;
  --r:    10px;
  --r-lg: 16px;

  --shadow-sm: 0 1px 2px rgba(43,31,24,0.04), 0 1px 1px rgba(43,31,24,0.03);
  --shadow:    0 2px 6px rgba(43,31,24,0.05), 0 6px 24px -12px rgba(43,31,24,0.10);
  --shadow-lg: 0 8px 32px -8px rgba(43,31,24,0.15);

  --serif: 'Cormorant Garamond', Georgia, serif;
  --sans:  'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); }
body {
  font-family: var(--sans);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
button { font-family: inherit; cursor: pointer; }
input, select, textarea { font-family: inherit; color: inherit; }

/* ---- App shell ---- */
.app {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 232px 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: "side header" "side main";
}
@media (max-width: 880px) {
  .app {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas: "header" "main" "side";
  }
}

/* ---- Header ---- */
.header {
  grid-area: header;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  padding: 16px 28px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.brand {
  display: flex; align-items: center;
}
.brand-logo {
  height: 44px;
  width: auto;
  display: block;
  /* leve aquecimento p/ casar com a paleta café */
  filter: sepia(15%) saturate(110%) hue-rotate(-5deg);
}
.header-meta {
  font-size: 12px;
  color: var(--ink-2);
  text-align: right;
}
.header-meta strong {
  display: block;
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0.01em;
  text-transform: capitalize;
}
@media (max-width: 880px) {
  .header { padding: 12px 16px; }
  .brand-logo { height: 32px; }
  .header-meta strong { font-size: 14px; }
}

/* ---- Sidebar / bottom nav ---- */
.nav {
  grid-area: side;
  background: var(--surface);
  border-right: 1px solid var(--line);
  padding: 24px 16px;
  display: flex; flex-direction: column; gap: 4px;
}
.nav-section {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--ink-3);
  padding: 8px 12px 4px;
}
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: var(--r);
  color: var(--ink-2);
  background: transparent;
  border: 0;
  text-align: left;
  font-size: 14px;
  width: 100%;
  transition: background .15s ease, color .15s ease;
}
.nav-item:hover { background: var(--bg-deep); color: var(--ink); }
.nav-item.active {
  background: var(--ink);
  color: var(--bg);
}
.nav-item.active .nav-icon { color: var(--gold); }
.nav-icon {
  width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--ink-3);
  flex: 0 0 auto;
}
.nav-item.active .nav-icon { color: var(--gold); }
.nav-item:hover .nav-icon { color: var(--gold-2); }

@media (max-width: 880px) {
  .nav {
    flex-direction: row;
    padding: 6px 6px max(6px, env(safe-area-inset-bottom));
    border-right: 0;
    border-top: 1px solid var(--line);
    position: sticky; bottom: 0;
    overflow-x: auto;
    z-index: 10;
  }
  .nav-section { display: none; }
  .nav-item {
    flex: 1; flex-direction: column; gap: 4px;
    padding: 8px 6px;
    font-size: 11px;
    min-width: 64px;
    border-radius: var(--r-sm);
  }
}

/* ---- Main ---- */
.main {
  grid-area: main;
  padding: 28px 32px 40px;
  width: 100%;
  min-width: 0;       /* permite que filhos com overflow respeitem o grid */
  animation: fadeIn .35s ease both;
}
@media (min-width: 1600px) {
  .main { padding: 36px 48px 56px; }
}
@media (max-width: 880px) {
  .main { padding: 16px 14px 24px; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- Tipografia de telas ---- */
.screen-title {
  font-family: var(--serif);
  font-weight: 500;
  font-size: 34px;
  letter-spacing: 0.005em;
  color: var(--ink);
  margin: 0 0 4px;
  line-height: 1.1;
}
.screen-sub {
  color: var(--ink-2);
  font-size: 13px;
  margin: 0 0 24px;
}
.section-title {
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 500;
  color: var(--ink);
  margin: 0 0 12px;
  letter-spacing: 0.01em;
}
.section-sub {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--ink-3);
  margin: 0 0 14px;
}

/* ---- Card primitive ---- */
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.card-elev { box-shadow: var(--shadow); }

/* ---- KPI cards ---- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
@media (min-width: 1600px) { .kpi-grid { gap: 20px; } }
@media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px)  { .kpi-grid { grid-template-columns: 1fr; } }

.kpi {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
}
.kpi::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--gold) 50%, transparent);
  opacity: 0;
  transition: opacity .3s ease;
}
.kpi:hover::before { opacity: 1; }
.kpi-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--ink-3);
  margin-bottom: 8px;
}
.kpi-value {
  font-family: var(--serif);
  font-size: 30px;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.1;
  letter-spacing: 0.005em;
}
.kpi-value .cents {
  font-size: 18px;
  color: var(--ink-2);
}
.kpi-note {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 6px;
  font-style: italic;
}
.kpi.accent .kpi-value { color: var(--emerald); }

/* ---- Two-column ---- */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 18px;
}
@media (max-width: 880px) { .two-col { grid-template-columns: 1fr; } }

/* ---- Bar (horizontal) ---- */
.bar-row {
  display: grid;
  grid-template-columns: 130px 1fr 90px;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
}
.bar-row + .bar-row { border-top: 1px dashed var(--line); }
.bar-label { color: var(--ink); }
.bar-sub { color: var(--ink-3); font-size: 11px; }
.bar-track {
  height: 8px;
  background: var(--bg-deep);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--gold);
  width: 0;
  transition: width .8s cubic-bezier(.2,.7,.2,1);
}
.bar-fill.online   { background: linear-gradient(90deg, var(--gold-2), var(--gold)); }
.bar-fill.cidade   { background: linear-gradient(90deg, var(--emerald), #4F8770); }
.bar-fill.neutral  { background: linear-gradient(90deg, #C9B580, var(--gold)); }
.bar-value {
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--ink);
  font-size: 13px;
}

/* ---- Lista simples ---- */
.list {
  display: flex; flex-direction: column;
}
.list-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}
.list-item:first-child { border-top: 0; }
.list-item-main { display: flex; flex-direction: column; gap: 2px; }
.list-item-name { color: var(--ink); font-size: 13px; }
.list-item-meta { color: var(--ink-3); font-size: 11px; }
.list-item-value { font-family: var(--serif); font-size: 18px; color: var(--ink); }

/* ---- Botões ---- */
.btn {
  display: inline-flex; align-items: center; gap: 8px; justify-content: center;
  padding: 10px 16px;
  border-radius: var(--r);
  border: 1px solid var(--line-2);
  background: var(--surface);
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  transition: all .15s ease;
  white-space: nowrap;
}
.btn:hover { border-color: var(--gold); background: var(--surface-2); }
.btn:active { transform: translateY(1px); }
.btn-primary {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
.btn-primary:hover { background: #1c130e; border-color: #1c130e; }
.btn-primary:disabled {
  background: var(--ink-3); border-color: var(--ink-3); cursor: not-allowed;
}
.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--ink-2);
  padding: 6px 10px;
}
.btn-ghost:hover { color: var(--ink); background: var(--bg-deep); }
.btn-danger {
  color: var(--danger);
  border-color: transparent;
  background: transparent;
}
.btn-danger:hover { background: var(--danger-soft); }
.btn-small { padding: 6px 10px; font-size: 12px; }
.btn-icon {
  padding: 6px;
  width: 30px; height: 30px;
  border-radius: var(--r-sm);
}

/* ---- Toggle / segmented ---- */
.seg {
  display: inline-flex;
  background: var(--bg-deep);
  border-radius: var(--r);
  padding: 4px;
  gap: 4px;
}
.seg-opt {
  padding: 8px 14px;
  border-radius: var(--r-sm);
  border: 0;
  background: transparent;
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  transition: all .15s ease;
}
.seg-opt.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}
.seg-opt:hover:not(.active) { color: var(--ink); }
.seg.wrap { flex-wrap: wrap; }

/* ---- Form ---- */
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 540px) { .field-row { grid-template-columns: 1fr; } }
.label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ink-3);
}
.input, .select {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--surface);
  color: var(--ink);
  font-size: 14px;
  transition: border .15s ease, box-shadow .15s ease;
  width: 100%;
}
.input:focus, .select:focus {
  outline: none;
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(184,146,75,0.15);
}
.input::placeholder { color: var(--ink-3); }
.select {
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='%236B5848' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}

/* ---- Tabela ---- */
.table-wrap {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
  overflow-x: auto;   /* tabela longa no celular: rola horizontalmente */
  box-shadow: var(--shadow-sm);
  -webkit-overflow-scrolling: touch;
}
.table {
  width: 100%;
  min-width: 720px;   /* abaixo disso o usuário rola, evita esmagar colunas */
  border-collapse: collapse;
  font-size: 13px;
}
.table th {
  text-align: left;
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ink-3);
  padding: 14px 16px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
}
.table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: middle;
}
.table tr:last-child td { border-bottom: 0; }
.table tr:hover td { background: var(--surface-2); }
.table .num { text-align: right; font-variant-numeric: tabular-nums; }

/* ---- Pills / chips ---- */
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.chip.online   { background: var(--gold-soft);    color: var(--gold-2); }
.chip.cidade   { background: var(--emerald-soft); color: var(--emerald); }
.chip.lucro    { color: var(--emerald); }
.chip.lucro-neg{ color: var(--danger); }
.chip.warn     { background: var(--warn-soft); color: var(--warn); }
.chip.danger   { background: var(--danger-soft); color: var(--danger); }
.chip.subtle   { background: var(--bg-deep); color: var(--ink-2); }
.chip-dot      { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .9; }

/* ---- Carrinho de venda ---- */
.cart-line {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--line);
}
.cart-line:first-child { border-top: 0; }
.qty {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  background: var(--surface);
}
.qty button {
  width: 30px; height: 30px;
  border: 0;
  background: transparent;
  color: var(--ink-2);
  font-size: 16px;
  transition: background .15s ease;
}
.qty button:hover { background: var(--bg-deep); color: var(--ink); }
.qty button:disabled { color: var(--ink-3); cursor: not-allowed; }
.qty-val {
  min-width: 32px; text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 500;
}

/* ---- Resumo ---- */
.summary-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 8px 0;
  font-size: 13px;
}
.summary-row + .summary-row { border-top: 1px dashed var(--line); }
.summary-row .lbl { color: var(--ink-2); }
.summary-row .val { color: var(--ink); font-variant-numeric: tabular-nums; }
.summary-row.total .lbl { color: var(--ink); font-weight: 500; }
.summary-row.total .val {
  font-family: var(--serif);
  font-size: 22px;
  color: var(--emerald);
}
.summary-row.fee .val { color: var(--danger); }

/* ---- Search ---- */
.search-wrap { position: relative; }
.search-wrap .input { padding-left: 36px; }
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: var(--ink-3); pointer-events: none;
}

/* ---- Result list (search produtos) ---- */
.search-results {
  margin-top: 8px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--surface);
  max-height: 280px;
  overflow-y: auto;
}
.search-result-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px;
  border-top: 1px solid var(--line);
  cursor: pointer;
  transition: background .12s ease;
}
.search-result-item:first-child { border-top: 0; }
.search-result-item:hover { background: var(--surface-2); }
.search-result-item.disabled { opacity: .5; cursor: not-allowed; }

/* ---- Empty state ---- */
.empty {
  text-align: center;
  padding: 56px 20px;
  color: var(--ink-3);
}
.empty-title {
  font-family: var(--serif);
  font-size: 24px;
  font-weight: 500;
  color: var(--ink-2);
  margin: 0 0 6px;
}
.empty-sub { font-size: 13px; margin: 0; }
.empty-icon {
  width: 48px; height: 48px;
  margin: 0 auto 14px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--gold-soft);
  color: var(--gold-2);
}

/* ---- Cartões de produto ---- */
.produto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
@media (min-width: 1400px) {
  .produto-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
}
.produto-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.produto-card:hover { border-color: var(--line-2); box-shadow: 0 4px 16px rgba(0,0,0,.06); }
.produto-card.low-stock { border-color: var(--warn); }
.produto-card.out-stock { border-color: var(--danger); }
.produto-img-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--surface-2);
  overflow: hidden;
  flex-shrink: 0;
}
.produto-img-wrap img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .3s ease;
}
.produto-card:hover .produto-img-wrap img { transform: scale(1.04); }
.produto-img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-3); font-size: 32px;
}
.produto-card-body {
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
  flex: 1;
}
.produto-name {
  font-family: var(--serif);
  font-size: 19px;
  font-weight: 500;
  color: var(--ink);
  margin: 0;
  line-height: 1.2;
}
.produto-ref { font-size: 11px; color: var(--ink-3); letter-spacing: 0.08em; text-transform: uppercase; }
.produto-stats {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.produto-stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--ink-3); }
.produto-stat-val { font-family: var(--serif); font-size: 17px; color: var(--ink); }
.stock-controls { display: flex; align-items: center; gap: 10px; }

/* ---- Filtros ---- */
.filter-bar {
  display: flex; gap: 10px; flex-wrap: wrap;
  margin-bottom: 16px;
  align-items: center;
}
.filter-bar .label-inline {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ink-3);
  margin-right: 4px;
}
@media (max-width: 540px) {
  .filter-bar > .select { flex: 1 1 140px; }
}

/* ---- Toast ---- */
.toast {
  position: fixed;
  bottom: 24px; right: 24px;
  background: var(--ink);
  color: var(--bg);
  padding: 14px 18px;
  border-radius: var(--r);
  box-shadow: var(--shadow-lg);
  font-size: 13px;
  z-index: 100;
  animation: toastIn .25s cubic-bezier(.2,.8,.2,1) both;
}
.toast.success { background: var(--emerald); }
.toast.error { background: var(--danger); }
@keyframes toastIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
@media (max-width: 880px) {
  .toast { bottom: 80px; left: 16px; right: 16px; }
}

/* ---- Modal ---- */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(43,31,24,0.4);
  backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
  padding: 20px;
  animation: fadeIn .2s ease both;
}
.modal {
  background: var(--surface);
  border-radius: var(--r-lg);
  padding: 28px;
  max-width: 440px;
  width: 100%;
  box-shadow: var(--shadow-lg);
}
.modal-title { font-family: var(--serif); font-size: 22px; font-weight: 500; margin: 0 0 8px; }
.modal-text { color: var(--ink-2); margin: 0 0 20px; font-size: 13px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

/* ---- Hairline divider ---- */
.hairline { border: 0; border-top: 1px solid var(--line); margin: 18px 0; }

/* ---- Section block padding ---- */
.block + .block { margin-top: 18px; }
`;

/* ============================================================
   2. CAMADA DE API — cliente REST para o backend Next.js
   ------------------------------------------------------------
   Toda a app fala SÓ com este objeto. Backend: /api/*
   ============================================================ */
const API = {
  async getProdutos() {
    const r = await fetch('/api/produtos');
    if (!r.ok) throw new Error('Erro ao carregar produtos');
    return r.json();
  },
  async createProduto(produto) {
    const r = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto),
    });
    if (!r.ok) throw new Error('Erro ao criar produto');
    return r.json();
  },
  async updateProduto(id, dados) {
    const r = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!r.ok) throw new Error('Erro ao atualizar produto');
    return r.json();
  },
  async deleteProduto(id) {
    const r = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Erro ao excluir produto');
  },
  async getVendas() {
    const r = await fetch('/api/vendas');
    if (!r.ok) throw new Error('Erro ao carregar vendas');
    return r.json();
  },
  async createVenda(venda) {
    const r = await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venda),
    });
    if (!r.ok) throw new Error('Erro ao registrar venda');
    return r.json();
  },
  async deleteVenda(id) {
    const r = await fetch(`/api/vendas/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Erro ao excluir venda');
  },
  async getClientes() {
    const r = await fetch('/api/clientes');
    if (!r.ok) throw new Error('Erro ao carregar clientes');
    return r.json();
  },
};

/* ============================================================
   3. REGRAS DE NEGÓCIO — taxas, cálculo de lucro, baixa estoque
   ------------------------------------------------------------
   Funções PURAS, sem efeitos colaterais e sem depender de storage.
   Toda matemática de venda mora aqui.
   ============================================================ */

/** Tabela de taxas das formas de pagamento.
 *  🔧 Ajustar com as taxas reais da maquininha.
 *  taxa: percentual deduzido do valorBruto.
 *  permiteParcelas: se true, a UI mostra o campo "parcelas". */
const TAXAS = {
  pix:               { label: 'Pix',                 taxa: 0.000, permiteParcelas: false },
  dinheiro:          { label: 'Dinheiro',            taxa: 0.000, permiteParcelas: false },
  debito:            { label: 'Débito',              taxa: 0.015, permiteParcelas: false },
  credito_vista:     { label: 'Crédito à vista',     taxa: 0.035, permiteParcelas: false },
  credito_parcelado: { label: 'Crédito parcelado',   taxa: 0.065, permiteParcelas: true  },
};

const ORDEM_PAGAMENTOS = ['pix', 'dinheiro', 'debito', 'credito_vista', 'credito_parcelado'];

/** Calcula totais de uma venda a partir dos itens + forma de pagamento.
 *  Retorna { valorBruto, custoTotal, taxa (decimal), valorLiquido, lucro }. */
function calcularVenda(itens, pagamento) {
  const valorBruto = itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
  const custoTotal = itens.reduce((s, i) => s + i.custoUnitario * i.quantidade, 0);
  const taxa = TAXAS[pagamento]?.taxa ?? 0;
  // Forma de pagamento aplica desconto sobre o BRUTO → líquido é o que entra no bolso
  const valorLiquido = valorBruto * (1 - taxa);
  // Lucro real = o que entrou - o que custou
  const lucro = valorLiquido - custoTotal;
  return { valorBruto, custoTotal, taxa, valorLiquido, lucro };
}

/** Margem de lucro percentual (sobre o preço de venda). */
function margemPercentual(custo, preco) {
  if (!preco || preco <= 0) return 0;
  return ((preco - custo) / preco) * 100;
}

/** Aplica a baixa de estoque ao registrar uma venda.
 *  Retorna NOVO array de produtos (imutável). */
function baixarEstoque(produtos, itens) {
  const mapa = new Map(itens.map(i => [i.produtoId, i.quantidade]));
  return produtos.map(p =>
    mapa.has(p.id) ? { ...p, estoque: Math.max(0, p.estoque - mapa.get(p.id)) } : p
  );
}

/** Estorna o estoque ao excluir uma venda. */
function estornarEstoque(produtos, itens) {
  const mapa = new Map(itens.map(i => [i.produtoId, i.quantidade]));
  return produtos.map(p =>
    mapa.has(p.id) ? { ...p, estoque: p.estoque + mapa.get(p.id) } : p
  );
}

const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ============================================================
   4. FORMATADORES & helpers
   ============================================================ */
const brl = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = (n) => (n * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

const formatData = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const formatDataHora = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
         ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const mesAtualLabel = () => {
  const d = new Date();
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
const isMesAtual = (iso) => {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
};

const ESTOQUE_BAIXO = 5;  // 🔧 limite para alerta de estoque

/* ============================================================
   6. ÍCONES (SVG inline — sem dependências externas)
   ============================================================ */
const Icon = ({ name, size = 18, ...rest }) => {
  const paths = {
    dashboard: <><path d="M3 13h7V3H3v10zm0 8h7v-6H3v6zm11 0h7V11h-7v10zm0-18v6h7V3h-7z"/></>,
    plus:      <><path d="M12 5v14M5 12h14" /></>,
    minus:     <><path d="M5 12h14" /></>,
    history:   <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></>,
    box:       <><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></>,
    users:     <><circle cx="9" cy="8" r="3"/><path d="M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M14 21c0-3 1.6-5 3-5s4 2 4 5"/></>,
    search:    <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    trash:     <><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13c0 1 1 2 2 2h6c1 0 2-1 2-2l1-13"/><path d="M9 7V4h6v3"/></>,
    check:     <><path d="M5 13l4 4L19 7"/></>,
    close:     <><path d="M6 6l12 12M6 18L18 6"/></>,
    alert:     <><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.5 17.5c-.6 1 .1 2.5 1.3 2.5h16.4c1.2 0 1.9-1.4 1.3-2.5L13.7 3.9c-.6-1.1-2.2-1.1-2.8 0z"/></>,
    sparkle:   <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name]}
    </svg>
  );
};

/* ============================================================
   7. COMPONENTE PRINCIPAL
   ============================================================ */
function App() {
  const [tela, setTela]         = useState('painel');
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas]     = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pronto, setPronto]     = useState(false);
  const [toast, setToast]       = useState(null);

  // -------- carregar dados da API ---------
  const recarregarDados = useCallback(async () => {
    const [p, v, c] = await Promise.all([
      API.getProdutos(),
      API.getVendas(),
      API.getClientes(),
    ]);
    setProdutos(p);
    setVendas(v);
    setClientes(c);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await recarregarDados();
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      }
      setPronto(true);
    })();
  }, [recarregarDados]);

  // -------- toast helper ---------
  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 2400);
  }, []);

  /** Registra uma nova venda via API. O backend lida com estoque e cliente. */
  const registrarVenda = useCallback(async (venda) => {
    try {
      await API.createVenda(venda);
      await recarregarDados();
      showToast('Venda registrada com sucesso');
    } catch (e) {
      showToast(e.message || 'Erro ao registrar venda', 'error');
    }
  }, [recarregarDados, showToast]);

  /** Exclui venda via API. O backend estorna estoque e ajusta cliente. */
  const excluirVenda = useCallback(async (vendaId) => {
    try {
      await API.deleteVenda(vendaId);
      await recarregarDados();
      showToast('Venda excluída e estoque estornado');
    } catch (e) {
      showToast(e.message || 'Erro ao excluir venda', 'error');
    }
  }, [recarregarDados, showToast]);

  const adicionarProduto = useCallback(async (p) => {
    try {
      await API.createProduto({ ...p, id: 'p_' + novoId() });
      await recarregarDados();
      showToast('Peça cadastrada');
    } catch (e) {
      showToast(e.message || 'Erro ao cadastrar produto', 'error');
    }
  }, [recarregarDados, showToast]);

  const ajustarEstoque = useCallback(async (id, delta) => {
    try {
      await API.updateProduto(id, { estoqueDelta: delta });
      await recarregarDados();
    } catch (e) {
      showToast(e.message || 'Erro ao ajustar estoque', 'error');
    }
  }, [recarregarDados, showToast]);

  const excluirProduto = useCallback(async (id) => {
    try {
      await API.deleteProduto(id);
      await recarregarDados();
      showToast('Peça removida do catálogo');
    } catch (e) {
      showToast(e.message || 'Erro ao excluir produto', 'error');
    }
  }, [recarregarDados, showToast]);

  // -------- render ---------
  if (!pronto) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink-2)'
      }}>
        Carregando catálogo…
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar tela={tela} setTela={setTela} />
      <header className="header">
        <div className="brand">
          <img src="assets/logo-miva.png" alt="Mivà Semijoias" className="brand-logo" />
        </div>
        <div className="header-meta">
          <strong>{mesAtualLabel()}</strong>
          <span>{vendas.filter(v => isMesAtual(v.data)).length} vendas no mês</span>
        </div>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          style={{
            marginLeft: '16px',
            padding: '6px 14px',
            background: 'transparent',
            border: '1px solid var(--gold)',
            borderRadius: '6px',
            color: 'var(--gold)',
            fontSize: '11px',
            fontFamily: 'var(--sans)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Sair
        </button>
      </header>
      <main className="main">
        {tela === 'painel'    && <Painel    vendas={vendas} produtos={produtos} setTela={setTela} />}
        {tela === 'venda'     && <NovaVenda produtos={produtos} onConfirm={async v => { await registrarVenda(v); setTela('historico'); }} />}
        {tela === 'historico' && <Historico vendas={vendas} onExcluir={excluirVenda} />}
        {tela === 'produtos'  && <Produtos  produtos={produtos} onCadastrar={adicionarProduto} onAjustar={ajustarEstoque} onExcluir={excluirProduto} />}
        {tela === 'clientes'  && <Clientes  clientes={clientes} vendas={vendas} />}
      </main>
      {toast && <div className={'toast ' + toast.kind}>{toast.message}</div>}
    </div>
  );
}

/* ============================================================
   8. SIDEBAR / BOTTOM NAV
   ============================================================ */
function Sidebar({ tela, setTela }) {
  const items = [
    { id: 'painel',    label: 'Painel',     icon: 'dashboard' },
    { id: 'venda',     label: 'Nova venda', icon: 'plus'      },
    { id: 'historico', label: 'Histórico',  icon: 'history'   },
    { id: 'produtos',  label: 'Produtos',   icon: 'box'       },
    { id: 'clientes',  label: 'Clientes',   icon: 'users'     },
  ];
  return (
    <nav className="nav" aria-label="Navegação">
      <div className="nav-section" style={{display: window.innerWidth > 880 ? 'block' : 'none'}}>Gestão</div>
      {items.map(it => (
        <button
          key={it.id}
          className={'nav-item' + (tela === it.id ? ' active' : '')}
          onClick={() => setTela(it.id)}
        >
          <span className="nav-icon"><Icon name={it.icon} size={18} /></span>
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ============================================================
   9. TELA — PAINEL
   ============================================================ */
function Painel({ vendas, produtos, setTela }) {
  const dados = useMemo(() => {
    const doMes = vendas.filter(v => isMesAtual(v.data));
    const bruto    = doMes.reduce((s, v) => s + v.valorBruto, 0);
    const liquido  = doMes.reduce((s, v) => s + v.valorLiquido, 0);
    const custo    = doMes.reduce((s, v) => s + v.custoTotal, 0);
    const lucro    = liquido - custo;
    const ticket   = doMes.length ? bruto / doMes.length : 0;

    // por canal
    const canais = { online: 0, cidade: 0 };
    doMes.forEach(v => { canais[v.canal] += v.valorBruto; });

    // por forma de pagamento
    const pags = {};
    ORDEM_PAGAMENTOS.forEach(p => { pags[p] = { bruto: 0, taxa: TAXAS[p].taxa }; });
    doMes.forEach(v => { if (pags[v.pagamento]) pags[v.pagamento].bruto += v.valorBruto; });

    // produtos mais vendidos
    const vendidos = new Map();
    doMes.forEach(v => v.itens.forEach(i => {
      const reg = vendidos.get(i.produtoId) || { id: i.produtoId, nome: i.nome, qtd: 0, total: 0 };
      reg.qtd += i.quantidade;
      reg.total += i.precoUnitario * i.quantidade;
      vendidos.set(i.produtoId, reg);
    }));
    const maisVendidos = Array.from(vendidos.values()).sort((a, b) => b.qtd - a.qtd).slice(0, 5);

    // estoque baixo
    const estoqueBaixo = produtos
      .filter(p => p.estoque <= ESTOQUE_BAIXO)
      .sort((a, b) => a.estoque - b.estoque);

    return { bruto, liquido, custo, lucro, ticket, ticketN: doMes.length, canais, pags, maisVendidos, estoqueBaixo };
  }, [vendas, produtos]);

  const maxCanal = Math.max(dados.canais.online, dados.canais.cidade, 1);
  const maxPag   = Math.max(...Object.values(dados.pags).map(p => p.bruto), 1);

  return (
    <div>
      <h1 className="screen-title">Painel</h1>
      <p className="screen-sub">Visão do mês — atualiza em tempo real conforme as vendas são registradas.</p>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPI label="Faturamento bruto" value={dados.bruto} />
        <KPI label="Recebido líquido"  value={dados.liquido} note="já sem taxas da maquininha" />
        <KPI label="Lucro real"        value={dados.lucro}   note="líquido − custo das peças" accent />
        <KPI label="Ticket médio"      value={dados.ticket}  note={dados.ticketN + ' vendas no mês'} />
      </div>

      {/* Vendas por canal & Formas de pagamento */}
      <div className="two-col">
        <section className="card">
          <h2 className="section-title">Vendas por canal</h2>
          <p className="section-sub">Faturamento bruto</p>
          {dados.canais.online + dados.canais.cidade === 0 ? (
            <EstadoVazio titulo="Nenhuma venda ainda" sub="As vendas aparecem aqui assim que registradas." />
          ) : (
            <>
              <BarRow label="Online" subLabel="site" value={brl(dados.canais.online)} fill={dados.canais.online / maxCanal} variant="online" />
              <BarRow label="Cidade" subLabel="presencial" value={brl(dados.canais.cidade)} fill={dados.canais.cidade / maxCanal} variant="cidade" />
            </>
          )}
        </section>

        <section className="card">
          <h2 className="section-title">Formas de pagamento</h2>
          <p className="section-sub">com a taxa aplicada</p>
          {Object.entries(dados.pags).every(([,p]) => p.bruto === 0) ? (
            <EstadoVazio titulo="Sem movimentação" sub="Registre uma venda para ver o detalhamento." />
          ) : (
            ORDEM_PAGAMENTOS.map(k => (
              <BarRow
                key={k}
                label={TAXAS[k].label}
                subLabel={dados.pags[k].taxa === 0 ? 'sem taxa' : 'taxa ' + (dados.pags[k].taxa * 100).toFixed(1).replace('.', ',') + '%'}
                value={brl(dados.pags[k].bruto)}
                fill={dados.pags[k].bruto / maxPag}
                variant="neutral"
              />
            ))
          )}
        </section>
      </div>

      {/* Mais vendidos & Estoque baixo */}
      <div className="two-col">
        <section className="card">
          <h2 className="section-title">Mais vendidos no mês</h2>
          <p className="section-sub">por quantidade</p>
          {dados.maisVendidos.length === 0 ? (
            <EstadoVazio titulo="Sem ranking ainda" sub="Os produtos campeões aparecem aqui." />
          ) : (
            <div className="list">
              {dados.maisVendidos.map(p => (
                <div className="list-item" key={p.id}>
                  <div className="list-item-main">
                    <span className="list-item-name">{p.nome}</span>
                    <span className="list-item-meta">{p.qtd} {p.qtd === 1 ? 'unidade' : 'unidades'} vendidas</span>
                  </div>
                  <span className="list-item-value">{brl(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="section-title" style={{display: 'flex', alignItems: 'center', gap: 8}}>
            Alerta de estoque
            {dados.estoqueBaixo.length > 0 && (
              <span className="chip warn"><span className="chip-dot"/>{dados.estoqueBaixo.length}</span>
            )}
          </h2>
          <p className="section-sub">peças com {ESTOQUE_BAIXO} unidades ou menos</p>
          {dados.estoqueBaixo.length === 0 ? (
            <EstadoVazio titulo="Estoque tranquilo" sub="Nenhuma peça abaixo do alerta." />
          ) : (
            <div className="list">
              {dados.estoqueBaixo.map(p => (
                <div className="list-item" key={p.id}>
                  <div className="list-item-main">
                    <span className="list-item-name">{p.nome}</span>
                    <span className="list-item-meta">{p.referencia} · {p.tipoBanho}</span>
                  </div>
                  <span className={'chip ' + (p.estoque === 0 ? 'danger' : 'warn')}>
                    {p.estoque === 0 ? 'esgotado' : p.estoque + ' un.'}
                  </span>
                </div>
              ))}
              <div style={{marginTop: 12}}>
                <button className="btn btn-small" onClick={() => setTela('produtos')}>Gerenciar estoque →</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KPI({ label, value, note, accent }) {
  // separa parte inteira e decimal para o tratamento tipográfico do "centavos"
  const v = brl(value);
  const idx = v.lastIndexOf(',');
  const inteiro = idx >= 0 ? v.slice(0, idx) : v;
  const cents = idx >= 0 ? v.slice(idx) : '';
  return (
    <div className={'kpi' + (accent ? ' accent' : '')}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{inteiro}<span className="cents">{cents}</span></div>
      {note && <div className="kpi-note">{note}</div>}
    </div>
  );
}

function BarRow({ label, subLabel, value, fill, variant }) {
  const ref = useRef(null);
  useEffect(() => {
    // anima de 0 → fill no mount
    if (ref.current) {
      ref.current.style.width = '0';
      requestAnimationFrame(() => {
        if (ref.current) ref.current.style.width = (Math.max(0, Math.min(1, fill)) * 100) + '%';
      });
    }
  }, [fill]);
  return (
    <div className="bar-row">
      <div>
        <div className="bar-label">{label}</div>
        <div className="bar-sub">{subLabel}</div>
      </div>
      <div className="bar-track">
        <div ref={ref} className={'bar-fill ' + variant} />
      </div>
      <div className="bar-value">{value}</div>
    </div>
  );
}

function EstadoVazio({ titulo, sub, icone = 'sparkle' }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icone} size={22}/></div>
      <p className="empty-title">{titulo}</p>
      <p className="empty-sub">{sub}</p>
    </div>
  );
}

/* ============================================================
   10. TELA — NOVA VENDA
   ============================================================ */
function NovaVenda({ produtos, onConfirm }) {
  const [canal, setCanal]         = useState('cidade');
  const [pagamento, setPagamento] = useState('pix');
  const [parcelas, setParcelas]   = useState(2);
  const [busca, setBusca]         = useState('');
  const [carrinho, setCarrinho]   = useState([]);  // [{ produtoId, nome, quantidade, precoUnitario, custoUnitario, estoqueDisp }]
  const [cliente, setCliente]     = useState('');
  const [salvando, setSalvando]   = useState(false);

  // calcula estoque disponível considerando o que já está no carrinho
  const estoqueDisp = (prodId) => {
    const p = produtos.find(x => x.id === prodId);
    const noCarrinho = carrinho.find(i => i.produtoId === prodId)?.quantidade || 0;
    return (p?.estoque || 0) - noCarrinho;
  };

  // resultados de busca
  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      p.referencia.toLowerCase().includes(q)
    );
  }, [busca, produtos]);

  const adicionar = (p) => {
    if (p.estoque === 0) return;
    const existente = carrinho.find(i => i.produtoId === p.id);
    if (existente) {
      // só incrementa se ainda houver estoque
      if (estoqueDisp(p.id) <= 0) return;
      setCarrinho(carrinho.map(i => i.produtoId === p.id ? { ...i, quantidade: i.quantidade + 1 } : i));
    } else {
      setCarrinho([...carrinho, {
        produtoId: p.id, nome: p.nome,
        quantidade: 1,
        precoUnitario: p.preco,
        custoUnitario: p.custo,
      }]);
    }
  };
  const alterarQtd = (prodId, delta) => {
    setCarrinho(curr => curr
      .map(i => {
        if (i.produtoId !== prodId) return i;
        const novaQtd = i.quantidade + delta;
        return { ...i, quantidade: novaQtd };
      })
      .filter(i => i.quantidade > 0)
    );
  };
  const remover = (prodId) => setCarrinho(carrinho.filter(i => i.produtoId !== prodId));

  // ajusta parcelas: se mudar para pagamento sem parcelas, força = 1
  useEffect(() => {
    if (!TAXAS[pagamento].permiteParcelas && parcelas !== 1) {
      setParcelas(1);
    } else if (TAXAS[pagamento].permiteParcelas && parcelas === 1) {
      setParcelas(2);
    }
  }, [pagamento]);

  const totais = useMemo(() => calcularVenda(carrinho, pagamento), [carrinho, pagamento]);

  const podeConfirmar = carrinho.length > 0 && !salvando;

  const confirmar = async () => {
    if (!podeConfirmar) return;
    setSalvando(true);
    const venda = {
      id: 'v_' + novoId(),
      data: new Date().toISOString(),
      canal,
      pagamento,
      parcelas: TAXAS[pagamento].permiteParcelas ? parcelas : 1,
      valorBruto:   totais.valorBruto,
      valorLiquido: totais.valorLiquido,
      custoTotal:   totais.custoTotal,
      taxa:         totais.taxa,
      lucro:        totais.lucro,
      clienteNome:  cliente.trim() || null,
      itens: carrinho.map(i => ({ ...i })),
    };
    await onConfirm(venda);
    setSalvando(false);
  };

  return (
    <div>
      <h1 className="screen-title">Nova venda</h1>
      <p className="screen-sub">Monte o carrinho e confirme — o estoque é baixado e o lucro real é calculado automaticamente.</p>

      <div style={{display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px, 360px)', gap: 18}} className="venda-layout">
        <style>{`
          @media (max-width: 880px) {
            .venda-layout { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* COLUNA ESQUERDA */}
        <div>
          {/* Canal */}
          <div className="card block">
            <div className="field">
              <span className="label">Canal de venda</span>
              <div className="seg">
                <button className={'seg-opt' + (canal === 'cidade' ? ' active' : '')} onClick={() => setCanal('cidade')}>Cidade (presencial)</button>
                <button className={'seg-opt' + (canal === 'online' ? ' active' : '')} onClick={() => setCanal('online')}>Online (site)</button>
              </div>
            </div>

            <div className="field" style={{marginBottom: 0}}>
              <span className="label">Forma de pagamento</span>
              <div className="seg wrap">
                {ORDEM_PAGAMENTOS.map(k => (
                  <button key={k}
                          className={'seg-opt' + (pagamento === k ? ' active' : '')}
                          onClick={() => setPagamento(k)}>
                    {TAXAS[k].label}
                    <span style={{
                      marginLeft: 8, fontSize: 11, color: 'var(--ink-3)',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {TAXAS[k].taxa === 0 ? '0%' : (TAXAS[k].taxa * 100).toFixed(1).replace('.', ',') + '%'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {TAXAS[pagamento].permiteParcelas && (
              <div className="field" style={{marginTop: 14, marginBottom: 0}}>
                <span className="label">Número de parcelas</span>
                <div className="seg wrap">
                  {[2, 3, 4, 5, 6, 10, 12].map(n => (
                    <button key={n}
                            className={'seg-opt' + (parcelas === n ? ' active' : '')}
                            onClick={() => setParcelas(n)}>
                      {n}×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Adicionar produto */}
          <div className="card block">
            <h2 className="section-title">Adicionar peça</h2>
            <div className="field" style={{marginBottom: 0}}>
              <div className="search-wrap">
                <span className="search-icon"><Icon name="search" size={16}/></span>
                <input
                  className="input"
                  placeholder="Buscar por nome ou referência"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />
              </div>
              <div className="search-results">
                {resultados.length === 0 && (
                  <div style={{padding: '14px', color: 'var(--ink-3)', fontSize: 13}}>
                    Nenhuma peça encontrada.
                  </div>
                )}
                {resultados.map(p => {
                  const disp = estoqueDisp(p.id);
                  const esgotado = disp <= 0;
                  return (
                    <div
                      key={p.id}
                      className={'search-result-item' + (esgotado ? ' disabled' : '')}
                      onClick={() => !esgotado && adicionar(p)}
                    >
                      <div>
                        <div style={{fontSize: 14, color: 'var(--ink)'}}>{p.nome}</div>
                        <div style={{fontSize: 11, color: 'var(--ink-3)', marginTop: 2}}>
                          {p.referencia} · {p.tipoBanho} · {brl(p.preco)}
                        </div>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                        <span className={'chip ' + (esgotado ? 'danger' : disp <= ESTOQUE_BAIXO ? 'warn' : 'subtle')}>
                          {esgotado ? 'esgotado' : disp + ' disp.'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Carrinho */}
          <div className="card block">
            <h2 className="section-title">Itens da venda</h2>
            {carrinho.length === 0 ? (
              <EstadoVazio titulo="Carrinho vazio" sub="Busque uma peça acima para começar." />
            ) : (
              <div>
                {carrinho.map(i => {
                  const p = produtos.find(x => x.id === i.produtoId);
                  const podeIncrementar = (p?.estoque || 0) > i.quantidade;
                  return (
                    <div className="cart-line" key={i.produtoId}>
                      <div>
                        <div style={{fontSize: 14}}>{i.nome}</div>
                        <div style={{fontSize: 11, color: 'var(--ink-3)', marginTop: 2}}>
                          {brl(i.precoUnitario)} cada · custo {brl(i.custoUnitario)}
                        </div>
                      </div>
                      <div className="qty">
                        <button onClick={() => alterarQtd(i.produtoId, -1)}>−</button>
                        <span className="qty-val">{i.quantidade}</span>
                        <button onClick={() => alterarQtd(i.produtoId, +1)} disabled={!podeIncrementar}>+</button>
                      </div>
                      <button className="btn btn-icon btn-danger" onClick={() => remover(i.produtoId)} aria-label="Remover">
                        <Icon name="trash" size={16}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card block">
            <div className="field" style={{marginBottom: 0}}>
              <label className="label" htmlFor="cliente-input">Cliente (opcional)</label>
              <input
                id="cliente-input"
                className="input"
                placeholder="Nome do cliente"
                value={cliente}
                onChange={e => setCliente(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA — RESUMO */}
        <aside>
          <div className="card card-elev" style={{position: 'sticky', top: 16}}>
            <h2 className="section-title">Resumo</h2>
            <div className="summary-row">
              <span className="lbl">Valor bruto</span>
              <span className="val">{brl(totais.valorBruto)}</span>
            </div>
            <div className="summary-row fee">
              <span className="lbl">
                Taxa {TAXAS[pagamento].label.toLowerCase()}
                {totais.taxa > 0 && <span style={{color: 'var(--ink-3)', marginLeft: 6}}>({(totais.taxa * 100).toFixed(1).replace('.', ',')}%)</span>}
              </span>
              <span className="val">− {brl(totais.valorBruto * totais.taxa)}</span>
            </div>
            <div className="summary-row">
              <span className="lbl">Recebido líquido</span>
              <span className="val">{brl(totais.valorLiquido)}</span>
            </div>
            <div className="summary-row">
              <span className="lbl">Custo das peças</span>
              <span className="val">− {brl(totais.custoTotal)}</span>
            </div>
            <hr className="hairline"/>
            <div className="summary-row total">
              <span className="lbl">Lucro da venda</span>
              <span className="val">{brl(totais.lucro)}</span>
            </div>

            {TAXAS[pagamento].permiteParcelas && carrinho.length > 0 && (
              <div style={{marginTop: 10, padding: '10px 12px', background: 'var(--bg-deep)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--ink-2)'}}>
                Cliente paga em <strong>{parcelas}×</strong> de {brl(totais.valorBruto / parcelas)}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{width: '100%', marginTop: 16, padding: '14px 16px'}}
              onClick={confirmar}
              disabled={!podeConfirmar}
            >
              <Icon name="check" size={16}/> {salvando ? 'Registrando…' : 'Confirmar venda'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   11. TELA — HISTÓRICO
   ============================================================ */
function Historico({ vendas, onExcluir }) {
  const [filtroCanal,     setFiltroCanal]     = useState('todos');
  const [filtroPagamento, setFiltroPagamento] = useState('todos');
  const [filtroPeriodo,   setFiltroPeriodo]   = useState('mes');
  const [confirmarExcluir, setConfirmarExcluir] = useState(null);

  const filtradas = useMemo(() => {
    return vendas.filter(v => {
      if (filtroCanal !== 'todos' && v.canal !== filtroCanal) return false;
      if (filtroPagamento !== 'todos' && v.pagamento !== filtroPagamento) return false;
      if (filtroPeriodo !== 'todos') {
        const d = new Date(v.data);
        const hoje = new Date();
        if (filtroPeriodo === 'mes' && !isMesAtual(v.data)) return false;
        if (filtroPeriodo === '30d') {
          const diff = (hoje - d) / (1000 * 60 * 60 * 24);
          if (diff > 30) return false;
        }
        if (filtroPeriodo === '7d') {
          const diff = (hoje - d) / (1000 * 60 * 60 * 24);
          if (diff > 7) return false;
        }
      }
      return true;
    });
  }, [vendas, filtroCanal, filtroPagamento, filtroPeriodo]);

  const totalLucro = filtradas.reduce((s, v) => s + v.lucro, 0);
  const totalBruto = filtradas.reduce((s, v) => s + v.valorBruto, 0);

  return (
    <div>
      <h1 className="screen-title">Histórico de vendas</h1>
      <p className="screen-sub">{filtradas.length} {filtradas.length === 1 ? 'venda' : 'vendas'} · bruto {brl(totalBruto)} · lucro {brl(totalLucro)}</p>

      <div className="filter-bar">
        <span className="label-inline">Período</span>
        <div className="seg">
          <button className={'seg-opt' + (filtroPeriodo === '7d' ? ' active' : '')} onClick={() => setFiltroPeriodo('7d')}>7 dias</button>
          <button className={'seg-opt' + (filtroPeriodo === 'mes' ? ' active' : '')} onClick={() => setFiltroPeriodo('mes')}>Mês atual</button>
          <button className={'seg-opt' + (filtroPeriodo === '30d' ? ' active' : '')} onClick={() => setFiltroPeriodo('30d')}>30 dias</button>
          <button className={'seg-opt' + (filtroPeriodo === 'todos' ? ' active' : '')} onClick={() => setFiltroPeriodo('todos')}>Tudo</button>
        </div>

        <span className="label-inline" style={{marginLeft: 8}}>Canal</span>
        <select className="select" style={{width: 'auto'}} value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="online">Online</option>
          <option value="cidade">Cidade</option>
        </select>

        <span className="label-inline" style={{marginLeft: 8}}>Pagamento</span>
        <select className="select" style={{width: 'auto'}} value={filtroPagamento} onChange={e => setFiltroPagamento(e.target.value)}>
          <option value="todos">Todos</option>
          {ORDEM_PAGAMENTOS.map(k => <option key={k} value={k}>{TAXAS[k].label}</option>)}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className="card">
          <EstadoVazio titulo="Nenhuma venda no filtro" sub="Ajuste os filtros ou registre uma nova venda." />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Canal</th>
                <th>Pagamento</th>
                <th className="num">Itens</th>
                <th className="num">Bruto</th>
                <th className="num">Líquido</th>
                <th className="num">Lucro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(v => {
                const totalItens = v.itens.reduce((s, i) => s + i.quantidade, 0);
                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{fontSize: 13}}>{formatData(v.data)}</div>
                      <div style={{fontSize: 11, color: 'var(--ink-3)'}}>{formatDataHora(v.data).split(' · ')[1]}</div>
                    </td>
                    <td><span className={'chip ' + v.canal}><span className="chip-dot"/>{v.canal === 'online' ? 'Online' : 'Cidade'}</span></td>
                    <td>
                      <div style={{fontSize: 13}}>{TAXAS[v.pagamento].label}</div>
                      {v.pagamento === 'credito_parcelado' && v.parcelas > 1 && (
                        <div style={{fontSize: 11, color: 'var(--ink-3)'}}>{v.parcelas}×</div>
                      )}
                    </td>
                    <td className="num">{totalItens}</td>
                    <td className="num">{brl(v.valorBruto)}</td>
                    <td className="num">{brl(v.valorLiquido)}</td>
                    <td className="num" style={{fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500, color: v.lucro >= 0 ? 'var(--emerald)' : 'var(--danger)'}}>
                      {brl(v.lucro)}
                    </td>
                    <td>
                      <button className="btn btn-icon btn-danger" onClick={() => setConfirmarExcluir(v)} aria-label="Excluir">
                        <Icon name="trash" size={16}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmarExcluir && (
        <div className="modal-backdrop" onClick={() => setConfirmarExcluir(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Excluir venda?</h3>
            <p className="modal-text">
              Esta venda de {brl(confirmarExcluir.valorBruto)} ({formatData(confirmarExcluir.data)})
              será removida e as <strong>{confirmarExcluir.itens.reduce((s, i) => s + i.quantidade, 0)} peças</strong> retornam ao estoque.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmarExcluir(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{background: 'var(--danger)', borderColor: 'var(--danger)'}}
                      onClick={async () => { await onExcluir(confirmarExcluir.id); setConfirmarExcluir(null); }}>
                Excluir e estornar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   12. TELA — PRODUTOS & ESTOQUE
   ============================================================ */
function Produtos({ produtos, onCadastrar, onAjustar, onExcluir }) {
  const [form, setForm] = useState({
    nome: '', referencia: '', tipoBanho: 'Ouro 18k',
    custo: '', preco: '', estoque: '', fornecedor: '',
  });
  const [erro, setErro] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    const custo = parseFloat((form.custo + '').replace(',', '.'));
    const preco = parseFloat((form.preco + '').replace(',', '.'));
    const estoque = parseInt(form.estoque, 10);
    if (!form.nome.trim() || !form.referencia.trim()) { setErro('Nome e referência são obrigatórios.'); return; }
    if (isNaN(custo) || isNaN(preco) || isNaN(estoque)) { setErro('Custo, preço e estoque precisam ser números.'); return; }
    if (preco < custo) { setErro('O preço de venda está abaixo do custo.'); return; }
    await onCadastrar({
      nome: form.nome.trim(),
      referencia: form.referencia.trim().toUpperCase(),
      tipoBanho: form.tipoBanho,
      custo, preco, estoque,
      fornecedor: form.fornecedor.trim(),
    });
    setForm({ nome: '', referencia: '', tipoBanho: 'Ouro 18k', custo: '', preco: '', estoque: '', fornecedor: '' });
  };

  return (
    <div>
      <h1 className="screen-title">Produtos & estoque</h1>
      <p className="screen-sub">{produtos.length} peças no catálogo · {produtos.reduce((s, p) => s + p.estoque, 0)} unidades em estoque.</p>

      <div style={{display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18}} className="prod-layout">
        <style>{`@media (max-width: 880px) { .prod-layout { grid-template-columns: 1fr !important; } }`}</style>

        {/* FORM */}
        <aside>
          <div className="card" style={{position: 'sticky', top: 16}}>
            <h2 className="section-title">Cadastrar peça</h2>
            <form onSubmit={submit}>
              <div className="field">
                <label className="label">Nome</label>
                <input className="input" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex.: Colar Ponto de Luz" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Referência</label>
                  <input className="input" value={form.referencia} onChange={e => setForm({...form, referencia: e.target.value})} placeholder="CL-014" />
                </div>
                <div className="field">
                  <label className="label">Tipo de banho</label>
                  <select className="select" value={form.tipoBanho} onChange={e => setForm({...form, tipoBanho: e.target.value})}>
                    <option>Ouro 18k</option>
                    <option>Ouro Rosé</option>
                    <option>Ródio</option>
                    <option>Prata 925</option>
                    <option>Outro</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Custo (R$)</label>
                  <input className="input" value={form.custo} onChange={e => setForm({...form, custo: e.target.value})} placeholder="18,00" inputMode="decimal" />
                </div>
                <div className="field">
                  <label className="label">Preço (R$)</label>
                  <input className="input" value={form.preco} onChange={e => setForm({...form, preco: e.target.value})} placeholder="65,00" inputMode="decimal" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Estoque inicial</label>
                  <input className="input" value={form.estoque} onChange={e => setForm({...form, estoque: e.target.value})} placeholder="10" inputMode="numeric" />
                </div>
                <div className="field">
                  <label className="label">Fornecedor</label>
                  <input className="input" value={form.fornecedor} onChange={e => setForm({...form, fornecedor: e.target.value})} placeholder="Opcional" />
                </div>
              </div>
              {erro && <div style={{color: 'var(--danger)', fontSize: 12, marginBottom: 12}}>{erro}</div>}
              <button type="submit" className="btn btn-primary" style={{width: '100%'}}>
                <Icon name="plus" size={16}/> Adicionar ao catálogo
              </button>
            </form>
          </div>
        </aside>

        {/* CATÁLOGO */}
        <div>
          {produtos.length === 0 ? (
            <div className="card"><EstadoVazio titulo="Catálogo vazio" sub="Cadastre a primeira peça ao lado." /></div>
          ) : (
            <div className="produto-grid">
              {produtos.map(p => {
                const margem = margemPercentual(p.custo, p.preco);
                const baixo = p.estoque <= ESTOQUE_BAIXO && p.estoque > 0;
                const out   = p.estoque === 0;
                return (
                  <div key={p.id} className={'produto-card' + (out ? ' out-stock' : baixo ? ' low-stock' : '')}>
                    <div className="produto-img-wrap">
                      {p.imagemUrl ? (
                        <img src={p.imagemUrl} alt={p.nome} loading="lazy" />
                      ) : (
                        <div className="produto-img-placeholder">💎</div>
                      )}
                    </div>

                    <div className="produto-card-body">
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8}}>
                        <div style={{flex: 1, minWidth: 0}}>
                          <h3 className="produto-name">{p.nome}</h3>
                          <div className="produto-ref">{p.referencia}{p.tipoBanho ? ' · ' + p.tipoBanho : ''}</div>
                        </div>
                        {out ? (
                          <span className="chip danger"><span className="chip-dot"/>esgotado</span>
                        ) : baixo ? (
                          <span className="chip warn"><span className="chip-dot"/>estoque baixo</span>
                        ) : null}
                      </div>

                      <div className="produto-stats">
                        <div>
                          <div className="produto-stat-lbl">Preço</div>
                          <div className="produto-stat-val">{brl(p.preco)}</div>
                        </div>
                        <div>
                          <div className="produto-stat-lbl">Margem</div>
                          <div className="produto-stat-val" style={{color: margem >= 40 ? 'var(--emerald)' : margem >= 20 ? 'var(--ink)' : 'var(--danger)'}}>
                            {margem.toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="produto-stat-lbl">Estoque</div>
                          <div className="produto-stat-val">{p.estoque}</div>
                        </div>
                      </div>

                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div className="qty">
                          <button onClick={() => onAjustar(p.id, -1)} disabled={p.estoque === 0}>−</button>
                          <span className="qty-val">{p.estoque}</span>
                          <button onClick={() => onAjustar(p.id, +1)}>+</button>
                        </div>
                        <button className="btn btn-icon btn-danger" onClick={() => setConfirmDel(p)} aria-label="Excluir peça">
                          <Icon name="trash" size={16}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirmDel && (
        <div className="modal-backdrop" onClick={() => setConfirmDel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Remover peça?</h3>
            <p className="modal-text">
              <strong>{confirmDel.nome}</strong> ({confirmDel.referencia}) será removida do catálogo.
              As vendas já registradas dela continuam no histórico.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{background: 'var(--danger)', borderColor: 'var(--danger)'}}
                      onClick={async () => { await onExcluir(confirmDel.id); setConfirmDel(null); }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   13. TELA — CLIENTES
   ============================================================ */
function Clientes({ clientes, vendas }) {
  // calcula stats live a partir das vendas (mais confiável que o cache)
  const ranking = useMemo(() => {
    const map = new Map();
    vendas.forEach(v => {
      if (!v.clienteNome) return;
      const reg = map.get(v.clienteNome) || { nome: v.clienteNome, totalGasto: 0, compras: 0, ultima: v.data };
      reg.totalGasto += v.valorBruto;
      reg.compras += 1;
      if (new Date(v.data) > new Date(reg.ultima)) reg.ultima = v.data;
      map.set(v.clienteNome, reg);
    });
    return Array.from(map.values()).sort((a, b) => b.totalGasto - a.totalGasto);
  }, [vendas]);

  const top = ranking[0];
  const totalGasto = ranking.reduce((s, c) => s + c.totalGasto, 0);

  return (
    <div>
      <h1 className="screen-title">Clientes</h1>
      <p className="screen-sub">{ranking.length} {ranking.length === 1 ? 'cliente cadastrada' : 'clientes cadastradas'} · {brl(totalGasto)} em compras</p>

      {ranking.length === 0 ? (
        <div className="card">
          <EstadoVazio titulo="Nenhuma cliente ainda" sub="Os nomes adicionados nas vendas aparecem aqui." />
        </div>
      ) : (
        <>
          {/* Destaque do top 1 */}
          {top && (
            <div className="card card-elev" style={{marginBottom: 18, background: 'linear-gradient(135deg, var(--gold-soft), var(--surface))'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12}}>
                <div>
                  <div className="section-sub" style={{marginBottom: 4}}>Cliente que mais compra</div>
                  <div style={{fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 500, color: 'var(--ink)'}}>{top.nome}</div>
                  <div style={{fontSize: 13, color: 'var(--ink-2)', marginTop: 4}}>{top.compras} {top.compras === 1 ? 'compra' : 'compras'} · última em {formatData(top.ultima)}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div className="section-sub" style={{marginBottom: 4}}>Total gasto</div>
                  <div style={{fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, color: 'var(--gold-2)'}}>{brl(top.totalGasto)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="num">Compras</th>
                  <th>Última compra</th>
                  <th className="num">Total gasto</th>
                  <th className="num">Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map(c => (
                  <tr key={c.nome}>
                    <td><strong style={{fontWeight: 500}}>{c.nome}</strong></td>
                    <td className="num">{c.compras}</td>
                    <td>{formatData(c.ultima)}</td>
                    <td className="num" style={{fontFamily: 'var(--serif)', fontSize: 16}}>{brl(c.totalGasto)}</td>
                    <td className="num">{brl(c.totalGasto / c.compras)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   14. MONTAGEM
   ============================================================ */
// injeta estilos
const styleTag = document.createElement('style');
styleTag.textContent = CSS;
document.head.appendChild(styleTag);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
