// Unassigned objects remain visible. Assigned reveal objects begin hidden.
export function visibilityAt(elements, steps, index) {
  const revealed = new Set(steps.flatMap(step => step.show));
  const visible = new Set(elements.filter(e => !e.isDeleted && !revealed.has(e.id)).map(e => e.id));
  for (const step of steps.slice(0, index + 1)) {
    for (const id of step.show) visible.add(id);
    for (const id of step.hide) visible.delete(id);
  }
  return visible;
}
export function cameraAt(steps, index, fallback) {
  let camera = fallback;
  for (const step of steps.slice(0, index + 1)) if (step.camera) camera = step.camera;
  return camera;
}

// One click runs a whole group; simultaneous cues share a start time while
// automatic cues wait for the preceding animation's fixed fade duration.
export function playbackGroups(steps, duration = 450) {
  /** @type {{cues: {index: number, at: number}[], end: number, duration: number}[]} */
  const groups = [];
  for (let index = 0; index < steps.length; index++) {
    const start = steps[index].start ?? 'click';
    if (!groups.length || start === 'click') groups.push({ cues: [], end: index, duration: 0 });
    const group = groups.at(-1);
    const previous = group.cues.at(-1);
    const at = previous ? previous.at + (start === 'after' ? duration : 0) : 0;
    group.cues.push({ index, at });
    group.end = index;
    group.duration = Math.max(group.duration, at + duration);
  }
  return groups;
}

const ease = value => 1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 3);
function sampleTrack(initial, transitions, elapsed, duration) {
  let value = initial;
  for (const transition of transitions) {
    if (elapsed < transition.at) break;
    value = transition.from + (transition.to - transition.from) * (duration ? ease((elapsed - transition.at) / duration) : 1);
  }
  return value;
}

export function createTimeline(elements, steps, cues, fromOpacity, fromCamera, fallbackCamera, duration = 450) {
  const opacity = new Map(elements.map(element => [element.id, { initial: fromOpacity.get(element.id) ?? 0, transitions: [] }]));
  const camera = Object.fromEntries(['scrollX', 'scrollY', 'zoom'].map(key => [key, { initial: fromCamera[key], transitions: [] }]));
  for (const cue of cues) {
    const visible = visibilityAt(elements, steps, cue.index);
    for (const element of elements) {
      const track = opacity.get(element.id);
      const to = visible.has(element.id) ? element.opacity : 0;
      const previousTarget = track.transitions.at(-1)?.to ?? track.initial;
      if (to !== previousTarget) track.transitions.push({ at: cue.at, from: sampleTrack(track.initial, track.transitions, cue.at, duration), to });
    }
    const target = cameraAt(steps, cue.index, fallbackCamera);
    for (const key of ['scrollX', 'scrollY', 'zoom']) {
      const track = camera[key];
      if (target[key] !== (track.transitions.at(-1)?.to ?? track.initial)) track.transitions.push({ at: cue.at, from: sampleTrack(track.initial, track.transitions, cue.at, duration), to: target[key] });
    }
  }
  return { opacity, camera, cues, duration };
}

export function sampleTimeline(timeline, elapsed) {
  const sample = track => sampleTrack(track.initial, track.transitions, elapsed, timeline.duration);
  return {
    opacity: new Map([...timeline.opacity].map(([id, track]) => [id, Math.round(sample(track))])),
    camera: Object.fromEntries(Object.entries(timeline.camera).map(([key, track]) => [key, sample(track)])),
    active: timeline.cues.filter(cue => cue.at <= elapsed).at(-1)?.index,
  };
}
