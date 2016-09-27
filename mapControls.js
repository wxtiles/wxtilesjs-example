import React from 'react'
import ReactDOM from 'react-dom'
import generateUrl from './mapOverlay/generateUrl'
import legends from './mapOverlay/legends'
import _ from 'lodash'
import timeSlider from './mapOverlay/timeSlider'
import moment from 'moment'
import wxtiles from './wxtiles'

var findBestTimeStepsForEachLayer = ({layers, time}) => {
  time = moment.utc(time)
  return _.map(layers, (layer) => {
    var allTimesForLayer = _.map(layer.times, (t) => moment.utc(t, 'YYYY-MM-DDTHH:mm:ss[Z]'))
    allTimesForLayer = _.sortBy(allTimesForLayer, (t) => +t)

    var timeToSelect = null
    _.forEach(allTimesForLayer, (timeForLayer, key) => {
      if(timeToSelect) return
      if (time.isBefore(timeForLayer)) return
      if (time.isAfter(allTimesForLayer[key+1])) return
      timeToSelect = timeForLayer
    })
    layer.time = null
    if(timeToSelect) layer.time = timeToSelect.format('YYYY-MM-DDTHH:mm:ss[Z]')
    return layer
  })
}

var updateVisibleUrls = ({layers, onSuccess}) => {
  var scopedLayers = _.cloneDeep(layers)
  Promise.all(_.map(scopedLayers, (layer) => {
    return new Promise((resolve, reject) => {
      layer.visibleUrl = null
      if (!layer.time) return resolve(layer)
      wxtiles.getTileLayerUrl({
        layerId: layer.id,
        instanceId: layer.instanceId,
        time: layer.time,
        level: 0,
        onSuccess: (url) => {
          layer.visibleUrl = url
          resolve(layer)
        }
      })
    })
  })).then(onSuccess)
}

class mapControls extends React.Component {
  constructor() {
    super()
    this.state = {}
    this.updateMapOptions = this.updateMapOptions.bind(this)
  }

  componentWillMount() {
  }

  updateMapOptions({mapOptions}) {
    this.props.updateMapOptions({mapOptions})
  }

  render() {
    var layers = this.props.mapOptions.layers
    layers = _.filter(layers, (layer) => layer != null)
    var legendsDatums = _.map(legendsDatums, (layer) => {
      return {
        label: layer.label,
        url: layer.legendUrl,
        layerId: layer.id,
        instanceId: layer.instanceId
      }
    })

    var hardCodedTimes = this.props.mapOptions.hardCodedTimes
    var now = hardCodedTimes[0]
    var times = _.map(layers, (layer) => {
      return _.map(layer.times, (time) => {
        return moment.utc(time)
      })
    })
    times = _.flatten(times)
    times = _.union(times, hardCodedTimes)
    var selectTime = ({time}) => {
      var mapOptions = this.props.mapOptions
      mapOptions.time = time
      this.props.updateMapOptions({mapOptions})
      var layersWithTime = findBestTimeStepsForEachLayer({layers, time})
      updateVisibleUrls({
        layers: layersWithTime,
        onSuccess: (layers) => {
          this.props.updateLayers({layers})
        }
      })
    }

    var timeSliderDatums = {
      times,
      selectTime,
      updateMapOptions: this.updateMapOptions,
      mapOptions: this.props.mapOptions,
      defaultTime: +now
    }

    var generateUrlDatums = {
      zoom: this.props.mapOptions.zoom,
      center: this.props.mapOptions.center,
      layers: _.map(layers, (layer) => {
        return {
          id: layer.id,
          opacity: layer.opacity,
          zIndex: layer.zIndex,
          time: layer.time
        }
      })
    }

    return React.createElement('div', {className: 'mapControls'},
      React.createElement(generateUrl, {urlDatums: generateUrlDatums}),
      React.createElement(legends, {legends: legendsDatums}),
      React.createElement('div', {className: 'timeSliderContainer'},
        React.createElement('div', {className: 'timeSliderWrapper'},
          React.createElement(timeSlider, timeSliderDatums)
        )
      )
    )
  }
}

export default mapControls
