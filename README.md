# G03_Arvore_EDA2_2026.2

## Alunos

| Matrícula | Nome |
| --- | --- |
| 241025944 | Ian Pedersoli Barbosa |
| 241012329 | Luiz Henrique Pallavicini |

## memfs — Visualizador de Sistema de Arquivos em Memória (Árvore N-ária)

Dashboard web interativo em Dark Mode, no estilo de uma IDE moderna (VS Code / Vercel), que simula um sistema de arquivos em memória e mostra, em tempo real, a árvore N-ária que o representa. Os comandos digitados no terminal alteram a árvore de verdade, e o canvas, o explorer, as métricas e o inspetor de nó são atualizados em seguida.

## Funcionalidades

### Barra Superior

* **Breadcrumb pwd:** Caminho atual (`/ > home > usuario > projetos`). Cada segmento é clicável e executa `cd`.

* **Métricas da árvore:** Total de Nós, Altura da Árvore, Grau Máximo e Uso de Memória. Os valores são calculados da árvore e atualizam a cada alteração.

* **Ações rápidas:** Nova Pasta (`mkdir`), Novo Arquivo (`touch`), Buscar Nó (`find`, atalho `Ctrl/Cmd + K`) e Limpar Memória (`rm -rf /*`, com confirmação).

### Painel Esquerdo

* **File Explorer:** Lista hierárquica indentada, com ícones de pasta aberta/fechada e de arquivo. O diretório atual aparece destacado, e clicar em uma pasta executa `cd`.

* **Terminal CLI:** Fonte monoespaçada, histórico de comandos, cursor piscando, histórico com $\uparrow / \downarrow$, autocompletar com `Tab` e limpar com `Ctrl+L`.

### Canvas da Árvore

* Fundo pontilhado (*dot grid*) com zoom (roda do mouse ou botões), arrastar para mover e botão Ajustar.

* Raiz `/` no topo, ligada aos filhos por curvas bézier.

* **Pastas:** Cards azuis/roxos com ícone e contador de filhos.

* **Arquivos:** Cards verdes/cinzas, marcados como nó folha, com o tamanho em KB.

* O ponteiro atual (`cwd`) tem borda com *glow* pulsante, e o caminho da raiz até ele fica destacado.

* Clique para selecionar um nó. Duplo clique em uma pasta executa `cd`.

* Os resultados do `find` ficam destacados em âmbar.

### Inspeção de Nó

Card flutuante com a estrutura interna do nó selecionado:

* ID do ponteiro (copiável)

* Nome

* Tipo (Pasta/Arquivo)

* Ponteiro para o pai (`parent`)

* Lista de ponteiros filhos (`children[]`)

* Os ponteiros do pai e dos filhos são clicáveis para navegar entre os nós.

## Comandos do Terminal

| Comando | Descrição | 
| ----- | ----- | 
| `help` | Lista os comandos | 
| `pwd` | Mostra o diretório atual | 
| `ls [-l] [dir]` | Lista os filhos de um nó | 
| `cd <dir>` | Move o ponteiro atual (`..` sobe, `~` vai para a home) | 
| `mkdir [-p] <nome>` | Cria uma pasta | 
| `touch <nome> [kb]` | Cria um arquivo (nó folha) com tamanho opcional em KB | 
| `rm [-rf] <alvo>` | Remove um nó e sua subárvore (aceita `dir/*`) | 
| `mv <origem> <destino>` | Move ou renomeia um nó (impede ciclos) | 
| `tree [dir]` | Imprime a subárvore | 
| `find <termo>` | Busca nós pelo nome e destaca no canvas | 
| `stat <alvo>` | Inspeciona um nó | 
| `clear` | Limpa o terminal | 

## Modelo de Dados

Cada nó da árvore guarda a seguinte estrutura:

```
interface FsNode {
  id: string          // "ponteiro", ex.: 0x7f3a0208
  name: string
  type: 'dir' | 'file'
  parent: string | null   // ponteiro para o pai (null na raiz)
  children: string[]      // array de ponteiros filhos (vazio nas folhas)
  size: number            // KB (apenas arquivos)
}

```

## Métricas

* **Total de Nós:** Quantidade de nós da árvore, incluindo a raiz.

