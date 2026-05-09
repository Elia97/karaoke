export type ParsedTrack = {
  title: string
  artist: string
  filename: string
  durationSeconds: number | null
}

export type CatalogParseResult = {
  tracks: ParsedTrack[]
  skipped: number
}
