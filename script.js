const CSV_URL = "data/roland_j6_chord_sets.csv";
const NOTE_TO_PC = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11
};
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
const BLACK_KEYS = [
  { pc: 1, afterWhite: 0 },
  { pc: 3, afterWhite: 1 },
  { pc: 6, afterWhite: 3 },
  { pc: 8, afterWhite: 4 },
  { pc: 10, afterWhite: 5 },
  { pc: 13, afterWhite: 7 },
  { pc: 15, afterWhite: 8 },
  { pc: 18, afterWhite: 10 },
  { pc: 20, afterWhite: 11 },
  { pc: 22, afterWhite: 12 }
];

const els = {
  setSelect: document.querySelector("#setSelect"),
  volumeSlider: document.querySelector("#volumeSlider"),
  setStrip: document.querySelector("#setStrip"),
  chordList: document.querySelector("#chordList")
};

let audioContext;
let activeNodes = [];
let sets = [];
let selectedSetId = "";
let volume = 0.75;

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  return lines.slice(1).map((line) => {
    const [presetNumber, setName, chord, chordNotes] = line.split(",");
    const [inputNote, ...symbolParts] = chord.split(":");
    const notes = chordNotes.trim().split(/\s+/).map(parseNote).filter(Boolean);

    return {
      presetNumber: Number(presetNumber),
      setName,
      setId: `${presetNumber}-${setName}`,
      chord,
      inputNote: inputNote.trim(),
      symbol: symbolParts.join(":").trim(),
      notes,
      noteText: chordNotes.trim()
    };
  });
}

