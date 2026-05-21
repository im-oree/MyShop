const fallbackApiKeys = [
  '5ad519ab4325c180abf6a7fc1ef8387c',
  'dd2db249754960998363e293209774b0',
  '24673ee1aee036884973dc6e4fa3378b',
  'ef73a1a3c74f86bff4590cd0888c961d',
]

const configuredKeys = (import.meta.env.VITE_IMGBB_API_KEYS as string | undefined)
  ?.split(',')
  .map((key) => key.trim())
  .filter(Boolean) || []

const apiKeys = configuredKeys.length > 0 ? configuredKeys : fallbackApiKeys

function shuffle<T>(items: T[]): T[] {
  const cloned = [...items]
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]]
  }
  return cloned
}

async function uploadWithKey(file: File, apiKey: string): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json()
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message || `IMGBB upload failed with key ${apiKey.slice(0, 6)}...`)
  }

  const imageUrl = payload.data?.display_url || payload.data?.url || payload.data?.thumb?.url
  if (!imageUrl) {
    throw new Error('IMGBB did not return an image URL')
  }

  return imageUrl
}

export async function uploadImagesToImgbb(files: File[] | FileList): Promise<string[]> {
  const fileList = Array.from(files).filter(Boolean)
  if (fileList.length === 0) return []

  const keyPool = shuffle(apiKeys)

  return Promise.all(
    fileList.map(async (file) => {
      let lastError: unknown = null

      for (const key of keyPool) {
        try {
          return await uploadWithKey(file, key)
        } catch (error) {
          lastError = error
        }
      }

      throw lastError instanceof Error ? lastError : new Error('Failed to upload image')
    })
  )
}
