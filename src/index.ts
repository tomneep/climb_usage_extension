import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';

import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';

import cloudIconSvg from '../style/icons/cloud.svg';

import '../style/index.css';

export const cloudIcon = new LabIcon({
  name: 'climb-jupyterlab-extension:cloud_icon',
  svgstr: cloudIconSvg
});

import { CLIMBReactWidget } from './CLIMB_react_widget';
/**
 * Activate the CLIMB widget extension.
 */
function activate(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  launcher: ILauncher | null
) {
  console.log('JupyterLab extension jupyterlab_climb is activated!');

  const newReactWidget = () => {
    const content = new CLIMBReactWidget();
    const main_widget = new MainAreaWidget({ content });
    main_widget.id = 'climb_dashboard';
    main_widget.title.label = 'CLIMB Dashboard';
    main_widget.title.icon = cloudIcon;
    main_widget.title.closable = true;

    return main_widget;
  };

  let climb_react_widget: MainAreaWidget<CLIMBReactWidget> = newReactWidget();

  const react_command: string = 'climb:open';
  app.commands.addCommand(react_command, {
    label: 'CLIMB Dashboard',
    caption: 'CLIMB Dashboard',
    icon: cloudIcon,
    execute: () => {
      if (climb_react_widget.isDisposed) {
        climb_react_widget = newReactWidget();
      }
      if (!climb_react_widget.isAttached) {
        app.shell.add(climb_react_widget, 'main');
      }
      app.shell.activateById(climb_react_widget.id);
    }
  });

  // Add the command to the palette.
  palette.addItem({ command: react_command, category: 'CLIMB' });

  if (launcher) {
    launcher.add({ command: react_command, category: 'CLIMB' });
  }
}

/**
 * Initialization data for the climb dashboard extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'climb_dashboard_gui_extension:plugin',
  description: 'A JupyterLab extension to query CLIMB resource usage',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [ILauncher],
  activate: activate
};

export default plugin;
