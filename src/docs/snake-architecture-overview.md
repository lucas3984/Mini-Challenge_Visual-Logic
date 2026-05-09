# Visão Geral da Arquitetura - Página Snake

Este documento apresenta uma análise de arquitetura da página do jogo Snake Tactical, sem a responsabilidade de documentar o código tecnicamente.

---

## Arquivos Principais da Página Snake

### 1. src/js/pages/snake.js — Controlador da Página

- **Papel:** Orquestrador principal da página Snake Tactical
- **Responsabilidades:**
  - Renderiza toda a UI (header, sidebar, workspace, stage, modais)
  - Gerencia drag-and-drop de blocos
  - Controla execução do código via Runner
  - Gerencia progressão de níveis e pontuação
  - Persiste estado no localStorage
- **Tamanho:** 800 linhas
- **Dependências-chave:** DragDrop, Stage, Snake, Runner, parseWorkspace

---

### 2. src/styles/pages/snake.css — Estilos da Página

- **Papel:** Define todo o visual da página Snake
- **Responsabilidades:**
  - Layout (flex/grid) responsivo
  - Tokens de cores e espaçamento (herdados do design-system)
  - Estilos de header, sidebar, workspace, stage, modal e toast
  - Animações e transições
- **Tamanho:** 517 linhas

---

### 3. src/js/actors/snake.js — Lógica do Jogo (Modelo)

- **Papel:** Ator que contém toda a lógica de estado do jogo
- **Responsabilidades:**
  - Gerencia corpo da cobra, direção, maçãs coletadas
  - Implementa movimentos (`moveForward`, `turnLeft`, `turnRight`)
  - Detecção de colisões (paredes, corpo, limites)
  - Sensores (`checkAppleAhead`, `checkWallAhead`, `checkSnakeAhead`)
  - Sem dependência de DOM — separação clara entre lógica e renderização
- **Tamanho:** 338 linhas

---

## Arquivos de Suporte (Engine)

### 4. src/js/engine/levels.js

- Define as configurações dos 10 níveis (posições iniciais da cobra, maçãs, paredes, limites de blocos)

---

### 5. src/js/engine/runner.js

- Executa o código AST gerado pelo parser
- Controla pause/resume/abort da execução
- Interage com o Snake para realizar movimentos

---

### 6. src/js/engine/parser.js

- Transforma o DOM dos blocos no workspace em uma AST (Abstract Syntax Tree)
- Monta a estrutura de comandos que o Runner executará

---

## Componentes UI

### 7. src/js/components/drag-drop.js

- Gerencia toda a mecânica de arrastar e soltar blocos da paleta para o workspace
- Validações (limites de blocos, loops, ifs aninhados)

---

### 8. src/js/components/stage.js

- Responsável por renderizar o tabuleiro 8x8
- Desenha a cobra, maçãs, paredes no grid
- Atualiza a visualização a cada movimento

---

### 9. src/js/components/top-app-bar.js / src/js/components/bottom-nav.js

- Componentes de navegação globais usados em todas as páginas

---

## Estilos Complementares

### 10. src/styles/components/blocks.css

- Estilos dos blocos arrastáveis (ação, controle, eventos)

---

### 11. src/styles/components/stage.css

- Estilos do tabuleiro de jogo (grid, células, entidades)

---

### 12. src/styles/design-system.css

- Tokens globais de design (cores, tipografia, espaçamento) — base de todas as páginas

---

## Resumo da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     SPA Router (app.js)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   snake.js (página)                         │
│  ├─ UI (header, sidebar, workspace, stage, modal)           │
│  ├─ DragDrop → Blocos no workspace                         │
│  ├─ Parser → AST                                           │
│  ├─ Runner → Executor                                      │
│  └─ Stage → Renderização visual                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   snake.js           runner.js         stage.js
   (lógica)          (execução)        (visual)
```

A arquitetura segue o padrão MVC simplificado:

- **Model:** snake.js (lógica de jogo)
- **View:** stage.js + CSS (renderização)
- **Controller:** snake.js (página) + runner.js (execução)