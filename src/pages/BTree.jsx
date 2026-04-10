import React, { useState, useRef, useEffect, useCallback } from 'react'

// ============================================================
// B+ Tree Implementation
// ============================================================
let nextId = 1

function newLeaf() {
  return { keys: [], values: [], isLeaf: true, children: [], next: null, prev: null, id: nextId++ }
}

function newInner() {
  return { keys: [], isLeaf: false, children: [], id: nextId++ }
}

class BPlusTree {
  constructor(order) {
    this.order = order
    this.root = newLeaf()
  }

  findLeaf(key) {
    let path = []
    let node = this.root
    while (!node.isLeaf) {
      let i = node.keys.findIndex(k => key < k)
      if (i === -1) i = node.keys.length
      path.push({ node, childIdx: i })
      node = node.children[i]
    }
    return { leaf: node, path }
  }

  insert(key) {
    const steps = []
    const { leaf, path } = this.findLeaf(key)
    steps.push({ type: 'found-leaf', node: leaf.id, msg: `Found leaf node. Insert ${key} in sorted order.` })

    let idx = leaf.keys.findIndex(k => key <= k)
    if (idx === -1) idx = leaf.keys.length
    if (leaf.keys[idx] === key) {
      steps.push({ type: 'duplicate', msg: `Key ${key} already exists!` })
      return steps
    }
    leaf.keys.splice(idx, 0, key)
    leaf.values.splice(idx, 0, `v${key}`)
    steps.push({ type: 'inserted', node: leaf.id, key, msg: `Inserted ${key} into leaf.` })

    if (leaf.keys.length < this.order) {
      steps.push({ type: 'done', msg: `Leaf has room. Done!` })
      return steps
    }

    this._splitLeaf(leaf, path, steps)
    return steps
  }

  _splitLeaf(leaf, path, steps) {
    const mid = Math.ceil(leaf.keys.length / 2)
    const nl = newLeaf()
    nl.keys = leaf.keys.splice(mid)
    nl.values = leaf.values.splice(mid)
    nl.next = leaf.next
    if (leaf.next) leaf.next.prev = nl
    leaf.next = nl
    nl.prev = leaf

    const pushKey = nl.keys[0]
    steps.push({ type: 'split-leaf', node: leaf.id, newNode: nl.id, pushKey, msg: `Leaf overflow! Split: copy-up key=${pushKey} to parent.` })

    if (path.length === 0) {
      const newRoot = newInner()
      newRoot.keys = [pushKey]
      newRoot.children = [leaf, nl]
      this.root = newRoot
      steps.push({ type: 'new-root', node: newRoot.id, msg: `Tree grew: new root created with key ${pushKey}.` })
    } else {
      const { node: parent, childIdx } = path[path.length - 1]
      parent.keys.splice(childIdx, 0, pushKey)
      parent.children.splice(childIdx + 1, 0, nl)
      steps.push({ type: 'push-to-parent', node: parent.id, key: pushKey, msg: `Pushed ${pushKey} up to parent.` })

      if (parent.keys.length >= this.order) {
        this._splitInner(parent, path.slice(0, -1), steps)
      } else {
        steps.push({ type: 'done', msg: `Parent has room. Done!` })
      }
    }
  }

  _splitInner(node, path, steps) {
    const mid = Math.floor(node.keys.length / 2)
    const pushKey = node.keys[mid]
    const ni = newInner()
    ni.keys = node.keys.splice(mid + 1)
    node.keys.splice(mid)
    ni.children = node.children.splice(mid + 1)

    steps.push({ type: 'split-inner', node: node.id, newNode: ni.id, pushKey, msg: `Inner node overflow! Split: push-up key=${pushKey}.` })

    if (path.length === 0) {
      const newRoot = newInner()
      newRoot.keys = [pushKey]
      newRoot.children = [node, ni]
      this.root = newRoot
      steps.push({ type: 'new-root', node: newRoot.id, msg: `Tree grew taller: new root with key ${pushKey}.` })
    } else {
      const { node: parent, childIdx } = path[path.length - 1]
      parent.keys.splice(childIdx, 0, pushKey)
      parent.children.splice(childIdx + 1, 0, ni)
      steps.push({ type: 'push-to-parent', node: parent.id, key: pushKey, msg: `Pushed ${pushKey} up to grandparent.` })
      if (parent.keys.length >= this.order) {
        this._splitInner(parent, path.slice(0, -1), steps)
      } else {
        steps.push({ type: 'done', msg: `Done inserting.` })
      }
    }
  }

