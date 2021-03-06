<script>
  /* global Flash */
  import _ from 'underscore';
  import statusCodes from '../../lib/utils/http_status';
  import MonitoringService from '../services/monitoring_service';
  import GraphGroup from './graph_group.vue';
  import Graph from './graph.vue';
  import EmptyState from './empty_state.vue';
  import MonitoringStore from '../stores/monitoring_store';
  import eventHub from '../event_hub';

  export default {

    data() {
      const metricsData = document.querySelector('#prometheus-graphs').dataset;
      const store = new MonitoringStore();

      return {
        store,
        state: 'gettingStarted',
        hasMetrics: gl.utils.convertPermissionToBoolean(metricsData.hasMetrics),
        documentationPath: metricsData.documentationPath,
        settingsPath: metricsData.settingsPath,
        endpoint: metricsData.additionalMetrics,
        deploymentEndpoint: metricsData.deploymentEndpoint,
        showEmptyState: true,
        backOffRequestCounter: 0,
        updateAspectRatio: false,
        updatedAspectRatios: 0,
        resizeThrottled: {},
      };
    },

    components: {
      Graph,
      GraphGroup,
      EmptyState,
    },

    methods: {
      getGraphsData() {
        const maxNumberOfRequests = 3;
        this.state = 'loading';
        gl.utils.backOff((next, stop) => {
          this.service.get().then((resp) => {
            if (resp.status === statusCodes.NO_CONTENT) {
              this.backOffRequestCounter = this.backOffRequestCounter += 1;
              if (this.backOffRequestCounter < maxNumberOfRequests) {
                next();
              } else {
                stop(new Error('Failed to connect to the prometheus server'));
              }
            } else {
              stop(resp);
            }
          }).catch(stop);
        })
        .then((resp) => {
          if (resp.status === statusCodes.NO_CONTENT) {
            this.state = 'unableToConnect';
            return false;
          }
          return resp.json();
        })
        .then((metricGroupsData) => {
          if (!metricGroupsData) return false;
          this.store.storeMetrics(metricGroupsData.data);
          return this.getDeploymentData();
        })
        .then((deploymentData) => {
          if (deploymentData !== false) {
            this.store.storeDeploymentData(deploymentData.deployments);
            this.showEmptyState = false;
          }
          return {};
        })
        .catch(() => {
          this.state = 'unableToConnect';
        });
      },

      getDeploymentData() {
        return this.service.getDeploymentData(this.deploymentEndpoint)
          .then(resp => resp.json())
          .catch(() => new Flash('Error getting deployment information.'));
      },

      resize() {
        this.updateAspectRatio = true;
      },

      toggleAspectRatio() {
        this.updatedAspectRatios = this.updatedAspectRatios += 1;
        if (this.store.getMetricsCount() === this.updatedAspectRatios) {
          this.updateAspectRatio = !this.updateAspectRatio;
          this.updatedAspectRatios = 0;
        }
      },
    },

    created() {
      this.service = new MonitoringService(this.endpoint);
      eventHub.$on('toggleAspectRatio', this.toggleAspectRatio);
    },

    beforeDestroy() {
      eventHub.$off('toggleAspectRatio', this.toggleAspectRatio);
      window.removeEventListener('resize', this.resizeThrottled, false);
    },

    mounted() {
      this.resizeThrottled = _.throttle(this.resize, 600);
      if (!this.hasMetrics) {
        this.state = 'gettingStarted';
      } else {
        this.getGraphsData();
        window.addEventListener('resize', this.resizeThrottled, false);
      }
    },
  };
</script>

<template>
  <div v-if="!showEmptyState" class="prometheus-graphs">
    <graph-group
      v-for="(groupData, index) in store.groups"
      :key="index"
      :name="groupData.group"
    >
      <graph
        v-for="(graphData, index) in groupData.metrics"
        :key="index"
        :graph-data="graphData"
        :update-aspect-ratio="updateAspectRatio"
        :deployment-data="store.deploymentData"
      />
    </graph-group>
  </div>
  <empty-state
    v-else
    :selected-state="state"
    :documentation-path="documentationPath"
    :settings-path="settingsPath"
  />
</template>
