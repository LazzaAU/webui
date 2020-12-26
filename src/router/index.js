import Vue from 'vue'
import VueRouter from 'vue-router'
import skills from '@/components/views/skills'
import scenarios from '@/components/views/scenarios'
import login from '@/components/views/login'
import admin from '@/components/views/admin'
import connect from '@/components/views/connect'
import syslog from '@/components/views/syslog'
import alicewatch from '@/components/views/alicewatch'
import devmode from '@/components/views/devmode'
import myhome from '@/components/views/myhome'
import dialogView from '@/components/views/dialogView'
import widgets from '@/components/views/widgets'
import telemetry from '@/components/views/telemetry'

Vue.use(VueRouter)

const routes = [
	{
		path: '/connect',
		name: 'Connect',
		component: connect,
		meta: {
			title: 'connect'
		}
	},
	{
		path: '/skills',
		component: skills,
		meta: {
			title: 'nav.skills'
		}
	},
	{
		path: '/scenarios',
		component: scenarios,
		meta: {
			title: 'nav.scenarios'
		}
	},
	{
		path: '/login',
		component: login,
		meta: {
			title: 'nav.login'
		}
	},
	{
		path: '/syslog',
		component: syslog,
		meta: {
			title: 'nav.syslog'
		}
	},
	{
		path: '/alicewatch',
		component: alicewatch,
		meta: {
			title: 'nav.alicewatch'
		}
	},
	{
		path: '/admin',
		component: admin,
		meta: {
			title: 'nav.admin'
		}
	},
	{
		path: '/devmode',
		component: devmode,
		meta: {
			title: 'nav.devmode'
		}
	},
	{
		path: '/myhome',
		component: myhome,
		meta: {
			title: 'nav.myhome'
		}
	},
	{
		path: '/dialogView',
		component: dialogView,
		meta: {
			title: 'nav.dialogView'
		}
	},
	{
		path: '/widgets',
		component: widgets,
		meta: {
			title: 'nav.widgets'
		}
	},
	{
		path: '/telemetry',
		component: telemetry,
		meta: {
			title: 'nav.telemetry'
		}
	},
	{
		path: '*',
		name: 'Home',
		component: widgets,
		meta: {
			title: 'nav.widgets'
		}
	}
]

const router = new VueRouter({
	routes,
	mode: 'abstract'
})

export default router
