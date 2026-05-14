/* =====================================================================
   CPUify — CPU Scheduling Simulator

   Algorithms implemented:
     1. FCFS          — First-Come, First-Served (Non-Preemptive)
     2. SJF           — Shortest Job First (Non-Preemptive)
     3. SRT           — Shortest Remaining Time (Preemptive)
     4. RR            — Round Robin (Preemptive)
     5. Priority      — Priority Scheduling (Non-Preemptive)
     6. Priority + RR — Priority with Round Robin (Preemptive)
   ===================================================================== */


/* ═══════════════════════════════════════════════════════════════════════
   1. CONSTANTS & GLOBAL STATE
   ═══════════════════════════════════════════════════════════════════════ */
const COLORS = [
  '#1DB954', '#3D9BE9', '#E91E8C', '#FF6D00',
  '#A259FF', '#FFB800', '#00BCD4', '#FF5252',
  '#69F0AE', '#FFEB3B'
];

const ALGOS = {
  fcfs: { name: 'First-Come, First-Served', short: 'FCFS', type: 'Non-Preemptive', icon: '⏱', quantum: false, priority: false },
  sjf: { name: 'Shortest Job First', short: 'SJF', type: 'Non-Preemptive', icon: '⚡', quantum: false, priority: false },
  srt: { name: 'Shortest Remaining Time', short: 'SRT', type: 'Preemptive', icon: '🔄', quantum: false, priority: false },
  rr: { name: 'Round Robin', short: 'RR', type: 'Preemptive', icon: '🔁', quantum: true, priority: false },
  priority: { name: 'Priority Scheduling', short: 'Priority', type: 'Non-Preemptive', icon: '🏆', quantum: false, priority: true },
  priority_preemptive: { name: 'Priority Scheduling', short: 'Priority', type: 'Preemptive', icon: '🏆', quantum: false, priority: true },
  priority_rr: { name: 'Priority + Round Robin', short: 'Priority + RR', type: 'Preemptive', icon: '🎯', quantum: true, priority: true },
};

let currentAlgo = 'fcfs';
let processCount = 0;

let processRows = [];


/* ═══════════════════════════════════════════════════════════════════════
   2. DOM REFERENCES
   Cache frequently accessed elements once at load time to avoid
   repeated and expensive querySelector / getElementById calls.
   ═══════════════════════════════════════════════════════════════════════ */

const tbody = document.getElementById('process-tbody');        // <tbody> of the process input table
const outputPanel = document.getElementById('output-panel');         // results section (hidden until first run)
const emptyState = document.getElementById('empty-state');          // placeholder shown before first run
const ganttChart = document.getElementById('gantt-chart');          // container for Gantt block divs
const ganttTimeline = document.getElementById('gantt-timeline');       // container for Gantt tick-mark divs
const resultTbody = document.getElementById('result-tbody');         // <tbody> of the results summary table
const statsRow = document.getElementById('stats-row');            // row of average stat cards
const quantumGroup = document.getElementById('quantum-group');        // Time Quantum field wrapper (RR / Priority+RR)
const priorityGroup = document.getElementById('priority-order-group'); // Priority order dropdown wrapper
const quantumInput = document.getElementById('quantum');              // numeric input for time quantum value
const priorityOrder = document.getElementById('priority-order');       // dropdown: "lower" or "higher" value = higher priority
const colPriority = document.querySelector('.col-priority');         // <th> for the Priority column
const algoTitle = document.getElementById('algo-title');           // <h1> displaying the current algorithm name
const algoBadge = document.getElementById('algo-badge');           // badge showing Preemptive / Non-Preemptive


/* ═══════════════════════════════════════════════════════════════════════
   3. EVENT BINDING
   All interactive elements are wired up here on page load.
   ═══════════════════════════════════════════════════════════════════════ */

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (item.id === 'nav-priority-parent') return; // handled by priority sub-tab logic
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    currentAlgo = item.dataset.algo;
    closePrioritySubtabs();
    switchAlgo();
    hideOutput();
  });
});

// Bind the three action buttons to their handler functions
document.getElementById('btn-add-process').addEventListener('click', addProcessRow);
document.getElementById('btn-run').addEventListener('click', runSimulation);
document.getElementById('btn-reset').addEventListener('click', resetAll);

