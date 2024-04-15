import { formatTime } from "./util";

export const renderBasics = (parent: Element) => {
  parent.innerHTML = `
    <div class="margin-content row">
      <div class="col-md-6">
        <table class="subtitle-cues">
          <thead>
            <tr><th>ID</th><th>Start time</th><th>End time</th><th>Text</th></tr>
          </thead>
          <tbody id="subtitle-cues"></tbody>
        </table>
      </div>
      <div class="col-md-6">
        <div class="subtitle-editor">
          <div id="subtitle-video-viewer"></div>
          <div id="subtitle-video-controls">
            <button class="btn btn-light">-1s</button>
            <button class="btn btn-light">Pause/play</button>
            <button class="btn btn-light">+1s</button>
            
            <button class="btn btn-light">Insert here</button>
            <button class="btn btn-light">Select current</button>
          </div>
          <span id="subtitle-timestamp">00:00.00</span>
          <textarea id="subtitle-cue-input" width="100%"></textarea>
        </div>
      </div>
    </div>
  `;
};

interface RenderTableOpts {
  time?: number;
  onCueSelected?: (cue: any, i: number) => any;
};

export const renderCueTable = (table: Element, cues: any[], opts: RenderTableOpts) => {
  cues.forEach((cue, i) => {
    let isViewed = false;
    if (typeof opts.time == "number") {
      if (cue.startTime < opts.time && opts.time < cue.endTime) {
        isViewed = true;
      }
    }

    const row = document.createElement("tr")
    if (isViewed) {
      row.setAttribute("class", "subtitle-cue-highlight");
    }
    const onCueSelected = opts.onCueSelected;
    if (typeof onCueSelected == "function") {
      row.addEventListener("click", () => onCueSelected(cue, i));
    }

    let e = document.createElement("td");
    e.innerText = cue.id;
    row.appendChild(e);

    e = document.createElement("td");
    e.innerText = formatTime(cue.startTime);
    row.appendChild(e);

    e = document.createElement("td");
    e.innerText = formatTime(cue.endTime);
    row.appendChild(e);

    e = document.createElement("td");
    let text = document.createElement("span")
    text.innerText = cue.text;
    e.appendChild(text);
    row.appendChild(e);

    table.appendChild(row);
  });

  return table;
};
