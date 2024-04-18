import { formatTime } from "./util";

export const renderBasics = (parent: Element) => {
  parent.innerHTML = `
    <div class="margin-content row subtitle-main">
      <div class="col-md-12">
        <div id="subtitle-languages" class="action-bubble"></div>
        <div class="action-bubble">
          <select id="subtitle-add-language-list"></select>
          <button id="subtitle-add" class="btn btn-primary">+ new</button>
          <button id="subtitle-add-copy" class="btn btn-primary">+ copy to new</button>
        </div>
        <div class="action-bubble">
          <button id="subtitle-delete" class="btn btn-danger">Delete</button>
          <button id="subtitle-save" class="btn btn-success">Save</button>
        </div>
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
            <button id="subtitle-seek-minus-1" class="btn btn-light">-1s</button>
            <button id="subtitle-pause-play" class="btn btn-light">Pause/play</button>
            <button id="subtitle-seek-plus-1" class="btn btn-light">+1s</button>
            
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
          <canvas id="subtitle-timeline" width=400 height=200 />
          <pre id="subtitle-vtt-result"></pre>
        </div>
      </div>
    </div>
  `;
};

export const renderLanguageSelector = (
  element: HTMLDivElement,
  languages: { id: string, label: string, changed: boolean }[],
  currentLangId: string,
  onSelected: (id: string) => any,
) => {
  element.innerHTML = "";

  languages.forEach((lang) => {
    const btn = document.createElement("button");
    btn.classList.add("btn");
    btn.classList.add((lang.id == currentLangId) ? "btn-dark" : "btn-light");
    btn.innerText = lang.label;
    if (lang.changed) {
      btn.innerText += " (unsaved)";
    }
    btn.onclick = () => onSelected(lang.id);
    element.appendChild(btn);
    element.appendChild(document.createTextNode(" "));
  });
};

export const renderLanguageList = (element: HTMLSelectElement, languages: { id: string, label: string, disabled: boolean }[]) => {
  languages.forEach(lang => {
    const opt = document.createElement("option");
    opt.innerText = lang.label;
    opt.value = lang.id;
    if (lang.disabled) {
      opt.setAttribute("disabled", "disabled");
    }
    element.appendChild(opt);
  });
}

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
  let result = "WEBVTT FILE\r\n\r\n";

  cues.forEach(cue => {
    if (cue.id) {
      result += cue.id + "\r\n";
    }

    result += `${formatTime(cue.startTime)} --> ${formatTime(cue.endTime)}`;
    if (cue.align != "center") {
      result += " align:" + cue.align;
    }
    result += "\r\n";

    result += cue.text;
    result += "\r\n\r\n";
  });

  return result;
};

export const renderTimeline = (
  ctx: CanvasRenderingContext2D,
  cues: any[],
  time: number,
  duration: number,
  width: number,
  height: number,
) => {
  const secondLength = 100;
  ctx.font = "16px Arial";
  ctx.moveTo(0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";

  for (let i = 0; i < duration * 10; i += 1) {
    let t = i/10;
    const p = (t - time) * secondLength + (width/2);
    if (p < width && 0 < p) {
      ctx.beginPath();
      ctx.moveTo(p, 20);
      ctx.lineTo(p, t%1 == 0 ? 30 : 24);
      ctx.stroke();
    }
  }
  
  for (let i = 0; i < duration; i ++) {
    const p = (i - time) * secondLength + (width/2);
    if (p < width && 0 < p) {
      ctx.textAlign = "center";
      // ctx.moveTo(p, 0);
      ctx.fillText("" + i%60, p, 18);
    }
  }

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const p1 = (cue.startTime - time) * secondLength + (width/2);
    const p2 = (cue.endTime - time) * secondLength + (width/2);
    if ((p1 < width && 0 < p1) || (p2 < width && 0 < p2) || (p1 < width/2 && width/2 < p2)) {
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(p1, 30, p2 - p1, 50);
      // ctx.stroke();
      // ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.textAlign = "left";
      ctx.fillText(cue.text, p1, 50);
    }
  }

  ctx.beginPath();
  ctx.moveTo(width/2, 0);
  ctx.lineTo(width/2, height);
  ctx.stroke();
};
