import { useDataSourceStore } from '@/store/dataSources'
import { useDataLoaderStore } from '@/store/dataLoaders'
import { useDatastreamStore } from '@/store/datastreams'
import { computed, onMounted, ref, toRaw } from 'vue'
import { storeToRefs } from 'pinia'

export function useDataSources() {
  const dataSourceStore = useDataSourceStore()
  const dataLoaderStore = useDataLoaderStore()
  const { fetchDatastreams } = useDatastreamStore()
  const { datastreams } = storeToRefs(useDatastreamStore())

  const selectedDataSource = ref(null)
  const dataSourcesLoaded = computed(() => dataSourceStore.loaded)
  const updatingDataSource = ref(false)

  const dataSources = computed(() => {
    if (!dataLoaderStore.loaded || !dataSourceStore.loaded) return []
    return dataSourceStore.dataSources.map((dataSource) => {
      {
        let status
        let dataLoader = dataLoaderStore.dataLoaders.filter(
          (dl) => dl.id === dataSource.dataLoaderId
        )[0]
        let statusTip = null
        let now = new Date()
        let dataSourceThru = dataSource['dataSourceThru']
          ? new Date(Date.parse(dataSource['dataSourceThru']))
          : null
        let lastSynced = dataSource['lastSynced']
          ? new Date(Date.parse(dataSource['lastSynced']))
          : null
        let nextSync = dataSource['nextSync']
          ? new Date(Date.parse(dataSource['nextSync']))
          : null

        if (lastSynced == null) {
          status = 'pending'
        } else if (
          dataSource['lastSyncSuccessful'] &&
          nextSync &&
          nextSync >= now
        ) {
          status = 'ok'
        } else if (dataSourceThru == null) {
          status = 'bad'
          statusTip =
            'Some datastreams from this data source may not be synced with HydroServer.'
        } else if (!dataSource['lastSyncSuccessful']) {
          status = 'bad'
          statusTip = 'Last data loading job failed.'
        } else if (nextSync && nextSync < now) {
          status = 'stale'
        } else {
          status = 'bad'
        }

        let filteredDatastreams = Object.values(datastreams.value)
          .flat(1)
          .filter((ds) => ds.dataSourceId === dataSource.id)

        return {
          ...dataSource,
          status: status,
          statusTip: statusTip,
          dataLoaderName: dataLoader.name,
          dataLoader: dataLoader,
          datastreams: filteredDatastreams,
        }
      }
    })
  })

  async function togglePaused() {
    if (!selectedDataSource.value) return
    let dataSource = structuredClone(
      toRaw(dataSourceStore.getById(selectedDataSource.value))
    )
    updatingDataSource.value = true
    dataSource.paused = !dataSource.paused
    await dataSourceStore.updateDataSource(dataSource)
    updatingDataSource.value = false
  }

  async function createDataSource() {
    let dataSource = selectedDataSource.value
    if (!dataSource) return
    updatingDataSource.value = true
    await dataSourceStore.createDataSource(dataSource)
    updatingDataSource.value = false
  }

  async function updateDataSource() {
    let dataSource = selectedDataSource.value
    if (!dataSource) return
    updatingDataSource.value = true
    await dataSourceStore.updateDataSource(dataSource)
    updatingDataSource.value = false
  }

  async function deleteDataSource() {
    let dataSourceId = selectedDataSource.value
    if (dataSourceId) {
      updatingDataSource.value = true
      await dataSourceStore.deleteDataSource(dataSourceId)
      updatingDataSource.value = false
    }
  }

  async function reloadDataSources() {
    await dataSourceStore.fetchDataSources(true)
    await dataLoaderStore.fetchDataLoaders(true)
    await fetchDatastreams(true)
  }

  onMounted(async () => {
    await dataSourceStore.fetchDataSources(true)
  })

  onMounted(async () => {
    await dataLoaderStore.fetchDataLoaders(true)
  })

  onMounted(async () => {
    await fetchDatastreams(true)
  })

  return {
    selectedDataSource,
    dataSources,
    dataSourcesLoaded,
    updatingDataSource,
    reloadDataSources,
    togglePaused,
    createDataSource,
    updateDataSource,
    deleteDataSource,
  }
}
