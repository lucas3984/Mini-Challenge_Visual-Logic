# Ajuda — Mini-Challenge Visual Logic (Snake Tactical)

## Estrutura geral do projeto

```
Mini-Challenge_Visual-Logic/
├── index.html                    # Página raiz do SPA (hub)
├── src/
│   ├── js/
│   │   ├── app.js                # Entry point: inicializa o roteador SPA
│   │   ├── actors/
│   │   │   └── snake.js          # Ator: estado puro da cobra (modelo de dados)
│   │   ├── components/
│   │   │   ├── base.js           # Classe base Component (mount/render/unmount)
│   │   │   ├── drag-drop.js      # Drag & Drop de blocos (HTML5 + touch + teclado)
│   │   │   └── stage.js          # Renderizador do grid 8×8 (visão)
│   │   ├── core/
│   │   │   ├── audio.js          # Síntese de som via Web Audio API
│   │   │   ├── router.js         # Roteador SPA baseado em hash (#/)
│   │   │   └── storage.js        # Wrapper do localStorage com try/catch
│   │   ├── engine/
│   │   │   ├── levels.js         # Definição das 10 fases base do jogo (dados)
│   │   │   ├── parser.js         # Leitor DOM → AST (árvore de comandos)
│   │   │   └── runner.js         # Executor assíncrono da AST com pause/resume
│   │   ├── pages/
│   │   │   ├── hub.js            # Página inicial (hub de jogos)
│   │   │   └── snake.js          # Página do jogo Snake (orquestrador)
│   │   └── utils/
│   │       └── dom.js            # Funções utilitárias puras (DOM, contagem, clone)
│   ├── styles/
│   │   ├── design-system.css     # Todos os tokens CSS (cores, fontes, espaçamentos)
│   │   ├── pages/
│   │   │   └── snake.css         # Tokens e layout da página do Snake
│   │   └── components/
│   │       ├── blocks.css        # Estilos da sidebar, blocos, workspace
│   │       └── stage.css         # Estilos do grid, cobra, maçã, paredes
│   ├── assets/
│   │   └── images/
│   │       ├── icons/            # Ícones SVG da UI (run, pause, clear, hub, reset)
│   │       └── sprites/          # Sprites SVG do jogo (cobra, maçã, parede)
│   └── docs/
│       ├── SNAKE_HELP.md         # Este arquivo
│       ├── SNAKE_RULES.md        # Regras completas do jogo
│       └── DOCUMENTATION.md      # Requisitos do projeto (RF, RNF)
```

---

## Páginas

### `pages/snake.js` — Orquestrador do jogo

É o cérebro que conecta tudo. Exporta `render()` exigido pelo roteador SPA.

**O que faz:**
- Constrói toda a UI do jogo via `innerHTML` (header, sidebar, workspace, stage, modais, toast)
- Instancia os subsistemas: `Snake` (ator), `Stage` (renderizador), `Runner` (executor), `DragDrop` (arrastar), `AudioFX` (som)
- Gerencia níveis: carregar, trocar, auto-avançar após vitória
- Gerencia pontuação: cálculo de estrelas, persistência em localStorage via `storage.js`
- Conecta todos os botões: Executar, Pausar, Limpar, Regras, Voltar
- Mantém estado global em closure (`currentLevelIndex`, `isExecuting`, `highestCompletedLevel`)
- Recarrega a lista de fases dinamicamente quando novas fases geradas são adicionadas ao jogo

**Por que está separado:** Isola a lógica de UI e orquestração da lógica de jogo (que está no ator e engine).

---

### `pages/hub.js` — Página inicial

Página simples que mostra o título "Visual Logic" e um card para lançar o Snake Tactical. Redireciona para `#/snake`.

---

## Atores

### `actors/snake.js` — Modelo de dados da cobra

Estado puro do jogo — **zero DOM**. O Stage lê este modelo para desenhar o grid.

