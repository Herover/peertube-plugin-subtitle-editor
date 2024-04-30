export interface Cue {
  id: string,
  startTime: number,
  endTime: number,
  text: string,
  // How to style entire text string
  style: TextSTyle,
  /** Not used by Peertube */
  align: string,
}

export enum TextSTyle {
  NONE = "",
  BOLD = "b",
  ITALIC = "i",
  UNDERLINE = "u",
}
