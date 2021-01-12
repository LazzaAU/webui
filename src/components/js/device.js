import axios from 'axios'
import * as C from '@/utils/constants'

// noinspection DuplicatedCode
export default {
	name: 'device',
	data: function () {
		return {
			rotationDelta: 0,
			targetParentLocation: 0,
			checkHeartbeat: null,
			myLinks: {}
		}
	},
	props: [
		'data',
		'device',
		'myHome'
	],
	created: function () {
		let self = this
		this.unwatch = this.$store.watch(
			function (state) {
				return state.mqttMessage
			},
			function (msg) {
				let payload
				try {
					payload = JSON.parse(msg.payloadString)
				} catch {
					return
				}

				if (payload['uid'] !== self.data.uid) return

				if (msg.topic === C.CORE_HEARTBEAT_TOPIC || msg.topic === C.DEVICE_HEARTBEAT_TOPIC || msg.topic === C.CORE_RECONNECTION_TOPIC) {
					if (self.checkHeartbeat !== null) {
						clearTimeout(self.checkHeartbeat)
					}

					self.data.connected = true

					self.checkHeartbeat = setTimeout(function () {
						self.data.connected = false
					}, self.data['heartbeatRate'] * 2500)
				} else if (msg.topic === C.CORE_DISCONNECTION_TOPIC) {
					self.data.connected = false
					if (self.checkHeartbeat !== null) {
						clearTimeout(self.checkHeartbeat)
					}
				} else if (msg.topic === C.DEVICE_UPDATED_TOPIC) {
					self.myHome.devices[self.data.id] = payload['device']
				}
			}
		)
	},
	beforeDestroy: function () {
		this.$store.state.mqtt.unsubscribe(C.CORE_HEARTBEAT_TOPIC)
		this.$store.state.mqtt.unsubscribe(C.DEVICE_HEARTBEAT_TOPIC)
		this.$store.state.mqtt.unsubscribe(C.DEVICE_UPDATED_TOPIC)
		this.unwatch()
	},
	methods: {
		computeCustomStyle: function () {
			return this.myHome.moveableItem.computeCustomStyle(
				this.data,
				`background: url('http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/myHome/devices/${this.data.id}/device.png') no-repeat; background-size: 100% 100%;`
			)
		},
		save: function () {
			if (this.data.uid === -1) return

			const data = {
				parentLocation: this.data.parentLocation,
				settings: this.data.settings
			}

			axios({
				method: 'patch',
				url: `http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/myHome/devices/${this.data.id}/`,
				data: data,
				headers: {
					'auth': localStorage.getItem('apiToken'),
					'content-type': 'application/json'
				}
			}).then()
		},
		handleClick: function (event) {
			if (this.myHome.toolsState.addingDevice || this.data.uid === -1) return

			event.stopPropagation()
			this.myHome.removeDroppable()

			if (this.myHome.devicesEditMode && this.myHome.toolsState.linkingDevices && this.myHome.newConnectionLink === null && this.data.parentLocation !== 0) {
				this.myHome.newConnectionLine(this)
			} else if (this.myHome.devicesEditMode && this.myHome.toolsState.unlinkingDevices && this.myHome.newConnectionLink === null) {
				this.myHome.newDisconnectionLine(this)
			} else if (this.myHome.toolsState.unlinkingDevices && this.myHome.newConnectionLink !== null) {

			} else if (this.myHome.toolsState.linkingDevices && this.myHome.newConnectionLink !== null) {
				this.showError(this.$t('notifications.errors.noDeviceToDeviceLink'))
			} else if (this.myHome.devicesEditMode && event.target.classList.contains('device')) {
				this.myHome.setMoveable(event.target, this)
				this.myHome.moveableItem.setBoundaries(this.myHome.$refs.floorPlan)
				this.myHome.moveableItem.setGuidelines([])
			} else if (!this.myHome.devicesEditMode && !this.myHome.locationsEditMode) {
				axios({
					method: 'patch',
					url: `http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/myHome/devices/${this.data.uid}/onClick/`,
					headers: {'auth': localStorage.getItem('apiToken')}
				}).then()
			}
		},
		handleDrag: function (target, left, top, clientX, clientY) {
			const elementsBelow = document.elementsFromPoint(clientX, clientY)
			for (const el of elementsBelow) {
				if (el.classList.contains('location')) {
					const elementId = parseInt(el.id.substring(4))
					if (this.myHome.checkDevicePerLocationLimit(this.myHome.getDeviceType(this), elementId)) {
						if (this.data.parentLocation !== elementId) {
							this.myHome.removeDroppable()
							el.classList.add('droppable')
							this.targetParentLocation = elementId
							break
						}
					} else {
						if (this.data.parentLocation !== elementId) {
							this.myHome.removeDroppable()
							el.classList.add('notDroppable')
						}
					}
				} else {
					this.targetParentLocation = 0
					this.myHome.removeDroppable()
				}
			}
			this.myHome.refreshDeviceLinks()
			throw true
		},
		setPosition: function (target, clientX, clientY) {
			try {
				if (this.targetParentLocation !== 0 && this.data.parentLocation !== this.targetParentLocation) {
					// noinspection DuplicatedCode
					const parentLocation = document.querySelector(`#loc_${this.data.parentLocation}`)
					const droppedIn = document.querySelector(`#loc_${this.targetParentLocation}`)
					this.myHome.moveableItem.container = droppedIn
					this.myHome.devices[this.data.id].parentLocation = this.targetParentLocation
					this.myHome.devices[this.data.id].settings['z'] = parseInt(droppedIn.style['z-index']) + 1
					this.myHome.devices[this.data.id].settings['x'] = parentLocation.offsetLeft + parseInt(target.style.left.substring(-2)) - droppedIn.offsetLeft
					this.myHome.devices[this.data.id].settings['y'] = parentLocation.offsetTop + parseInt(target.style.top.substring(-2)) - droppedIn.offsetTop
					this.targetParentLocation = 0
				} else {
					// noinspection ExceptionCaughtLocallyJS
					throw true
				}
			} catch (e) {
				console.log(e)
				throw e
			}
		},
		deleteMe: function (event) {
			event.stopPropagation()
			axios({
				method: 'delete',
				url: `http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/myHome/devices/${this.data.id}/`,
				headers: {'auth': localStorage.getItem('apiToken')}
			}).then(response => {
				if ('success' in response.data && response.data.success) {
					this.myHome.$delete(this.myHome.devices, this.data.id)
					this.showSuccess(this.$t('notifications.success.deviceDeleted'))
				}
			})
		},
		onMouseEnter: function () {
			if (this.myHome.locationsEditMode && this.myHome.toolsState.none) {
				for (const link of Object.values(this.myLinks)) {
					link.show('draw')
				}
			}
		},
		onMouseExit: function () {
			if (this.myHome.locationsEditMode && this.myHome.toolsState.none) {
				for (const link of Object.values(this.myLinks)) {
					link.hide('draw')
				}
			}
		}
	}
}
