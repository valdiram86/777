document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "https://script.google.com/macros/s/AKfycbwfamJDHV1RRE4Q3Lv2ZyKiXhCNQj-qwusmJJJo5Fwzy4L2gAyhRWcnrr2_7il3uNA/exec";

  async function carregarDados() {
    try {
      const response = await fetch(API_URL);
      const dados = await response.json();

      if (!dados || !Array.isArray(dados)) {
        document.getElementById("cryptoTable").innerHTML = "<p>Sem dados disponíveis.</p>";
        return;
      }

      const tabela = $('#cryptoTable').DataTable();
      tabela.clear();
      tabela.rows.add(dados);
      tabela.draw();
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      alert("Erro ao buscar dados. Verifique se o link da API está correto.");
    }
  }

  // Inicializar DataTable
  $('#cryptoTable').DataTable({
    columns: [
      { data: 'rank' },
      { data: 'nome' },
      { data: 'simbolo' },
      { data: 'preco' },
      { data: 'pontuacao' }
    ],
    language: {
      search: "Buscar:",
      zeroRecords: "Nenhuma moeda encontrada",
      info: "",
      infoEmpty: "",
      infoFiltered: "",
    }
  });

  // Atualizar ao carregar e ao clicar
  carregarDados();
  document.getElementById("atualizarBtn").addEventListener("click", carregarDados);
});
