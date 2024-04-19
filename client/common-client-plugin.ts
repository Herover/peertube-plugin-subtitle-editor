import type { RegisterClientOptions } from '@peertube/peertube-types/client'
import { PeerTubePlayer } from '@peertube/embed-api'
import vtt from "vtt.js";
import { generateVTT, renderBasics, renderCueTable, renderLanguageList, renderLanguageSelector, renderTimeline, TimelineClickBox, timelineSecondLength } from './render';
import { formatTime } from './util';
import { VideoCaption, VideoDetails } from '@peertube/peertube-types/peertube-models';

const newCueLength = 5;

const getVTTDataFromUrl = async (url: string) => {
  return await fetch(url).then(d => d.text()).then(data => {
    let cues: any[] = [];
    const vttParser = new vtt.WebVTT.Parser(window, vtt.WebVTT.StringDecoder());
    vttParser.oncue = (cue: any) => {
      cues.push(cue);
    };
    vttParser.parse(data);
    vttParser.flush();

    return { cues };
  });
};

async function register ({
  peertubeHelpers,
  registerHook,
  registerClientRoute,
}: RegisterClientOptions): Promise<void> {
  // const message = await peertubeHelpers.translate('Hello world')

  registerHook({
    target: 'action:video-edit.init',
    handler: (data: any) => {
      console.log(data)

      const videoId = window.location.pathname.match(/(?!\/)[\d\w\-]*$/);
      if (!videoId || videoId.length == 0) {
        console.log("No id found")
        return;
      }
      const link = document.createElement("a")
      link.innerText = 'Open subtitle editor'
      link.classList.add("nav-link")
      link.classList.add("nav-item")
      link.href = "/p/subtitles?id=" + videoId[0]
      document.querySelector('.video-edit .nav-tabs')?.appendChild(link)
    }
  })

  registerClientRoute({
    route: 'subtitles',
    onMount: async ({ rootEl }: { rootEl: HTMLDivElement }) => {
      const main = document.createElement("div");
      main.setAttribute("class", "margin-content row");
      rootEl.appendChild(main);
      
      let videoPosition = 0;
      let videoDuration = 1;
      let videoIsPlaying = false;
      let currentCaptionLanguageId = "";
      // Contains current player status fn, must be kept around so we can remove it later
      let playerStatusCallback: any;

      // Minimum number of seconds between a cue endTime and next cue startTime
      let cueMinSpace = 0.1; // TODO: make configureable

      renderBasics(rootEl);
      const cuesElement = rootEl.querySelector("#subtitle-cues");
      const videoViewerElement = rootEl.querySelector("#subtitle-video-viewer");
      
      const cueInputElement = rootEl.querySelector<HTMLTextAreaElement>("#subtitle-cue-input");
      const cueSetStartElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-set-start")
      const cueSetEndElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-set-end")
      const cueInsertCueElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-insert-new")
      const cueSelectCurrentCueElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-select-current")
      const languageListElement = rootEl.querySelector<HTMLDivElement>("#subtitle-languages")
      const seekPlusElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-seek-plus-1");
      const pausePlayElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-pause-play");
      const seekMinusElement = rootEl.querySelector<HTMLDivElement>("#subtitle-seek-minus-1");
      const addNewLanguageListElement = rootEl.querySelector<HTMLSelectElement>("#subtitle-add-language-list");
      const addNewLanguageElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-add");
      const addCopyLanguageElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-add-copy");
      const saveCurrentLanguageElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-save");
      const deleteCurrentLanguageElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-delete");
      const timelineElement = rootEl.querySelector<HTMLCanvasElement>("#subtitle-timeline");
      const padCuesElement = rootEl.querySelector<HTMLInputElement>("#subtitle-pad-cues");
      const deleteCueElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-delete-cue");
      
      const timestampElement = rootEl.querySelector<HTMLSpanElement>("#subtitle-timestamp");
      const vttResultElement = rootEl.querySelector<HTMLPreElement>("#subtitle-vtt-result");
      if (!cuesElement
        || !videoViewerElement
        || !seekPlusElement
        || !pausePlayElement
        || !seekMinusElement
        || !cueInputElement
        || !cueSetStartElement
        || !cueSetEndElement
        || !cueInsertCueElement
        || !cueSelectCurrentCueElement
        || !timestampElement
        || !languageListElement
        || !addNewLanguageListElement
        || !addNewLanguageElement
        || !addCopyLanguageElement
        || !saveCurrentLanguageElement
        || !deleteCurrentLanguageElement
        || !timelineElement
        || !padCuesElement
        || !deleteCueElement
        || !vttResultElement) {
        console.warn("unable to render missing stuff");
        alert("Something didn't load properly");

        return;
      }

      const [_, query] = location.href.split('?')
      if (query) {
        const parameters = query.split('&').map(p => p.split('=')).reduce((acc, [k, v]) => {
          acc[k] = v
          return acc
        }, {} as {[key: string]: string})

        if (parameters.id) {
          const [
            videoDataRequest,
            captionsRequest,
            languagesRequest,
          ] = await Promise.all([
            fetch(`/api/v1/videos/${parameters.id}`),
            fetch(`/api/v1/videos/${parameters.id}/captions`),
            fetch("/api/v1/videos/languages"),
          ]);

          if (captionsRequest.status !== 200 || videoDataRequest.status !== 200) {
            main.innerHTML = "can't find video with id " + parameters.id;
            return;
          }

          const captions: { data: VideoCaption[] } = await captionsRequest.json();
          let captionList = await Promise.all(captions.data.map(async c => ({
            id: c.language.id,
            label: c.language.label,
            url: c.captionPath,
            changed: false,
            cues: (await getVTTDataFromUrl(c.captionPath)).cues,
          })));

          let timelineContext = timelineElement.getContext("2d");

          const languages: { [id: string]: string } = await languagesRequest.json();
          renderLanguageList(
            addNewLanguageListElement,
            Object.keys(languages)
              .map(id => ({ id, label: languages[id], disabled: captionList.findIndex(c => c.id == id) != -1 }))
              .sort((a, b) => a.label.localeCompare(b.label)),
          );
          
          const videoData: VideoDetails = await videoDataRequest.json();

          const playerIframeEl = document.createElement("iframe");
          playerIframeEl.setAttribute("title", videoData.name);
          playerIframeEl.setAttribute("width", "100%");
          playerIframeEl.setAttribute("height", "100%");
          playerIframeEl.setAttribute("src", "/videos/embed/" + parameters.id + "?api=1");
          playerIframeEl.setAttribute("frameborder", "0");
          playerIframeEl.setAttribute("allowfullscreen", "");
          playerIframeEl.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups");
          videoViewerElement.appendChild(playerIframeEl);
          let player = new PeerTubePlayer(playerIframeEl);
          seekPlusElement.onclick = async () => player.seek(videoPosition + 1);
          pausePlayElement.onclick = async () => videoIsPlaying ? player.pause() : player.play();
          seekMinusElement.onclick = async () => player.seek(videoPosition - 1);

          padCuesElement.checked = cueMinSpace == 0 ? false : true;
          padCuesElement.onclick = (e) => {
            cueMinSpace = (e.target as HTMLInputElement).checked ? 0.1 : 0;
          };

          const selectLanguage = (languageId: string) => {
            currentCaptionLanguageId = languageId;
            const captionData = captionList.find(e => e.id == currentCaptionLanguageId);
            if (!captionData) {
              alert("Could not find captions that was expected to be here: " + currentCaptionLanguageId);
              return;
            }

            cueInputElement.setAttribute("lang", languageId);

            renderLanguageSelector(
              languageListElement,
              captionList,
              currentCaptionLanguageId,
              selectLanguage,
            );

            cueSelectCurrentCueElement.onclick = () => {
              const cue = captionData.cues.find(c => c.startTime < videoPosition && videoPosition < c.endTime);
              if (cue) {
                selectCue(cue);
                renderCueTable(cuesElement, captionData.cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                // vttResultElement.innerText = generateVTT(cues);
              }
            };
            cueInsertCueElement.onclick = () => {
              const cue = new VTTCue(videoPosition, videoPosition + newCueLength, "");
              captionData.cues.push(cue);
              captionData.cues.sort((a, b) => a.startTime - b.startTime);
              selectCue(cue);
              renderCueTable(cuesElement, captionData.cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
              // vttResultElement.innerText = generateVTT(cues);
            };


            const selectCue = (cue: any | null) => {
              if (cue == null) {
                cueInputElement.value = "";
                cueInputElement.disabled = true;
                cueSetStartElement.disabled = true;
                cueSetEndElement.disabled = true;
                deleteCueElement.disabled = true;
                return;
              }
              cueInputElement.disabled = false;
              cueSetStartElement.disabled = false;
              cueSetEndElement.disabled = false;
              deleteCueElement.disabled = false;

              cueInputElement.value = cue.text;

              cueInputElement.onkeyup = () => {
                cue.text = cueInputElement.value;
                captionData.changed = true;
                renderCueTable(cuesElement, captionData.cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                renderLanguageSelector(
                  languageListElement,
                  captionList,
                  currentCaptionLanguageId,
                  selectLanguage,
                );
                // vttResultElement.innerText = generateVTT(cues);
              };

              cueSetStartElement.onclick = () => {
                console.log(videoPosition, cue, captionData.cues)
                cue.startTime = videoPosition;
                captionData.changed = true;
                renderCueTable(cuesElement, captionData.cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                renderLanguageSelector(
                  languageListElement,
                  captionList,
                  currentCaptionLanguageId,
                  selectLanguage,
                );
                // vttResultElement.innerText = generateVTT(cues);
              };
              cueSetEndElement.onclick = () => {
                cue.endTime = videoPosition;
                captionData.changed = true;
                renderCueTable(cuesElement, captionData.cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                renderLanguageSelector(
                  languageListElement,
                  captionList,
                  currentCaptionLanguageId,
                  selectLanguage,
                );
                // vttResultElement.innerText = generateVTT(cues);
              };

              deleteCueElement.onclick = () => {
                captionData.cues = captionData.cues.filter(c => c != cue);
                renderCueTable(cuesElement, captionData.cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                selectCue(null);
              }

              renderCueTable(cuesElement, captionData.cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
            };
            selectCue(null);

            if (playerStatusCallback) {
              player.removeEventListener("playbackStatusUpdate", playerStatusCallback);
            }
            playerStatusCallback = ({ position, playbackState, duration }: { position: number, playbackState: string, duration: string }) => {
              if (position != videoPosition) {
                videoPosition = position;
                videoIsPlaying = playbackState == "playing";
                videoDuration = Number.parseInt(duration);

                timestampElement.innerText = formatTime(position);

                renderCueTable(cuesElement, captionData.cues, { time: position, onCueSelected: (cue => selectCue(cue)) });
              }
            };
            player.addEventListener(
              "playbackStatusUpdate",
              playerStatusCallback
            );

            saveCurrentLanguageElement.onclick = async () => {
              if (currentCaptionLanguageId) {
                let formData = new FormData();
                formData.append('captionfile', new Blob(generateVTT(captionData.cues).split("")), currentCaptionLanguageId + ".vtt");
                const res = await fetch(
                  `/api/v1/videos/${parameters.id}/captions/${currentCaptionLanguageId}`,
                  {
                    method: "PUT",
                    body: formData,
                    credentials: 'include', 
                    withCredentials: true,
                    headers: {
                      "authorization": "Bearer " + localStorage.getItem("access_token") || "",
                    },
                  } as any,
                );
                if (res.status == 204) {
                  captionData.changed = false;
                  renderLanguageSelector(
                    languageListElement,
                    captionList,
                    currentCaptionLanguageId,
                    selectLanguage,
                  );
                }
                // /lazy-static/video-captions/8569c190-8405-4e0e-a89e-fec0c0377f75-da.vtt
              }
            };

            let mouseDown: { x: number, y: number, box?: TimelineClickBox } | null = null;
            let lastTimelineRender = 0;
            const updateTimeline = (t: number) => {
              if (videoIsPlaying) {
                videoPosition += (t-lastTimelineRender)/1000;
                timestampElement.innerText = formatTime(videoPosition);
              }
              lastTimelineRender = t;
              timelineContext = timelineElement.getContext("2d");
              const width = timelineElement.parentElement?.offsetWidth || 400;
              const height = 200;
              // Make it look good on retina displays, zoomed in browsers...
              const scale = window.devicePixelRatio;
              timelineElement.width = Math.floor(width * scale);
              timelineElement.height = Math.floor(height * scale);
              timelineElement.style.width = width + "px";
              timelineElement.style.height = height + "px";
              if (timelineContext) {
                timelineContext.scale(scale, scale);
                const boxes = renderTimeline(
                  timelineContext,
                  captionData.cues,
                  videoPosition,
                  videoDuration,
                  width,
                  height,
                );

                const getBoxAtPosition = (e: MouseEvent) => {
                  const rect = (e as any).target.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  return boxes.find(box => {
                    if (box.x1 < x && x < box.x2 && box.y1 < y && y < box.y2) {
                      return true;
                    }
    
                    return false;
                  });
                }

                timelineElement.onmousemove = (e) => {
                  const box = getBoxAtPosition(e);
                  if (box) {
                    if (box.type == 'cue') {
                      timelineElement.style.cursor = "pointer";
                      timelineElement.onclick = () => selectCue(box.cue);
                    }
                    if (box.type == "cueStart") {
                      timelineElement.style.cursor = "ew-resize";
                      
                    }
                    if (box.type == "cueEnd") {
                      timelineElement.style.cursor = "ew-resize";
                    }
                  } else {
                    timelineElement.style.cursor = "grab";
                  }

                  if (mouseDown) {
                    if (mouseDown?.box?.type == "cueEnd") {
                      const newTime = mouseDown.box.cue.endTime + e.movementX/timelineSecondLength;
                      if (
                        cueMinSpace == 0 ||
                        !captionData.cues.find(other =>
                          other.startTime - cueMinSpace < newTime &&
                          other.startTime > newTime - cueMinSpace
                        )
                      ) {
                        mouseDown.box.cue.endTime = newTime;
                        if (!captionData.changed) {
                          captionData.changed = true;
                          renderLanguageSelector(
                            languageListElement,
                            captionList,
                            currentCaptionLanguageId,
                            selectLanguage,
                          );
                        }
                      }
                    } else if (mouseDown?.box?.type == "cueStart") {
                      const newTime = mouseDown.box.cue.startTime + e.movementX/timelineSecondLength;
                      if (
                        cueMinSpace == 0 ||
                        !captionData.cues.find(other =>
                          other.endTime - cueMinSpace < newTime &&
                          other.endTime > newTime - cueMinSpace
                        )
                      ) {
                        mouseDown.box.cue.startTime = newTime;
                        if (!captionData.changed) {
                          captionData.changed = true;
                          renderLanguageSelector(
                            languageListElement,
                            captionList,
                            currentCaptionLanguageId,
                            selectLanguage,
                          );
                        }
                      }
                    } else if(!mouseDown.box) {
                      videoPosition -= e.movementX/timelineSecondLength;
                      player.seek(videoPosition);
                      timestampElement.innerText = formatTime(videoPosition);
                    }
                  }
                }
                timelineElement.onmousedown = (e) => {
                  const rect = (e as any).target.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const box = getBoxAtPosition(e);
                  mouseDown = { x, y, box };
                };
                timelineElement.onmouseup = () => {
                  mouseDown = null;
                };
              }

              if (currentCaptionLanguageId == languageId) {
                requestAnimationFrame(updateTimeline);
              }
            };
            requestAnimationFrame(updateTimeline);

            renderCueTable(cuesElement, captionData.cues, { onCueSelected: (cue => selectCue(cue)) });
            // vttResultElement.innerText = generateVTT(cues);
          };

          if (!currentCaptionLanguageId && captions.data.length != 0) {
            currentCaptionLanguageId = captions.data[0].language.id;
            selectLanguage(currentCaptionLanguageId);
          }
          renderLanguageSelector(
            languageListElement,
            captionList,
            currentCaptionLanguageId,
            selectLanguage,
          );

          addNewLanguageElement.onclick = () => {
            captionList.push({
              changed: true,
              id: addNewLanguageListElement.value,
              label: languages[addNewLanguageListElement.value],
              url: "",
              cues: [],
            });
            selectLanguage(addNewLanguageListElement.value);
          };

          addCopyLanguageElement.onclick = async () => {
            const existing = captionList.find(e => e.id == addNewLanguageListElement.value);
            if (existing) {
              captionList.push({
                changed: true,
                id: addNewLanguageListElement.value,
                label: languages[addNewLanguageListElement.value],
                url: "",
                cues: (await getVTTDataFromUrl(existing.url)).cues,
              });
              selectLanguage(addNewLanguageListElement.value);
            }
          };

          deleteCurrentLanguageElement.onclick = () => {
            if (currentCaptionLanguageId) {
              peertubeHelpers.showModal({
                title: "Delete?",
                content: `Confirm that you want to delete ${currentCaptionLanguageId}`,
                cancel: {
                  value: "Cancel",
                },
                confirm: {
                  value: "Delete",
                  action: async () => {
                    const res = await fetch(`/api/v1/videos/${parameters.id}/captions/${currentCaptionLanguageId}`, {
                      method: "DELETE",
                      credentials: 'include',
                      headers: {
                        "authorization": "Bearer " + localStorage.getItem("access_token") || "",
                      },
                    });
                    
                    if (res.status == 204) {
                      captionList = captionList.filter(e => e.id != currentCaptionLanguageId);
                      if (captionList.length != 0) {
                        selectLanguage(captionList[0].id);
                      }
                    } else {
                      alert("Could not delete");
                    }
                  },
                },
              });
            }
          };
        } else {
          main.innerHTML = 'no video id'
        }
      }
    }
  })
}

export {
  register
}
