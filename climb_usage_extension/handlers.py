import json
import os

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
        


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "climb-usage-extension", "get-example")
    env_pattern = url_path_join(base_url, "climb-usage-extension", "get-env")
    handlers = [
        (route_pattern, RouteHandler),
        (env_pattern, EnvHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)