  delete(key) {
    const steps = []
    const { leaf, path } = this.findLeaf(key)
    const idx = leaf.keys.indexOf(key)
    if (idx === -1) {
      steps.push({ type: 'not-found', msg: `Key ${key} not found.` })
      return steps
    }
    steps.push({ type: 'found-leaf', node: leaf.id, msg: `Found key ${key} in leaf. Removing...` })
    leaf.keys.splice(idx, 1)
    leaf.values.splice(idx, 1)
    steps.push({ type: 'deleted', node: leaf.id, msg: `Removed ${key} from leaf.` })

    const minKeys = Math.ceil((this.order - 1) / 2)
    if (path.length === 0 || leaf.keys.length >= minKeys) {
      steps.push({ type: 'done', msg: `Leaf still has enough keys (≥${minKeys}). Done!` })
      return steps
    }

    this._fixLeaf(leaf, path, steps, minKeys)
    return steps
  }

  _fixLeaf(leaf, path, steps, minKeys) {
    const { node: parent, childIdx } = path[path.length - 1]

    if (childIdx > 0) {
      const leftSib = parent.children[childIdx - 1]
      if (leftSib.keys.length > minKeys) {
        leaf.keys.unshift(leftSib.keys.pop())
        leaf.values.unshift(leftSib.values.pop())
        parent.keys[childIdx - 1] = leaf.keys[0]
        steps.push({ type: 'redistribute', node: leaf.id, sibling: leftSib.id, msg: `Redistributed from left sibling. Updated separator key.` })
        steps.push({ type: 'done', msg: `Done.` })
        return
      }
    }

    if (childIdx < parent.children.length - 1) {
      const rightSib = parent.children[childIdx + 1]
      if (rightSib.keys.length > minKeys) {
        leaf.keys.push(rightSib.keys.shift())
        leaf.values.push(rightSib.values.shift())
        parent.keys[childIdx] = rightSib.keys[0]
        steps.push({ type: 'redistribute', node: leaf.id, sibling: rightSib.id, msg: `Redistributed from right sibling. Updated separator key.` })
        steps.push({ type: 'done', msg: `Done.` })
        return
      }
    }

    if (childIdx > 0) {
      const leftSib = parent.children[childIdx - 1]
      leftSib.keys = leftSib.keys.concat(leaf.keys)
      leftSib.values = leftSib.values.concat(leaf.values)
      leftSib.next = leaf.next
      if (leaf.next) leaf.next.prev = leftSib
      parent.keys.splice(childIdx - 1, 1)
      parent.children.splice(childIdx, 1)
      steps.push({ type: 'merge', node: leaf.id, sibling: leftSib.id, msg: `Merged leaf into left sibling. Removed separator from parent.` })
    } else {
      const rightSib = parent.children[childIdx + 1]
      leaf.keys = leaf.keys.concat(rightSib.keys)
      leaf.values = leaf.values.concat(rightSib.values)
      leaf.next = rightSib.next
      if (rightSib.next) rightSib.next.prev = leaf
      parent.keys.splice(childIdx, 1)
      parent.children.splice(childIdx + 1, 1)
      steps.push({ type: 'merge', node: leaf.id, sibling: rightSib.id, msg: `Merged right sibling into leaf. Removed separator from parent.` })
    }

    if (path.length === 1) {
      if (parent.keys.length === 0) {
        this.root = parent.children[0]
        steps.push({ type: 'shrink', msg: `Tree shrank: parent became empty, its child is now root.` })
      } else {
        steps.push({ type: 'done', msg: `Done.` })
      }
      return
    }

    if (parent.keys.length >= minKeys) {
      steps.push({ type: 'done', msg: `Done.` })
      return
    }

    this._fixInner(parent, path.slice(0, -1), steps, minKeys)
  }