/* ═══════════════════════════════════════════════════════════════════════
   3b. PRIORITY SUB-TAB LOGIC
   Handles the Non-Preemptive / Preemptive toggle inside the Priority item.
   ═══════════════════════════════════════════════════════════════════════ */

const priorityParent = document.getElementById('nav-priority-parent');
const prioritySubtabs = document.getElementById('priority-subtabs');
const PRIORITY_ALGOS = ['priority', 'priority_preemptive'];

function openPrioritySubtabs() {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  priorityParent.classList.add('active');
  prioritySubtabs.classList.add('open');
}

function closePrioritySubtabs() {
  prioritySubtabs.classList.remove('open');
}

priorityParent.addEventListener('click', () => {
  openPrioritySubtabs();
  // Re-activate whichever sub-tab was last selected
  const lastSubtab = prioritySubtabs.querySelector('.nav-subtab.active');
  if (lastSubtab) {
    currentAlgo = lastSubtab.dataset.algo;
  } else {
    currentAlgo = 'priority';
    document.getElementById('subtab-priority').classList.add('active');
  }
  switchAlgo();
  hideOutput();
});

// Sub-tab clicks select Non-Preemptive or Preemptive variant
document.querySelectorAll('.nav-subtab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    e.stopPropagation(); // don't bubble to parent nav-item
    document.querySelectorAll('.nav-subtab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentAlgo = tab.dataset.algo;
    openPrioritySubtabs();
    switchAlgo();
    hideOutput();
  });
});



/* ═══════════════════════════════════════════════════════════════════════
   4. UI / INPUT HANDLING
   ═══════════════════════════════════════════════════════════════════════ */

function switchAlgo() {
  const a = ALGOS[currentAlgo];

  // Update topbar heading and preemptive badge
  algoTitle.textContent = a.name;
  algoBadge.textContent = a.type;

  // Update sidebar footer
  document.getElementById('sidebar-algo-name').textContent = a.short;
  document.getElementById('sidebar-algo-type').textContent = a.type;

  // Update the Spotify-style now-playing bar at the bottom
  document.getElementById('np-algo-icon').textContent = a.icon;
  document.getElementById('np-algo-name').textContent = a.short;
  document.getElementById('np-algo-full').textContent = a.name;
  document.getElementById('np-type').textContent = a.type;
  document.getElementById('np-cover').firstElementChild.textContent = a.icon;

  // Show the Time Quantum field only for algorithms that slice CPU time
  quantumGroup.style.display = a.quantum ? 'flex' : 'none';

  // Show the Priority order selector only for Priority-based algorithms
  priorityGroup.style.display = a.priority ? 'flex' : 'none';

  // Show/hide the Priority column header in the process input table
  colPriority.style.display = a.priority ? '' : 'none';

  // Show/hide Priority input cells in every existing process row
  document.querySelectorAll('.priority-cell').forEach(cell => {
    cell.style.display = a.priority ? '' : 'none';
  });
}

