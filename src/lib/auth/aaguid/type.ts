export type AAGUID = {
  name: string;
  icon_dark: string;
  icon_light: string;
}

export type AAGUIDJSON = {
  [aaguid: string]: AAGUID;
}
