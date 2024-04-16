import { formatTime } from "./util";

export const renderBasics = (parent: Element) => {
  parent.innerHTML = `
    <div class="margin-content row">
      <div class="col-md-12">
        <div id="subtitle-languages"></div>
      </div>
    </div>
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
            <button id="subtitle-seek-plus-1" class="btn btn-light">-1s</button>
            <button id="subtitle-pause-play" class="btn btn-light">Pause/play</button>
            <button id="subtitle-seek-minus-1" class="btn btn-light">+1s</button>
            
            <button id="subtitle-insert-new" class="btn btn-light">Insert here</button>
            <button id="subtitle-select-current" class="btn btn-light">Select current</button>
          </div>
          <p>
            <span id="subtitle-timestamp">00:00:00.000</span>
            <button id="subtitle-set-start" class="btn btn-light">Set start</button>
            <button id="subtitle-set-end" class="btn btn-light">Set end</button>
          </p>
          <textarea id="subtitle-cue-input" width="100%"></textarea>
          <p>
            <label>Left <input value="left" name="subtitle-align" type="radio"/></label>
            <label>Center <input value="center" name="subtitle-align" type="radio"/></label>
            <label>Right <input value="right" name="subtitle-align" type="radio"/></label>
          </p>
          <pre id="subtitle-vtt-result"></pre>
        </div>
      </div>
    </div>
  `;
};

export const renderLanguageSelector = (
  element: HTMLDivElement,
  languages: { id: string, label: string }[],
  currentLangId: string,
  onSelected: (id: string) => any,
) => {
  element.innerHTML = "";

  languages.forEach((lang) => {
    const btn = document.createElement("button");
    btn.classList.add("btn");
    if (lang.id == currentLangId) btn.classList.add("btn-primary");
    btn.innerText = lang.label;
    btn.onclick = () => onSelected(lang.id);
    element.appendChild(btn);
  });
};

interface RenderTableOpts {
  time?: number;
  onCueSelected?: (cue: any, i: number) => any;
};

export const renderCueTable = (table: Element, cues: any[], opts: RenderTableOpts) => {
  table.innerHTML = "";

  cues.map(e => e)
    .sort((a, b) => a.startTime - b.startTime)
    .forEach((cue, i) => {
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

export const generateVTT = (cues: any[]) => {
  let result = "WEBVTT FILE\n\n";

  cues.forEach(cue => {
    if (cue.id) {
      result += cue.id + "\n";
    }

    result += `${formatTime(cue.startTime)} --> ${formatTime(cue.endTime)}`;
    if (cue.align != "center") {
      result += " align:" + cue.align;
    }
    result += "\n";

    result += cue.text;
    result += "\n\n";
  });

  return result;
};
