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
| RF0X | Seletor de Velocidade para a RF03 | Importante | o campo de execução visual deve ter um seletor de velocidade que define quão rápido os blocos de lógica são executados visualmente|
| RF0X | Seletor de Modo de Jogo| Importante | O site deve contar um seletor de modo de jogo, cada um tem seu prórpio ranking e funcionamento |
| RF0X | Criador de Fases | Desejável | O Usuário deve poder criar fases, que ficarão num modo de jogo Personalizado|

### Não Funcionais

| Identificador | Nome | Prioridade | Descrição |
| :---: | :---: | :---: | :---: |
| RNF01 | Responsividade | Essencial | O site deve funcionar em mobile e em desktop sem quebrar visualmente|

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



#### Aceitação Ideal

- Blocos Lógicos
    - If Else
- Seletor de Modos (Labirinto / Snake / Jornada)
- Modo Jornada 
- Modo criador de fases