function parseNote(value) {
  const match = value.trim().match(/^([A-G](?:#|b)?)(-?\d+)$/);
  if (!match) return null;

  const [, name, octaveText] = match;
  const octave = Number(octaveText);
  const pc = NOTE_TO_PC[name];
  const midi = (octave + 1) * 12 + pc;

  return {
    name,
    octave,
    midi,
    pc,
    label: value.trim(),
    frequency: 440 * (2 ** ((midi - 69) / 12))
  };
}

function groupSets(rows) {
  const map = new Map();

  rows.forEach((row) => {
    if (!map.has(row.setId)) {
      map.set(row.setId, {
        id: row.setId,
        presetNumber: row.presetNumber,
        name: row.setName,
        chords: []
      });
    }
    map.get(row.setId).chords.push(row);
  });

  return Array.from(map.values()).sort((a, b) => a.presetNumber - b.presetNumber);
}

function renderSetOptions() {
  els.setSelect.innerHTML = sets.map((set) => (
    `<option value="${set.id}">${set.presetNumber}. ${set.name}</option>`
  )).join("");

  els.setStrip.innerHTML = sets.map((set) => (
    `<button class="set-chip" type="button" data-set-id="${set.id}">${set.presetNumber}</button>`
  )).join("");
}

function render() {
  const selected = sets.find((set) => set.id === selectedSetId) || sets[0];
  if (!selected) return;

  const chords = selected.chords;

  els.setSelect.value = selected.id;

  els.setStrip.querySelectorAll(".set-chip").forEach((button) => {
    button.classList.toggle("active", button.dataset.setId === selected.id);
  });

  els.chordList.innerHTML = chords.length
    ? chords.map(renderChordCard).join("")
    : `<p class="empty">No chords match this search.</p>`;
}

function renderChordCard(chord) {
  const rootPc = NOTE_TO_PC[chord.inputNote];
  const notePills = chord.notes.map((note) => (
    `<span class="note-pill${note.pc === rootPc ? " root-note" : ""}">${note.label}</span>`
  )).join("");

  return `
    <button class="chord-card" type="button" data-chord="${encodeURIComponent(chord.chord)}" aria-label="Play ${chord.chord}">
      <div class="chord-head">
        <span class="input-note">${chord.inputNote}</span>
        <span class="symbol">${chord.symbol}</span>
      </div>
      <div class="notes-row">${notePills}</div>
      ${renderKeyboard(chord.notes, rootPc)}
    </button>
  `;
}

function renderKeyboard(notes, rootPc) {
  const minMidi = Math.min(...notes.map((note) => note.midi));
  const baseMidi = Math.max(24, Math.min(72, Math.floor(minMidi / 12) * 12));
  const activeOffsets = new Set(notes
    .filter((note) => note.midi >= baseMidi && note.midi <= baseMidi + 24)
    .map((note) => note.midi - baseMidi));
  const rootOffsets = new Set(notes
    .filter((note) => note.pc === rootPc)
    .filter((note) => note.midi >= baseMidi && note.midi <= baseMidi + 24)
    .map((note) => note.midi - baseMidi));
  const whiteWidth = 100 / WHITE_PCS.length;
  const whiteKeys = WHITE_PCS.map((offset, index) => {
    const x = index * whiteWidth;
    const activeClass = rootOffsets.has(offset)
      ? " key-root"
      : activeOffsets.has(offset)
        ? " key-active"
        : "";
    return `<rect class="white-key${activeClass}" x="${x}" y="0" width="${whiteWidth}" height="132"></rect>`;
  }).join("");

  const blackKeys = BLACK_KEYS.map((key) => {
    const x = ((key.afterWhite + 1) * whiteWidth) - (whiteWidth * 0.32);
    const activeClass = rootOffsets.has(key.pc)
      ? " key-root"
      : activeOffsets.has(key.pc)
        ? " key-active"
        : "";
    return `<rect class="black-key${activeClass}" x="${x}" y="0" width="${whiteWidth * 0.62}" height="82" rx="2"></rect>`;
  }).join("");

  return `<svg class="keyboard" viewBox="0 0 100 132" preserveAspectRatio="none" role="img" aria-label="Two octave keyboard voicing">${whiteKeys}${blackKeys}</svg>`;
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function stopAudio() {
  activeNodes.forEach(({ oscillator, gain }) => {
    try {
      gain.gain.cancelScheduledValues(audioContext.currentTime);
      gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.03);
      oscillator.stop(audioContext.currentTime + 0.12);
    } catch {
      // Already stopped.
    }
  });
  activeNodes = [];
}

function playChord(chord, card) {
  ensureAudio();
  stopAudio();

  const now = audioContext.currentTime;
  const master = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  master.gain.value = (0.225 * volume) / Math.max(1, chord.notes.length);
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.45;
  filter.connect(master);
  master.connect(audioContext.destination);

  chord.notes.forEach((note, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 0.025 + index * 0.01);
    gain.gain.setTargetAtTime(0, now + 1.1, 0.22);
    oscillator.connect(gain);
    gain.connect(filter);
    oscillator.start(now + index * 0.01);
    oscillator.stop(now + 2.2);
    activeNodes.push({ oscillator, gain });
  });

  card.classList.add("playing");
  window.setTimeout(() => card.classList.remove("playing"), 550);
}

function findChordByEncodedName(encodedName) {
  const name = decodeURIComponent(encodedName);
  return sets.flatMap((set) => set.chords).find((chord) => chord.chord === name);
}

async function init() {
  const response = await fetch(CSV_URL);
  const text = await response.text();
  sets = groupSets(parseCSV(text));
  selectedSetId = sets[0]?.id || "";
  renderSetOptions();
  render();
}

els.setSelect.addEventListener("change", (event) => {
  selectedSetId = event.target.value;
  render();
});

els.volumeSlider.addEventListener("input", (event) => {
  volume = Number(event.target.value) / 100;
});

els.setStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-set-id]");
  if (!button) return;
  selectedSetId = button.dataset.setId;
  render();
  button.scrollIntoView({ block: "nearest", inline: "center" });
});

els.chordList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-chord]");
  if (!card) return;

  const chord = findChordByEncodedName(card.dataset.chord);
  if (chord) playChord(chord, card);
});

init().catch((error) => {
  els.chordList.innerHTML = `<p class="empty">${error.message}</p>`;
});
