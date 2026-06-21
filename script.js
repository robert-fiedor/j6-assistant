const keys = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const chromatic = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const scaleSteps = [0, 2, 4, 5, 7, 9, 11];
const majorQualities = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
const degrees = ["I", "ii", "iii", "IV", "V", "vi", "vii"];

const moodPatterns = {
  warm: [[0, 5, 3, 4], [0, 4, 5, 3], [3, 0, 5, 4]],
  dark: [[5, 3, 0, 4], [1, 5, 3, 4], [5, 1, 3, 0]],
  bright: [[0, 3, 4, 0], [0, 4, 1, 3], [3, 4, 0, 5]],
  late: [[1, 4, 5, 3], [5, 4, 2, 3], [1, 5, 0, 4]]
};

const cues = {
  pluck: ["Shorten release so the J-6 rhythm stays crisp.", "Try motion on filter cutoff every two bars.", "Leave the first chord dry, then add delay on repeats."],
  pad: ["Open attack slightly and let chord changes overlap.", "Use fewer bass notes so the voicing breathes.", "Ride the filter into the turnaround chord."],
  arp: ["Keep chord memory simple and let the arp define movement.", "Accent the second chord for lift.", "Mute one chord tone when the pattern gets busy."],
  bass: ["Double roots on the downbeat only.", "Use the fifth chord as the bass anchor.", "Keep sub notes shorter than the J-6 chord stabs."]
};

const els = {
  keySelect: document.querySelector("#keySelect"),
  moodSelect: document.querySelector("#moodSelect"),
  lengthRange: document.querySelector("#lengthRange"),
  lengthValue: document.querySelector("#lengthValue"),
  textureSelect: document.querySelector("#textureSelect"),
  progression: document.querySelector("#progression"),
  chordGrid: document.querySelector("#chordGrid"),
  cueList: document.querySelector("#cueList"),
  newIdea: document.querySelector("#newIdea"),
  copyProgression: document.querySelector("#copyProgression"),
  sessionNote: document.querySelector("#sessionNote"),
  saveState: document.querySelector("#saveState")
};

let currentPattern = [];

function noteFrom(root, step) {
  const rootIndex = chromatic.indexOf(root);
  return chromatic[(rootIndex + step) % chromatic.length];
}

function buildScale(root) {
  return scaleSteps.map((step) => noteFrom(root, step));
}

function buildChord(scale, degreeIndex) {
  const root = scale[degreeIndex];
  const third = scale[(degreeIndex + 2) % 7];
  const fifth = scale[(degreeIndex + 4) % 7];
  const seventh = scale[(degreeIndex + 6) % 7];
  return {
    degree: degrees[degreeIndex],
    name: `${root}${majorQualities[degreeIndex]}`,
    notes: [root, third, fifth, seventh]
  };
}

function choosePattern() {
  const mood = els.moodSelect.value;
  const base = moodPatterns[mood][Math.floor(Math.random() * moodPatterns[mood].length)];
  const targetLength = Number(els.lengthRange.value);
  const pattern = [];

  while (pattern.length < targetLength) {
    pattern.push(...base);
  }

  return pattern.slice(0, targetLength);
}

function render() {
  const scale = buildScale(els.keySelect.value);
  const chords = currentPattern.map((degreeIndex) => buildChord(scale, degreeIndex));

  els.progression.innerHTML = chords.map((chord) => `<span>${chord.name}</span>`).join("");
  els.chordGrid.innerHTML = chords.map((chord, index) => `
    <article class="chord-card">
      <div class="degree">Step ${index + 1} · ${chord.degree}</div>
      <div class="chord-name">${chord.name}</div>
      <div class="notes">${chord.notes.join(" · ")}</div>
    </article>
  `).join("");

  els.cueList.innerHTML = cues[els.textureSelect.value].map((cue) => `<li>${cue}</li>`).join("");
  els.lengthValue.textContent = `${els.lengthRange.value} chords`;
}

function newIdea() {
  currentPattern = choosePattern();
  render();
}

function copyProgression() {
  const text = Array.from(els.progression.querySelectorAll("span"))
    .map((item) => item.textContent)
    .join(" - ");

  const write = navigator.clipboard
    ? navigator.clipboard.writeText(text)
    : Promise.reject(new Error("Clipboard API unavailable"));

  write.catch(() => {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }).finally(() => {
    els.copyProgression.textContent = "Copied";
    els.copyProgression.classList.add("copied");
    window.setTimeout(() => {
      els.copyProgression.textContent = "Copy";
      els.copyProgression.classList.remove("copied");
    }, 1200);
  });
}

function saveNote() {
  localStorage.setItem("j6-assistant-note", els.sessionNote.value);
  els.saveState.textContent = "Saved locally";
}

keys.forEach((key) => {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = key;
  els.keySelect.append(option);
});

els.sessionNote.value = localStorage.getItem("j6-assistant-note") || "";
els.keySelect.value = "C";
newIdea();

els.newIdea.addEventListener("click", newIdea);
els.copyProgression.addEventListener("click", copyProgression);
els.keySelect.addEventListener("change", render);
els.moodSelect.addEventListener("change", newIdea);
els.textureSelect.addEventListener("change", render);
els.lengthRange.addEventListener("input", newIdea);
els.sessionNote.addEventListener("input", saveNote);