function addProcessRow() {
  processCount++;
  const idx = processRows.length;          // used to cycle through the color palette
  const color = COLORS[idx % COLORS.length]; // wrap palette if > 10 processes
  const pid = `P${processCount}`;
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>
      <span class="pid-dot" style="background:${color}"></span>
      <input class="pid-input" type="text" value="${pid}" maxlength="6" placeholder="P1"/>
    </td>
    <td><input type="number" value="${Math.floor(Math.random() * 4)}" min="0" max="99" placeholder="0"/></td>
    <td><input type="number" value="${1 + Math.floor(Math.random() * 8)}" min="1" max="99" placeholder="1"/></td>
    <td class="priority-cell" style="display:${ALGOS[currentAlgo].priority ? '' : 'none'}">
      <input type="number" value="${1 + Math.floor(Math.random() * 5)}" min="1" max="99" placeholder="1"/>
    </td>
    <td><button class="btn-remove" title="Remove">×</button></td>
  `;

  // Remove button: deletes the row from the DOM and drops it from the tracking array
  tr.querySelector('.btn-remove').addEventListener('click', () => {
    tr.remove();
    processRows = processRows.filter(r => r.tr !== tr);
  });

  tbody.appendChild(tr);
  processRows.push({ tr, color }); // register so color can be retrieved during rendering
}

function resetAll() {
  tbody.innerHTML = '';  // remove all existing process rows from DOM
  processRows = [];  // clear the color tracking array
  processCount = 0;   // reset auto-naming counter
  hideOutput();
  // Re-add the minimum required 3 processes
  addProcessRow();
  addProcessRow();
  addProcessRow();
}

function hideOutput() {
  outputPanel.style.display = 'none';
  emptyState.style.display = '';
  document.getElementById('np-avg-wt').textContent = '—';
  document.getElementById('np-avg-tat').textContent = '—';
  document.getElementById('progress-bar').style.width = '0%';
}

function readProcesses() {
  const rows = tbody.querySelectorAll('tr');
  const processes = [];

  rows.forEach((tr, i) => {
    const inputs = tr.querySelectorAll('input');
    const pid = inputs[0].value.trim() || `P${i + 1}`;           // default if blank
    const at = Math.max(0, parseInt(inputs[1].value) || 0);     // arrival time ≥ 0
    const bt = Math.max(1, parseInt(inputs[2].value) || 1);     // burst time ≥ 1
    const prio = ALGOS[currentAlgo].priority
      ? (parseInt(inputs[3].value) || 1)               // priority (when applicable)
      : 0;                                              // 0 = unused

    processes.push({
      pid,
      at,
      bt,
      prio,
      color: processRows[i] ? processRows[i].color : COLORS[i % COLORS.length]
    });
  });

  return processes;
}

function runSimulation() {
  const processes = readProcesses();

  // Enforce minimum of 3 processes per case study specification
  if (processes.length < 3) {
    alert('Please add at least 3 processes (minimum required by the case study).');
    return;
  }

  let timeline = [];

  switch (currentAlgo) {
    case 'fcfs':
      timeline = fcfs(processes);
      break;
    case 'sjf':
      timeline = sjf(processes);
      break;
    case 'srt':
      timeline = srt(processes);
      break;
    case 'rr':
      // Read time quantum from input; default to 2 if blank or invalid
      timeline = roundRobin(processes, parseInt(quantumInput.value) || 2);
      break;
    case 'priority':
      timeline = priorityScheduling(processes);
      break;
    case 'priority_preemptive':
      timeline = priorityPreemptive(processes);
      break;
    case 'priority_rr':
      timeline = priorityRR(processes, parseInt(quantumInput.value) || 2);
      break;
  }

  // Derive per-process Waiting Time and Turnaround Time from the timeline
  const results = computeResults(processes, timeline);

  // Render all three output sections
  renderGantt(timeline);
  renderResults(results);
  updateNowPlaying(results);

  // Show the output panel and scroll it into view smoothly
  outputPanel.style.display = '';
  emptyState.style.display = 'none';
  outputPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


/* ═══════════════════════════════════════════════════════════════════════
   5. SCHEDULING ALGORITHMS
   Each function accepts the process array and returns a raw timeline:
   ═══════════════════════════════════════════════════════════════════════ */

function fcfs(processes) {
  // Sort by arrival time; preserve original insertion order for equal arrivals
  const sorted = [...processes].sort((a, b) => a.at - b.at);
  const timeline = [];
  let time = 0; // CPU clock — tracks the current time

  for (const p of sorted) {
    // If the next process hasn't arrived yet, CPU sits idle
    if (time < p.at) {
      timeline.push({ pid: 'idle', start: time, end: p.at, color: null });
      time = p.at; // jump clock forward to the process's arrival
    }

    // Execute this process fully — no preemption possible in FCFS
    timeline.push({ pid: p.pid, start: time, end: time + p.bt, color: p.color });
    time += p.bt; // advance clock by the full burst duration
  }

  return mergeTimeline(timeline);
}

function sjf(processes) {
  // Deep-copy processes; add 'done' flag to track which have completed
  const jobs = processes.map(p => ({ ...p, done: false }));
  const timeline = [];
  let time = 0;
  let completed = 0;
  const n = jobs.length;

  while (completed < n) {
    // Build the available pool: arrived and not yet finished
    const avail = jobs.filter(j => !j.done && j.at <= time);

    if (avail.length === 0) {
      // No process ready — CPU idles until the earliest next arrival
      const nextAt = Math.min(...jobs.filter(j => !j.done).map(j => j.at));
      timeline.push({ pid: 'idle', start: time, end: nextAt, color: null });
      time = nextAt;
      continue;
    }

    // Select the process with the shortest burst; break ties by arrival time
    avail.sort((a, b) => a.bt - b.bt || a.at - b.at);
    const p = avail[0];

    // Execute fully (non-preemptive) — no interruptions allowed
    timeline.push({ pid: p.pid, start: time, end: time + p.bt, color: p.color });
    time += p.bt;
    p.done = true;
    completed++;
  }

  return mergeTimeline(timeline);
}

function srt(processes) {
  // Deep-copy with remaining time (rem) and done flag
  const jobs = processes.map(p => ({ ...p, rem: p.bt, done: false }));
  const timeline = [];
  let time = 0;
  let completed = 0;
  const n = jobs.length;

  while (completed < n) {
    // All processes that have arrived and still need CPU time
    const avail = jobs.filter(j => !j.done && j.at <= time);

    if (avail.length === 0) {
      // No process available — fast-forward to next arrival
      const nextAt = Math.min(...jobs.filter(j => !j.done).map(j => j.at));
      timeline.push({ pid: 'idle', start: time, end: nextAt, color: null });
      time = nextAt;
      continue;
    }

    // Pick process with least remaining time; ties broken by arrival time
    avail.sort((a, b) => a.rem - b.rem || a.at - b.at);
    const p = avail[0];
    const last = timeline[timeline.length - 1];

    // Extend the previous segment if the same process continues uninterrupted;
    // otherwise push a new 1-unit segment (indicates a preemption or fresh start)
    if (last && last.pid === p.pid && last.end === time) {
      last.end = time + 1; // extend — no preemption occurred this unit
    } else {
      timeline.push({ pid: p.pid, start: time, end: time + 1, color: p.color });
    }

    p.rem--; // consume 1 time unit of this process's burst
    time++;

    // Check if this process has now used all of its requested CPU time
    if (p.rem === 0) {
      p.done = true;
      completed++;
    }
  }

  return mergeTimeline(timeline);
}

function roundRobin(processes, quantum) {
  // Sort jobs by arrival time to enqueue them in the correct arrival order
  const jobs = processes.map(p => ({ ...p, rem: p.bt, done: false }))
    .sort((a, b) => a.at - b.at);

  const timeline = [];
  const queue = []; // FIFO ready queue
  let time = 0;
  let idx = 0;  // index into sorted jobs — marks the next unqueued process

  if (idx < jobs.length && jobs[idx].at > time) {
    timeline.push({ pid: 'idle', start: time, end: jobs[idx].at, color: null });
    time = jobs[idx].at;
  }

  // Seed the queue with all processes that have now arrived
  while (idx < jobs.length && jobs[idx].at <= time) {
    queue.push(jobs[idx++]);
  }

  while (queue.length > 0) {
    const p = queue.shift();              // dequeue the next process
    const run = Math.min(p.rem, quantum);   // execute for at most one quantum

    // Record this execution slice in the timeline
    timeline.push({ pid: p.pid, start: time, end: time + run, color: p.color });
    time += run;
    p.rem -= run;

    // Enqueue any processes that arrived while this slice was running
    while (idx < jobs.length && jobs[idx].at <= time) {
      queue.push(jobs[idx++]);
    }

    if (p.rem > 0) {
      // Process has remaining work — re-enqueue at the back (preempted)
      queue.push(p);
    } else {
      p.done = true; // process has finished all of its burst time
    }

    // If queue is now empty but unstarted processes exist, idle until next arrival
    if (queue.length === 0 && idx < jobs.length) {
      timeline.push({ pid: 'idle', start: time, end: jobs[idx].at, color: null });
      time = jobs[idx].at;
      // Enqueue processes that have now arrived
      while (idx < jobs.length && jobs[idx].at <= time) {
        queue.push(jobs[idx++]);
      }
    }
  }

  return mergeTimeline(timeline);
}

function priorityScheduling(processes) {
  const order = priorityOrder.value; // 'lower' or 'higher' from UI dropdown
  const jobs = processes.map(p => ({ ...p, done: false }));
  const timeline = [];
  let time = 0;
  let completed = 0;
  const n = jobs.length;

  while (completed < n) {
    // Collect all processes that have arrived and are not yet done
    const avail = jobs.filter(j => !j.done && j.at <= time);

    if (avail.length === 0) {
      // No process ready — idle until the earliest remaining arrival
      const nextAt = Math.min(...jobs.filter(j => !j.done).map(j => j.at));
      timeline.push({ pid: 'idle', start: time, end: nextAt, color: null });
      time = nextAt;
      continue;
    }

    avail.sort((a, b) =>
      order === 'lower'
        ? a.prio - b.prio || a.at - b.at   // lower number wins
        : b.prio - a.prio || a.at - b.at   // higher number wins
    );

    const p = avail[0]; // highest-priority available process

    // Run to full completion — non-preemptive, no interruptions
    timeline.push({ pid: p.pid, start: time, end: time + p.bt, color: p.color });
    time += p.bt;
    p.done = true;
    completed++;
  }

  return mergeTimeline(timeline);
}

function priorityRR(processes, quantum) {
  const order = priorityOrder.value; // 'lower' or 'higher' from UI dropdown

  // Sort by arrival time so we can enqueue in the correct order
  const jobs = processes.map(p => ({ ...p, rem: p.bt, done: false }))
    .sort((a, b) => a.at - b.at);

  const timeline = [];
  const queue = []; // unified ready queue — re-sorted by priority each round
  let time = 0;
  let idx = 0;  // index into sorted jobs for arrival tracking
  let completed = 0;

  if (idx < jobs.length && jobs[idx].at > time) {
    timeline.push({ pid: 'idle', start: time, end: jobs[idx].at, color: null });
    time = jobs[idx].at;
  }

  // Seed queue with all processes that have now arrived
  while (idx < jobs.length && jobs[idx].at <= time) {
    queue.push(jobs[idx++]);
  }

  while (completed < jobs.length) {
    if (queue.length === 0) {
      // Nothing ready — fast-forward to the next process arrival
      const nextAt = Math.min(...jobs.filter(j => !j.done).map(j => j.at));
      timeline.push({ pid: 'idle', start: time, end: nextAt, color: null });
      time = nextAt;
      while (idx < jobs.length && jobs[idx].at <= time) {
        queue.push(jobs[idx++]);
      }
      continue;
    }

    queue.sort((a, b) =>
      order === 'lower'
        ? a.prio - b.prio || a.at - b.at
        : b.prio - a.prio || a.at - b.at
    );

    const p = queue.shift();             // highest-priority process in queue
    const run = Math.min(p.rem, quantum);  // execute for at most one quantum

    timeline.push({ pid: p.pid, start: time, end: time + run, color: p.color });
    time += run;
    p.rem -= run;

    // Enqueue processes that arrived during this execution slice
    while (idx < jobs.length && jobs[idx].at <= time) {
      queue.push(jobs[idx++]);
    }

    if (p.rem > 0) {
      // Unfinished — re-enqueue; will compete with new arrivals on next sort
      queue.push(p);
    } else {
      p.done = true;
      completed++;
    }
  }

  return mergeTimeline(timeline);
}



function priorityPreemptive(processes) {
  const order = priorityOrder.value; // 'lower' or 'higher' from UI dropdown
  const jobs = processes.map(p => ({ ...p, rem: p.bt, done: false }));
  const timeline = [];
  let time = 0;
  let completed = 0;
  const n = jobs.length;

  while (completed < n) {
    // All processes that have arrived and still need CPU time
    const avail = jobs.filter(j => !j.done && j.at <= time);

    if (avail.length === 0) {
      // No process ready — fast-forward to next arrival
      const nextAt = Math.min(...jobs.filter(j => !j.done).map(j => j.at));
      timeline.push({ pid: 'idle', start: time, end: nextAt, color: null });
      time = nextAt;
      continue;
    }

    // Select highest-priority available process (same sort as non-preemptive)
    avail.sort((a, b) =>
      order === 'lower'
        ? a.prio - b.prio || a.at - b.at   // lower number = higher priority
        : b.prio - a.prio || a.at - b.at   // higher number = higher priority
    );

    const p = avail[0];
    const last = timeline[timeline.length - 1];

    // Extend last segment if same process continues; new segment if preempted
    if (last && last.pid === p.pid && last.end === time) {
      last.end = time + 1; // same process — extend, no preemption this unit
    } else {
      timeline.push({ pid: p.pid, start: time, end: time + 1, color: p.color });
    }

    p.rem--;
    time++;

    if (p.rem === 0) {
      p.done = true;
      completed++;
    }
  }

  return mergeTimeline(timeline);
}

/* ═══════════════════════════════════════════════════════════════════════
   6. TIMELINE UTILITY
   ═══════════════════════════════════════════════════════════════════════ */

function mergeTimeline(tl) {
  if (tl.length === 0) return [];
  const merged = [{ ...tl[0] }]; // begin with a fresh copy of the first segment

  for (let i = 1; i < tl.length; i++) {
    const last = merged[merged.length - 1];
    // Merge condition: same PID and segments are contiguous (no time gap)
    if (tl[i].pid === last.pid && tl[i].start === last.end) {
      last.end = tl[i].end; // extend the existing segment's end time
    } else {
      merged.push({ ...tl[i] }); // different process or gap — start a new segment
    }
  }

  return merged;
}


/* ═══════════════════════════════════════════════════════════════════════
   7. RESULT COMPUTATION
   ═══════════════════════════════════════════════════════════════════════ */

function computeResults(processes, timeline) {
  // Build a finish-time map: pid → last end time seen in the timeline
  const finish = {};
  for (const seg of timeline) {
    if (seg.pid !== 'idle') {
      finish[seg.pid] = seg.end; // overwrite on each occurrence; last = actual finish
    }
  }

  return processes.map(p => {
    const ft = finish[p.pid] ?? (p.at + p.bt); // finish time (fallback for edge cases)
    const tat = ft - p.at;                       // turnaround time
    const wt = Math.max(0, tat - p.bt);         // waiting time (never negative)
    return { ...p, ft, tat, wt };
  });
}


/* ═══════════════════════════════════════════════════════════════════════
   8. RENDERING
   ═══════════════════════════════════════════════════════════════════════ */

function renderGantt(timeline) {
  // Clear any previous chart output
  ganttChart.innerHTML = '';
  ganttTimeline.innerHTML = '';
  if (timeline.length === 0) return;

  const totalTime = timeline[timeline.length - 1].end; // total simulation length
  const MIN_BLOCK = 28;

  const unitPx = Math.max(30, Math.min(80, Math.floor(700 / totalTime)));

  const blockWidths = timeline.map(seg => {
    const dur = seg.end - seg.start;
    return Math.max(MIN_BLOCK, dur * unitPx); // mirror the CSS min-width rule
  });

  // ── Row 1: Gantt process blocks ─────────────────────────────────────
  timeline.forEach((seg, i) => {
    const dur = seg.end - seg.start;  // duration of this execution segment
    const w = blockWidths[i];       // actual rendered pixel width

    const div = document.createElement('div');
    div.className = 'gantt-block' + (seg.pid === 'idle' ? ' idle' : '');
    div.style.width = w + 'px';
    div.style.minWidth = w + 'px';   // override CSS min-width with exact value

    // Stagger the CSS entry animation so blocks appear left-to-right
    div.style.animationDelay = (i * 0.04) + 's';

    if (seg.pid !== 'idle') {
      div.style.background = seg.color;
      div.style.boxShadow = `0 0 12px ${seg.color}55`; // subtle glow effect
    }

    // Tooltip: hover to see exact time range and duration of this segment
    div.title = `${seg.pid === 'idle' ? 'Idle' : seg.pid}: t=${seg.start} → t=${seg.end}  (${dur} unit${dur !== 1 ? 's' : ''})`;
    div.textContent = seg.pid === 'idle' ? '' : seg.pid;

    ganttChart.appendChild(div);
  });

  // ── Row 2: Timeline tick marks ──────────────────────────────────────

  // Build cumulative position map
  const posMap = {};
  let cumPx = 0;
  timeline.forEach((seg, i) => {
    posMap[seg.start] = cumPx;
    cumPx += blockWidths[i];
  });
  posMap[timeline[timeline.length - 1].end] = cumPx; // final right edge

  // Make the timeline container relatively positioned so absolute children work
  ganttTimeline.style.position = 'relative';
  ganttTimeline.style.height = '16px';
  ganttTimeline.style.width = cumPx + 'px';

  const boundaries = [...new Set(timeline.flatMap(s => [s.start, s.end]))]
    .sort((a, b) => a - b);

  boundaries.forEach(t => {
    const tickDiv = document.createElement('div');
    tickDiv.className = 'gantt-tick';
    tickDiv.style.position = 'absolute';
    tickDiv.style.left = posMap[t] + 'px'; // exact pixel alignment
    tickDiv.style.whiteSpace = 'nowrap';
    tickDiv.textContent = t;
    ganttTimeline.appendChild(tickDiv);
  });
}

function renderResults(results) {
  resultTbody.innerHTML = '';
  let totalWT = 0, totalTAT = 0;

  // Render one row per process with all computed timing values
  results.forEach(r => {
    totalWT += r.wt;
    totalTAT += r.tat;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="pid-dot" style="background:${r.color}"></span>
        <strong>${r.pid}</strong>
      </td>
      <td>${r.at}</td>
      <td>${r.bt}</td>
      <td class="finish-cell">${r.ft}</td>
      <td class="wt-cell">${r.wt}</td>
      <td class="tat-cell">${r.tat}</td>
    `;
    resultTbody.appendChild(tr);
  });

  // Compute averages to 2 decimal places for display
  const n = results.length;
  const avgWT = (totalWT / n).toFixed(2);
  const avgTAT = (totalTAT / n).toFixed(2);

  // Append the average summary row at the bottom of the process table
  const avgRow = document.createElement('tr');
  avgRow.style.borderTop = '2px solid rgba(255,255,255,0.1)';
  avgRow.innerHTML = `
    <td colspan="4" style="text-align:right; font-weight:700; color:var(--sub);
        font-size:11px; letter-spacing:1px; text-transform:uppercase;">Average</td>
    <td class="wt-cell"  style="font-size:15px;">${avgWT}</td>
    <td class="tat-cell" style="font-size:15px;">${avgTAT}</td>
  `;
  resultTbody.appendChild(avgRow);

  // Render the four summary stat cards
  const totalSimTime = Math.max(...results.map(r => r.ft));
  statsRow.innerHTML = `
    <div class="stat-card">
      <span class="stat-val">${n}</span>
      <span class="stat-label">Processes</span>
    </div>
    <div class="stat-card">
      <span class="stat-val">${avgWT}</span>
      <span class="stat-label">Avg Waiting Time</span>
    </div>
    <div class="stat-card">
      <span class="stat-val">${avgTAT}</span>
      <span class="stat-label">Avg Turnaround Time</span>
    </div>
    <div class="stat-card">
      <span class="stat-val">${totalSimTime}</span>
      <span class="stat-label">Total Time Units</span>
    </div>
  `;
}

