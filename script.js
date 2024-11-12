// Constantes e configurações
const CONFIG = {
    MAX_HISTORY_ITEMS: 10,
    STORAGE_KEY: 'folhasA4_historico',
    DECIMAL_PLACES: 2
};

// Classes para gerenciamento de dados
class CalculationResult {
    constructor(blocos, folhasPorBloco, folhasPorA4, folhasA4) {
        this.blocos = blocos;
        this.folhasPorBloco = folhasPorBloco;
        this.folhasPorA4 = folhasPorA4;
        this.folhasA4 = folhasA4;
        this.data = new Date().toLocaleString();
        this.id = crypto.randomUUID();
    }

    toString() {
        return `Blocos: ${this.blocos}, Folhas/Bloco: ${this.folhasPorBloco}, ` +
               `Folhas/A4: ${this.folhasPorA4} → ${this.folhasA4} folhas A4`;
    }
}

class HistoryManager {
    constructor() {
        this.storage = window.localStorage;
    }

    getHistory() {
        try {
            return JSON.parse(this.storage.getItem(CONFIG.STORAGE_KEY)) || [];
        } catch (error) {
            console.error('Erro ao recuperar histórico:', error);
            return [];
        }
    }

    addToHistory(calculation) {
        try {
            let history = this.getHistory();
            history.push(calculation);
            
            // Mantém apenas os itens mais recentes
            if (history.length > CONFIG.MAX_HISTORY_ITEMS) {
                history = history.slice(-CONFIG.MAX_HISTORY_ITEMS);
            }

            this.storage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
            return true;
        } catch (error) {
            console.error('Erro ao salvar no histórico:', error);
            return false;
        }
    }

    clearHistory() {
        try {
            this.storage.removeItem(CONFIG.STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            return false;
        }
    }
}

// Classe principal da calculadora
class A4Calculator {
    constructor() {
        this.historyManager = new HistoryManager();
        this.setupEventListeners();
        this.displayHistory();
    }

    setupEventListeners() {
        // Form submission
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.calculate();
            });
        }

        // Input validation
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', this.validateInput);
        });

        // Adiciona botão de limpar histórico
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Limpar Histórico';
        clearBtn.className = 'clear-history-btn';
        clearBtn.addEventListener('click', () => this.clearHistory());
        document.querySelector('.history')?.appendChild(clearBtn);
    }

    validateInput(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        
        if (value <= 0) {
            input.setCustomValidity('Por favor, insira um número maior que zero');
        } else if (!Number.isInteger(value)) {
            input.setCustomValidity('Por favor, insira um número inteiro');
        } else {
            input.setCustomValidity('');
        }
        
        input.reportValidity();
    }

    getInputValue(id) {
        const value = parseInt(document.getElementById(id)?.value);
        if (isNaN(value) || value <= 0) {
            throw new Error(`Valor inválido para ${id}`);
        }
        return value;
    }

    async calculate() {
        try {
            // Obtém e valida inputs
            const blocos = this.getInputValue('blocos');
            const folhasPorBloco = this.getInputValue('folhasPorBloco');
            const folhasPorA4 = this.getInputValue('folhasPorA4');

            // Realiza os cálculos
            const totalFolhas = blocos * folhasPorBloco;
            const folhasA4 = Math.ceil(totalFolhas / folhasPorA4);

            // Cria novo resultado
            const result = new CalculationResult(
                blocos, folhasPorBloco, folhasPorA4, folhasA4
            );

            // Salva e exibe resultados
            this.displayResult(result);
            this.historyManager.addToHistory(result);
            this.displayHistory();

            // Feedback visual
            this.showSuccessMessage();

        } catch (error) {
            this.showErrorMessage(error.message);
        }
    }

    displayResult(result) {
        const resultElement = document.getElementById('resultado');
        if (resultElement) {
            resultElement.innerHTML = `
                <div class="result-card">
                    <h3>Resultado</h3>
                    <p>Você vai precisar de <strong>${result.folhasA4}</strong> folhas A4.</p>
                    <small>Calculado em: ${result.data}</small>
                </div>
            `;
        }
    }

    displayHistory() {
        const historyElement = document.getElementById('historico');
        if (!historyElement) return;

        const history = this.historyManager.getHistory();
        
        if (history.length === 0) {
            historyElement.innerHTML = '<li class="empty-history">Nenhum cálculo realizado ainda</li>';
            return;
        }

        historyElement.innerHTML = history
            .reverse()
            .map(item => `
                <li class="history-item" data-id="${item.id}">
                    <div class="history-content">
                        <strong>${item.folhasA4} folhas A4</strong>
                        <p>${item.toString()}</p>
                        <small>Data: ${item.data}</small>
                    </div>
                </li>
            `)
            .join('');
    }

    clearHistory() {
        if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
            this.historyManager.clearHistory();
            this.displayHistory();
            this.showSuccessMessage('Histórico limpo com sucesso!');
        }
    }

    showSuccessMessage(message = 'Cálculo realizado com sucesso!') {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.classList.add('fade-out');
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new A4Calculator();
    
    // Exporta para uso no console durante desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        window.calculator = calculator;
    }
});
