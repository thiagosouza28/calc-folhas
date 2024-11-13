// Configurações da aplicação
const CONFIG = {
    MAX_HISTORY_ITEMS: 10,
    STORAGE_KEY: 'folhasA4_calculator',
    THEME_KEY: 'folhasA4_theme',
    DECIMAL_PLACES: 2,
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    MIN_INPUT_VALUE: 1,
    MAX_INPUT_VALUE: 9999
};

// Utilitários
const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    formatNumber(number) {
        return new Intl.NumberFormat('pt-BR').format(number);
    },

    formatDate(date) {
        return new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(date);
    },

    isValidNumber(value) {
        return !isNaN(value) && 
               Number.isInteger(value) && 
               value >= CONFIG.MIN_INPUT_VALUE && 
               value <= CONFIG.MAX_INPUT_VALUE;
    }
};

// Gerenciador de Temas
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('themeToggle');
        this.body = document.body;
        this.currentThemeIndex = 0;
        this.themes = ['light-theme', 'dark-theme', 'contrast-theme'];
        this.setupTheme();
    }

    setupTheme() {
        // Carrega tema salvo ou detecta preferência do sistema
        const savedTheme = localStorage.getItem(CONFIG.THEME_KEY);
        if (savedTheme) {
            this.setTheme(savedTheme);
            this.currentThemeIndex = this.themes.indexOf(savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark-theme' : 'light-theme');
            this.currentThemeIndex = prefersDark ? 1 : 0;
        }

        // Configura eventos
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Alterna entre temas
        this.themeToggle?.addEventListener('click', () => {
            this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
            this.setTheme(this.themes[this.currentThemeIndex]);
        });

        // Observa mudanças na preferência do sistema
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', e => {
                if (!localStorage.getItem(CONFIG.THEME_KEY)) {
                    this.setTheme(e.matches ? 'dark-theme' : 'light-theme');
                }
            });
    }

    setTheme(theme) {
        this.themes.forEach(t => this.body.classList.remove(t));
        this.body.classList.add(theme);
        localStorage.setItem(CONFIG.THEME_KEY, theme);
        
        // Atualiza ícones e ARIA labels
        const icons = {
            'light-theme': 'fa-sun',
            'dark-theme': 'fa-moon',
            'contrast-theme': 'fa-circle'
        };
        
        const labels = {
            'light-theme': 'Tema Claro',
            'dark-theme': 'Tema Escuro',
            'contrast-theme': 'Alto Contraste'
        };
        
        this.themeToggle?.setAttribute('aria-label', `Alternar tema (atual: ${labels[theme]})`);
    }
}

// Modelo de Resultado de Cálculo
class CalculationResult {
    constructor(blocos, folhasPorBloco, folhasPorA4, folhasA4) {
        this.blocos = blocos;
        this.folhasPorBloco = folhasPorBloco;
        this.folhasPorA4 = folhasPorA4;
        this.folhasA4 = folhasA4;
        this.totalFolhas = blocos * folhasPorBloco;
        this.timestamp = new Date();
        this.id = crypto.randomUUID();
    }

    toString() {
        return `${Utils.formatNumber(this.blocos)} blocos × ` +
               `${Utils.formatNumber(this.folhasPorBloco)} folhas por bloco ÷ ` +
               `${Utils.formatNumber(this.folhasPorA4)} folhas por A4 = ` +
               `${Utils.formatNumber(this.folhasA4)} folhas A4`;
    }

    toJSON() {
        return {
            ...this,
            timestamp: this.timestamp.toISOString()
        };
    }

    static fromJSON(json) {
        const result = Object.assign(new CalculationResult(), json);
        result.timestamp = new Date(json.timestamp);
        return result;
    }
}

// Gerenciador de Histórico
class HistoryManager {
    constructor() {
        this.storage = window.localStorage;
        this.history = this.loadHistory();
    }

    loadHistory() {
        try {
            const stored = this.storage.getItem(CONFIG.STORAGE_KEY);
            if (!stored) return [];
            
            const parsed = JSON.parse(stored);
            return parsed.map(item => CalculationResult.fromJSON(item));
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            return [];
        }
    }

    saveHistory() {
        try {
            this.storage.setItem(CONFIG.STORAGE_KEY, 
                JSON.stringify(this.history.slice(-CONFIG.MAX_HISTORY_ITEMS))
            );
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
            throw new Error('Não foi possível salvar o histórico');
        }
    }

    addCalculation(result) {
        this.history.push(result);
        this.saveHistory();
    }

    clearHistory() {
        this.history = [];
        this.storage.removeItem(CONFIG.STORAGE_KEY);
    }

    getHistory() {
        return [...this.history];
    }
}