**Estado interno (#):**
- `#body` — array de `{row, col}`, cabeça no índice 0
- `#direction` — `'right'`, `'down'`, `'left'` ou `'up'`
- `#apples` — posições das maçãs restantes
- `#walls` — posições fixas das paredes
- `#collectedApples` — quantas maçãs já foram coletadas
- `#gameOver` — flag de derrota
- `#audio` — referência para tocar sons de ação

**Métodos principais:**
- `loadLevel(level)` — carrega os dados de um nível (deep-copia para não mutar o original)
- `moveForward()` — move 1 casa na direção atual, detecta colisões e maçãs
- `turnLeft()` / `turnRight()` — gira 90°
- `checkAppleAhead()` / `checkWallAhead()` / `checkSnakeAhead()` — sensores para o bloco Se

**Por que está separado do Stage:** Segue a convenção "DOM logic separated from data/business logic". Se amanhã o jogo tiver outro renderizador (ex: 3D), o ator não muda.

---

## Componentes

### `components/base.js` — Classe base Component

Fornece o contrato de ciclo de vida para todos os componentes:
- `mount(container)` — guarda o container e chama `render()`
- `render()` — método a ser sobrescrito (retorna `HTMLElement`)
- `unmount()` — limpa `innerHTML` do container (pode ser sobrescrito para remover listeners)

**Por que existe:** Garante que todo componente tenha uma interface previsível. Facilita adicionar novos componentes no futuro.

---

### `components/drag-drop.js` — Arrastar e soltar blocos

Gerencia todo o fluxo de montagem dos blocos no workspace.

**Três modos de interação:**
1. **HTML5 Drag & Drop** (desktop) — `dragstart`, `dragover`, `drop`, `dragend`
2. **Touch long-press** (mobile) — timer de 500ms, clone visual flutuante
3. **Teclado** — Delete/Backspace remove bloco focado, Escape cancela arrasto

**Lógica de permissão:**
- Verifica limites do nível (`maxBlocks`, `maxLoops`, `maxIfs`) antes de cada drop de novos blocos da paleta
- Blocos da sidebar são **clonados** (cópia), blocos do workspace são **movidos**
- Não há limite de quantidade de blocos dentro de `Repetir` e `Se`
- Continua proibido aninhar `Se` dentro de `Se` e `Repetir` dentro de `Repetir`
- Snap preview: borda glow azul aparece nas zonas de encaixe durante o arrasto
- Botão de delete (×) aparece no hover de cada bloco no workspace

**Por que listeners são guardados em `this._on*Bound`:** Para que o `unmount()` possa remover todos os event listeners por identidade, evitando memory leak no SPA.

---

### `components/stage.js` — Renderizador do grid

Traduz o estado do ator `Snake` em elementos visuais no DOM.

**Fluxo de renderização:**
1. Limpa todas as 64 células do grid (remove classes e `innerHTML`)
2. Desenha paredes (SVG com espinhos)
3. Desenha maçãs (SVG com brilho e cabinho)
4. Desenha cobra de trás para frente (cauda primeiro, cabeça por último)
   - Cabeça: rotacionada via classe CSS conforme direção
   - Corpo: opacidade decrescente com a distância da cabeça
5. Atualiza footer (posição, maçãs, status)

**Por que não usa `document.getElementById`:** Usa `this.#gridEl.closest('.page--snake')` para buscar elementos dentro do escopo da página SPA. Isso evita conflitos se houver múltiplas páginas montadas.

---

## Engine

### `engine/parser.js` — DOM → AST

Lê a árvore DOM do workspace e gera uma **árvore sintática abstrata (AST)** que o Runner entende.

**Tipos de nós gerados:**
- `{ type: 'action', command: 'moveForward'|'turnLeft'|'turnRight', node: el }`
- `{ type: 'loop', iterations: N, children: [...], node: el }`
- `{ type: 'conditional', condition: 'checkAppleAhead'|..., children: [...], node: el }`

**Por que AST e não executar direto no DOM:** Separa a leitura da estrutura (parser) da execução (runner). Se os blocos mudarem de HTML, só o parser muda.

---

### `engine/runner.js` — Executor assíncrono

Percorre a AST e executa cada comando no ator Snake com delays visíveis.

**Mecanismo de pausa:**
- `pause()` seta flag `#paused = true`
- `#checkPause()` entra em loop `while(paused && !aborted)` aguardando uma Promise
- `resume()` seta `#paused = false` e resolve a Promise pendente
- `abort()` seta `#aborted = true` + chama `resume()` para destravar

**Highlight visual:** Adiciona/remove a classe `block--executing` no nó DOM do bloco atual. O CSS faz o bloco pulsar com glow verde.

**Fluxo por tipo de nó:**
- **Ação:** snake.moveForward() → stage.render() → highlight off
- **Loop:** highlight on → executa filhos N vezes → highlight off
- **Condicional:** highlight on → verifica condição → executa filhos se verdadeiro → highlight off

---

### `engine/levels.js` — Dados dos níveis

Array com 10 fases base, cada uma definindo:
- Posição inicial da cobra, direção, paredes, maçãs
- Limites: `maxBlocks`, `maxLoops`, `maxIfs`
- Thresholds de estrelas: `starThree`, `starTwo`
- Grid: `gridSize: 8` (fixo)

Nenhuma lógica — apenas dados puros.

### `engine/level-registry.js` — Catálogo dinâmico de fases

Une as fases base com as fases geradas globalmente para o Snake.

**Regras principais:**
- Fases 1-10 vêm de `levels.js`
- Fases 11+ são geradas uma vez por computador e compartilhadas entre todos os perfis
- A geração começa quando um perfil alcança a fase 8 (progressão 7)
- O catálogo é lido por `home.js`, `snake.js` e `level-selector.js`

---

## Utilitários

### `utils/dom.js` — Funções DOM puras

Funções sem estado, sem efeitos colaterais:

- `getCellElement(gridEl, row, col)` — querySelector por `data-row`/`data-col`
- `escapeHtml(str)` — sanitização XSS (exigida pelo DOCUMENTATION.md RNF04)
- `delay(ms)` — Promise que resolve após N ms
- `countAllBlocks(container)` — conta blocos de ação, loop e if **recursivamente** (entra em dropzones)
- `countLoopBlocks(container)` — conta blocos Repeat recursivamente
- `countIfBlocks(container)` — conta blocos Se recursivamente
- `countIfChildren(ifBlock)` — conta filhos diretos no dropzone de um Se
- `cloneBlockForWorkspace(block)` — clona bloco da sidebar para workspace (remove `data-block-id`, adiciona botão delete)

---

## Core (infraestrutura compartilhada)

### `core/router.js` — Roteador SPA

Roteador baseado em hash (`#/`, `#/snake`, `#/snake/:level`).

- Converte padrões de rota em regex (ex: `/snake/:level` → captura `level` como grupo nomeado)
- No `hashchange`, encontra a rota correspondente, chama `render()` da página e monta no `<main>`
- Move foco para `<main>` após cada transição (acessibilidade)
- Rota desconhecida redireciona para `#/`

---

### `core/storage.js` — Wrapper do localStorage

Encapsula `localStorage` com `try/catch` em todas as operações.
Motivo: `localStorage` pode falhar em modo privado, quota excedida ou estar indisponível.

Fornece `getItem`, `setItem`, `removeItem`, `getJSON`, `setJSON`.

---

### `core/audio.js` — Síntese de som

Gera sons via **Web Audio API** (osciladores) — sem arquivos de áudio externos.

- **Inicialização preguiçosa:** AudioContext só é criado no primeiro clique/toque (política de autoplay)
- **Sons disponíveis:** `move` (passo), `turn` (giro), `eat` (maçã), `hit` (colisão), `win` (vitória), `snap` (encaixe), `error` (limite)

---

### `app.js` — Entry point

Registra as rotas (`/` → hub, `/snake` → snake) e inicia o roteador. É carregado via `<script type="module">` no `index.html`.

---

## CSS

### `design-system.css` — Fonte única de tokens

**Todos** os valores de cor, espaçamento, tipografia, bordas, sombras e durações do projeto são definidos aqui como variáveis CSS. Nenhum outro arquivo CSS contém valores hardcoded.

Inclui suporte a tema claro (padrão) e escuro (`[data-theme="dark"]`).

---

### `pages/snake.css` — Tokens e layout da página Snake

- Define tokens específicos do jogo (cores da cobra, maçã, paredes, botões)
- Layout da página: header, level-bar, grid, modal, toast
- Animações: pulsar maçã, executar bloco, toast
- Breakpoints mobile

---

### `components/blocks.css` — Estilo dos blocos

- Sidebar e paleta de blocos
- Blocos de ação com formato puzzle (clip-path)
- C-blocks (Repeat/Se) com dropzone interno
- Estados: dragging, selected, executing, snap preview
- Botão de delete (×)
- Workspace e controls bar

---

### `components/stage.css` — Estilo do grid

- Grid 8×8 xadrez
- Cabeça da cobra com olhos, língua e rotação por direção
- Corpo da cobra com fade de opacidade
- Maçã com brilho, cabinho e folha + animação pulsar
- Parede com espinhos triangulares (CSS triangles)
- Footer com posição, contador e status
- Sprites SVG com sombras

---

## Fluxo completo de uma jogada

```
1. Jogador arrasta blocos da sidebar para o workspace
   → drag-drop.js clona/move, verifica limites, atualiza contadores

2. Jogador clica "Executar"
   → snake.js: snake.loadLevel(level) + stage.render()
   → parser.js: lê DOM do workspace → gera AST
   → runner.js: percorre AST async, comando por comando

3. Para cada comando:
   → runner chama snake.moveForward() / turnLeft() / turnRight()
   → runner chama stage.render() para atualizar o grid
   → runner aplica highlight no bloco atual (pulsa verde)

4. Fim da execução:
   → win: snake.isComplete → salva estrelas, desbloqueia próximo nível, auto-avança
   → gameover: snake.isGameOver → toca som de colisão
   → aborted: jogador limpou ou trocou de nível
```
