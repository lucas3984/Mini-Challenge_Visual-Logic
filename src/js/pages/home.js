import { GameCard } from '../components/game-card.js';
import { ProgressStats } from '../components/progress-stats.js';
import { hasAnyProfile, setActiveProfile, getActiveProfile } from '../core/profile.js';
import { getGameProgress } from '../core/profile-data.js';
import { GAME_CONFIG } from '../config/games.js';
import { getGameLevels, ensureGeneratedLevelsForProgress } from '../engine/level-registry.js';
import { ProfileModal } from '../components/profile-modal.js';
import { navigateTo } from '../core/router-state.js';

/*
 * Static game catalog data lives outside render() so it is only
 * allocated once — not recreated on every render call (future-proofing
 * for SPA route re-renders).
 */
const games = [
  {
    id: 'labirinto',
    title: 'Labirinto',
    description: 'Navegue por caminhos algorítmicos complexos. Encontre a rota ideal através de portões lógicos mutáveis.',
    icon: 'explore',
    gradient: 'linear-gradient(135deg, #8789c0, #8380b6)',
    iconColor: '#111d4a',
    iconBorderColor: '#111d4a',
    iconBgColor: '#8789c0',
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
    gradient: 'linear-gradient(135deg, #45f0df, #c2cae8)',
    iconColor: '#111d4a',
    iconBorderColor: '#111d4a',
    iconBgColor: '#45f0df',
    difficulty: 'Difícil',
    difficultyColor: 'var(--color-error)',
    difficultyShadow: '#93000a',
    backgroundIcon: 'line_curve',
    onStart: () => { navigateTo('/levels/snake'); }
  }
];

/*
 * Aggregates per-game progress across all registered games
 * to produce a unified level + XP display for the home page.
 */
function computeProfileProgress() {
  const profile = getActiveProfile();
  if (!profile) {
    return { level: { current: 1, title: 'Visitante' }, progress: 0 };
  }

  let totalCompleted = 0;
  let totalLevels = 0;

  for (const [gameId, config] of Object.entries(GAME_CONFIG)) {
    const completed = getGameProgress(profile, gameId);
    ensureGeneratedLevelsForProgress(gameId, completed);
    totalCompleted += completed;
    totalLevels += getGameLevels(gameId).length;
  }

  const percentage = totalLevels > 0
    ? Math.round((totalCompleted / totalLevels) * 100)
    : 0;

  return {
    level: { current: totalCompleted + 1, title: deriveTitle(totalCompleted) },
    progress: percentage,
  };
}

/*
 * Remembers the last rendered progress percentage so the bar can animate
 * from the previous value when the profile changes (module-scoped to
 * survive page re-renders without leaking into the component).
 */
let lastProgress = 0;

/*
 * Maps the total number of completed levels to a player rank title.
 * Thresholds are tuned for the current game catalog and can be revisited as
 * more games or phases are added.
 */
function deriveTitle(completed) {
  if (completed >= 40) return 'Lenda';
  if (completed >= 25) return 'Mestre da Lógica';
  if (completed >= 15) return 'Estrategista';
  if (completed >= 7) return 'Programador';
  if (completed >= 3) return 'Aprendiz';
  return 'Iniciante';
}

/*
 * Home page render function — follows the SPA convention from AGENTS.md:
 * pages export render(): HTMLElement. Components are instantiated here
 * and their render() output is assembled into the page DOM tree.
 * .render() is called instead of .mount() because the page manually
 * manages layout assembly; .mount() is reserved for cases where a
 * component owns its own container lifecycle.
 */
export function render() {
  const page = document.createElement('div');
  page.className = 'home-page';

  const { level, progress } = computeProfileProgress();
  const progressStats = new ProgressStats(level, progress, lastProgress);
  lastProgress = progress;

  /* Hero section: game-style header with animated icon and tagline. */
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

  /* Games grid section — one GameCard per catalog entry. */
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

  page.appendChild(heroSection);
  page.appendChild(gamesSection);

  /*
   * Ripple effect adds tactile feedback on button clicks (gamified UI).
   * Material Symbols setup ensures consistent icon rendering across browsers.
   */
  initRippleEffect();
  initMaterialSymbols();

  /*
   * First-time access: if no profiles exist, overlay the profile creation
   * modal on document.body so it sits above all page content. The home page
   * renders underneath but remains inaccessible until the modal is resolved.
   */
  if (!hasAnyProfile()) {
    const profileModal = new ProfileModal({
      onSubmit: (name) => {
        setActiveProfile(name);
        profileModal.close();
        // Re-render so the TopAppBar shows the new profile name
        window.dispatchEvent(new CustomEvent('profile-changed'));
      }
    });
    profileModal.mount(document.body);
  }

  return page;
}

/*
 * Google's Material Symbols font needs explicit CSS property resets on
 * every .material-symbols-outlined element to render correctly across
 * different browsers. The font-face import gets the font family right,
 * but line-height, letter-spacing, etc. often inherit unintended values.
 */
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

/*
 * Implements a Material-style ripple effect on all buttons.
 * The @keyframes animation is injected once via a guarded <style> element
 * (id="ripple-style") so repeated calls don't duplicate the keyframes.
 * Ripple elements are created at click position, animated, then removed
 * after the animation duration to prevent DOM bloat.
 */
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

      /* Button needs position: relative and overflow: hidden so the
         ripple stays clipped inside the button boundaries. */
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  });

  /*
   * Guard: inject the @keyframes only once. Checking for an existing
   * <style id="ripple-style"> prevents duplicate keyframe definitions
   * if this init function is called multiple times (e.g. SPA navigation).
   */
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
