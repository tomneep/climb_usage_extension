import { requestAPI } from './handler';
import { Widget } from '@lumino/widgets';

export class CLIMBWidget extends Widget {
  /**
   * Construct a new CLIMB widget.
   */
  constructor() {
    super();

    this.node.className = 'onyx';

    // This should probably be called createHeader instead
    this.node.appendChild(this.createNavbar());

    // These sections will appear all the time
    this.node.appendChild(this.createUserInfo());
    this.node.appendChild(this.createResourceInfo());
    this.node.appendChild(this.createVolumeInfo());

    // Test to see if we have a GPU. This test is currently only
    // valid for NVIDIA GPUs (which is all we are using on CLIMB
    // atm)
    requestAPI<any>('has-gpu')
      .then(data => {
        this.hasGPU = data['has_gpu'];
        if (this.hasGPU) {
          this.node.appendChild(this.createGPUInfo());
        }
      })
      .catch(reason => {
        console.error(
          `The climb_usage_extension server extension appears to be missing.\n${reason}`
        );
      });
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
      const value: number = parseFloat(data['value']);
      const usage = value / this.ncpus;
      this.cpu_usage_progress.value = usage;
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }

    try {
      const data = await requestAPI<any>('disk-usage');
      for (const vol of data) {
        const progress = this.node.querySelector(
          '#' + vol.id_prefix
        ) as HTMLProgressElement;
        if (progress) {
          progress.value = vol['data']['used'];
          progress.max = vol['data']['total'];
        }
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }

    // GPU Stats
    if (this.hasGPU) {
      console.log('Getting GPU stats');
      try {
        const data = await requestAPI<any>('gpu-stats');
        console.log(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
      }
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

  private createNavbar(): HTMLElement {
    const header = document.createElement('header');
    const nav = document.createElement('nav');
    header.appendChild(nav);
    nav.classList.add('navbar', 'bg-dark', 'navbar-expand-md', 'fixed-top');
    nav.setAttribute('data-bs-theme', 'dark');

    const container_fluid = document.createElement('div');
    container_fluid.className = 'container-fluid';
    nav.appendChild(container_fluid);

    // Links
    const links = [
      { label: 'Documentation', href: 'https://docs.climb.ac.uk' },
      { label: 'Support', href: 'mailto:support@climb.ac.uk' },
      { label: 'Bryn', href: 'https://bryn.climb.ac.uk' }
    ];

    const list = document.createElement('div');
    list.classList.add('navbar-nav');
    for (const link of links) {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.label;
      a.target = '_blank'; // open in new tab
      a.rel = 'noopener noreferrer'; // security best practice
      a.classList.add('nav-link');
      list.appendChild(a);
    }
    container_fluid.appendChild(list);
    return header;
  }

  private createUserInfo(): HTMLElement {
    const info_section = document.createElement('section');
    const info_card = this.makeCard('User information');
    info_section.appendChild(info_card);
    const info_card_body = info_card.children[1];

    const descriptionList = document.createElement('dl');
    info_card_body.appendChild(descriptionList);

    // Store references while building
    const elements: Record<string, HTMLElement> = {};

    // Items to show
    // TODO: Make the ID prefix be determined programmatically
    const items = [
      { label: 'User', id_prefix: 'user' },
      { label: 'Group', id_prefix: 'group' }
    ];
    for (const item of items) {
      const dt = document.createElement('dt');
      dt.id = item.id_prefix + '-dt';
      const dd = document.createElement('dd');
      dd.id = item.id_prefix + '-dd';
      const label = document.createTextNode(item.label);

      dt.appendChild(label);

      descriptionList.appendChild(dt);
      descriptionList.appendChild(dd);
      elements[item.id_prefix] = dd;
    }

    // Get username and group on connection
    requestAPI<any>('get-env')
      .then(data => {
        console.log(data);
        let el = elements['user'];
        el.textContent = data['user'];
        el = elements['group'];
        el.textContent = data['group'];
      })
      .catch(reason => {
        console.error(
          `The climb_usage_extension server extension appears to be missing.\n${reason}`
        );
      });

    return info_section;
  }

  private createResourceInfo(): HTMLElement {
    const section = document.createElement('section');
    const card = this.makeCard('Resources');
    section.appendChild(card);
    const card_body = card.children[1];

    const descriptionList = document.createElement('dl');
    card_body.appendChild(descriptionList);

    // Items to show
    // TODO: Make the ID prefix be determined programmatically

    // Store references while building
    const elements: Record<string, HTMLElement> = {};

    const items = [
      { label: 'CPUs', id_prefix: 'cpus' },
      { label: 'Memory usage', id_prefix: 'memory_usage' },
      { label: 'CPU usage', id_prefix: 'cpu_usage' }
    ];
    for (const item of items) {
      const dt = document.createElement('dt');
      dt.id = item.id_prefix + '-dt';
      const dd = document.createElement('dd');
      dd.id = item.id_prefix + '-dd';
      const label = document.createTextNode(item.label);

      dt.appendChild(label);

      descriptionList.appendChild(dt);
      descriptionList.appendChild(dd);
      elements[item.id_prefix] = dd;
    }

    this.memory_usage = document.createElement('progress');
    // const mem_usage = document.createElement('dd');
    const mem_usage = elements['memory_usage'];
    mem_usage.appendChild(this.memory_usage);

    this.cpu_usage_progress = document.createElement('progress');
    const cpu_usage = elements['cpu_usage'];
    cpu_usage.appendChild(this.cpu_usage_progress);

    // Get username and group on connection
    requestAPI<any>('limits')
      .then(data => {
        console.log(data);
        this.ncpus = data['cpu_limit'] as number;
        const el = elements['cpus'];
        el.textContent = String(this.ncpus);

        this.memory_usage.max = data['max_memory'];
      })
      .catch(reason => {
        console.error(
          `The climb_usage_extension server extension appears to be missing.\n${reason}`
        );
      });

    return section;
  }

  private createVolumeInfo(): HTMLElement {
    const section = document.createElement('section');
    const card = this.makeCard('Volumes');
    section.appendChild(card);
    const card_body = card.children[1];

    // Volumes
    const list = document.createElement('dl');
    card_body.appendChild(list);

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

          list.appendChild(dt);
          list.appendChild(dd);
        }
      })
      .catch(reason => {
        console.error('Error getting volumes');
      });
    return section;
  }

