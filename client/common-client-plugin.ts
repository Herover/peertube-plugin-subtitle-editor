import type { RegisterClientOptions } from '@peertube/peertube-types/client'
import { PeerTubePlayer } from '@peertube/embed-api'
import vtt from "vtt.js";
import { renderCueTable } from './render';

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
    onMount: async ({ rootEl }: any) => {
      const main = document.createElement("div");
      main.setAttribute("class", "margin-content row");
      rootEl.appendChild(main);

      const cueEl = document.createElement("div")
      cueEl.setAttribute("class", "col-md-6")
      main.appendChild(cueEl);

      const playerEl = document.createElement("div")
      playerEl.setAttribute("class", "col-md-6")
      main.appendChild(playerEl);

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

          cueEl.appendChild(renderCueTable(cues));

          const playerIframeEl = document.createElement("iframe");
          playerIframeEl.setAttribute("title", "TV STOP 18. maj deltagere");
          playerIframeEl.setAttribute("width", "560");
          playerIframeEl.setAttribute("height", "315");
          playerIframeEl.setAttribute("src", "/videos/embed/" + parameters.id + "?api=1");
          playerIframeEl.setAttribute("frameborder", "0");
          playerIframeEl.setAttribute("allowfullscreen", "");
          playerIframeEl.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups");
          playerEl.appendChild(playerIframeEl);
          let player = new PeerTubePlayer(playerIframeEl);

          let lastPosition = 0;
          player.addEventListener("playbackStatusUpdate", ({ position }: { position: number }) => {
            if (position != lastPosition) {
              cueEl.innerHTML = "";
              cueEl.appendChild(renderCueTable(cues, position));
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