  _fixInner(node, path, steps, minKeys) {
    if (path.length === 0) {
      if (node.keys.length === 0) {
        this.root = node.children[0]
        steps.push({ type: 'shrink', msg: `Tree shrank: root is now the single child.` })
      } else {
        steps.push({ type: 'done', msg: `Done.` })
      }
      return
    }

    const { node: parent, childIdx } = path[path.length - 1]

    if (childIdx > 0) {
      const leftSib = parent.children[childIdx - 1]
      if (leftSib.keys.length > minKeys) {
        node.keys.unshift(parent.keys[childIdx - 1])
        node.children.unshift(leftSib.children.pop())
        parent.keys[childIdx - 1] = leftSib.keys.pop()
        steps.push({ type: 'redistribute', node: node.id, sibling: leftSib.id, msg: `Redistributed inner node keys from left sibling.` })
        steps.push({ type: 'done', msg: `Done.` })
        return
      }
    }

    if (childIdx < parent.children.length - 1) {
      const rightSib = parent.children[childIdx + 1]
      if (rightSib.keys.length > minKeys) {
        node.keys.push(parent.keys[childIdx])
        node.children.push(rightSib.children.shift())
        parent.keys[childIdx] = rightSib.keys.shift()
        steps.push({ type: 'redistribute', node: node.id, sibling: rightSib.id, msg: `Redistributed inner node keys from right sibling.` })
        steps.push({ type: 'done', msg: `Done.` })
        return
      }
    }

    if (childIdx > 0) {
      const leftSib = parent.children[childIdx - 1]
      leftSib.keys.push(parent.keys[childIdx - 1])
      leftSib.keys = leftSib.keys.concat(node.keys)
      leftSib.children = leftSib.children.concat(node.children)
      parent.keys.splice(childIdx - 1, 1)
      parent.children.splice(childIdx, 1)
      steps.push({ type: 'merge', node: node.id, sibling: leftSib.id, msg: `Merged inner node into left sibling.` })
    } else {
      const rightSib = parent.children[childIdx + 1]
      node.keys.push(parent.keys[childIdx])
      node.keys = node.keys.concat(rightSib.keys)
      node.children = node.children.concat(rightSib.children)
      parent.keys.splice(childIdx, 1)
      parent.children.splice(childIdx + 1, 1)
      steps.push({ type: 'merge', node: node.id, sibling: rightSib.id, msg: `Merged right sibling into inner node.` })
    }

    if (path.length === 1 && parent.keys.length === 0) {
      this.root = parent.children[0]
      steps.push({ type: 'shrink', msg: `Tree shrank: parent became empty.` })
      return
    }

    if (parent.keys.length >= minKeys) {
      steps.push({ type: 'done', msg: `Done.` })
      return
    }

    this._fixInner(parent, path.slice(0, -1), steps, minKeys)
  }

  search(key) {
    const steps = []
    let node = this.root
    steps.push({ type: 'visit', node: node.id, msg: `Start at root.` })

    while (!node.isLeaf) {
      let i = node.keys.findIndex(k => key < k)
      if (i === -1) i = node.keys.length
      steps.push({ type: 'route', node: node.id, childIdx: i, msg: `Key ${key} < ${node.keys[i] ?? '∞'}: go to child ${i}.` })
      node = node.children[i]
      steps.push({ type: 'visit', node: node.id, msg: `Visiting node.` })
    }

    const idx = node.keys.indexOf(key)
    if (idx !== -1) {
      steps.push({ type: 'found', node: node.id, keyIdx: idx, msg: `✓ Found key ${key} at index ${idx} in leaf!` })
    } else {
      steps.push({ type: 'not-found', node: node.id, msg: `✗ Key ${key} not found in leaf.` })
    }
    return steps
  }

  height() {
    let h = 0, n = this.root
    while (!n.isLeaf) { h++; n = n.children[0] }
    return h
  }

