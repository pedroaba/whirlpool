import { printDiskBannerColored } from '../utils/out.ts'

export async function runDisk(): Promise<void> {
  await printDiskBannerColored('Disk status')
}
