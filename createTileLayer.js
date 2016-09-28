import React from 'react'
import ReactDOM from 'react-dom'
import wxTiles from './wxtiles'
import select from 'react-select'
import _ from 'lodash'
import layerLabel from './layerLabel'
import rcSlider from 'rc-slider'
import legend from './legend'
import timeSelector from './timeSelector'
import moment from 'moment'

class createTileLayer extends React.Component {
  constructor() {
    super()
    this.state = {}
    this.state.selectedLayer = null
    this.state.loadingInstance = false
    this.selectLayer = this.selectLayer.bind(this)
    this.deleteLayer = this.deleteLayer.bind(this)
    this.setOpacity = this.setOpacity.bind(this)
  }

  selectLayer(selectingLayer) {
    var instances = _.map(selectingLayer.instances, (instance) => {
      instance.value = instance.id
      instance.label = "Instance: " + instance.displayName
      return instance
    })
    instances = _.sortBy(instances, (instance) => { return instance.displayName }).reverse()
    var layer = this.props.layer
    layer.id = selectingLayer.id
    layer.instances = instances
    layer.instanceId = instances[0].id
    layer.label = selectingLayer.meta.name
    if(selectingLayer.resources.legend) {
      layer.legendUrl = selectingLayer.resources.legend
        .replace('<instance>', instances[0].id)
        .replace('<size>', 'small')
        .replace('<orientation>', 'horizontal')
    }

    wxTiles.getInstance({
      layerId: layer.id,
      instanceId: layer.instanceId,
      onSuccess: (instanceObject) => {
        var times = instanceObject.times
        while(times.length > 100) {
          times = _.remove(times, (time, key) => key % 2 == 0)
        }
        layer.times = times
        layer.time = times[2]
        wxTiles.getAllTileLayerUrls({
          layerId: layer.id,
          instanceId: layer.instanceId,
          times: layer.times,
          level: 0,
          onSuccess: (timeUrls) => {
            var timeUrls = _.map(timeUrls, (timeUrl) => {
              timeUrl.time = moment.utc(timeUrl.time, 'YYYY-MM-DDTHH:mm:ss[Z]')
              return timeUrl
            })
            layer.timeUrls = timeUrls
            wxTiles.getTileLayerUrl({
              layerId: layer.id,
              instanceId: layer.instanceId,
              time: layer.time,
              level: 0,
              onSuccess: (visibleUrl) => {
                layer.visibleUrl = visibleUrl
                this.props.updateLayer({layerObject: layer})
              }
            })
          }
        })
      },
      onError: (error) => {
        console.log(error)
      }
    })
  }

  selectInstance(instance) {
  }

  componentWillMount() {
  }

  deleteLayer() {
    this.props.removeLayer({key: this.props.layer.key})
  }

  setOpacity(opacity) {
    var layerObject = this.props.layer
    layerObject.opacity = opacity
    this.props.updateLayer({layerObject})
  }

  render() {
    var layer = this.props.layer
    return React.createElement('div', {className: 'createTileLayer'},
      React.createElement('div', {className: 'select-container'},
        React.createElement('div', {className: 'select-list'},
          React.createElement(layerLabel, {
            deleteLayer: this.deleteLayer,
            layers: this.props.layerOptions,
            selectLayer: this.selectLayer,
            layer: layer.id
          }),
          React.createElement('div', {className: 'controls'},
            React.createElement('div', {className: 'transparencyContainer'},
              React.createElement('div', {}, 'Opacity'),
              React.createElement(rcSlider, {
                defaultValue: layer.opacity * 100,
                onChange: (opacity) => this.setOpacity(opacity/100)
              })
            )
          )
        )
      )
    )
  }
}

export default createTileLayer
