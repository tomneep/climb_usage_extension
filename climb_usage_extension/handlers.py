import json
import os
import random

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado

class RouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({
            "data": "This is /climb-usage-extension/get-example endpoint!"
        }))

class EnvHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):

        user, _, group = os.environ.get("JUPYTERHUB_USER", "user.group").partition(".")

        out = {"user": user, "group": group}
        self.finish(json.dumps(out))


class MaxMemHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):

        max_memory = os.environ["MEM_LIMIT"]

        out = {"max_memory": max_memory}
        self.finish(json.dumps(out))


class CurrentMemHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):

        max_memory = os.environ["MEM_LIMIT"]

        x = random.randint(0, int(max_memory))
        
        out = {"value": x}
        self.finish(json.dumps(out))
        

        



def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "climb-usage-extension", "get-example")
    env_pattern = url_path_join(base_url, "climb-usage-extension", "get-env")
    max_memory_pattern = url_path_join(base_url, "climb-usage-extension", "max-memory");
    current_memory_pattern = url_path_join(base_url, "climb-usage-extension", "current-memory");


    handlers = [
        (route_pattern, RouteHandler),
        (env_pattern, EnvHandler),
        (max_memory_pattern, MaxMemHandler),
        (current_memory_pattern, CurrentMemHandler),
    ]

    web_app.add_handlers(host_pattern, handlers)