function updateNowPlaying(results) {
  const n = results.length;
  const totalWT = results.reduce((s, r) => s + r.wt, 0);
  const totalTAT = results.reduce((s, r) => s + r.tat, 0);
  const avgWT = (totalWT / n).toFixed(2);
  const avgTAT = (totalTAT / n).toFixed(2);

  document.getElementById('np-processes').textContent = n;
  document.getElementById('np-avg-wt').textContent = avgWT;
  document.getElementById('np-avg-tat').textContent = avgTAT;

  // Animate progress bar to full width to signal simulation is complete
  document.getElementById('progress-bar').style.width = '100%';
}


/* ═══════════════════════════════════════════════════════════════════════
   9. INITIALIZATION
   Runs once on page load to set up the default simulator state.
   ═══════════════════════════════════════════════════════════════════════ */

function init() {
  // Add 3 default process rows (minimum required by the case study)
  addProcessRow();
  addProcessRow();
  addProcessRow();

  // Overwrite random defaults with a clear, predictable first-run example
  const rows = tbody.querySelectorAll('tr');
  const defaults = [
    [0, 6],  // P1: arrives at 0, needs 6 units
    [2, 4],  // P2: arrives at 2, needs 4 units
    [4, 2],  // P3: arrives at 4, needs 2 units
  ];

  rows.forEach((tr, i) => {
    const inputs = tr.querySelectorAll('input');
    if (defaults[i]) {
      inputs[1].value = defaults[i][0]; // set arrival time
      inputs[2].value = defaults[i][1]; // set burst time
    }
  });

  // Apply the default FCFS UI (no quantum field, no priority column)
  switchAlgo();
}

// Start the application
init();
