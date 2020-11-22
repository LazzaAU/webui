import axios from 'axios'

export default {
	name: 'pa-widgets',
	data: function() {
		return {
			tabs: {},
			menuItems: [
				{
					name: 'edit',
					icon: 'fas fa-pen-square',
					isToggle: true,
					extendedIcon: 'fas fa-times-circle',
					extendedName: 'close',
					onClose: () => {
						this.removeWidgets = false
						this.settings = false
						this.dragAndResizeEnabled = false
					},
					onOpen: () => {
						this.dragAndResizeEnabled = true
					}
				},
				{
					name: 'theater mode',
					icon: 'fas fa-person-booth',
					isToggle: true,
					callback: this.cinemaMode
				},
				{
					name: 'settings',
					icon: 'fas fa-cog',
					onClick: () => {
						this.settings = !this.settings
					}
				},
				{
					name: 'upload preset',
					icon: 'fas fa-file-upload',
				},
				{
					name: 'download preset',
					icon: 'fas fa-file-download',
				},
				{
					name: 'add widget',
					icon: 'far fa-plus-square',
					onClick: () => {
						this.addWidgets = true
					}
				},
				{
					name: 'remove widget',
					icon: 'far fa-minus-square',
					onClick: () => {
						this.removeWidgets = !this.removeWidgets
					}
				}
			],
			settings: false,
			addWidgets: false,
			removeWidgets: false,
			widgetTemplates: {},
			widgetInstances: {},
			activePageId: 1,
			selectedWidget: -1,
			dragAndResizeEnabled: false,
			hasTitle: true
		}
	},
	created: function() {
		let self = this;
		document.addEventListener('keypress', function(event) {
			if (event.key === 'Enter') {
				self.$store.commit('stopCinemaMode')
			}
		})

		axios({
			method: 'get',
			url: `http://${this.$cookies.get('host')}:${this.$cookies.get('apiPort')}/api/v1.0.1/widgets/pages/`,
			headers: {'auth': this.$cookies.get('apiToken')}
		}).then(response => {
			if ('pages' in response.data) {
				this.tabs = response.data.pages
				this.fetchWidgetTemplates()
				this.fetchWidgetInstances()
			}
		})
	},
	methods: {
		changePage: function(id) {
			this.activePageId = id
			this.$forceUpdate()
		},
		cinemaMode: function() {
			this.$store.commit('toggleCinemaMode')
		},
		fetchWidgetTemplates: function() {
			axios({
				method: 'get',
				url: `http://${this.$cookies.get('host')}:${this.$cookies.get('apiPort')}/api/v1.0.1/widgets/templates/`
			}).then(response => {
				if ('widgets' in response.data) {
					this.widgetTemplates = response.data['widgets']
				}
			})
		},
		fetchWidgetInstances: function() {
			axios({
				method: 'get',
				url: `http://${this.$cookies.get('host')}:${this.$cookies.get('apiPort')}/api/v1.0.1/widgets/`,
				headers: {'auth': this.$cookies.get('apiToken')}
			}).then(response => {
				if ('widgets' in response.data) {
					this.widgetInstances = response.data.widgets
				}
			})
		},
		addWidget: function(skillName, widgetName) {
			axios({
				method: 'put',
				url: `http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/widgets/`,
				data: {
					skillName: skillName,
					widgetName: widgetName,
					pageId: this.activePageId
				},
				headers: {
					'auth': this.$cookies.get('apiToken'),
					'content-type': 'application/json'
				}
			}).then(response => {
				if ('widget' in response.data) {
					this.$set(this.widgetInstances, response.data['widget']['id'], response.data['widget'])
				}
			})
		},
		removeWidget: function(widgetId) {
			axios({
				method: 'delete',
				url: `http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/widgets/${widgetId}/`,
				headers: {
					'auth': this.$cookies.get('apiToken')
				}
			}).then(response => {
				if ('success' in response.data && response.data.success) {
					const listing = this.listOfWidgetOnPage(this.widgetInstances[widgetId]['page'])
					const hisZIndex = this.widgetInstances[widgetId]['params']['z']
					this.$delete(this.widgetInstances, widgetId)

					for (const w of listing) {
						if (w.params['z'] > hisZIndex) {
							w.params['z'] -= 1
							this.saveWidgetParams(w)
						}
					}
				}
			})
		},
		savePosition: function(x, y) {
			if (this.selectedWidget <= -1) {
				return
			}

			x = Math.ceil(x / 5) * 5
			y = Math.ceil(y / 5) * 5

			let widgetId = this.selectedWidget

			axios({
				method: 'patch',
				url: `http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/widgets/${widgetId}/savePosition/`,
				data: {
					x: x,
					y: y
				},
				headers: {'auth': this.$cookies.get('apiToken')}
			}).then(response => {
				if ('success' in response.data && response.data.success) {
					let widget = this.widgetInstances[widgetId]
					widget.params['x'] = x
					widget.params['y'] = y
					this.$set(this.widgetInstances, widgetId, widget)
				}
			})
		},
		saveSize: function(x, y, w, h) {
			if (this.selectedWidget <= -1) {
				return
			}
			x = Math.ceil(x / 5) * 5
			y = Math.ceil(y / 5) * 5
			w = Math.ceil(w / 5) * 5
			h = Math.ceil(h / 5) * 5

			let widgetId = this.selectedWidget

			axios({
				method: 'patch',
				url: `http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/widgets/${widgetId}/saveSize/`,
				data: {
					x: x,
					y: y,
					w: w,
					h: h
				},
				headers: {'auth': this.$cookies.get('apiToken')}
			}).then(response => {
				if ('success' in response.data && response.data.success) {
					let widget = this.widgetInstances[widgetId]
					widget.params['x'] = x
					widget.params['y'] = y
					widget.params['w'] = w
					widget.params['h'] = h
					this.$set(this.widgetInstances, widgetId, widget)
				}
			})
		},
		openWidgetSettings(widget) {
			let self = this
			let backup = {...widget.params}
			this.settings = false

			const message = {}
			const options = {
				view: 'widgetOptionsPromptDialog',
				widget: widget
			}

			this.$dialog.prompt(message, options).then(dialogue => {
				axios({
					method: 'PATCH',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/widgets/${dialogue.data.id}/`,
					data: JSON.stringify(dialogue.data.params),
					headers: {
						'auth': self.$cookies.get('apiToken'),
						'content-type': 'application/json'
					}
				}).catch(() => {
					widget.params = backup
				}).finally(() => {
					this.settings = true
				})
			}).catch(() => {
				widget.params = backup
				this.settings = true
			})
		},
		saveWidgetParams(widget) {
			axios({
				method: 'PATCH',
				url: `http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/widgets/${widget.id}/`,
				data: JSON.stringify(widget.params),
				headers: {
					'auth': self.$cookies.get('apiToken'),
					'content-type': 'application/json'
				}
			})
		},
		computeCustomStyle(widget) {
			let style = ''
			style += `color: ${widget.params['color']};`
			style += `background-color: ${widget.params['rgba']};`
			style += `font-size: ${widget.params['font-size']}em;`

			if (!widget.params['borders']) {
				style += 'box-shadow:none;'
			}

			if (widget.params['rotation'] && widget.params['rotation'] !== 0) {
				style += `transform:rotate(${widget.params['rotation']}deg);`
			}

			return style
		},
		moveZUp(widget) {
			const myIndex = widget.params['z']
			const myNewIndex = myIndex + 1;
			const listing = this.listOfWidgetOnPage(widget['page'])

			if (myNewIndex > listing.length) {
				return
			}

			for (const w of listing) {
				if (w.params['z'] === myNewIndex) {
					w.params['z'] -= 1
					widget.params['z'] = myNewIndex
					this.saveWidgetParams(w)
					this.saveWidgetParams(widget)
					return
				}
			}
		},
		moveZDown(widget) {
			const myIndex = widget.params['z']
			const myNewIndex = myIndex - 1;
			const listing = this.listOfWidgetOnPage(widget['page'])

			if (myNewIndex <= 0) {
				return
			}

			for (const w of listing) {
				if (w.params['z'] === myNewIndex) {
					w.params['z'] += 1
					widget.params['z'] = myNewIndex
					this.saveWidgetParams(w)
					this.saveWidgetParams(widget)
					return
				}
			}
		},
		listOfWidgetOnPage(pageId) {
			let listing = []
			for (const w of Object.values(this.widgetInstances)) {
				if (w['page'] === pageId) {
					listing.push(w)
				}
			}
			return listing
		},
		removeTab: function(id) {
			if (!this.$store.state.loggedInUser) {
				return
			}
			let self = this
			if (id <= 1) {
				this.$dialog.alert('You can\'t delete the default page').then()
			} else {
				this.$dialog.confirm('Do you really want to delete this page?')
					.then(function() {
						axios({
							method: 'DELETE',
							url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/widgets/pages/${id}/`,
							headers: {'auth': self.$cookies.get('apiToken')}
						}).then(response => {
							if ('pages' in response.data) {
								self.$delete(self.tabs, id)
							}
						})
					}).catch(() => {})
			}
		},
		renameTab: function(id) {
			if (!this.$store.state.loggedInUser) {
				return
			}

			let self = this

			const message = {}
			const options = {
				view: 'fontawesomePromptDialog'
			}

			this.$dialog.prompt(message, options).then(dialogue => {
				let icon = dialogue.data || 'fas fa-biohazard'
				axios({
					method: 'PATCH',
					url: `http://${self.$store.state.settings['aliceIp']}:${self.$store.state.settings['apiPort']}/api/v1.0.1/widgets/pages/${id}/`,
					data: {newIcon: icon},
					headers: {'auth': self.$cookies.get('apiToken')}
				}).then(response => {
					if ('success' in response.data && response.data.success) {
						this.tabs[id].icon = icon
					}
				})
			}).catch(() =>{})
		},
		addTab: function() {
			axios({
				method: 'PUT',
				url: `http://${this.$store.state.settings['aliceIp']}:${this.$store.state.settings['apiPort']}/api/v1.0.1/widgets/addPage/`,
				headers: {'auth': this.$cookies.get('apiToken')}
			}).then(response => {
				if ('newpage' in response.data) {
					let page = response.data.newpage
					this.$set(this.tabs, page.id, page)
				}
			})
		}
	}
}
