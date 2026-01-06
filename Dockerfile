# Start from a stable Jupyter base image
FROM quay.io/jupyter/base-notebook:latest

# # Switch to root to install system-level dependencies
USER root

# Install nodejs (needed for building JupyterLab extensions)
RUN apt-get update && apt-get install -y nodejs npm && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Switch back to the notebook user
USER $NB_USER

# Copy your local extension into the container
COPY --chown=${NB_UID}:${NB_GID} . /home/jovyan/my-extension

# (Optional) install additional Python dependencies
# COPY requirements.txt /tmp/requirements.txt
# RUN pip install --no-cache-dir -r /tmp/requirements.txt || true

# Install JupyterLab and your extension
RUN pip install --no-cache-dir jupyterlab && \
    cd /home/jovyan/my-extension && \
    jlpm install && jlpm run build && \
    jupyter labextension develop . --overwrite

ENV JUPYTERHUB_USER=climb_user.climb_group

# Expose JupyterLab port
EXPOSE 8888

# Set the default command
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--no-browser", "--allow-root"]
