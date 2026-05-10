#### Documentation in PT-BR

An english version will be added when this is sufficiently done

## Requisitos Coletados

### Funcionais

| Identificador | Nome | Prioridade | Descrição |
| :---: | :---: | :---: | :---: |
| RF01 | Blocos de Lógica | Essencial | O jogo irá funcionar por meio de blocos de lógica (if, if-else, loops, variáveis), esse blocos devem ser posicionados por meio de API de Drag and Drop|
| RF02 | Feedback ao Usuário | Essencial | O jogo deve dar retorno visual e sonoro referente ao sucesso/falha do código aplicado pelo usuário |
| RF03 | Palco - Campo de Execução dos Blocos | Essencial | O jogo deve conter um campo que execute visualmente o código definido, este campo deve ter: Executar, Reiniciar (Reinicia o visual apenas, mantém os blocos da forma que foram dispostas) |
| RF04 | Ranking | Essencial | O jogo deve conter um ranking, armazenado em local-storage, ele deve conter o nome do usuário e sua pontuação total|
| RF05 | Perfil | Essencial | O jogo deve conter perfis, armazenados em local storage, o perfil possui apenas um nome, o usuário deve ser capaz de selecionar qual perfil ele está usando|
| RF06 | SPA States | Essencial | O site deve ser feito como um SPA, ele precisa salvar em estados onde está para caso o usuário recarregue a página ele não volte para a home|
| RF07 | Acessibilidade | Essencial | Jogo deve ser compatível com leitores de tela (ARIA roles, focus trap), alvos de toque 44x44px |
| RF08 | Validação de Blocos | Essencial | Blocos devem validar conexões (verificação de tipos, parâmetros obrigatórios) antes da execução |
| RF09 | Tratamento de Erros | Essencial | Feedback visual e sonoro para: conexões inválidas, erros de execução, loops infinitos |
| RF10 | Save/Load Progresso | Importante | Usuário pode salvar e carregar arranjos de blocos por nível (localStorage com try/catch) |
| RF11 | Execução Passo-a-Passo | Importante | Execução visual deve suportar modo passo-a-passo (não apenas play/pause) |
| RF12 | Seletor de Velocidade para a RF03 | Importante | o campo de execução visual deve ter um seletor de velocidade que define quão rápido os blocos de lógica são executados visualmente|
| RF13 | Seletor de Modo de Jogo| Importante | O site deve contar um seletor de modo de jogo, cada um tem seu próprio ranking e funcionamento |
| RF14 | Criador de Fases | Desejável | O Usuário deve poder criar fases, que ficarão num modo de jogo Personalizado|
| RF15 | Controle via teclado  | Desejável | Jogo deve ser navegável via teclado para melhorar a experiência acessível|

### Não Funcionais

| Identificador | Nome | Prioridade | Descrição |
| :---: | :---: | :---: | :---: |
| RNF01 | Responsividade | Essencial | O site deve funcionar em mobile e em desktop sem quebrar visualmente|
| RNF02 | Acessibilidade | Essencial | Suporte a leitores de tela, alvos de toque 44x44px |
| RNF03 | Arquitetura | Essencial | Componentes baseados em classes, hash routing, ES6+ modules |
| RNF04 | Segurança | Essencial | Sanitização obrigatória de entrada do usuário contra XSS (`escapeHtml`) |

### Requisitos Técnicos

#### Frontend
- Vanilla JavaScript (ES6+ modules, sem frameworks)
- CSS com BEM naming (`block__element--modifier`)
- Sem variáveis globais (apenas ES modules via `type="module"`)

#### Roteamento
- Hash-based SPA routing: `#/`, `#/puzzle/:id`
- Usar sempre `router.navigate(path)` (nunca manipular `location.hash` diretamente)
- Transições de rota devem mover foco para `<main>` (acessibilidade)
- Uma página por arquivo em `js/pages/`, exportando `render(): HTMLElement`

#### Armazenamento
- `localStorage` para perfis, ranking e progresso
- Sempre com `try/catch` (pode falhar em modo privado ou quota excedida)

#### Segurança
- Sanitização obrigatória de entrada do usuário contra XSS (`escapeHtml`)
- Zero credenciais hardcodeadas (tokens, senhas, URLs de produção)

#### Componentes
- Ciclo de vida: `mount(container)` → `render()` → `unmount()`
- Limpeza de listeners e estado em `unmount()`
- Private state via `#` fields em classes

### Especificações de Gamificação

#### Sistema de Pontuação
- Pontos por: blocos usados (menos blocos = mais pontos), tempo de execução, tentativas
- Bônus por: resolver sem erros, usar novos tipos de blocos, eficiência
- No Snake, a contagem de blocos inclui também os blocos aninhados dentro de `Repetir` e `Se`

#### Níveis e Progressão
- Fases com progressão de dificuldade
- Novos tipos de blocos desbloqueados por nível
- Sistema de "Objetivo" por fase (meta clara para avançar)
- `Se` dentro de `Se` e `Repetir` dentro de `Repetir` continuam bloqueados; blocos filhos em `Repetir` e `Se` não têm limite de quantidade
- No Snake, as fases 11+ são geradas globalmente no localStorage do computador e aparecem para todos os perfis

#### Jornada
- A visualização de fases precisa suportar scroll horizontal para acomodar a expansão do mapa
- O scroll da jornada pode ser salvo por perfil para manter a navegação consistente

#### Conquistas (Achievements)
- Badges por: usar todos os tipos de blocos, resolver sem erros, tempo recorde, usar loops, etc.
- Exibição no perfil do usuário

#### Modos de Jogo (Planejado)
- **Labirinto**: Blocos controlam movimento em labirinto 2D (estilo plano cartesiano), o labirinto pode possuit inimigos e o avatar pode possuir ataques
- **Snake**: Evolução do Labirinto, blocos controlam cobra que cresce

### Checklist de Aceitação

#### Aceitação Mínima

- Blocos lógicos
    - Variáveis
    - IF
    - Loop (while, for)
- Fases -> "Sistema de Objetivo"
- Ranking local
- Efeitos Sonoros
- UI / UX
    - Responsivo
    - Animado
    - Feedback ao usuário
- Ranking
    - Nome de Usuário
    - Pontuação
- Páginas
    - Aérea da Fase
        - Palco
            - Mapa/Desafio Único
                - Estilo -> Plano cartesiano
            - Ator
        - Área dos Blocos
            - Drag and Drop para área de planejamento
        - Área de Planejamento
- Acessibilidade
    - Compatível com leitores de tela (ARIA)
    - Alvos de toque 44x44px
- Validação de Blocos
    - Verificação de tipos de conexão
    - Feedback de erro visual e sonoro
- Tratamento de Erros
    - Conexões inválidas rejeitadas visualmente
    - Loops infinitos detectados e interrompidos
    - Mensagens de erro amigáveis

#### Aceitação Ideal

- Blocos Lógicos
    - If Else
- Seletor de Modos (Labirinto / Snake / Jornada)
- Modo Jornada 
- Modo criador de fases
- Acessibilidade
    - Navegação via teclado (para os blocos)
- Sistema de Conquistas
    - Badges visuais no perfil
    - Múltiplas conquistas por fase
- Múltiplos níveis de dificuldade
    - Fases tutorial
    - Fases desafio
    - Fases livre (sandbox)
