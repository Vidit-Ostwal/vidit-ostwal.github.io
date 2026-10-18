/**
 * Hero gridworld: a tiny RL-style agent explores a maze, then gets greedier each
 * episode until it walks the shortest path to the goal. Tap a cell to add or
 * remove a wall — the agent re-plans around it. Purely illustrative.
 */

const CELLS_X = 6;
const CELLS_Y = 4;
const W = CELLS_X * 2 + 1; // 13
const H = CELLS_Y * 2 + 1; // 9

type Grid = boolean[][]; // true = wall
const EPSILON = [0.8, 0.55, 0.35, 0.2, 0.1, 0.04, 0];
const STEP_MS = 85;
const STEP_CAP = 260;
const OPTIMAL_RUNS_BEFORE_NEW_MAZE = 3;

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const START = { x: 1, y: 1 };
const GOAL = { x: W - 2, y: H - 2 };

function makeMaze(): Grid {
  const g: Grid = Array.from({ length: H }, () => Array(W).fill(true));
  const seen = new Set<string>();
  const stack: [number, number][] = [[0, 0]];
  seen.add('0,0');
  g[1][1] = false;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][])
      .map(([dx, dy]) => [cx + dx, cy + dy, dx, dy] as const)
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < CELLS_X && ny < CELLS_Y && !seen.has(`${nx},${ny}`));
    if (!options.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = options[Math.floor(Math.random() * options.length)];
    seen.add(`${nx},${ny}`);
    g[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = false;
    g[ny * 2 + 1][nx * 2 + 1] = false;
    stack.push([nx, ny]);
  }
  return g;
}

function distanceField(g: Grid): number[][] {
  const d: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const q: [number, number][] = [[GOAL.x, GOAL.y]];
  d[GOAL.y][GOAL.x] = 0;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || g[ny][nx] || d[ny][nx] !== Infinity) continue;
      d[ny][nx] = d[y][x] + 1;
      q.push([nx, ny]);
    }
  }
  return d;
}

