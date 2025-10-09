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

    // const logo = document.createElement('img');
    // logo.src = 'https://docs.climb.ac.uk/img/climb_big_data_white_450px.png';
    // logo.classList.add('logo');
    // nav.append(logo);

    this.descriptionList = document.createElement('dl');
    this.node.appendChild(this.descriptionList);

      // Items to show
      // TODO: Make the ID prefix be determined programmatically
    const items = [
	{ label: 'User', id_prefix: 'user' },
	{ label: 'Group', id_prefix: 'group' },
	{ label: 'CPUs', id_prefix: 'cpus' },
	{ label: 'Memory usage', id_prefix: 'memory_usage' },
	{ label: 'CPU usage', id_prefix: 'cpu_usage' },
    ];
      for (const item of items) {
	  const dt = document.createElement('dt');
	  dt.id = item.id_prefix + "-dt";
	  const dd = document.createElement('dd');
	  dd.id = item.id_prefix + "-dd";
	  const label = document.createTextNode(item.label);

	  dt.appendChild(label);

	  this.descriptionList.appendChild(dt);
	  this.descriptionList.appendChild(dd);
    }

      this.memory_usage = document.createElement('progress');
      // const mem_usage = document.createElement('dd');
      const mem_usage = this.node.querySelector('#memory_usage-dd');
      if (mem_usage) {
	  mem_usage.appendChild(this.memory_usage);
      }

      this.cpu_usage_progress = document.createElement('progress');
      const cpu_usage = this.node.querySelector('#cpu_usage-dd');
      if (cpu_usage) {
	  cpu_usage.appendChild(this.cpu_usage_progress);
      }


      // Volumes
      this.volumeList = document.createElement('dl');
      this.node.appendChild(this.volumeList);

      requestAPI<any>('disk-usage')
	  .then(volumes => {
	      for (const item of volumes) {
		  const dt = document.createElement('dt');
		  const dd = document.createElement('dd');
		  const label = document.createTextNode(item.label);
		  const progress = document.createElement('progress');
		  // Not a prefix but the actual ID
		  progress.id = item.id_prefix;

		  dt.appendChild(label);
		  dd.appendChild(progress);

		  this.descriptionList.appendChild(dt);
		  this.descriptionList.appendChild(dd);

	      }
	  })
	  .catch(reason => {
	      console.error('Error getting volumes');
	  });


      // Get username and group on connection
      requestAPI<any>('get-env')
      .then(data => {
          console.log(data);
	  let el = this.node.querySelector('#user-dd');
	  if (el) { el.textContent = data['user']; }
	  el = this.node.querySelector('#group-dd');
	  if (el) el.textContent = data['group'];
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
	  let el = this.node.querySelector('#cpus-dd');
	  if (el) { el.textContent = String(this.ncpus); }

        this.memory_usage.max = data['max_memory'];
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
      this.memory_usage.value = data['value'];
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }

    try {
      const data = await requestAPI<any>('cpu-usage');
      let value: number = parseFloat(data['value']);
      let usage = value / this.ncpus;
      this.cpu_usage_progress.value = usage;
	console.log('CPU: ', data['value'], 'usage:', usage);
	console.log(data)
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }


      try {
	  const data = await requestAPI<any>('disk-usage');
	  for (const vol of data) {
	      const progress = this.node.querySelector('#' + vol.id_prefix) as HTMLProgressElement;
	      if (progress) {
		  progress.value = vol['data']['used'];
		  progress.max = vol['data']['total'];
	      }
	  }
      } catch (err) {
	  console.error('Error fetching metrics:', err);
      }

  }

  onAfterAttach(): void {
    // Start polling when widget is attached to the DOM
    this.onUpdateRequest();
    this.intervalId = window.setInterval(
      () => this.onUpdateRequest(),
      this.pollInterval
    );
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
  private ncpus: number = 1;

    private descriptionList: HTMLDListElement;
    private volumeList: HTMLDListElement;

  private intervalId: number | null = null;
  private pollInterval = 5000; // 5 seconds
}
/**
 * Activate the CLIMB widget extension.
 */
function activate(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  launcher: ILauncher | null
) {
  console.log('JupyterLab extension jupyterlab_climb is activated!');

  // Define a widget creator function
  const newWidget = () => {
    const content = new CLIMBWidget();
    const widget = new MainAreaWidget({ content });
    widget.id = 'climb-jupyterlab';
    widget.title.label = 'CLIMB stats';
    widget.title.closable = true;
    return widget;
  };

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
