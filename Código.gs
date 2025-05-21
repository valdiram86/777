// === CONFIGURAÇÃO ===
const CMC_API_KEY = '3f2fc20e-1d90-4dbc-86d6-4d1e30ed5024'; // Substitua pela sua chave
const PLANILHA = SpreadsheetApp.getActiveSpreadsheet();
const ABA = PLANILHA.getSheetByName('On-ChainSetValues') || PLANILHA.insertSheet('On-ChainSetValues');
const HISTORICO = PLANILHA.getSheetByName('Historico') || PLANILHA.insertSheet('Historico');

// === FUNÇÃO MESTRE ===
function atualizarTudo() {
  const dados = obterDadosCMC();
  preencherPlanilha(dados);
  aplicarCores();
  salvarHistorico();
}

// === COLETA ===
function obterDadosCMC() {
  const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=2500';
  const options = {
    headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
    muteHttpExceptions: true
  };
  const resposta = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(resposta.getContentText());

  const stable = ['USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'USDP', 'USDD', 'GUSD', 'LUSD', 'OUSD', 'SUSD', 'FEI', 'HUSD', 'FRAX', 'EUROC', 'USDN', 'ALUSD'];

  return json.data.filter(c => {
    const simbolo = c.symbol.toUpperCase();
    const nome = c.name.toLowerCase();
    return !stable.includes(simbolo) && !nome.includes('usd') && !nome.includes('stable');
  });
}

// === CÁLCULO DE PONTUAÇÃO ===
function calcularPontuacao(c) {
  const v7 = c.quote.USD.percent_change_7d || 0;
  const v30 = c.quote.USD.percent_change_30d || 0;
  const v90 = c.quote.USD.percent_change_90d || 0;
  return Math.max(0, Math.min(700, 100 + v7 * 2 + v30 + v90 * 0.5));
}

function balancear(score, rank) {
  let mult = 1;
  if (rank <= 150) mult = 0.3;
  else if (rank <= 300) mult = 0.5;
  else if (rank <= 700) mult = 0.8;
  return Math.round(score * mult);
}

// === PREENCHIMENTO ===
function preencherPlanilha(dados) {
  ABA.clearContents();
  ABA.setFrozenRows(1);
  const headers = ["Rank", "Nome", "Símbolo", "Preço (USD)", "Volume", "Market Cap", "Pontuação On-Chain", "Link", "Pontuação Balanceada (1–700)", "Cor", "Alerta Anticolapso", "Observações"];
  ABA.getRange(1, 1, 1, headers.length).setValues([headers]);

  const linhas = dados.map(c => {
    const score = calcularPontuacao(c);
    const balanceado = balancear(score, c.cmc_rank);
    const cor = balanceado >= 600 ? 'azul' : balanceado >= 500 ? 'verde' : balanceado >= 300 ? 'amarelo' : balanceado >= 250 ? 'rosa' : '';
    const alerta = gerarAlerta(c, score, balanceado);
    const preco = c.quote.USD.price;
    return [
      c.cmc_rank,
      c.name,
      c.symbol,
      preco,
      c.quote.USD.volume_24h,
      c.quote.USD.market_cap,
      score,
      `https://coinmarketcap.com/currencies/${c.slug}`,
      balanceado,
      cor,
      alerta,
      ""
    ];
  });

  ABA.getRange(2, 1, linhas.length, linhas[0].length).setValues(linhas);
}

// === ALERTA ANTI-COLAPSO ===
function gerarAlerta(c, score, balanceado) {
  if (balanceado >= 600 && c.quote.USD.volume_24h < 500000) return "Alerta: Hype sem volume";
  if (c.symbol === 'LUNA' || c.symbol === 'FTT') return "Alerta histórico: colapso conhecido";
  if (score > 500 && balanceado < 300) return "Alerta: queda brusca de confiança";
  return "";
}

// === CORES ===
function aplicarCores() {
  const ultima = ABA.getLastRow();
  const valores = ABA.getRange(2, 10, ultima - 1).getValues();
  const cores = valores.map(([cor]) => {
    if (cor === 'azul') return ['#3399ff'];
    if (cor === 'verde') return ['#00ff00'];
    if (cor === 'amarelo') return ['#ffff00'];
    if (cor === 'rosa') return ['#ff00ff'];
    return ['white'];
  });
  ABA.getRange(2, 10, ultima - 1).setBackgrounds(cores);
}

// === HISTÓRICO ===
function salvarHistorico() {
  const dados = ABA.getDataRange().getValues();
  const timestamp = new Date();
  dados.forEach((linha, i) => {
    if (i === 0) return; // pular header
    HISTORICO.appendRow([timestamp, ...linha]);
  });
}

// === API doGet (Painel) ===
function doGet(e) {
  const dados = ABA.getDataRange().getValues();
  const headers = dados[0];
  const lista = dados.slice(1).map(linha => {
    const item = {};
    headers.forEach((h, i) => item[h] = linha[i]);
    item.cor = item["Cor"];
    return item;
  });
  return ContentService.createTextOutput(JSON.stringify(lista)).setMimeType(ContentService.MimeType.JSON);
}