export function initGridworld(canvas: HTMLCanvasElement, hud: HTMLElement | null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let grid = makeMaze();
  let dist = distanceField(grid);
  let visits: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  let pos = { ...START };
  let path: { x: number; y: number }[] = [{ ...START }];
  let bestPath: { x: number; y: number }[] = [];
  let episode = 1;
  let env = 1;
  let optimalRuns = 0;
  let steps = 0;
  let solvedNow = false; // reward only counts once the goal is reached
  let hold = 0; // ms to pause (goal flash)
  let flash = 0;
  let size = 0; // css px per cell
  let colors = readColors();

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      wall: dark ? '#3c3c3c' : '#1f1f1f',
      floor: v('--surface'),
      border: v('--border'),
      violet: v('--text'),   // the agent
      pink: v('--text-3'),   // where it has explored
      mint: '#10a37f',       // the path it learned
      sun: '#f5b301',        // the goal
      eye: v('--bg'),
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = rect.width / W;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(size * H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function shortestPath(): { x: number; y: number }[] {
    const out = [{ ...START }];
    let { x, y } = START;
    while (dist[y][x] > 0 && dist[y][x] !== Infinity) {
      const next = DIRS
        .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
        .filter((n) => n.x >= 0 && n.y >= 0 && n.x < W && n.y < H && !grid[n.y][n.x])
        .sort((a, b) => dist[a.y][a.x] - dist[b.y][b.x])[0];
      if (!next) break;
      x = next.x; y = next.y;
      out.push({ x, y });
    }
    return out;
  }

  function updateHud(note = '') {
    if (!hud) return;
    const reward = solvedNow ? Math.min(1, shortestPath().length / Math.max(path.length, 1)).toFixed(2) : '0.00';
    hud.textContent = note || `env ${env} · episode ${episode} · steps ${steps} · reward ${reward}`;
  }

  function draw() {
    if (!size) return;
    const c = ctx!;
    const w = size * W, h = size * H;
    c.clearRect(0, 0, w, h);
    const r = size * 0.28;

    // floor + exploration heat
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const px = x * size, py = y * size;
        if (grid[y][x]) {
          c.fillStyle = colors.wall;
          c.globalAlpha = 0.9;
          roundRect(c, px + 1, py + 1, size - 2, size - 2, r);
          c.fill();
          c.globalAlpha = 1;
        } else {
          c.fillStyle = colors.floor;
          roundRect(c, px + 1, py + 1, size - 2, size - 2, r);
          c.fill();
          const n = visits[y][x];
          if (n) {
            c.fillStyle = colors.pink;
            c.globalAlpha = Math.min(0.55, 0.12 + n * 0.08);
            roundRect(c, px + 1, py + 1, size - 2, size - 2, r);
            c.fill();
            c.globalAlpha = 1;
          }
        }
      }
    }

    // learned path
    if (bestPath.length > 1 && (reduced || optimalRuns > 0)) {
      c.strokeStyle = colors.mint;
      c.lineWidth = size * 0.26;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.shadowColor = colors.mint;
      c.shadowBlur = size * 0.7;
      c.beginPath();
      bestPath.forEach((p, i) => {
        const px = (p.x + 0.5) * size, py = (p.y + 0.5) * size;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      });
      c.stroke();
      c.shadowBlur = 0;
    }

    // goal
    const gx = (GOAL.x + 0.5) * size, gy = (GOAL.y + 0.5) * size;
    c.fillStyle = colors.sun;
    c.shadowColor = colors.sun;
    c.shadowBlur = size * (0.5 + flash * 1.2);
    star(c, gx, gy, size * (0.42 + flash * 0.25), size * 0.2);
    c.fill();
    c.shadowBlur = 0;

    // agent
    const ax = (pos.x + 0.5) * size, ay = (pos.y + 0.5) * size;
    c.fillStyle = colors.violet;
    c.shadowColor = colors.violet;
    c.shadowBlur = size * 0.6;
    c.beginPath();
    c.arc(ax, ay, size * 0.33, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = colors.eye;
    c.beginPath();
    c.arc(ax + size * 0.1, ay - size * 0.06, size * 0.08, 0, Math.PI * 2);
    c.arc(ax - size * 0.1, ay - size * 0.06, size * 0.08, 0, Math.PI * 2);
    c.fill();
  }

  function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function star(c: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? inner : outer;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
  }

  function step() {
    const eps = EPSILON[Math.min(episode - 1, EPSILON.length - 1)];
    const open = DIRS
      .map(([dx, dy]) => ({ x: pos.x + dx, y: pos.y + dy }))
      .filter((n) => n.x >= 0 && n.y >= 0 && n.x < W && n.y < H && !grid[n.y][n.x]);
    if (!open.length) return;
    let next;
    if (Math.random() < eps) {
      next = open[Math.floor(Math.random() * open.length)];
    } else {
      next = [...open].sort((a, b) => dist[a.y][a.x] - dist[b.y][b.x])[0];
    }
    pos = next;
    steps++;
    path.push({ ...pos });
    visits[pos.y][pos.x]++;

    if (pos.x === GOAL.x && pos.y === GOAL.y) {
      finishEpisode(true);
    } else if (steps >= STEP_CAP) {
      finishEpisode(false);
    }
  }

  function finishEpisode(solved: boolean) {
    solvedNow = solved;
    if (solved) {
      bestPath = shortestPath();
      if (path.length - 1 <= bestPath.length - 1) optimalRuns++;
      flash = 1;
      updateHud(`env ${env} · episode ${episode} solved in ${steps} steps`);
    } else {
      updateHud(`env ${env} · episode ${episode} timed out`);
    }
    hold = 900;
  }

  function nextEpisode() {
    if (optimalRuns >= OPTIMAL_RUNS_BEFORE_NEW_MAZE) {
      env++;
      episode = 1;
      optimalRuns = 0;
      grid = makeMaze();
      dist = distanceField(grid);
      visits = Array.from({ length: H }, () => Array(W).fill(0));
      bestPath = [];
    } else {
      episode++;
    }
    solvedNow = false;
    pos = { ...START };
    path = [{ ...START }];
    steps = 0;
    updateHud();
  }

  // Tap a cell to toggle a wall (only if the goal stays reachable)
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / size);
    const y = Math.floor((e.clientY - rect.top) / size);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if ((x === START.x && y === START.y) || (x === GOAL.x && y === GOAL.y)) return;
    if (x === pos.x && y === pos.y) return;
    grid[y][x] = !grid[y][x];
    const nd = distanceField(grid);
    if (nd[START.y][START.x] === Infinity || nd[pos.y][pos.x] === Infinity) {
      grid[y][x] = !grid[y][x];
      return;
    }
    dist = nd;
    visits = Array.from({ length: H }, () => Array(W).fill(0));
    bestPath = shortestPath();
    optimalRuns = 0;
    episode = 1;
    steps = 0;
    pos = { ...START };
    path = [{ ...START }];
    updateHud('wall moved — re-planning');
    draw();
  });

  new ResizeObserver(resize).observe(canvas);
  new MutationObserver(() => { colors = readColors(); draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (reduced) {
    bestPath = shortestPath();
    pos = { ...GOAL };
    steps = bestPath.length - 1;
    path = bestPath;
    bestPath.forEach((p) => visits[p.y][p.x]++);
    updateHud(`solved in ${steps} steps`);
    resize();
    return;
  }

  updateHud();
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  let last = performance.now();
  let acc = 0;
  function frame(now: number) {
    const dt = Math.min(now - last, 100);
    last = now;
    if (visible && !document.hidden) {
      flash = Math.max(0, flash - dt / 700);
      if (hold > 0) {
        hold -= dt;
        if (hold <= 0) nextEpisode();
      } else {
        acc += dt;
        while (acc >= STEP_MS) {
          acc -= STEP_MS;
          if (hold <= 0) step();
        }
      }
      updateHudLive();
      draw();
    }
    requestAnimationFrame(frame);
  }

  let lastSteps = -1;
  function updateHudLive() {
    if (hold <= 0 && steps !== lastSteps) {
      lastSteps = steps;
      updateHud();
    }
  }

  requestAnimationFrame(frame);
}