  countKeys() {
    let count = 0
    let n = this.root
    while (!n.isLeaf) n = n.children[0]
    while (n) { count += n.keys.length; n = n.next }
    return count
  }
}

// ============================================================
// Renderer
// ============================================================
const NODE_W = 50, NODE_H = 36, NODE_PAD = 6, V_GAP = 80, H_GAP = 20

function layoutTree(root) {
  const positions = new Map()
  let nextX = [0]

  function layout(node, depth) {
    if (node.isLeaf) {
      const w = Math.max(1, node.keys.length) * NODE_W + NODE_PAD * 2
      const x = nextX[0]
      nextX[0] += w + H_GAP
      positions.set(node.id, { x, y: depth * (NODE_H + V_GAP), w, h: NODE_H, node })
      return x + w / 2
    } else {
      const childCenters = node.children.map(c => layout(c, depth + 1))
      const cx = (childCenters[0] + childCenters[childCenters.length - 1]) / 2
      const w = (node.keys.length + 1) * NODE_W + NODE_PAD * 2
      positions.set(node.id, { x: cx - w / 2, y: depth * (NODE_H + V_GAP), w, h: NODE_H, node })
      return cx
    }
  }

  layout(root, 0)
  return positions
}

function buildSVG(tree, highlightIds, errorIds, successIds) {
  const positions = layoutTree(tree.root)

  let minX = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [, pos] of positions) {
    minX = Math.min(minX, pos.x)
    maxX = Math.max(maxX, pos.x + pos.w)
    maxY = Math.max(maxY, pos.y + pos.h)
  }

  const PAD = 40
  const W = maxX - minX + PAD * 2
  const H = maxY + PAD * 2

  const viewBox = `${minX - PAD} ${-PAD} ${W} ${H + PAD}`
  const svgH = Math.max(400, H + PAD)

  let html = '<defs><marker id="arrow-sib" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#43d9ad" opacity="0.6"/></marker></defs>'

  for (const [id, pos] of positions) {
    if (!pos.node.isLeaf) {
      const parent = pos.node
      parent.children.forEach((child, i) => {
        const childPos = positions.get(child.id)
        if (!childPos) return
        const slotW = NODE_W
        const parentX = pos.x + NODE_PAD + i * slotW + slotW / 2
        const parentY = pos.y + NODE_H
        const childCX = childPos.x + childPos.w / 2
        const childY = childPos.y
        html += `<path class="edge" d="M${parentX},${parentY} C${parentX},${parentY + V_GAP * 0.4} ${childCX},${childY - V_GAP * 0.4} ${childCX},${childY}"/>`
      })
    }
    if (pos.node.isLeaf && pos.node.next) {
      const nextPos = positions.get(pos.node.next.id)
      if (nextPos) {
        const x1 = pos.x + pos.w, y1 = pos.y + NODE_H / 2
        const x2 = nextPos.x, y2 = nextPos.y + NODE_H / 2
        html += `<line class="sibling-edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrow-sib)"/>`
      }
    }
  }

  for (const [id, pos] of positions) {
    const node = pos.node
    const isHL = highlightIds.has(id)
    const isErr = errorIds.has(id)
    const isOk = successIds.has(id)

    if (node.isLeaf) {
      const fill = isHL ? '#3d3000' : isErr ? '#3d0014' : isOk ? '#0d3320' : '#1e2d3d'
      const stroke = isHL ? '#ffd166' : isErr ? '#ff6584' : isOk ? '#43d9ad' : '#43d9ad'
      const strokeW = (isHL || isErr || isOk) ? 2.5 : 1.5
      html += `<rect class="node-rect" x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>`
      node.keys.forEach((k, i) => {
        const kx = pos.x + NODE_PAD + i * NODE_W
        if (i > 0) html += `<line x1="${kx}" y1="${pos.y + 4}" x2="${kx}" y2="${pos.y + NODE_H - 4}" stroke="${stroke}" stroke-width="0.5" opacity="0.4"/>`
        html += `<text class="node-text" x="${kx + NODE_W / 2}" y="${pos.y + NODE_H / 2 + 5}" text-anchor="middle" fill="${isHL ? '#ffd166' : '#e2e8f0'}">${k}</text>`
      })
      if (node.keys.length === 0) {
        html += `<text class="node-text" x="${pos.x + pos.w / 2}" y="${pos.y + NODE_H / 2 + 5}" text-anchor="middle" fill="#555" font-style="italic">empty</text>`
      }
    } else {
      const fill = isHL ? '#2a1f40' : isErr ? '#3d0014' : '#252842'
      const stroke = isHL ? '#ffd166' : isErr ? '#ff6584' : '#6c63ff'
      const strokeW = (isHL || isErr) ? 2.5 : 1.5
      const slotW = NODE_W
      html += `<rect class="node-rect" x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>`
      for (let i = 0; i <= node.keys.length; i++) {
        const px = pos.x + NODE_PAD + i * slotW
        if (i < node.keys.length) {
          const kx = px + slotW
          html += `<line x1="${kx}" y1="${pos.y + 4}" x2="${kx}" y2="${pos.y + NODE_H - 4}" stroke="${stroke}" stroke-width="0.5" opacity="0.3"/>`
          html += `<text class="node-text" x="${px + slotW + slotW / 2}" y="${pos.y + NODE_H / 2 + 5}" text-anchor="middle" fill="${isHL ? '#ffd166' : '#e2e8f0'}">${node.keys[i]}</text>`
        }
      }
    }
    html += `<text x="${pos.x + 3}" y="${pos.y - 4}" font-size="8" fill="#444" font-family="monospace">#${id}</text>`
  }

  return { html, viewBox, svgH }
}