  private createGPUInfo(): HTMLElement {
    const section = document.createElement('section');
    const card = this.makeCard('GPU');
    section.appendChild(card);
    const card_body = card.children[1];

    const list = document.createElement('dl');
    card_body.appendChild(list);

    // Store references while building
    const elements: Record<string, HTMLElement> = {};

    const items = [{ label: 'GPU', id_prefix: 'gpu' }];
    for (const item of items) {
      const dt = document.createElement('dt');
      dt.id = item.id_prefix + '-dt';
      const dd = document.createElement('dd');
      dd.id = item.id_prefix + '-dd';
      const label = document.createTextNode(item.label);

      dt.appendChild(label);

      list.appendChild(dt);
      list.appendChild(dd);
      elements[item.id_prefix] = dd;
    }

    requestAPI<any>('gpu-info')
      .then(info => {
        elements["gpu"].textContent = info['name'];
      })
      .catch(reason => {
        console.error('Error getting GPU info');
      });

    return section;
  }

  private makeCard(title: string): HTMLElement {
    const card = document.createElement('div');
    card.classList.add('card', 'p-3', 'm-2');

    const card_title = document.createElement('h5');
    card_title.className = 'card-title';
    card_title.innerText = title;

    const card_body = document.createElement('div');
    card_body.className = 'card-body';

    card.appendChild(card_title);
    card.appendChild(card_body);

    return card;
  }

  // These are marked with ! because typescipt is unhappy we aren't
  // directly assigning them in the constructor
  private memory_usage!: HTMLProgressElement;
  private cpu_usage_progress!: HTMLProgressElement;
  private ncpus: number = 1;

  private intervalId: number | null = null;
  private pollInterval = 5000; // 5 seconds

  private hasGPU: boolean = false;
}
