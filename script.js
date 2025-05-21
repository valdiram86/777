document.addEventListener("DOMContentLoaded", function () {
  $('#cryptoTable').DataTable({
    data: [], // Aqui você vai popular com dados reais depois
    columns: [
      { data: 'rank' },
      { data: 'nome' },
      { data: 'simbolo' },
      { data: 'preco' },
      { data: 'pontuacao' },
      { data: 'cor' },
      { data: 'alerta' },
      { data: 'obs' }
    ]
  });

  document.getElementById('updateBtn').addEventListener('click', function () {
    alert("Atualização conectada com sucesso!");
    // No futuro: chamar API ou planilha aqui
  });
});