// Classe Principal da Calculadora
class A4Calculator {
    constructor() {
        this.historyManager = new HistoryManager();
        this.themeManager = new ThemeManager();
        this.form = document.getElementById('calculatorForm');
        this.resultElement = document.getElementById('resultado');
        this.historicoElement = document.getElementById('historico');
        this.setupEventListeners();
        this.displayHistory();
        this.updateCurrentYear();
    }

    setupEventListeners() {
        // Form submission
        this.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculate();
        });

        // Form reset
        this.form?.addEventListener('reset', () => {
            setTimeout(() => {
                this.resultElement.querySelector('strong').textContent = '0';
            }, 0);
        });

        // Input validation
        this.form?.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', Utils.debounce((e) => this.validateInput(e), 300));
        });

        // Limpar histórico
        document.getElementById('clearHistory')?.addEventListener('click', () => this.clearHistory());
        
        // Tooltip setup
        this.setupTooltips();
    }

    setupTooltips() {
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;

        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const rect = e.target.getBoundingClientRect();
                tooltip.querySelector('.tooltip-content').textContent = e.target.dataset.tooltip;
                tooltip.style.top = `${rect.bottom + 10}px`;
                tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
                tooltip.hidden = false;
            });

            element.addEventListener('mouseleave', () => {
                tooltip.hidden = true;
            });
        });
    }

    validateInput(event) {
        const input = event.target;
        const value = parseInt(input.value);
        
        if (!Utils.isValidNumber(value)) {
            input.setCustomValidity(`Por favor, insira um número inteiro entre ${CONFIG.MIN_INPUT_VALUE} e ${CONFIG.MAX_INPUT_VALUE}`);
        } else {
            input.setCustomValidity('');
        }
        
        input.reportValidity();
    }

    async calculate() {
        try {
            const inputs = ['blocos', 'folhasPorBloco', 'folhasPorA4']
                .map(id => ({
                    id,
                    value: parseInt(document.getElementById(id)?.value)
                }));

            // Validação
            inputs.forEach(({id, value}) => {
                if (!Utils.isValidNumber(value)) {
                    throw new Error(`Valor inválido para ${id}`);
                }
            });

            // Cálculo
            const [blocos, folhasPorBloco, folhasPorA4] = inputs.map(i => i.value);
            const totalFolhas = blocos * folhasPorBloco;
            const folhasA4 = Math.ceil(totalFolhas / folhasPorA4);

            // Criação do resultado
            const result = new CalculationResult(blocos, folhasPorBloco, folhasPorA4, folhasA4);

            // Atualização da UI
            this.displayResult(result);
            this.historyManager.addCalculation(result);
            this.displayHistory();
            this.showToast('Cálculo realizado com sucesso!', 'success');

        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    displayResult(result) {
        if (!this.resultElement) return;

        const content = `
            <div class="result-content">
                <span class="result-icon">
                    <i class="fas fa-file-alt" aria-hidden="true"></i>
                </span>
                <p>Você vai precisar de <strong>${Utils.formatNumber(result.folhasA4)}</strong> folhas A4.</p>
            </div>
            <div class="result-details">
                <small>Total de folhas: ${Utils.formatNumber(result.totalFolhas)}</small>
                <small>Cálculo realizado em: ${Utils.formatDate(result.timestamp)}</small>
            </div>
        `;

        this.resultElement.innerHTML = content;
        this.resultElement.classList.add('highlight');
        setTimeout(() => this.resultElement.classList.remove('highlight'), CONFIG.ANIMATION_DURATION);
    }

    displayHistory() {
        if (!this.historicoElement) return;

        const history = this.historyManager.getHistory();
        const emptyState = document.getElementById('emptyHistory');
        
        if (history.length === 0) {
            this.historicoElement.innerHTML = '';
            emptyState?.removeAttribute('aria-hidden');
            return;
        }

        emptyState?.setAttribute('aria-hidden', 'true');
        this.historicoElement.innerHTML = history
            .reverse()
            .map(item => `
                <li class="history-item" data-id="${item.id}">
                    <div class="history-content">
                        <strong>${Utils.formatNumber(item.folhasA4)} folhas A4</strong>
                        <p>${item.toString()}</p>
                        <small>Data: ${Utils.formatDate(item.timestamp)}</small>
                    </div>
                </li>
            `)
            .join('');
    }

    clearHistory() {
        const dialog = confirm('Tem certeza que deseja limpar todo o histórico?');
        if (dialog) {
            this.historyManager.clearHistory();
            this.displayHistory();
            this.showToast('Histórico limpo com sucesso!', 'success');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}" 
                   aria-hidden="true"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animação de entrada
        requestAnimationFrame(() => {
            toast.classList.add('show');
            
            // Animação de saída
            setTimeout(() => {
                toast.classList.add('hide');
                setTimeout(() => toast.remove(), CONFIG.ANIMATION_DURATION);
            }, CONFIG.TOAST_DURATION);
        });
    }

    updateCurrentYear() {
        const yearElement = document.getElementById('currentYear');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
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
