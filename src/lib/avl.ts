export interface AvlNode {
  readonly key: string
  readonly value: string
  readonly left: AvlNode | null
  readonly right: AvlNode | null
  readonly height: number
}

export interface RotationEvent {
  kind: 'LL' | 'RR' | 'LR' | 'RL'
  pivot: string
  newRoot: string
}

// Comparação exata e sensível a maiúsculas.
// O mesmo comparador é usado em todas as operações.
export function compareKeys(a: string, b: string): number {
  return a === b ? 0 : a < b ? -1 : 1
}

// Convenção: árvore vazia tem altura 0; folha tem altura 1.
export function avlHeight(root: AvlNode | null): number {
  return root?.height ?? 0
}

export function balanceFactor(root: AvlNode | null): number {
  return root
    ? avlHeight(root.left) - avlHeight(root.right)
    : 0
}

function makeNode(
  key: string,
  value: string,
  left: AvlNode | null,
  right: AvlNode | null,
): AvlNode {
  return {
    key,
    value,
    left,
    right,
    height: 1 + Math.max(avlHeight(left), avlHeight(right)),
  }
}

function rotateRight(root: AvlNode): AvlNode {
  const pivot = root.left!

  const newRight = makeNode(
    root.key,
    root.value,
    pivot.right,
    root.right,
  )

  return makeNode(
    pivot.key,
    pivot.value,
    pivot.left,
    newRight,
  )
}

function rotateLeft(root: AvlNode): AvlNode {
  const pivot = root.right!

  const newLeft = makeNode(
    root.key,
    root.value,
    root.left,
    pivot.left,
  )

  return makeNode(
    pivot.key,
    pivot.value,
    newLeft,
    pivot.right,
  )
}

function rebalance(
  root: AvlNode,
  events: RotationEvent[],
): AvlNode {
  const factor = balanceFactor(root)

  let result = root
  let kind: RotationEvent['kind'] | null = null

  if (factor > 1) {
    if (balanceFactor(root.left) < 0) {
      kind = 'LR'

      result = rotateRight(
        makeNode(
          root.key,
          root.value,
          rotateLeft(root.left!),
          root.right,
        ),
      )
    } else {
      kind = 'LL'
      result = rotateRight(root)
    }
  } else if (factor < -1) {
    if (balanceFactor(root.right) > 0) {
      kind = 'RL'

      result = rotateLeft(
        makeNode(
          root.key,
          root.value,
          root.left,
          rotateRight(root.right!),
        ),
      )
    } else {
      kind = 'RR'
      result = rotateLeft(root)
    }
  }

  if (kind) {
    events.push({
      kind,
      pivot: root.key,
      newRoot: result.key,
    })
  }

  return result
}

export function avlSearch(
  root: AvlNode | null,
  key: string,
): AvlNode | null {
  let current = root

  while (current) {
    const comparison = compareKeys(key, current.key)

    if (comparison === 0) return current

    current =
      comparison < 0
        ? current.left
        : current.right
  }

  return null
}

export function avlInsert(
  root: AvlNode | null,
  key: string,
  value: string,
  events: RotationEvent[] = [],
): AvlNode {
  if (!root) {
    return makeNode(key, value, null, null)
  }

  const comparison = compareKeys(key, root.key)

  if (comparison === 0) {
    if (root.value !== value) {
      throw new Error(`Chave duplicada na AVL: ${key}`)
    }

    return root
  }

  const updated =
    comparison < 0
      ? makeNode(
          root.key,
          root.value,
          avlInsert(root.left, key, value, events),
          root.right,
        )
      : makeNode(
          root.key,
          root.value,
          root.left,
          avlInsert(root.right, key, value, events),
        )

  return rebalance(updated, events)
}

export function avlRemove(
  root: AvlNode | null,
  key: string,
  events: RotationEvent[] = [],
): AvlNode | null {
  if (!root) return null

  const comparison = compareKeys(key, root.key)
  let updated: AvlNode

  if (comparison < 0) {
    updated = makeNode(
      root.key,
      root.value,
      avlRemove(root.left, key, events),
      root.right,
    )
  } else if (comparison > 0) {
    updated = makeNode(
      root.key,
      root.value,
      root.left,
      avlRemove(root.right, key, events),
    )
  } else {
    // Nó sem filho esquerdo: promove o filho direito.
    if (!root.left) return root.right

    // Nó sem filho direito: promove o filho esquerdo.
    if (!root.right) return root.left

    // Dois filhos: utiliza o sucessor em ordem.
    let successor = root.right

    while (successor.left) {
      successor = successor.left
    }

    updated = makeNode(
      successor.key,
      successor.value,
      root.left,
      avlRemove(root.right, successor.key, events),
    )
  }

  // A remoção pode exigir rotações em vários ancestrais.
  return rebalance(updated, events)
}

export function avlInOrder(root: AvlNode | null): AvlNode[] {
  const result: AvlNode[] = []

  function visit(current: AvlNode | null): void {
    if (!current) return

    visit(current.left)
    result.push(current)
    visit(current.right)
  }

  visit(root)
  return result
}