export const renderCueTable = (cues: any[], time?: number) => {
  const table = document.createElement("table");
  table.setAttribute("class", "cues")


  const head = document.createElement("tr");
  table.appendChild(head);

  let e = document.createElement("th");
  e.innerText = "ID";
  head.appendChild(e);

  e = document.createElement("th");
  e.innerText = "Start time";
  head.appendChild(e);

  e = document.createElement("th");
  e.innerText = "End time";
  head.appendChild(e);

  e = document.createElement("th");
  e.innerText = "Text";
  head.appendChild(e);

  cues.forEach(cue => {
    let isViewed = false;
    if (typeof time == "number") {
      if (cue.startTime < time && time < cue.endTime) {
        isViewed = true;
      }
    }

    const row = document.createElement("tr")
    if (isViewed) {
      row.setAttribute("class", "cue-highlight");
    }

    let e = document.createElement("td");
    e.innerText = cue.id;
    row.appendChild(e);

    e = document.createElement("td");
    e.innerText = cue.startTime;
    row.appendChild(e);

    e = document.createElement("td");
    e.innerText = cue.endTime;
    row.appendChild(e);

    e = document.createElement("td");
    let input = document.createElement("input")
    input.value = cue.text;
    e.appendChild(input);
    row.appendChild(e);

    table.appendChild(row);
  });

  return table;
};