* **Altura:** Maior profundidade, medida em arestas a partir da raiz.

* **Grau Máximo:** Maior quantidade de filhos de um único nó.

* **Uso de Memória:** Soma dos tamanhos dos arquivos mais $2\text{ KB}$ de overhead por nó.

## Layout do Grafo

O canvas usa um layout por contornos (estilo Reingold–Tilford). Cada subárvore é encaixada ao lado da anterior com a menor distância que evita sobreposição em qualquer profundidade, e o pai fica centralizado sobre os filhos.

## Tecnologias

* React 19 + TypeScript

* Vite 8

* Tailwind CSS v4

* lucide-react (ícones)

* Fontes: Inter e JetBrains Mono (Google Fonts)

## Como Executar

**Requisitos:** Node 22 e pnpm.

```
pnpm install
pnpm dev         # servidor de desenvolvimento
pnpm build       # build de produção em dist/
pnpm preview     # serve o build localmente

```

## Estrutura de Arquivos

```
src/
├── App.tsx                    # estado global e orquestração
├── index.css                  # tema, fontes e animações
├── lib/
│   └── fs.ts                  # árvore N-ária, comandos, métricas, sessão inicial
└── components/
    ├── Header.tsx             # breadcrumb, métricas e ações
    ├── Explorer.tsx           # tree view
    ├── Terminal.tsx           # CLI com cursor, histórico e autocomplete
    ├── TreeCanvas.tsx         # canvas, layout, arestas bezier, zoom/pan
    ├── Inspector.tsx          # card "Inspeção de Nó"
    └── Dialogs.tsx            # criar, buscar e limpar

```

## Estado Inicial de Exemplo

A aplicação abre com 14 nós, altura 4, grau máximo 5 e $128\text{ KB}$. O diretório atual é `/home/usuario/projetos`:

```
/
├── home
│   └── usuario
│       ├── notas.txt
│       └── projetos
│           ├── README.md
│           └── main.c
├── etc
│   └── hosts
├── var
│   └── app.log
├── tmp
│   └── cache.bin
└── usr

```# G03_Arvore_EDA2_2026.2

## Alunos

| Matrícula | Nome |
| --- | --- |
| 241025944 | Ian Pedersoli Barbosa |
| 241012329 | Luiz Henrique Pallavicini |

## memfs — Visualizador de Sistema de Arquivos em Memória (Árvore N-ária)

Dashboard web interativo em Dark Mode, no estilo de uma IDE moderna (VS Code / Vercel), que simula um sistema de arquivos em memória e mostra, em tempo real, a árvore N-ária que o representa. Os comandos digitados no terminal alteram a árvore de verdade, e o canvas, o explorer, as métricas e o inspetor de nó são atualizados em seguida.

## Funcionalidades

### Barra Superior

* **Breadcrumb pwd:** Caminho atual (`/ > home > usuario > projetos`). Cada segmento é clicável e executa `cd`.

* **Métricas da árvore:** Total de Nós, Altura da Árvore, Grau Máximo e Uso de Memória. Os valores são calculados da árvore e atualizam a cada alteração.

* **Ações rápidas:** Nova Pasta (`mkdir`), Novo Arquivo (`touch`), Buscar Nó (`find`, atalho `Ctrl/Cmd + K`) e Limpar Memória (`rm -rf /*`, com confirmação).

### Painel Esquerdo

* **File Explorer:** Lista hierárquica indentada, com ícones de pasta aberta/fechada e de arquivo. O diretório atual aparece destacado, e clicar em uma pasta executa `cd`.

* **Terminal CLI:** Fonte monoespaçada, histórico de comandos, cursor piscando, histórico com $\uparrow / \downarrow$, autocompletar com `Tab` e limpar com `Ctrl+L`.

### Canvas da Árvore

* Fundo pontilhado (*dot grid*) com zoom (roda do mouse ou botões), arrastar para mover e botão Ajustar.

* Raiz `/` no topo, ligada aos filhos por curvas bézier.

* **Pastas:** Cards azuis/roxos com ícone e contador de filhos.

* **Arquivos:** Cards verdes/cinzas, marcados como nó folha, com o tamanho em KB.

