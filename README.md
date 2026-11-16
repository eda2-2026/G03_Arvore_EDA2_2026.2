# G03_Arvore_EDA2_2026.2

## Alunos

| Matrícula | Nome |
| --- | --- |
| 241025944 | Ian Pedersoli Barbosa |
| 241012329 | Luiz Henrique Pallavicini |

## memfs — Visualizador de Sistema de Arquivos em Memória

Aplicação web que simula um sistema de arquivos em memória, combinando uma **hierarquia N-ária de diretórios** com uma **AVL para armazenar as entradas de cada pasta**, ordenadas pelo nome.

Os comandos do terminal modificam o estado do simulador e atualizam o explorador, as visualizações e as métricas. A aplicação não altera arquivos reais do computador.

## Funcionalidades

### Barra Superior

- **Caminho atual:** segmentos clicáveis para navegar entre diretórios.
- **Métricas da hierarquia:** total de nós, altura, grau máximo e estimativa de memória.
- **Ações rápidas:** criar pasta, criar arquivo, buscar e limpar o sistema simulado.

### Painel Esquerdo

- **Explorador de arquivos:** exibe pastas e arquivos e destaca o diretório atual.
- **Terminal:** histórico com `↑/↓`, autocompletar com `Tab` e limpeza com `Ctrl+L`.

### Modos de Visualização

- **Hierarquia de Pastas:** árvore N-ária com zoom, arraste, destaque do caminho atual e inspetor de nós.
- **AVL por Diretório:** mostra a árvore das entradas da pasta escolhida, com filhos esquerdo e direito, altura, fator de balanceamento e registro das rotações do último comando.
- Clique para inspecionar uma entrada; duplo clique em uma pasta para entrar nela.
- Resultados da busca são destacados na visualização correspondente.

Na AVL, as ligações esquerda e direita conectam entradas da mesma pasta; não representam relações entre pastas e subpastas.

## Comandos do Terminal

| Comando | Descrição |
| --- | --- |
| `help` | Lista os comandos |
| `pwd` | Mostra o diretório atual |
| `ls [-l] [dir]` | Lista entradas em ordem pelo nome usando a AVL |
| `cd <dir>` | Navega entre pastas; aceita `..` e `~` |
| `mkdir [-p] <nome>` | Cria uma pasta |
| `touch <nome> [kb]` | Cria um arquivo com tamanho simulado opcional em KB |
| `rm [-rf] <alvo>` | Remove uma entrada e sua subárvore; aceita `dir/*` |
| `mv <origem> <destino>` | Move ou renomeia uma entrada, impedindo ciclos |
| `tree [dir]` | Exibe a hierarquia a partir de um nó |
| `find <termo>` | Busca por parte do nome na hierarquia |
| `stat [alvo]` | Mostra informações do nó e, para diretórios, de sua AVL |
| `clear` | Limpa o terminal |

## Estruturas de Dados

### Nó do Sistema de Arquivos

```ts
interface FsNode {
  id: string
  name: string
  type: 'dir' | 'file'
  parent: string | null
  entries: AvlNode | null
  readonly children: string[]
  size: number
}
```

- `parent`: ID do diretório pai na hierarquia; é `null` na raiz.
- `entries`: raiz da AVL das entradas da pasta; arquivos possuem `null`.
- `children`: propriedade calculada pelo percurso em ordem da AVL, sem armazenar um array paralelo de filhos.
- `size`: tamanho simulado do arquivo em KB.

Os IDs simulam referências e não são endereços reais de memória.

### Nó da AVL

```ts
interface AvlNode {
  readonly key: string
  readonly value: string
  readonly left: AvlNode | null
  readonly right: AvlNode | null
  readonly height: number
}
```

A chave é o nome da entrada, e o valor é seu ID. A comparação distingue maiúsculas e minúsculas.

A árvore vazia tem altura **0**, e uma folha tem altura **1**. O fator de balanceamento é:

```text
FB = altura(esquerda) − altura(direita)
```

As rotações dos casos **LL, RR, LR e RL** mantêm esse fator entre **−1 e 1** em todos os nós após inserções e remoções.

### Aplicação da AVL

- **Busca por nome:** consulta a AVL do diretório.
- **Criação:** insere uma entrada.
- **Exclusão:** remove a entrada e rebalanceia.
- **Movimentação e renomeação:** removem a chave antiga e inserem a nova.
- **Listagem:** utiliza o percurso em ordem.

Busca exata, inserção e remoção na AVL têm custo `O(log n)`, considerando `n` entradas na pasta e o custo das comparações de chaves. Isso não representa o custo total dos comandos, que também envolve cópia do estado e atualização da interface. A busca por substring com `find` percorre a hierarquia.

## Como Executar

É necessário ter **Node.js compatível com o Vite 8** e **pnpm** instalados.

```bash
git clone https://github.com/eda2-2026/G03_Arvore_EDA2_2026.2.git
cd G03_Arvore_EDA2_2026.2
pnpm install
pnpm dev
```

Abra no navegador o endereço informado pelo terminal.

Para verificar os tipos e gerar o build:

```bash
pnpm exec tsc --noEmit
pnpm build
```

Para visualizar o build:

```bash
pnpm preview
```

No PowerShell, caso haja bloqueio de scripts, utilize `pnpm.cmd` no lugar de `pnpm`.

## Verificações Manuais

Foram verificados os quatro casos de rotação na inserção, o rebalanceamento após remoção, a remoção de nó com dois filhos, a renomeação e a movimentação entre diretórios.

Para reproduzir as rotações, execute cada sequência em uma pasta vazia diferente, no terminal da aplicação:

| Caso | Comando | Resultado esperado |
| --- | --- | --- |
| LL | `touch c b a` | Raiz `b`, esquerda `a`, direita `c` |
| RR | `touch a b c` | Raiz `b`, esquerda `a`, direita `c` |
| LR | `touch c a b` | Raiz `b`, esquerda `a`, direita `c` |
| RL | `touch a c b` | Raiz `b`, esquerda `a`, direita `c` |

Confira o registro de rotações imediatamente após cada comando.

## Limitações

- O estado fica em memória e é reiniciado ao recarregar a página.
- Os comandos simulam um subconjunto do comportamento de um terminal Linux.
- A memória exibida é uma estimativa didática, não uma medição do consumo real do navegador.

## Apresentação em Vídeo

[Assista à apresentação do projeto no YouTube](https://youtu.be/11nvbundSYM)
