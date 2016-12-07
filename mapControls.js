import React from 'react'
import ReactDOM from 'react-dom'
import generateUrl from './mapOverlay/generateUrl'
import legends from './mapOverlay/legends'
import _ from 'lodash'
import timeSlider from './mapOverlay/timeSlider'
import moment from 'moment'
import wxtiles from './wxtiles'

var findBestTimeStepsForEachLayer = ({layers, time}) => {
  // For each layer, for each of its available time-based URLs, set the
  // layer.time property to be equal to the nearest valid time to the time
  // that is seelcted on the timeslider.
  time = moment.utc(time)
  return _.map(layers, (layer) => {
    var allTimesForLayer = _.map(layer.times, (t) => moment.utc(t, 'YYYY-MM-DDTHH:mm:ss[Z]'))
    allTimesForLayer = _.sortBy(allTimesForLayer, (t) => +t)

    var timeToSelect = null
    allTimesForLayer = _.forEach(allTimesForLayer, (timeForLayer, key) => {
      if (timeToSelect) {
        return false
      } else if (time.isBefore(timeForLayer)) {
        return
      } else if (time.isSameOrAfter(allTimesForLayer[key+1])) {
        return
      } else {
        timeToSelect = timeForLayer
      }
    })
    timeToSelect = timeToSelect ? timeToSelect : _.last(allTimesForLayer)
    layer.time = timeToSelect.format('YYYY-MM-DDTHH:mm:ss[Z]')
    return layer
  })
}

var updateVisibleUrls = ({layers, onSuccess}) => {
  var scopedLayers = layers
  Promise.all(_.map(scopedLayers, (layer) => {
    return new Promise((resolve, reject) => {
      layer.visibleUrl = null
      if (!layer.time) return resolve(layer)
      wxtiles.getTileLayerUrl({
        layerId: layer.id,
        styleId: layer.styleId,
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
    var mapOptions = this.props.mapOptions
    var layers = mapOptions.layers

    var legendsDatums = _.filter(layers, (layer) => layer.label)
    legendsDatums = _.map(legendsDatums, (layer) => {
      return {
        label: layer.label,
        description: layer.description,
        hasLegend: layer.hasLegend,
        url: layer.hasLegend ? layer.legendUrl : null,
        layerId: layer.id,
        styleId: layer.styleId,
      }
    })

    var selectTime = ({time}) => {
      mapOptions.time = time
      mapOptions.displayTime = time
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
      selectTime,
      updateMapOptions: this.updateMapOptions,
      mapOptions: this.props.mapOptions
    }

    var generateUrlDatums = {
      zoom: this.props.mapOptions.zoom,
      center: this.props.mapOptions.center,
      animationFrameMinutes: this.props.mapOptions.animationFrameMinutes,
      layers: _.map(layers, (layer) => {
        return {
          id: layer.id,
          opacity: layer.opacity,
          zIndex: layer.zIndex
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
