import type { RegisterClientOptions } from '@peertube/peertube-types/client'
import { PeerTubePlayer } from '@peertube/embed-api'
import vtt from "vtt.js";
import { generateVTT, renderBasics, renderCueTable, renderLanguageSelector } from './render';
import { formatTime } from './util';
import { VideoCaption, VideoDetails } from '@peertube/peertube-types/peertube-models';

const newCueLength = 5;

async function register ({ peertubeHelpers, registerHook, registerClientRoute }: RegisterClientOptions): Promise<void> {
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
      let currentCaptionLanguageId = "";
      let playerStatusEventListener: any;

      renderBasics(rootEl);
      const cuesElement = rootEl.querySelector("#subtitle-cues");
      const videoViewerElement = rootEl.querySelector("#subtitle-video-viewer");
      
      const cueInputElement = rootEl.querySelector<HTMLTextAreaElement>("#subtitle-cue-input");
      const cueAlignElements = rootEl.querySelectorAll<HTMLInputElement>("input[name=subtitle-align]")
      const cueSetStartElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-set-start")
      const cueSetEndElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-set-end")
      const cueInsertCueElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-insert-new")
      const cueSelectCurrentCueElement = rootEl.querySelector<HTMLButtonElement>("#subtitle-select-current")
      const languageListElement = rootEl.querySelector<HTMLDivElement>("#subtitle-languages")
      
      const timestampElement = rootEl.querySelector<HTMLSpanElement>("#subtitle-timestamp");
      const vttResultElement = rootEl.querySelector<HTMLPreElement>("#subtitle-vtt-result");
      if (!cuesElement
        || !videoViewerElement
        || !cueInputElement
        || !cueSetStartElement
        || !cueSetEndElement
        || !cueInsertCueElement
        || !cueSelectCurrentCueElement
        || !timestampElement
        || !languageListElement
        || !vttResultElement) {
        console.warn("unable to render missing stuff")

        return;
      }

      const [_, query] = location.href.split('?')
      if (query) {
        const parameters = query.split('&').map(p => p.split('=')).reduce((acc, [k, v]) => {
          acc[k] = v
          return acc
        }, {} as {[key: string]: string})

        if (parameters.id) {
          const [videoDataRequest, captionsRequest] = await Promise.all([
            fetch(`/api/v1/videos/${parameters.id}`),
            fetch(`/api/v1/videos/${parameters.id}/captions`),
          ]);

          if (captionsRequest.status !== 200 || videoDataRequest.status !== 200) {
            main.innerHTML = "can't find video with id " + parameters.id;
            return;
          }

          const captions: { data: VideoCaption[] } = await captionsRequest.json();
          const captionFiles = await Promise.all(
            captions.data
              .map((d) => fetch(d.captionPath).then(d => d.text()).then(e => e))
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

          const selectLanguage = (languageId: string) => {
            const cues: any[] = [];
            const vttParser = new vtt.WebVTT.Parser(window, vtt.WebVTT.StringDecoder());
            vttParser.oncue = function(cue: any) {
              cues.push(cue);
            };
            vttParser.parse(captionFiles[captions.data.findIndex(c => c.language.id == languageId)]);
            vttParser.flush();
            console.log(cues);

            cueSelectCurrentCueElement.onclick = () => {
              const cue = cues.find(c => c.startTime < videoPosition && videoPosition < c.endTime);
              if (cue) {
                selectCue(cue);
                renderCueTable(cuesElement, cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                vttResultElement.innerText = generateVTT(cues);
              }
            };
            cueInsertCueElement.onclick = () => {
              const cue = new VTTCue(videoPosition, videoPosition + newCueLength, "");
              cues.push(cue);
              selectCue(cue);
              renderCueTable(cuesElement, cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
              vttResultElement.innerText = generateVTT(cues);
            };


            const selectCue = (cue: any) => {
              cueInputElement.value = cue.text;
              cueAlignElements.forEach(el => {
                if (el.value == cue.align) el.checked = true;
                else el.checked = false;

                el.onclick = () => {
                  if (el.checked) {
                    cue.align = el.value;
                    renderCueTable(cuesElement, cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                    vttResultElement.innerText = generateVTT(cues);
                  }
                };

                cueInputElement.onkeyup = () => {
                  cue.text = cueInputElement.value;
                  renderCueTable(cuesElement, cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                  vttResultElement.innerText = generateVTT(cues);
                };
              });

              cueSetStartElement.onclick = () => {
                console.log(videoPosition, cue, cues)
                cue.startTime = videoPosition;
                renderCueTable(cuesElement, cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                vttResultElement.innerText = generateVTT(cues);
              };
              cueSetEndElement.onclick = () => {
                cue.endTime = videoPosition;
                renderCueTable(cuesElement, cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
                vttResultElement.innerText = generateVTT(cues);
              };

              renderCueTable(cuesElement, cues, { time: videoPosition, onCueSelected: (cue => selectCue(cue)) });
            };

            if (playerStatusEventListener) {
              player.removeEventListener("playbackStatusUpdate", playerStatusEventListener);
            }
            playerStatusEventListener = player.addEventListener("playbackStatusUpdate", ({ position }: { position: number }) => {
              if (position != videoPosition) {
                timestampElement.innerText = formatTime(position);

                renderCueTable(cuesElement, cues, { time: position, onCueSelected: (cue => selectCue(cue)) });
                videoPosition = position;

              }
            });

            renderCueTable(cuesElement, cues, { onCueSelected: (cue => selectCue(cue)) });
            vttResultElement.innerText = generateVTT(cues);
            // await fetch(`/api/v1/videos/${parameters.id}/captions/da`, { method: "PUT" })
            // /lazy-static/video-captions/8569c190-8405-4e0e-a89e-fec0c0377f75-da.vtt
          };

          if (!currentCaptionLanguageId && captions.data.length != 0) {
            currentCaptionLanguageId = captions.data[0].language.id;
            selectLanguage(currentCaptionLanguageId);
          }
          renderLanguageSelector(languageListElement, captions.data.map(e => e.language), currentCaptionLanguageId, selectLanguage);
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