export default function BTree() {
  const [order, setOrder] = useState(4)
  const [insertVal, setInsertVal] = useState('')
  const [deleteVal, setDeleteVal] = useState('')
  const [searchVal, setSearchVal] = useState('')
  const [explanation, setExplanation] = useState({ msg: 'Insert keys to build the tree. When a node exceeds order-1 keys, it splits.', type: '' })
  const [stats, setStats] = useState({ order: 4, height: 0, keys: 0 })
  const [svgData, setSvgData] = useState({ html: '', viewBox: '0 0 400 400', svgH: 400 })
  const [steps, setSteps] = useState([])
  const [stepIdx, setStepIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)

  const treeRef = useRef(null)
  const playTimerRef = useRef(null)

  const initTree = useCallback((ord) => {
    nextId = 1
    treeRef.current = new BPlusTree(ord)
    updateRender(treeRef.current, new Set(), new Set(), new Set())
    setExplanation({ msg: 'Tree reset. Insert keys to begin.', type: '' })
    setSteps([])
    setStepIdx(-1)
    setStats({ order: ord, height: 0, keys: 0 })
  }, [])

  useEffect(() => {
    initTree(order)
  }, []) // eslint-disable-line

  function updateRender(tree, hl, err, ok) {
    const data = buildSVG(tree, hl, err, ok)
    setSvgData(data)
    setStats({ order: tree.order, height: tree.height(), keys: tree.countKeys() })
  }

  function applyStep(step, tree) {
    const hl = new Set(), err = new Set(), ok = new Set()
    if (step.node) {
      if (['not-found','duplicate','split-leaf','split-inner','merge'].includes(step.type)) err.add(step.node)
      else if (['found','done','inserted','deleted'].includes(step.type)) ok.add(step.node)
      else hl.add(step.node)
    }
    if (step.sibling) hl.add(step.sibling)
    if (step.newNode) ok.add(step.newNode)

    const typeClass = ['not-found','duplicate'].includes(step.type) ? 'danger' :
                      ['done','found'].includes(step.type) ? 'success' :
                      ['split-leaf','split-inner','merge'].includes(step.type) ? 'warning' : ''
    setExplanation({ msg: step.msg, type: typeClass })
    updateRender(tree, hl, err, ok)
  }

  function doInsert() {
    const val = parseInt(insertVal)
    if (isNaN(val)) return
    const newSteps = treeRef.current.insert(val)
    setSteps(newSteps)
    setStepIdx(0)
    applyStep(newSteps[0], treeRef.current)
    setInsertVal('')
  }

  function doDelete() {
    const val = parseInt(deleteVal)
    if (isNaN(val)) return
    const newSteps = treeRef.current.delete(val)
    setSteps(newSteps)
    setStepIdx(0)
    applyStep(newSteps[0], treeRef.current)
    setDeleteVal('')
  }

  function doSearch() {
    const val = parseInt(searchVal)
    if (isNaN(val)) return
    const newSteps = treeRef.current.search(val)
    setSteps(newSteps)
    setStepIdx(0)
    applyStep(newSteps[0], treeRef.current)
  }

  function prevStep() {
    if (stepIdx > 0) {
      const ni = stepIdx - 1
      setStepIdx(ni)
      applyStep(steps[ni], treeRef.current)
    }
  }

  function nextStep() {
    if (stepIdx < steps.length - 1) {
      const ni = stepIdx + 1
      setStepIdx(ni)
      applyStep(steps[ni], treeRef.current)
    }
  }

  function togglePlay() {
    if (playing) {
      clearInterval(playTimerRef.current)
      setPlaying(false)
    } else {
      setPlaying(true)
      playTimerRef.current = setInterval(() => {
        setStepIdx(prev => {
          if (prev < steps.length - 1) {
            const ni = prev + 1
            applyStep(steps[ni], treeRef.current)
            return ni
          } else {
            clearInterval(playTimerRef.current)
            setPlaying(false)
            return prev
          }
        })
      }, 900)
    }
  }

  function bulkInsert(keys) {
    nextId = 1
    treeRef.current = new BPlusTree(order)
    for (const k of keys) treeRef.current.insert(k)
    updateRender(treeRef.current, new Set(), new Set(), new Set())
    setExplanation({ msg: `Inserted ${keys.length} keys. Tree is balanced at height ${treeRef.current.height()}.`, type: 'success' })
    setSteps([])
    setStepIdx(-1)
  }

  function randomInsert(n) {
    const keys = Array.from({ length: n }, () => Math.floor(Math.random() * 99) + 1)
    bulkInsert(keys)
  }

  function handleOrderChange(e) {
    const o = parseInt(e.target.value)
    setOrder(o)
    nextId = 1
    treeRef.current = new BPlusTree(o)
    updateRender(treeRef.current, new Set(), new Set(), new Set())
    setExplanation({ msg: 'Tree reset. Insert keys to begin.', type: '' })
    setSteps([])
    setStepIdx(-1)
    setStats({ order: o, height: 0, keys: 0 })
  }

  const hasPrev = stepIdx > 0
  const hasNext = stepIdx < steps.length - 1

  return (
    <>
      <style>{`
        .tree-svg { width: 100%; min-height: 500px; display: block; }
        .node-rect { transition: all 0.3s; }
        .node-text { font-size: 13px; font-family: var(--mono); font-weight: 600; }
        .edge { stroke: var(--border); stroke-width: 1.5; fill: none; }
        .sibling-edge { stroke: var(--accent3); stroke-width: 1; stroke-dasharray: 4 3; fill: none; }
      `}</style>
      <div className="page">
        <div className="page-header">
          <div className="page-title">B+ Tree</div>
          <div className="page-desc">A self-balancing ordered tree where all data lives in leaf nodes linked together. Inner nodes hold separator keys for routing.</div>
        </div>

        <div className="two-col">
          <div>
            <div className="viz-area">
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="legend">
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#252842', border: '2px solid #6c63ff' }}></div> Inner Node</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#1e2d3d', border: '2px solid #43d9ad' }}></div> Leaf Node</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#ffd166', border: '2px solid #ffd166' }}></div> Highlighted</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#ff6584', border: '2px solid #ff6584' }}></div> Split/Merge</div>
                </div>
                <div className="stats">
                  <div className="stat"><div className="stat-val">{stats.order}</div><div className="stat-lbl">Order</div></div>
                  <div className="stat"><div className="stat-val">{stats.height}</div><div className="stat-lbl">Height</div></div>
                  <div className="stat"><div className="stat-val">{stats.keys}</div><div className="stat-lbl">Keys</div></div>
                </div>
              </div>
              <div className="viz-canvas">
                <svg
                  className="tree-svg"
                  viewBox={svgData.viewBox}
                  height={svgData.svgH}
                  dangerouslySetInnerHTML={{ __html: svgData.html }}
                />
              </div>
              <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
                <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
              </div>
            </div>

            {steps.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div className="step-controls">
                  <button className="btn btn-ghost btn-sm" onClick={prevStep} disabled={!hasPrev}>← Prev</button>
                  <div className="step-info">{stepIdx >= 0 ? `Step ${stepIdx + 1} / ${steps.length}` : 'No operation in progress'}</div>
                  <button className="btn btn-ghost btn-sm" onClick={nextStep} disabled={!hasNext}>Next →</button>
                  <button className="btn btn-primary btn-sm" onClick={togglePlay}>{playing ? '⏸ Pause' : '▶ Play'}</button>
                </div>
              </div>
            )}
          </div>

          <div className="controls">
            <div className="card">
              <div className="card-title">Configuration</div>
              <div className="input-row">
                <label>Order (m)</label>
                <select value={order} onChange={handleOrderChange} style={{ flex: 1 }}>
                  <option value="3">3 (min 1, max 2 keys)</option>
                  <option value="4">4 (min 1, max 3 keys)</option>
                  <option value="5">5 (min 2, max 4 keys)</option>
                  <option value="6">6 (min 2, max 5 keys)</option>
                </select>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => { nextId = 1; treeRef.current = new BPlusTree(order); updateRender(treeRef.current, new Set(), new Set(), new Set()); setExplanation({ msg: 'Tree reset. Insert keys to begin.', type: '' }); setSteps([]); setStepIdx(-1); }}>Reset Tree</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Insert Key</div>
              <div className="input-row">
                <input type="number" value={insertVal} onChange={e => setInsertVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && doInsert()} placeholder="e.g. 42" min="1" max="999" />
                <button className="btn btn-primary" onClick={doInsert}>Insert</button>
              </div>
              <div className="btn-group" style={{ marginTop: '0.75rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => bulkInsert([3,7,12,1,5,10,15,20,25,30])}>Demo: 10 keys</button>
                <button className="btn btn-ghost btn-sm" onClick={() => randomInsert(8)}>Random 8</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Delete Key</div>
              <div className="input-row">
                <input type="number" value={deleteVal} onChange={e => setDeleteVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && doDelete()} placeholder="key to delete" min="1" max="999" />
                <button className="btn btn-danger" onClick={doDelete}>Delete</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Search</div>
              <div className="input-row">
                <input type="number" value={searchVal} onChange={e => setSearchVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="key to find" min="1" max="999" />
                <button className="btn btn-success" onClick={doSearch}>Search</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Algorithm Reference</div>
              <div className="algo-steps">
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: '1.8' }}>
                  <b style={{ color: 'var(--accent)' }}>INSERT:</b><br />
                  1. Find correct leaf node L<br />
                  2. Insert key in sorted order<br />
                  3. If L has space → done<br />
                  4. Else split L into L and L2<br />
                  &nbsp;&nbsp;&nbsp;→ Copy up middle key to parent<br />
                  &nbsp;&nbsp;&nbsp;→ Repeat upward if parent full<br /><br />
                  <b style={{ color: 'var(--danger)' }}>DELETE:</b><br />
                  1. Find leaf L with entry<br />
                  2. Remove entry<br />
                  3. If L ≥ half-full → done<br />
                  4. Try redistribute from sibling<br />
                  5. Else merge L with sibling<br />
                  &nbsp;&nbsp;&nbsp;→ Delete separator from parent<br /><br />
                  <b style={{ color: 'var(--success)' }}>SEARCH:</b><br />
                  1. Start at root<br />
                  2. At each inner node: find correct child pointer<br />
                  3. Follow until leaf<br />
                  4. Scan leaf for key
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