* O ponteiro atual (`cwd`) tem borda com *glow* pulsante, e o caminho da raiz até ele fica destacado.

* Clique para selecionar um nó. Duplo clique em uma pasta executa `cd`.

* Os resultados do `find` ficam destacados em âmbar.

### Inspeção de Nó

Card flutuante com a estrutura interna do nó selecionado:

* ID do ponteiro (copiável)

* Nome

* Tipo (Pasta/Arquivo)

* Ponteiro para o pai (`parent`)

* Lista de ponteiros filhos (`children[]`)

* Os ponteiros do pai e dos filhos são clicáveis para navegar entre os nós.

## Comandos do Terminal

| Comando | Descrição | 
| ----- | ----- | 
| `help` | Lista os comandos | 
| `pwd` | Mostra o diretório atual | 
| `ls [-l] [dir]` | Lista os filhos de um nó | 
| `cd <dir>` | Move o ponteiro atual (`..` sobe, `~` vai para a home) | 
| `mkdir [-p] <nome>` | Cria uma pasta | 
| `touch <nome> [kb]` | Cria um arquivo (nó folha) com tamanho opcional em KB | 
| `rm [-rf] <alvo>` | Remove um nó e sua subárvore (aceita `dir/*`) | 
| `mv <origem> <destino>` | Move ou renomeia um nó (impede ciclos) | 
| `tree [dir]` | Imprime a subárvore | 
| `find <termo>` | Busca nós pelo nome e destaca no canvas | 
| `stat <alvo>` | Inspeciona um nó | 
| `clear` | Limpa o terminal | 

## Modelo de Dados

Cada nó da árvore guarda a seguinte estrutura:

```
interface FsNode {
  id: string          // "ponteiro", ex.: 0x7f3a0208
  name: string
  type: 'dir' | 'file'
  parent: string | null   // ponteiro para o pai (null na raiz)
  children: string[]      // array de ponteiros filhos (vazio nas folhas)
  size: number            // KB (apenas arquivos)
}

```

## Métricas

* **Total de Nós:** Quantidade de nós da árvore, incluindo a raiz.

* **Altura:** Maior profundidade, medida em arestas a partir da raiz.

* **Grau Máximo:** Maior quantidade de filhos de um único nó.

* **Uso de Memória:** Soma dos tamanhos dos arquivos mais $2\text{ KB}$ de overhead por nó.

## Layout do Grafo

O canvas usa um layout por contornos (estilo Reingold–Tilford). Cada subárvore é encaixada ao lado da anterior com a menor distância que evita sobreposição em qualquer profundidade, e o pai fica centralizado sobre os filhos.

## Tecnologias

* React 19 + TypeScript

* Vite 8

* Tailwind CSS v4

* lucide-react (ícones)

* Fontes: Inter e JetBrains Mono (Google Fonts)

## Como Executar

**Requisitos:** Node 22 e pnpm.

```
pnpm install
pnpm dev         # servidor de desenvolvimento
pnpm build       # build de produção em dist/
pnpm preview     # serve o build localmente

```

## Estrutura de Arquivos

```
src/
├── App.tsx                    # estado global e orquestração
├── index.css                  # tema, fontes e animações
├── lib/
│   └── fs.ts                  # árvore N-ária, comandos, métricas, sessão inicial
└── components/
    ├── Header.tsx             # breadcrumb, métricas e ações
    ├── Explorer.tsx           # tree view
    ├── Terminal.tsx           # CLI com cursor, histórico e autocomplete
    ├── TreeCanvas.tsx         # canvas, layout, arestas bezier, zoom/pan
    ├── Inspector.tsx          # card "Inspeção de Nó"
    └── Dialogs.tsx            # criar, buscar e limpar

```

## Estado Inicial de Exemplo

A aplicação abre com 14 nós, altura 4, grau máximo 5 e $128\text{ KB}$. O diretório atual é `/home/usuario/projetos`:

```
/
├── home
│   └── usuario
│       ├── notas.txt
│       └── projetos
│           ├── README.md
│           └── main.c
├── etc
│   └── hosts
├── var
│   └── app.log
├── tmp
│   └── cache.bin
└── usr

```