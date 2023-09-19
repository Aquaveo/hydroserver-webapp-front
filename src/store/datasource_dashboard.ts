import { ENDPOINTS } from '@/constants'
import { defineStore } from 'pinia'
import { api } from '@/utils/api/apiMethods'

interface DataSource {
  id: string
  name: string
  location: string
  status: string
  statusTip: string
  paused: boolean
  data_source_thru: string
  database_thru: string
  last_sync_successful: boolean
  last_synced: string
  next_sync: string
  linked_datastreams: number
}

interface DataSources {
  [key: string]: DataSource
}

interface DataSourceDashboard {
  dataSources: DataSources
}

export const useDataSourceDashboardStore = defineStore(
  'data-source-dashboard-store',
  {
    state: (): DataSourceDashboard => ({
      dataSources: {},
    }),
    getters: {
      dataSourceRows(state) {
        return Object.values(state.dataSources).map((dataSource) => {
          return dataSource
        })
      },
    },
    actions: {
      async fetchDataSources() {
        const dataStreams = await api.fetch(ENDPOINTS.DATA_SOURCES)
        this.dataSources = dataStreams.data.reduce(
          (dataSources: any, dataSource: any) => {
            let status
            let statusTip = null
            let now = new Date()
            let databaseThruUpper = dataSource['database_thru_upper']
              ? new Date(Date.parse(dataSource['database_thru_upper']))
              : null
            let databaseThruLower = dataSource['database_thru_lower']
              ? new Date(Date.parse(dataSource['database_thru_lower']))
              : null
            let dataSourceThru = dataSource['data_source_thru']
              ? new Date(Date.parse(dataSource['data_source_thru']))
              : null
            let lastSynced = dataSource['last_synced']
              ? new Date(Date.parse(dataSource['last_synced']))
              : null
            let nextSync = dataSource['next_sync']
              ? new Date(Date.parse(dataSource['next_sync']))
              : null

            if (lastSynced == null) {
              status = 'pending'
            } else if (
              databaseThruUpper?.valueOf() === databaseThruLower?.valueOf() &&
              databaseThruUpper?.valueOf() === dataSourceThru?.valueOf() &&
              dataSource['last_sync_successful'] === true &&
              nextSync &&
              nextSync >= now
            ) {
              status = 'ok'
            } else if (dataSourceThru == null) {
              status = 'bad'
              statusTip =
                'Some datastreams from this data source may not be synced with HydroServer.'
            } else if (
              databaseThruUpper &&
              dataSourceThru &&
              databaseThruUpper < dataSourceThru
            ) {
              status = 'bad'
              statusTip = 'This data source is not synced with HydroServer.'
            } else if (
              databaseThruLower &&
              databaseThruUpper &&
              databaseThruLower < databaseThruUpper
            ) {
              status = 'bad'
              statusTip =
                'Some datastreams from this data source are not synced with HydroServer.'
            } else if (dataSource['last_sync_successful'] === false) {
              status = 'bad'
              statusTip = 'Last data loading job failed.'
            } else if (nextSync && nextSync < now) {
              status = 'stale'
            } else {
              status = 'unknown'
            }

            dataSources[dataSource['id']] = {
              id: dataSource['id'],
              name: dataSource['name'],
              data_loader: (dataSource['data_loader'] || {})['name'],
              location: dataSource['file_access']['path'],
              status: status,
              statusTip: statusTip,
              paused: dataSource['schedule']['paused'],
              data_source_thru: dataSourceThru
                ? dataSourceThru.toUTCString()
                : null,
              database_thru: databaseThruUpper
                ? databaseThruUpper.toUTCString()
                : null,
              last_sync_successful: dataSource['last_sync_successful'],
              last_synced: lastSynced ? lastSynced.toUTCString() : null,
              next_sync: nextSync ? nextSync.toUTCString() : null,
              linked_datastreams: dataSource['datastreams'].length,
            }
            return dataSources
          },
          {}
        )
      },
      async updateDataSourceStatus(dataSourceId: string, paused: boolean) {
        const body = { schedule: { paused: !paused } }
        await api.patch(ENDPOINTS.DATA_SOURCES.ID(dataSourceId), body)
      },
      async deleteDataSource(dataSourceId: string) {
        await api.delete(ENDPOINTS.DATA_SOURCES.ID(dataSourceId))
      },
    },
  }
)
