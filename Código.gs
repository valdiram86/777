// === CONFIGURAÇÕES ===
const CMC_API_KEY = '3f2fc20e-1d90-4dbc-86d6-4d1e30ed5024';
const EMAIL_DESTINO = 'valdiram.lima.2013@gmail.com';
const PLANILHA = SpreadsheetApp.getActiveSpreadsheet();
const ABA_PRINCIPAL = 'On-ChainSetValues';
const ABA_HISTORICO = 'Historico';
const ABA_SENHAS = 'Senhas';

// === FUNÇÃO MESTRE AGENDADA ===
function atualizarTudo() {
  const dados = buscarCriptos();
  const filtrados = processarCriptos(dados);
  preencherAbaPrincipal(filtrados);
  salvarHistorico(filtrados);
  aplicarCores();
  preencherTopHistorico();
  enviarEmailResumo(filtrados);
}

// === COLETA DE DADOS ===
function buscarCriptos() {
  const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=2500&start=1';
  const options = {
    headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
    muteHttpExceptions: true
  };
  const resposta = UrlFetchApp.fetch(url, options);
  return JSON.parse(resposta.getContentText()).data;
}

// === PROCESSAMENTO ===
function processarCriptos(lista) {
  return lista.filter(c => !c.symbol.includes('USD') && !c.symbol.includes('USDT'))
              .map(c => {
    const score = calcularPontuacao(c);
    return [
      c.cmc_rank,
      c.name,
      c.symbol,
      c.quote.USD.price,
      score,
      '', // Pontuação anterior
      '', // Variação
      gerarSlug(c.name),
      `https://coinmarketcap.com/currencies/${c.slug}/`
    ];
  });
}

function calcularPontuacao(c) {
  const v = c.quote.USD;
  let pontos = 0;
  if (v.percent_change_7d > 0) pontos += 80;
  if (v.percent_change_30d > 0) pontos += 80;
  if (v.percent_change_90d > 0) pontos += 80;
  if (c.cmc_rank <= 200) pontos += 40;
  if (c.cmc_rank > 200 && c.cmc_rank <= 700) pontos += 100;
  if (v.volume_24h > 5000000) pontos += 50;
  if (v.market_cap > 50000000) pontos += 50;
  return Math.min(700, Math.floor(pontos));
}

// === PREENCHIMENTO ===
function preencherAbaPrincipal(dados) {
  const aba = PLANILHA.getSheetByName(ABA_PRINCIPAL) || PLANILHA.insertSheet(ABA_PRINCIPAL);
  aba.clearContents().clearFormats();
  const titulos = ['Rank', 'Nome', 'Símbolo', 'Preço', 'Pontuação Balanceada', 'Pontuação Anterior', 'Variação', 'Slug', 'Link'];
  aba.getRange(1, 1, 1, titulos.length).setValues([titulos]);
  aba.getRange(2, 1, dados.length, dados[0].length).setValues(dados);
  aba.setFrozenRows(1);
  aba.setFrozenColumns(1);
}

// === GERAÇÃO DE SLUG ===
function gerarSlug(nome) {
  return nome.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
}

// === CORES ===
function aplicarCores() {
  const aba = PLANILHA.getSheetByName(ABA_PRINCIPAL);
  const pontuacoes = aba.getRange('E2:E' + aba.getLastRow()).getValues();
  for (let i = 0; i < pontuacoes.length; i++) {
    const score = pontuacoes[i][0];
    let cor = null;
    if (score >= 600) cor = '#00BFFF'; // Azul
    else if (score >= 500) cor = '#00FF00'; // Verde
    else if (score >= 300) cor = '#FFFF00'; // Amarelo
    else if (score >= 250) cor = '#FF69B4'; // Rosa Neon
    if (cor) aba.getRange(i + 2, 5).setBackground(cor);
    else aba.getRange(i + 2, 5).setBackground(null);
  }
}

// === HISTÓRICO ===
function salvarHistorico(dados) {
  const aba = PLANILHA.getSheetByName(ABA_HISTORICO) || PLANILHA.insertSheet(ABA_HISTORICO);
  const data = Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd');
  aba.appendRow([data, JSON.stringify(dados)]);
}

// === TOP VARIAÇÃO (7,15,30,50d) ===
function preencherTopHistorico() {
  const aba = PLANILHA.getSheetByName(ABA_PRINCIPAL);
  aba.getRange('L1:Q1').setValues([['Top 3D', 'Top 7D', 'Top 15D', 'Top 30D', 'Top 50D', 'Tendência Consolidada']]);
  // (Exemplo: aqui você pode adicionar lógica para preencher com dados reais baseados no histórico)
}

// === ENVIO DE E-MAIL ===
function enviarEmailResumo(dados) {
  const hoje = Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd');
  const top = dados.sort((a, b) => b[4] - a[4]).slice(0, 10);
  const corpo = top.map(c => `${c[1]} (${c[2]}) - Pontuação: ${c[4]} - [CMC](${c[8]})`).join('\n');
  MailApp.sendEmail({
    to: EMAIL_DESTINO,
    subject: `Relatório On-Chain SetValues – ${hoje}`,
    htmlBody: `<b>Top 10 do dia:</b><br><pre>${corpo}</pre>`
  });
}

// === AUTORIZAÇÃO PARA PAINEL ===
function doGet(e) {
  const email = (e.parameter.email || '').toLowerCase().trim();
  const aba = PLANILHA.getSheetByName(ABA_SENHAS);
  const lista = aba.getRange(2, 1, aba.getLastRow() - 1).getValues().flat().map(e => e.toLowerCase());
  if (!lista.includes(email)) {
    return ContentService.createTextOutput(JSON.stringify({ erro: 'Acesso negado' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const dados = PLANILHA.getSheetByName(ABA_PRINCIPAL).getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({ dados })).setMimeType(ContentService.MimeType.JSON);
}

// === AGENDAMENTO ===
function criarGatilhoDiario() {
  ScriptApp.newTrigger('atualizarTudo').timeBased().everyDays(1).atHour(8).create();
}
