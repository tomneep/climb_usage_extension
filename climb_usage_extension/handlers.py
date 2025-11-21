import json
import os
import shutil
import time
from pathlib import Path

import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join

_handlers = {}


def add_to_handlers(path):
    """Helper function to add handlers via a decorator.

    Useful to associate the url path to the class at the point the
    class is declared.
    """

    def func(cls):
        _handlers[path] = cls
        return cls

    return func


@add_to_handlers("get-env")
class EnvHandler(APIHandler):
    """Get the user and group from environment variables."""

    @tornado.web.authenticated
    def get(self):
        user, _, group = os.environ["JUPYTERHUB_USER"].partition(".")

        out = {"user": user, "group": group}
        self.finish(json.dumps(out))


@add_to_handlers("resources")
class ResourceUsageHandler(APIHandler):
    """Get information about resource usage (memory/CPU)."""

    previous_time = None
    previous_value = None

    @staticmethod
    def current_memory():
        # Note that psutil can't be used to get the memory usage
        # inside a container (correct as of 2025/10/09) See:
        # https://github.com/giampaolo/psutil/issues/2100
        with Path("/sys/fs/cgroup/memory.current").open() as f:
            current_memory = f.read().strip()
        return {"memory_now": current_memory}

    @staticmethod
    def limits():
        # WARNING: You might think that getting the number of CPUs
        # this way is odd, considering there are methods like
        # os.cpu_count() and psutil.cpu_count(), however, these will
        # return the CPU count of the entire node and not of the
        # container. There is a python bug here:
        # https://bugs.python.org/issue36054
        memory_path = Path("/sys/fs/cgroup/memory.max")
        cpu_path = Path("/sys/fs/cgroup/cpu.max")

        with memory_path.open() as f:
            max_memory = f.read().strip()
            if max_memory == "max":
                # Set some kind of dummy value for now (16 GB)
                max_memory = 2**30

        with cpu_path.open() as f:
            line = f.read().strip()
            cpu_limit, period = line.split()
            # CPU limit can be "max", in which case we are a bit
            # stuck here! Let's just set it to 1 and see
            try:
                cpu_limit = float(cpu_limit) / int(period)
            except ValueError:
                cpu_limit = 1

        return {"memory_max": max_memory, "cpus": cpu_limit}

    def current_cpu(self):
        # See above warnings about why we can't just use psutil for
        # the CPU usage
        path = Path("/sys/fs/cgroup/cpu.stat")

        # If we don't have this path then lets just leave here
        if not path.exists():
            return {"cpu_now": 0}

        data = {}
        with path.open() as f:
            current_time = time.time()
            for line in f:
                key, _, value = line.partition(" ")
                data[key] = value
        current_value = int(data["usage_usec"])

        cls = self.__class__
        x = 0
        if cls.previous_value is not None:
            t_diff = current_time - cls.previous_time
            v_diff = current_value - cls.previous_value
            x = v_diff / (t_diff * 1e6)

        cls.previous_time = current_time
        cls.previous_value = current_value

        return {"cpu_now": x}

    @tornado.web.authenticated
    def get(self):
        output = self.current_memory() | self.current_cpu() | self.limits()
        # Scale CPU usage by number of CPUs
        output["cpu_now"] /= output["cpus"]
        self.finish(json.dumps(output))


@add_to_handlers("disk-usage")
class DiskUsageHandler(APIHandler):
    """Get disk usage.

    Currently gets home drive and /shared/team.
    """

    @tornado.web.authenticated
    def get(self):
        output = []

        # Show home directory usage and /shared/team/

        home = {
            "label": "~",
            "id_prefix": "home_disk_usage",
            "data": shutil.disk_usage(Path.home())._asdict(),
        }
        output.append(home)

        try:
            shared_team = shutil.disk_usage("/shared/team")
        except FileNotFoundError:
            pass
        else:
            shared = {
                "label": "/shared/team/",
                "id_prefix": "shared_team_disk_usage",
                "data": shared_team._asdict(),
            }
            output.append(shared)

        return self.finish(json.dumps(output))


@add_to_handlers("has-gpu")
class HasGPUHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        has_gpu = "NVIDIA_VISIBLE_DEVICES" in os.environ
        return self.finish(json.dumps({"has_gpu": has_gpu}))


@add_to_handlers("gpu-info")
class GPUInfoHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        import pynvml

        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        name = pynvml.nvmlDeviceGetName(handle)
        return self.finish(json.dumps({"name": name}))


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    usage_url = "climb-usage-extension"

    handlers = []
    for path, cls in _handlers.items():
        pattern = url_path_join(base_url, usage_url, path)
        handlers.append([pattern, cls])
    web_app.add_handlers(host_pattern, handlers)
