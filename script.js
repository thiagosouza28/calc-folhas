// Função para calcular as folhas A4 necessárias
function calcularFolhasA4() {
    // Obtém os valores dos inputs
    const blocos = document.getElementById('blocos').value;
    const folhasPorBloco = document.getElementById('folhasPorBloco').value;
    const folhasPorA4 = document.getElementById('folhasPorA4').value;
    // Calcula o número total de folhas
    const totalFolhas = blocos * folhasPorBloco;
    // Calcula o número de folhas A4 necessárias
    const folhasA4 = Math.ceil(totalFolhas / folhasPorA4);
    // Exibe o resultado
    document.getElementById('resultado').innerText = `Você vai precisar de ${folhasA4} folhas A4.`;
    // Salva o cálculo no histórico
    salvarHistorico(blocos, folhasPorBloco, folhasPorA4, folhasA4);
}

// Função para salvar o cálculo no histórico (em localStorage)
function salvarHistorico(blocos, folhasPorBloco, folhasPorA4, folhasA4) {
    // Recupera o histórico atual do localStorage
    let historico = JSON.parse(localStorage.getItem('historico')) || [];
    // Adiciona o novo cálculo ao histórico
    const novoCalculo = {
        blocos: blocos,
        folhasPorBloco: folhasPorBloco,
        folhasPorA4: folhasPorA4,
        folhasA4: folhasA4,
        data: new Date().toLocaleString()
    };
    historico.push(novoCalculo);
    // Limita o histórico a um número máximo de 10 entradas
    if (historico.length > 10) {
        historico.shift();  // Remove o primeiro item para manter o limite
    }
    // Salva o histórico de volta no localStorage
    localStorage.setItem('historico', JSON.stringify(historico));
    // Atualiza a interface com o histórico mais recente
    exibirHistorico();
}

// Função para exibir o histórico na página
function exibirHistorico() {
    const historico = JSON.parse(localStorage.getItem('historico')) || [];
    const ul = document.getElementById('historico');
    ul.innerHTML = '';  // Limpa a lista antes de adicionar os novos itens
    // Exibe cada item do histórico
    historico.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `Blocos: ${item.blocos}, Folhas/Bloco: ${item.folhasPorBloco}, Folhas/A4: ${item.folhasPorA4} → ${item.folhasA4} folhas A4 (Data: ${item.data})`;
        ul.appendChild(li);
    });
}

// Exibe o histórico ao carregar a página
window.onload = exibirHistorico;
