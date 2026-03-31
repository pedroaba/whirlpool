export {
  browserExtraCachePaths,
  executeCacheClean,
  planCacheClean,
  type CacheCleanPlan,
} from './cache.ts'
export {
  emptyTrashMacOS,
  listTrashEntries,
  movePathsToTrashMacOS,
  purgeTrashFolderContents,
  trashDir,
  trashTotalBytes,
  TrashAccessError,
  type TrashEntry,
} from './trash.ts'
