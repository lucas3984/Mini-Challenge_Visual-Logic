import { TopAppBar } from '../components/top-app-bar.js';
import { GameCard } from '../components/game-card.js';
import { ProgressStats } from '../components/progress-stats.js';
import { BottomNav } from '../components/bottom-nav.js';

const games = [
  {
    id: 'labirinto',
    title: 'Labirinto',
    description: 'Navegue por caminhos algorítmicos complexos. Encontre a rota ideal através de portões lógicos mutáveis.',
    icon: 'explore',
    difficulty: 'Fácil',
    difficultyColor: 'var(--color-secondary)',
    difficultyShadow: '#005049',
    backgroundIcon: 'map',
    onStart: (id) => console.log(`Starting game: ${id}`)
  },
  {
    id: 'snake',
    title: 'Snake',
    description: 'A lógica clássica de crescimento e consciência espacial. Evite sua própria cauda em um grid 2D limitado.',
    icon: 'gesture',
    difficulty: 'Difícil',
    difficultyColor: 'var(--color-error)',
    difficultyShadow: '#93000a',
    backgroundIcon: 'line_curve',
    onStart: (id) => console.log(`Starting game: ${id}`)
  }
];

export function render() {
  const main = document.createElement('main');
  main.className = 'home-page';

  const topAppBar = new TopAppBar();
  const progressStats = new ProgressStats({ current: 42, title: 'Mago da Lógica' }, 85);
  const bottomNav = new BottomNav();

  main.appendChild(topAppBar.render());

  const heroSection = document.createElement('section');
  heroSection.className = 'hero-section';
  heroSection.innerHTML = `
    <div class="hero-section__content">
      <div class="hero-section__icon-wrapper">
        <div class="hero-section__glow"></div>
        <span class="material-symbols-outlined hero-section__icon" style="font-variation-settings: 'FILL' 1;">grid_view</span>
      </div>
      <h1 class="hero-section__title">SELECIONAR_NÍVEL</h1>
      <p class="hero-section__subtitle">Desafie suas vias neurais com nossa coleção de módulos de lógica especializados.</p>
    </div>
  `;

  const gamesSection = document.createElement('section');
  gamesSection.className = 'games-section';

  const gamesGrid = document.createElement('div');
  gamesGrid.className = 'games-grid';

  games.forEach(gameData => {
    const gameCard = new GameCard(gameData);
    gamesGrid.appendChild(gameCard.render());
  });

  gamesSection.appendChild(gamesGrid);
  gamesSection.appendChild(progressStats.render());

  main.appendChild(heroSection);
  main.appendChild(gamesSection);
  main.appendChild(bottomNav.render());

  initRippleEffect();
  initMaterialSymbols();

  return main;
}

function initMaterialSymbols() {
  const symbols = document.querySelectorAll('.material-symbols-outlined');
  symbols.forEach(symbol => {
    symbol.style.fontFamily = 'Material Symbols Outlined';
    symbol.style.fontStyle = 'normal';
    symbol.style.fontWeight = 'normal';
    symbol.style.textTransform = 'none';
    symbol.style.letterSpacing = 'normal';
    symbol.style.wordBreak = 'normal';
    symbol.style.whiteSpace = 'normal';
    symbol.style.display = 'inline-block';
    symbol.style.lineHeight = '1';
    symbol.style.verticalAlign = 'middle';
  });
}

function initRippleEffect() {
  document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        background: rgba(255,255,255,0.3);
        border-radius: 50%;
        width: 100px;
        height: 100px;
        left: ${x - 50}px;
        top: ${y - 50}px;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;

      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  });

  if (!document.querySelector('#ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}