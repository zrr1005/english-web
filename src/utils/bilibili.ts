/**
 * Bilibili subtitle extractor.
 *
 * Flow:
 *   B站链接 → 提取 BV号 → 获取 cid → 获取字幕列表 → 下载字幕 JSON → 解析分句
 *
 * Production proxy: /api/bilibili/*  → api.bilibili.com/*
 * Production proxy: /api/subtitle/*  → i0.hdslb.com/*
 */

const BILIBILI_PROXY = '/api/bilibili'
const SUBTITLE_PROXY = '/api/subtitle'

interface SubtitleItem {
  from: number
  to: number
  content: string
}

/**
 * Extract BV id from a Bilibili URL.
 * Supports: b23.tv short links, standard watch links, embed links
 */
export function extractBvid(url: string): string | null {
  // Standard: https://www.bilibili.com/video/BV1xx411c7mD
  const bvMatch = url.match(/BV[a-zA-Z0-9]{10}/)
  if (bvMatch) return bvMatch[0]

  // Short: https://b23.tv/xxxxx
  if (/b23\.tv/.test(url)) return null // b23.tv requires HTTP redirect resolution

  return null
}

/**
 * Check if a URL is a Bilibili link
 */
export function isBilibiliUrl(url: string): boolean {
  return /bilibili\.com|b23\.tv/.test(url)
}

/**
 * Fetch pagelist (get cid) for a BV id
 */
async function getPageList(bvid: string): Promise<{ cid: number; part: string }[]> {
  const res = await fetch(`${BILIBILI_PROXY}/x/player/pagelist?bvid=${bvid}`)
  const json = await res.json()
  if (json.code !== 0 || !json.data) {
    throw new Error('Failed to get video info: ' + (json.message || 'unknown error'))
  }
  return json.data
}

/**
 * Fetch subtitle list for a given bvid + cid
 */
async function getSubtitleList(bvid: string, cid: number) {
  const res = await fetch(
    `${BILIBILI_PROXY}/x/player/v2?bvid=${bvid}&cid=${cid}`,
    { headers: { Referer: 'https://www.bilibili.com' } }
  )
  const json = await res.json()
  if (json.code !== 0) {
    throw new Error('Failed to get subtitle list')
  }
  return json.data?.subtitle?.subtitles || []
}

/**
 * Download and parse a Bilibili subtitle JSON file
 */
async function downloadSubtitle(subtitleUrl: string): Promise<SubtitleItem[]> {
  // Subtitle URLs are like: //i0.hdslb.com/bfs/ai_subtitle/xxxxx.json
  // Remove protocol prefix for proxy
  const url = subtitleUrl.replace(/^https?:/, '')
  const proxyUrl = `${SUBTITLE_PROXY}${url}`

  const res = await fetch(proxyUrl)
  const json = await res.json()
  return json.body || []
}

/**
 * Main: fetch subtitles from a Bilibili video URL
 * Returns raw subtitle text joined as a single string
 */
export async function fetchBilibiliSubtitles(videoUrl: string): Promise<{
  title: string
  subtitles: string
  parts: { cid: number; part: string }[]
}> {
  const bvid = extractBvid(videoUrl)
  if (!bvid) throw new Error('Could not extract BV ID from URL')

  // Get page list
  const pages = await getPageList(bvid)
  if (pages.length === 0) throw new Error('No video parts found')

  // Get subtitles for each part
  const allText: string[] = []

  for (const page of pages) {
    const subtitleList = await getSubtitleList(bvid, page.cid)

    if (subtitleList.length === 0) {
      // No subtitles for this part — skip
      continue
    }

    // Pick English subtitle first, then any
    const enSub = subtitleList.find((s: any) =>
      s.lang_key?.includes('en') || s.lan_doc?.includes('English')
    )
    const target = enSub || subtitleList[0]

    const items = await downloadSubtitle(target.subtitle_url)
    const text = items.map((item) => item.content).join(' ')
    allText.push(text)
  }

  if (allText.length === 0) {
    throw new Error('No subtitles found. This video may not have subtitles.')
  }

  return {
    title: `Bilibili: ${bvid}`,
    subtitles: allText.join('\n\n'),
    parts: pages,
  }
}
