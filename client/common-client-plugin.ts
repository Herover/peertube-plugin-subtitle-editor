import type { RegisterClientOptions } from '@peertube/peertube-types/client'
import { PeerTubePlayer } from '@peertube/embed-api'
import vtt from "vtt.js";
import { renderBasics, renderCueTable } from './render';
import { formatTime } from './util';

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

      renderBasics(rootEl);
      const cuesElement = rootEl.querySelector("#subtitle-cues");
      const videoViewerElement = rootEl.querySelector("#subtitle-video-viewer");
      const cueInputElement = rootEl.querySelector<HTMLTextAreaElement>("#subtitle-cue-input");
      const timestampElement = rootEl.querySelector<HTMLSpanElement>("#subtitle-timestamp");
      if (!cuesElement || !videoViewerElement || !cueInputElement || !timestampElement) {
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
          const video = await fetch(`/api/v1/videos/${parameters.id}/captions`)
          console.log("video", video)
          if (video.status !== 200) {
            main.innerHTML = "can't find video with id " + parameters.id;
            return;
          }
          const data = await Promise.all(
            (await video.json()).data
              .map((d: any) => fetch(d.captionPath).then(d => d.text()).then(e => e))
          )
          console.log(data)

          const cues: any[] = [];
          const vttParser = new vtt.WebVTT.Parser(window, vtt.WebVTT.StringDecoder());
          vttParser.oncue = function(cue: any) {
            cues.push(cue);
          };
          vttParser.parse(data[0]);
          vttParser.flush();
          console.log(cues);

          renderCueTable(cuesElement, cues, {});

          const playerIframeEl = document.createElement("iframe");
          playerIframeEl.setAttribute("title", "TV STOP 18. maj deltagere");
          playerIframeEl.setAttribute("width", "100%");
          playerIframeEl.setAttribute("height", "100%");
          playerIframeEl.setAttribute("src", "/videos/embed/" + parameters.id + "?api=1");
          playerIframeEl.setAttribute("frameborder", "0");
          playerIframeEl.setAttribute("allowfullscreen", "");
          playerIframeEl.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups");
          videoViewerElement.appendChild(playerIframeEl);
          let player = new PeerTubePlayer(playerIframeEl);

          let lastPosition = 0;
          player.addEventListener("playbackStatusUpdate", ({ position }: { position: number }) => {
            if (position != lastPosition) {
              timestampElement.innerText = formatTime(position);

              cuesElement.innerHTML = "";
              renderCueTable(cuesElement, cues, { time: position, onCueSelected: (cue => cueInputElement.innerText = cue.text) });
              lastPosition = position;

            }
          });
          // await fetch(`/api/v1/videos/${parameters.id}/captions/da`, { method: "PUT" })
          // /lazy-static/video-captions/8569c190-8405-4e0e-a89e-fec0c0377f75-da.vtt
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
