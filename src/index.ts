import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { requestAPI } from './handler';

import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

import cloudIconSvg from '../style/icons/cloud.svg';


export const cloudIcon = new LabIcon({
  name: 'climb-jupyterlab-extension:cloud_icon',
  svgstr: cloudIconSvg
});


class CLIMBWidget extends Widget {
    /**
     * Construct a new CLIMB widget.
     */
    constructor() {
	super();

	const header = document.createElement('header');
	this.node.appendChild(header);
	const nav = document.createElement('nav');
	header.appendChild(nav);

	this.descriptionList = document.createElement('dl');
	this.node.appendChild(this.descriptionList);

	this.memory_usage = document.createElement('progress');
	this.cpu_usage_progress = document.createElement('progress');

	const user_dt = document.createElement('dt');
	const group_dt = document.createElement('dt');
	const cpus_dt = document.createElement('dt');
	const mem_usage_dt = document.createElement('dt');
	const cpu_usage_dt = document.createElement('dt');

	user_dt.textContent = 'User';
	group_dt.textContent = 'Group';
	cpus_dt.textContent = 'CPUs';
	mem_usage_dt.textContent = 'Memory usage';
	cpu_usage_dt.textContent = 'CPU %';

	const user = document.createElement('dd');
	const group = document.createElement('dd');
	const cpus = document.createElement('dd');
	const mem_usage = document.createElement('dd');
	mem_usage.appendChild(this.memory_usage)

	const cpu_usage = document.createElement('dd');
	cpu_usage.appendChild(this.cpu_usage_progress);

	// Get username and group on connection
        requestAPI<any>('get-env')
            .then(data => {
		console.log(data);
		user.textContent = data['user'];
		this.descriptionList.appendChild(user_dt);
		this.descriptionList.appendChild(user);
		group.textContent = data['group'];
		this.descriptionList.appendChild(group_dt);
		this.descriptionList.appendChild(group);

            })
            .catch(reason => {
		console.error(
                    `The climb_usage_extension server extension appears to be missing.\n${reason}`
		);
            });

	// Get username and group on connection
        requestAPI<any>('limits')
            .then(data => {
		console.log(data);
		this.ncpus = data['cpu_limit'] as number;
		cpus.textContent = String(this.ncpus);
		this.descriptionList.appendChild(cpus_dt);
		this.descriptionList.appendChild(cpus);
		this.memory_usage.max = data['max_memory'];
		this.descriptionList.appendChild(mem_usage_dt);
		this.descriptionList.appendChild(mem_usage);
		this.descriptionList.appendChild(cpu_usage_dt);
		this.descriptionList.appendChild(cpu_usage);
            })
            .catch(reason => {
		console.error(
                    `The climb_usage_extension server extension appears to be missing.\n${reason}`
		);
            });

	// Links
	const links = [
	    { label: 'Documentation', href: 'https://docs.climb.ac.uk' },
	    { label: 'Support', href: 'mailto:support@climb.ac.uk' },
	    { label: 'Bryn', href: 'https://bryn.climb.ac.uk' }
	];

	const list = document.createElement('ul');
	for (const link of links) {
	    const li = document.createElement('li');
	    const a = document.createElement('a');
	    a.href = link.href;
	    a.textContent = link.label;
	    a.target = '_blank'; // open in new tab
	    a.rel = 'noopener noreferrer'; // security best practice
	    a.classList.add('text-blue-600', 'hover:underline');
	    li.appendChild(a);
	    list.appendChild(li);
	}
	nav.appendChild(list);
    }

    async onUpdateRequest(): Promise<void> {
	try {
	    const data = await requestAPI<any>('current-memory');
	    this.memory_usage.value = data["value"];

	} catch (err) {
	    console.error('Error fetching metrics:', err);
	}

	try {
	    const data = await requestAPI<any>('cpu-usage');
	    let value : number = parseFloat(data["value"]);
	    let usage = value / this.ncpus;
	    this.cpu_usage_progress.value = usage;
	    console.log("CPU: ", data["value"], "usage:", usage);

	} catch (err) {
	    console.error('Error fetching metrics:', err);
	}


    }

    onAfterAttach(): void {
	// Start polling when widget is attached to the DOM
	this.onUpdateRequest();
	this.intervalId = window.setInterval(() => this.onUpdateRequest(), this.pollInterval);
    }

    onBeforeDetach(): void {
	// Stop polling when the widget is removed
	if (this.intervalId !== null) {
	    clearInterval(this.intervalId);
	    this.intervalId = null;
	}
    }

    private memory_usage: HTMLProgressElement;
    private cpu_usage_progress: HTMLProgressElement;
    private ncpus : number = 1;

    private descriptionList: HTMLDListElement;

    private intervalId: number | null = null;
    private pollInterval = 5000; // 5 seconds

}
/**
 * Activate the CLIMB widget extension.
 */
function activate(app: JupyterFrontEnd, palette: ICommandPalette, launcher: ILauncher | null) {
    console.log('JupyterLab extension jupyterlab_climb is activated!');

    // Define a widget creator function
    const newWidget = () => {
	const content = new CLIMBWidget();
	const widget = new MainAreaWidget({content});
	widget.id = 'climb-jupyterlab';
	widget.title.label = 'CLIMB stats';
	widget.title.closable = true;
	return widget;
    }

    // Create a single widget
    let widget = newWidget();

    // Add an application command
    const command: string = 'climb:open';
    app.commands.addCommand(command, {
	label: 'CLIMB dashboard',
	caption: 'CLIMB dashboard',
	icon: cloudIcon,
	execute: () => {
	    // Regenerate the widget if disposed
	    if (widget.isDisposed) {
		widget = newWidget();
	    }
	    if (!widget.isAttached) {
		// Attach the widget to the main work area if it's not there
		app.shell.add(widget, 'main');
	    }
	    // Activate the widget
	    app.shell.activateById(widget.id);
	}
    });

    // Add the command to the palette.
    palette.addItem({ command, category: 'CLIMB' });

    if (launcher) {
	launcher.add({ command, category: 'CLIMB' });
    }
}

/**
 * Initialization data for the climb_usage_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
    id: 'climb_usage_extension:plugin',
    description: 'A JupyterLab extension to query CLIMB resource usage',
    autoStart: true,
    requires: [ICommandPalette],
    optional: [ILauncher],
    activate: activate
};

export default plugin;
