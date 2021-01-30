import axios from 'axios'
import Paho from 'paho-mqtt'
import * as C from '@/utils/constants'

export default {
	name: 'connect',
	data() {
		return {
			connecting: false,
			port: 5001,
			ip: '',
			remember: false
		}
	},
	created: function () {
		this.remember = localStorage.getItem('rememberServer') || false
		if (this.remember === 'true') this.remember = true
		if (this.remember === 'false') this.remember = false

		this.ip = localStorage.getItem('host') || '127.0.0.1'
		this.port = localStorage.getItem('apiPort') || 5001

		if (localStorage.getItem('skillsTourCompleted')) {
			this.$store.commit('setSkillTourCompleted')
		}

		this.doConnect().then(console.log('Project Alice Web Interface connected and ready'))
	},
	methods: {
		async doConnect() {
			this.connecting = true
			let self = this
			Promise.all([
				self.connect(),
				self.connectMQTT(),
				self.loadI18n(),
				self.validateToken()
			]).then(() => {
				self.loadData().then(() => {
					// Start these pages so that they start logging stuff
					const lastVisitedPage = localStorage.getItem('showPage') || '/'
					self.$router.replace('/syslog').then(function () {
						self.$router.replace('/alicewatch').then(function () {
							self.$store.commit('uiConnected', true)
							self.$store.commit('setConnectVue', self)
							if (lastVisitedPage !== '/alicewatch') {
								self.$router.replace(lastVisitedPage).then()
							}
						})
					})
				}).catch(reason => {
					console.error(reason)
				})
			}).catch(reason => {
				reject(Error('Failed connecting: ' + reason))
			}).finally(() => self.connecting = false)
		},
		connect() {
			let self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.ip}:${self.port}/api/v1.0.1/utils/config/`,
					headers: {'auth': localStorage.getItem('apiToken')}
				}).then(response => {
					self.$store.commit('setSettings', response.data.config)
					self.$store.commit('setSettingTemplates', response.data.templates)
					self.$store.commit('setSettingCategories', response.data.categories)
					if (self.remember) {
						localStorage.setItem('host', self.ip)
						localStorage.setItem('apiPort', self.port)
						localStorage.setItem('rememberServer', true)
					} else {
						localStorage.removeItem('host')
						localStorage.removeItem('apiPort')
					}
					resolve()
				}).catch(reason => {
					reject(new Error('Error connecting to Alice ' + reason))
				})
			})
		},
		connectMQTT() {
			let self = this
			return new Promise(function (resolve, reject) {
				axios.get(`http://${self.ip}:${self.port}/api/v1.0.1/utils/mqttConfig/`)
					.then(response => {
						let randomNum = Math.floor((Math.random() * 10000000) + 1);
						// noinspection JSUnresolvedFunction
						let client = new Paho.Client(response.data.host, Number(response.data.port), 'ProjectAliceInterface' + randomNum)
						client.onMessageArrived = self.onMessage
						client.onConnectionLost = self.onConnectionLost
						client.onConnectionFailed = self.onConnectionFailed
						client.connect({
							onSuccess: self.onConnected,
							onFailure: self.onConnectionFailed,
							timeout: 5
						})
						self.$store.commit('setMqtt', client)
						resolve()
					})
					.catch(reason => {
						reject(new Error('Error getting MQTT info: ' + reason))
					})
			})
		},
		validateToken() {
			let self = this
			return new Promise(function (resolve, _reject) {
				if (localStorage.getItem('apiToken') && localStorage.getItem('username')) {
					axios({
						method: 'POST',
						url: `http://${self.ip}:${self.port}/api/v1.0.1/login/checkToken/`,
						headers: {'auth': localStorage.getItem('apiToken')}
					}).then(response => {
						if ('success' in response.data) {
							self.$store.commit('userLogin', {
								user: localStorage.getItem('username'),
								token: localStorage.getItem('apiToken'),
								authLevel: response.data.authLevel
							})
						} else {
							localStorage.removeItem('username')
							localStorage.removeItem('apiToken')
						}
						resolve()
					}).catch(reason => {
						reject(Error('Failed validating token: ' + reason))
					})
				} else {
					resolve()
				}
			})
		},
		loadI18n() {
			let self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.ip}:${self.port}/api/v1.0.1/utils/i18n/`
				}).then(response => {
					for (const [lang, data] of Object.entries(response.data['data'])) {
						self.$i18n.setLocaleMessage(lang, data)
					}
					self.$i18n.locale = self.$store.state.settings['activeLanguage']
					resolve()
				}).catch(reason => {
					reject(Error('Failed loading i18n: ' + reason))
				})
			})
		},
		loadWidgetTemplates: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/widgets/templates/`
				}).then(response => {
					if ('widgets' in response.data) {
						self.$store.commit('setWidgetTemplates', response.data['widgets'])
						resolve()
					} else {
						reject(Error('Error fetching widget templates'))
					}
				}).catch(reason => {
					reject(Error('Failed loading widget templates: ' + reason))
				})
			})
		},
		loadWidgetInstances: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/widgets/`,
					headers: {'auth': self.$store.getters.apiToken}
				}).then(response => {
					if ('widgets' in response.data) {
						self.$store.commit('setWidgetInstances', response.data['widgets'])
						resolve()
					} else {
						reject(Error('Error fetching widget instances'))
					}
				}).catch(reason => {
					reject(Error('Failed loading widget instances: ' + reason))
				})
			})
		},
		loadDeviceTypes: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/myHome/deviceTypes/`,
					headers: {'auth': self.$store.getters.apiToken}
				}).then(response => {
					if ('types' in response.data) {
						self.$store.commit('setDeviceTypes', response.data['types'])
						resolve()
					} else {
						reject(Error('Error fetching device types'))
					}
				}).catch(reason => {
					reject(Error('Failed loading device types: ' + reason))
				})
			})
		},
		loadWidgetPages: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/widgets/pages/`,
					headers: {'auth': self.$store.getters.apiToken}
				}).then(response => {
					if ('pages' in response.data) {
						self.$store.commit('setWidgetPages', response.data['pages'])
						resolve()
					} else {
						reject(Error('Error fetching widget pages'))
					}
				}).catch(reason => {
					reject(Error('Failed loading widget pages: ' + reason))
				})
			})
		},
		loadInstalledSkills: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/skills/`,
					headers: {'auth': self.$store.getters.apiToken}
				}).then(response => {
					if ('skills' in response.data) {
						self.$store.commit('setInstalledSkills', response.data['skills'])
						resolve()
					} else {
						reject(Error('Error fetching skills'))
					}
				}).catch(reason => {
					reject(Error('Failed loading installed skills: ' + reason))
				})
			})
		},
		loadStore: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/skills/getStore/`
				}).then(response => {
					if ('store' in response.data) {
						self.$store.commit('setStoreSkills', response.data['store'])
						resolve()
					} else {
						reject(Error('Error fetching store skills'))
					}
				}).catch(reason => {
					reject(Error('Failed loading store: ' + reason))
				})
			})
		},
		loadFloorTiles: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/myHome/locations/floors/`,
					headers: {'auth': self.$store.getters.apiToken}
				}).then(response => {
					if ('data' in response.data) {
						self.$store.commit('setFloorTiles', response.data['data'])
						resolve()
					} else {
						reject(Error('Error fetching floor tiles'))
					}
				}).catch(reason => {
					reject(Error('Failed loading floor tiles: ' + reason))
				})
			})
		},
		loadConstructionTiles: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/myHome/constructions/tiles/`,
					headers: {'auth': self.$store.getters.apiToken}
				}).then(response => {
					if ('data' in response.data) {
						self.$store.commit('setConstructionTiles', response.data['data'])
						resolve()
					} else {
						reject(Error('Error fetching construction tiles'))
					}
				}).catch(reason => {
					reject(Error('Failed loading construction tiles: ' + reason))
				})
			})
		},
		loadFurnitureTiles: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/myHome/furniture/tiles/`,
					headers: {'auth': self.$store.getters.apiToken}
				}).then(response => {
					if ('data' in response.data) {
						self.$store.commit('setFurnitureTiles', response.data['data'])
						resolve()
					} else {
						reject(Error('Error fetching furniture tiles'))
					}
				}).catch(reason => {
					reject(Error('Failed loading furniture tiles: ' + reason))
				})
			})
		},
		loadMyHome: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				axios({
					method: 'GET',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/myHome/`,
					headers: {'auth': self.$store.getters.apiToken}
				}).then(response => {
					if ('data' in response.data) {
						self.$store.commit('setLocations', response.data['data']['locations'])
						self.$store.commit('setConstructions', response.data['data']['constructions'])
						self.$store.commit('setFurnitures', response.data['data']['furnitures'])
						self.$store.commit('setDeviceLinks', response.data['data']['links'])
						self.$store.commit('setDevices', response.data['data']['devices'])
						resolve()
					} else {
						reject(Error('Error fetching my home data'))
					}
				}).catch(reason => {
					reject(Error('Failed loading myHome data: ' + reason))
				})
			})
		},
		loadData: function () {
			const self = this
			return new Promise(function (resolve, reject) {
				Promise.all([
					self.loadWidgetPages(),
					self.loadDeviceTypes(),
					self.loadWidgetTemplates(),
					self.loadWidgetInstances(),
					self.loadInstalledSkills(),
					self.loadStore(),
					self.loadFloorTiles(),
					self.loadConstructionTiles(),
					self.loadFurnitureTiles(),
					self.loadMyHome()
				]).then(() => {
					resolve()
				}).catch(reason => {
					reject(Error('Failed loading data: ' + reason))
				})
			})
		},
		onConnected: function () {
			console.log('Mqtt connected')
			this.$store.state.mqtt.subscribe(C.RESOURCE_USAGE_TOPIC)
			this.$store.state.mqtt.subscribe(C.CORE_HEARTBEAT_TOPIC)
			this.$store.state.mqtt.subscribe(C.DEVICE_HEARTBEAT_TOPIC)
			this.$store.state.mqtt.subscribe(C.DEVICE_UPDATED_TOPIC)
			this.$store.state.mqtt.subscribe(C.CORE_DISCONNECTION_TOPIC)
			this.$store.state.mqtt.subscribe(C.CORE_RECONNECTION_TOPIC)
			this.$store.state.mqtt.subscribe(C.ALICE_WATCH_TOPIC)
			this.$store.state.mqtt.subscribe(C.SYSLOG_TOPIC)
			this.$store.state.mqtt.subscribe(C.SESSION_ENDED_TOPIC)
			this.$store.state.mqtt.subscribe(C.NLU_QUERY_TOPIC)
			this.$store.state.mqtt.subscribe(C.SAY_TOPIC)
			this.$store.state.mqtt.subscribe(C.HOTWORD_TOPIC)
			this.$store.state.mqtt.subscribe(C.ASR_PART_TOPIC)
			this.$store.state.mqtt.subscribe(C.ASR_TOPIC)
			this.$store.state.mqtt.subscribe(C.SKILL_UPDATED_TOPIC)
			this.$store.state.mqtt.subscribe(C.SKILL_UPDATING_TOPIC)
			this.$store.state.mqtt.subscribe(C.SKILL_INSTALLED_TOPIC)
			this.$store.state.mqtt.subscribe(C.SKILL_DELETED_TOPIC)
		},
		onConnectionFailed: function (_msg) {
			console.log('Mqtt connection failed')
		},
		onConnectionLost: function () {
			console.log('Mqtt connection lost')
		},
		onMessage: function (msg) {
			this.$store.commit('mqttMessage', msg)
		}
	}
}
